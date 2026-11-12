import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductService } from '../product/product.service';
import { PromotionService } from '../promotion/promotion.service';
import { variantPriceKey } from '../product/variant-price';

/** Серверная цена варианта из прайса: 88 + 5 + 7 */
const SERVER_PRICE = 100;

describe('CartService (серверной расчёт цен корзины)', () => {
  let service: CartService;
  let prismaService: {
    cart: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    cartItem: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    productItem: {
      upsert: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let productService: {
    getById: jest.Mock;
    getVariantPrices: jest.Mock;
  };
  let promotionService: { calculateDiscount: jest.Mock };

  const cartRow = { id: 'cart-1', userId: 'user-1', totalAmount: 0 };

  const position = (storedPrice: number, quantity = 2) => ({
    quantity,
    productItem: {
      id: 'item-1',
      productId: 'product-1',
      price: storedPrice,
      taste: 'Ананас-манго',
      size: 'большой',
    },
  });

  const fullCart = (
    storedPrice: number,
    quantity = 2,
    storedTotal?: number,
  ) => ({
    ...cartRow,
    // storedTotal моделирует устаревшую сумму, записанную в БД
    totalAmount: storedTotal ?? storedPrice * quantity,
    CartItem: [position(storedPrice, quantity)],
  });

  beforeEach(async () => {
    prismaService = {
      cart: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      cartItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productItem: { upsert: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) =>
        Promise.all(ops),
      ),
    };

    productService = {
      getById: jest.fn().mockResolvedValue({ id: 'product-1' }),
      getVariantPrices: jest.fn(
        (refs: Array<{ productId: string; taste?: string; size?: string }>) =>
          new Map(refs.map((ref) => [variantPriceKey(ref), SERVER_PRICE])),
      ),
    };

    promotionService = {
      calculateDiscount: jest
        .fn()
        .mockResolvedValue({ totalDiscount: 0, breakdown: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prismaService },
        { provide: ProductService, useValue: productService },
        { provide: PromotionService, useValue: promotionService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToCart', () => {
    it('пишет в БД серверную цену варианта, а не цену из запроса клиента', async () => {
      prismaService.cart.findUnique
        // поиск корзины пользователя
        .mockResolvedValueOnce(cartRow)
        // перечитывание корзины для пересчёта суммы
        .mockResolvedValueOnce(fullCart(SERVER_PRICE, 2, 0));
      prismaService.productItem.upsert.mockResolvedValue({
        id: 'item-1',
        price: SERVER_PRICE,
      });
      prismaService.cartItem.findUnique.mockResolvedValue(null);
      prismaService.cartItem.create.mockResolvedValue({ id: 'cart-item-1' });

      // клиент пытается пробросить заниженную цену
      await service.addToCart('user-1', {
        productId: 'product-1',
        taste: 'Ананас-манго',
        size: 'большой',
        price: 1,
      } as never);

      expect(productService.getVariantPrices).toHaveBeenCalledWith([
        { productId: 'product-1', taste: 'Ананас-манго', size: 'большой' },
      ]);
      expect(prismaService.productItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { price: SERVER_PRICE },
          create: expect.objectContaining({
            productId: 'product-1',
            price: SERVER_PRICE,
          }),
        }),
      );
      // 2 штуки по серверной цене
      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { totalAmount: SERVER_PRICE * 2 },
      });
    });

    it('отказывается добавлять вариант, цены которого нет в прайсе', async () => {
      prismaService.cart.findUnique.mockResolvedValue(cartRow);
      productService.getVariantPrices.mockResolvedValue(new Map());

      await expect(
        service.addToCart('user-1', {
          productId: 'product-1',
          taste: 'несуществующий',
          size: 'несуществующий',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.productItem.upsert).not.toHaveBeenCalled();
      expect(prismaService.cartItem.create).not.toHaveBeenCalled();
    });
  });

  describe('getCart', () => {
    it('пересчитывает цену позиции и сумму корзины по прайсу', async () => {
      // в БД лежит устаревшая (или подменённая) цена 1
      prismaService.cart.findUnique.mockResolvedValue(fullCart(1));

      const cart = await service.getCart('user-1');

      expect(cart.CartItem[0].productItem.price).toBe(SERVER_PRICE);
      expect(cart.totalAmount).toBe(SERVER_PRICE * 2);
      expect(cart.finalAmount).toBe(SERVER_PRICE * 2);
      expect(prismaService.productItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { price: SERVER_PRICE },
      });
      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { totalAmount: SERVER_PRICE * 2 },
      });
    });

    it('скидка акций считается от серверной суммы', async () => {
      prismaService.cart.findUnique.mockResolvedValue(fullCart(1, 3));
      promotionService.calculateDiscount.mockResolvedValue({
        totalDiscount: 50,
        breakdown: [{ name: 'акция' }],
      });

      const cart = await service.getCart('user-1');

      expect(cart.totalAmount).toBe(SERVER_PRICE * 3);
      expect(cart.discountAmount).toBe(50);
      expect(cart.finalAmount).toBe(SERVER_PRICE * 3 - 50);
      expect(promotionService.calculateDiscount).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: SERVER_PRICE * 3 }),
        { id: 'user-1' },
      );
    });

    it('позиция без цены в прайсе не входит в итоговую сумму', async () => {
      prismaService.cart.findUnique.mockResolvedValue(fullCart(1));
      productService.getVariantPrices.mockResolvedValue(new Map());

      const cart = await service.getCart('user-1');

      expect(cart.totalAmount).toBe(0);
    });

    it('пустая корзина не пересчитывается и не обращается к прайсу', async () => {
      prismaService.cart.findUnique.mockResolvedValue({
        ...cartRow,
        totalAmount: 0,
        CartItem: [],
      });

      const cart = await service.getCart('user-1');

      expect(cart.totalAmount).toBe(0);
      expect(productService.getVariantPrices).not.toHaveBeenCalled();
      expect(prismaService.cart.update).not.toHaveBeenCalled();
    });
  });

  describe('updateCartItem', () => {
    it('пересчитывает сумму по серверным ценам после изменения количества', async () => {
      prismaService.cart.findUnique
        .mockResolvedValueOnce(cartRow)
        .mockResolvedValueOnce(fullCart(SERVER_PRICE, 5, 0));
      prismaService.cartItem.findUnique.mockResolvedValue({
        id: 'cart-item-1',
        cartId: 'cart-1',
      });
      prismaService.cartItem.update.mockResolvedValue({});

      await service.updateCartItem('user-1', 'cart-item-1', { quantity: 5 });

      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { totalAmount: SERVER_PRICE * 5 },
      });
    });
  });
});
