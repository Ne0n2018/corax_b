import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartDto } from './dto/add.cart.dto';
import { UpdateCartDto } from './dto/update.cart.dto';
import { ProductService } from '../product/product.service';
import { PromotionService } from '../promotion/promotion.service';
import { variantPriceKey } from '../product/variant-price';
import { round2 } from '../common/utils/money.util';

/** Минимальная форма корзины, needed для серверного расчёта цен */
interface CartForPricing {
  id: string;
  totalAmount: number;
  CartItem: Array<{
    quantity: number;
    productItem: {
      id: string;
      productId: string;
      price: number;
      taste: string;
      size: string;
    };
  }>;
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly productService: ProductService,
    private readonly promotionService: PromotionService,
  ) {}

  // ─── Приватные утилиты ──────────────────────────────────────────────────────

  /** Возвращает корзину пользователя или выбрасывает 404 */
  private async findCartByUserId(userId: string) {
    const cart = await this.prismaService.cart.findUnique({
      where: { userId },
    });
    if (!cart) {
      throw new NotFoundException('Корзина не найдена');
    }
    return cart;
  }

  /**
   * Пересчитывает цены позиций корзины по серверным справочникам прайса и
   * обновляет Cart.totalAmount.
   *
   * Единственный допустимый источник цены — ProductService.getVariantPrices
   * (products.default_price + tastes.price + "Size".price из БД). Значения из
   * запроса клиента в расчёт не попадают, поэтому подменить сумму со стороны
   * клиента невозможно.
   *
   * Метод мутирует переданный объект (price/totalAmount), чтобы вызывающий код
   * отдавал клиенту уже пересчитанные значения без повторного чтения БД.
   */
  private async syncServerPrices(cart: CartForPricing): Promise<number> {
    const items = cart.CartItem ?? [];

    if (items.length === 0) {
      if (cart.totalAmount !== 0) {
        await this.prismaService.cart.update({
          where: { id: cart.id },
          data: { totalAmount: 0 },
        });
        cart.totalAmount = 0;
      }
      return 0;
    }

    const prices = await this.productService.getVariantPrices(
      items.map((item) => ({
        productId: item.productItem.productId,
        taste: item.productItem.taste,
        size: item.productItem.size,
      })),
    );

    const outdatedPrices: Array<{ id: string; price: number }> = [];
    let rawTotal = 0;

    for (const item of items) {
      const serverPrice = prices.get(
        variantPriceKey({
          productId: item.productItem.productId,
          taste: item.productItem.taste,
          size: item.productItem.size,
        }),
      );

      // Вариант больше не присутствует в прайсе — в сумму он не входит
      if (serverPrice === undefined) {
        this.logger.warn(
          `Корзина ${cart.id}: цена варианта товара ${item.productItem.productId} ` +
            `(${item.productItem.taste}/${item.productItem.size}) не найдена в прайсе, ` +
            `позиция исключена из итоговой суммы`,
        );
        continue;
      }

      if (item.productItem.price !== serverPrice) {
        outdatedPrices.push({ id: item.productItem.id, price: serverPrice });
        item.productItem.price = serverPrice;
      }

      rawTotal += serverPrice * item.quantity;
    }

    const totalAmount = round2(rawTotal);

    if (outdatedPrices.length > 0) {
      await this.prismaService.$transaction(
        outdatedPrices.map((entry) =>
          this.prismaService.productItem.update({
            where: { id: entry.id },
            data: { price: entry.price },
          }),
        ),
      );
    }

    if (cart.totalAmount !== totalAmount) {
      await this.prismaService.cart.update({
        where: { id: cart.id },
        data: { totalAmount },
      });
      cart.totalAmount = totalAmount;
    }

    return totalAmount;
  }

  /** Читает позиции корзины и пересчитывает их цены и сумму на сервере */
  private async recalculateTotalAmount(cartId: string): Promise<number> {
    const cart = await this.prismaService.cart.findUnique({
      where: { id: cartId },
      select: {
        id: true,
        totalAmount: true,
        CartItem: {
          select: {
            quantity: true,
            productItem: {
              select: {
                id: true,
                productId: true,
                price: true,
                taste: true,
                size: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Корзина не найдена');
    }

    return this.syncServerPrices(cart);
  }

  // ─── Публичные методы ───────────────────────────────────────────────────────

  /**
   * Получить корзину текущего пользователя вместе с позициями.
   * Если корзины нет — создаёт пустую.
   */
  public async getCart(userId: string) {
    let cart = await this.prismaService.cart.findUnique({
      where: { userId },
      include: {
        CartItem: {
          orderBy: { createdAt: 'desc' },
          include: {
            productItem: {
              include: {
                product: {
                  include: {
                    Provider: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prismaService.cart.create({
        data: { userId, totalAmount: 0 },
        include: {
          CartItem: {
            include: {
              productItem: {
                include: {
                  product: {
                    include: {
                      Provider: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Цены и сумма всегда пересчитываются сервером: клиент не может
    // ни повлиять на них, ни получить устаревшие значения
    await this.syncServerPrices(cart);

    let discountAmount = 0;
    let appliedPromotions: any[] = [];

    if (cart.CartItem && cart.CartItem.length > 0) {
      try {
        const discountResult = await this.promotionService.calculateDiscount(
          cart,
          { id: userId },
        );
        discountAmount = discountResult.totalDiscount || 0;
        appliedPromotions = discountResult.breakdown || [];
      } catch {
        // Если расчет скидок выдал ошибку, скидка 0
      }
    }

    const finalAmount = Math.max(0, cart.totalAmount - discountAmount);

    return {
      ...cart,
      discountAmount,
      finalAmount,
      appliedPromotions,
    };
  }

  /**
   * Рассчитать скидку для корзины текущего пользователя
   */
  public async getCartDiscount(userId: string) {
    const cart = await this.getCart(userId);
    return {
      totalAmount: cart.totalAmount,
      discountAmount: cart.discountAmount,
      finalAmount: cart.finalAmount,
      appliedPromotions: cart.appliedPromotions,
    };
  }

  /**
   * Добавить товар с выбранными опциями (вкус + размер) в корзину.
   * Если такая позиция уже есть — увеличивает quantity на 1.
   *
   * Цена варианта рассчитывается сервером: клиент передаёт только товар и опции.
   */
  public async addToCart(userId: string, dto: AddCartDto) {
    const { productId, taste, size } = dto;

    // 1. Проверяем, что продукт существует
    await this.productService.getById(productId);

    // 2. Серверная цена варианта (товар + вкус + размер) из справочников прайса
    const prices = await this.productService.getVariantPrices([
      { productId, taste, size },
    ]);
    const serverPrice = prices.get(variantPriceKey({ productId, taste, size }));

    if (serverPrice === undefined) {
      throw new BadRequestException(
        'Товар недоступен для заказа: цена не задана',
      );
    }

    // 3. Найти или создать корзину пользователя
    let cart = await this.prismaService.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prismaService.cart.create({
        data: { userId, totalAmount: 0 },
      });
    }

    // 4. Найти или создать ProductItem (уникальная комбинация продукт+вкус+размер).
    //    Цена перезаписывается серверным значением при каждом добавлении,
    //    поэтому в БД не может оказаться сумма, пришедшая от клиента.
    const productItem = await this.prismaService.productItem.upsert({
      where: {
        productId_taste_size: { productId, taste, size },
      },
      update: { price: serverPrice },
      create: { productId, taste, size, price: serverPrice },
    });

    // 5. Добавить или обновить CartItem.
    //    Ищем по составному ключу (productItemId + cartId) —
    //    один и тот же вариант товара может лежать в разных корзинах,
    //    но внутри одной корзины дублироваться не должен.

    const existingCartItem = await this.prismaService.cartItem.findUnique({
      where: {
        productItemId_cartId: {
          productItemId: productItem.id,
          cartId: cart.id,
        },
      },
    });

    if (existingCartItem) {
      // Позиция уже есть в нашей корзине — увеличиваем количество
      await this.prismaService.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + 1 },
      });
    } else {
      await this.prismaService.cartItem.create({
        data: {
          cartId: cart.id,
          productItemId: productItem.id,
        },
      });
    }

    // 5. Пересчитать итоговую сумму
    await this.recalculateTotalAmount(cart.id);

    return { message: 'товар успешно добавлен в корзину' };
  }

  /**
   * Изменить количество товара в корзине.
   * quantity = 0 удаляет позицию из корзины.
   */
  public async updateCartItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartDto,
  ) {
    const cart = await this.findCartByUserId(userId);

    const cartItem = await this.prismaService.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem || cartItem.cartId !== cart.id) {
      throw new NotFoundException('Позиция в корзине не найдена');
    }

    await this.prismaService.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: dto.quantity },
    });

    await this.recalculateTotalAmount(cart.id);

    return { message: 'Корзина успешно обновлена' };
  }

  /**
   * Удалить конкретную позицию из корзины.
   */
  public async removeFromCart(userId: string, cartItemId: string) {
    const cart = await this.findCartByUserId(userId);

    const cartItem = await this.prismaService.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem || cartItem.cartId !== cart.id) {
      throw new NotFoundException('Позиция в корзине не найдена');
    }

    await this.prismaService.cartItem.delete({
      where: { id: cartItemId },
    });

    await this.recalculateTotalAmount(cart.id);

    return { message: 'Товар убран из корзины' };
  }

  /**
   * Очистить корзину (удалить все позиции, обнулить сумму).
   */
  public async clearCart(userId: string) {
    const cart = await this.findCartByUserId(userId);

    await this.prismaService.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await this.prismaService.cart.update({
      where: { id: cart.id },
      data: { totalAmount: 0 },
    });

    return { message: 'Корзина успешно отчищена' };
  }
}
