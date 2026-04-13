import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartDto } from './dto/add.cart.dto';
import { UpdateCartDto } from './dto/update.cart.dto';
import { ProductService } from '../product/product.service';

@Injectable()
export class CartService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly productService: ProductService,
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

  /** Пересчитывает totalAmount и обновляет запись Cart */
  private async recalculateTotalAmount(cartId: string): Promise<number> {
    const cartItems = await this.prismaService.cartItem.findMany({
      where: { cartId },
      include: { productItem: true },
    });

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.productItem.price * item.quantity,
      0,
    );

    await this.prismaService.cart.update({
      where: { id: cartId },
      data: { totalAmount },
    });

    return totalAmount;
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

    return cart;
  }

  /**
   * Добавить товар с выбранными опциями (вкус + размер) в корзину.
   * Если такая позиция уже есть — увеличивает quantity на 1.
   */
  public async addToCart(userId: string, dto: AddCartDto) {
    const { productId, price, taste, size } = dto;

    // 1. Проверяем, что продукт существует
    await this.productService.getById(productId);

    // 2. Найти или создать корзину пользователя
    let cart = await this.prismaService.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prismaService.cart.create({
        data: { userId, totalAmount: 0 },
      });
    }

    // 3. Найти или создать ProductItem (уникальная комбинация продукт+вкус+размер).
    //    Цена всегда обновляется, т.к. рассчитывается на фронте и может меняться.
    const productItem = await this.prismaService.productItem.upsert({
      where: {
        productId_taste_size: { productId, taste, size },
      },
      update: { price },
      create: { productId, taste, size, price },
    });

    // 4. Добавить или обновить CartItem.
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

    return this.getCart(userId);
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

    return this.getCart(userId);
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

    return this.getCart(userId);
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

    return this.getCart(userId);
  }
}
