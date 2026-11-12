import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { UserService } from '../user/user.service';
import { AlfaBankService } from './alfa-bank/alfa-bank.service';
import { MailService } from '../libs/mail/mail.service';
import { MetricsService } from '../metrics/metrics.service';
import { PromoCodeService } from './promo/promo-code.service';
import { PromotionService } from '../promotion/promotion.service';
import { TopProductsService } from '../top-products/top-products.service';
import { DeliveryType, PaymentType } from './dto/create-order.dto';

describe('OrderService.createOrder (итог считается на сервере)', () => {
  let service: OrderService;
  let prismaService: {
    order: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: { update: jest.Mock };
  };
  let cartService: { getCart: jest.Mock; clearCart: jest.Mock };
  let userService: { findById: jest.Mock };
  let alfaBankService: { registerOrder: jest.Mock; cancelOrder: jest.Mock };
  let promotionService: { calculateDiscount: jest.Mock };
  let promoCodeService: {
    validateAndCalculateDiscount: jest.Mock;
    recordPromoCodeUsage: jest.Mock;
  };

  /** Корзина: 2 позиции по 50 = 100 BYN */
  const cartWith = (totalAmount: number) => ({
    id: 'cart-1',
    userId: 'user-1',
    totalAmount,
    CartItem: [
      {
        quantity: 2,
        productItem: {
          id: 'item-1',
          productId: 'product-1',
          price: totalAmount / 2,
          taste: 'Ананас-манго',
          size: 'большой',
          product: {
            id: 'product-1',
            name: 'Эдгар',
            imageUrl: 'https://cdn.example/edgar.png',
          },
        },
      },
    ],
  });

  /** Данные заказа, реально записанные в БД */
  const createdOrderData = (): Record<string, unknown> =>
    prismaService.order.create.mock.calls[0][0].data as Record<string, unknown>;

  beforeEach(async () => {
    prismaService = {
      order: {
        create: jest.fn(
          ({
            data,
          }: {
            data: Record<string, unknown>;
          }): Promise<Record<string, unknown>> =>
            Promise.resolve({
              id: 'order-1',
              ...data,
              items: (data.items as { create: unknown[] }).create,
            }),
        ),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
    };

    cartService = {
      getCart: jest.fn().mockResolvedValue(cartWith(100)),
      clearCart: jest.fn().mockResolvedValue({ message: 'ok' }),
    };

    userService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'buyer@example.test',
        displayName: 'Иван Иванов',
        number: '+375291234567',
      }),
    };

    alfaBankService = {
      registerOrder: jest
        .fn()
        .mockResolvedValue({ orderId: 'gw-1', formUrl: 'https://pay/form' }),
      cancelOrder: jest.fn().mockResolvedValue(undefined),
    };

    promotionService = {
      calculateDiscount: jest
        .fn()
        .mockResolvedValue({ totalDiscount: 10, breakdown: [] }),
    };

    promoCodeService = {
      validateAndCalculateDiscount: jest.fn(),
      recordPromoCodeUsage: jest.fn().mockResolvedValue(undefined),
    };

    const configService = {
      getOrThrow: (key: string) =>
        key === 'ALLOWED_ORIGIN' ? 'https://corax.by' : undefined,
      get: () => '933',
    } as unknown as ConfigService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prismaService },
        { provide: CartService, useValue: cartService },
        { provide: UserService, useValue: userService },
        { provide: AlfaBankService, useValue: alfaBankService },
        { provide: MailService, useValue: {} },
        { provide: ConfigService, useValue: configService },
        { provide: MetricsService, useValue: {} },
        { provide: PromoCodeService, useValue: promoCodeService },
        { provide: PromotionService, useValue: promotionService },
        { provide: TopProductsService, useValue: {} },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('курьер: товары - скидка + 15 BYN доставки', async () => {
    await service.createOrder('user-1', {
      deliveryType: DeliveryType.DELIVERY,
      address: 'г. Минск, ул. Ленина, 1',
      paymentType: PaymentType.ONLINE,
    });

    const data = createdOrderData();
    expect(data.subtotalAmount).toBe(100);
    expect(data.discountAmount).toBe(10);
    expect(data.deliveryCost).toBe(15);
    expect(data.totalAmount).toBe(105);
  });

  it('самовывоз: доставка не добавляется к сумме', async () => {
    await service.createOrder('user-1', {
      deliveryType: DeliveryType.PICKUP,
      paymentType: PaymentType.ONLINE,
    });

    const data = createdOrderData();
    expect(data.deliveryCost).toBe(0);
    expect(data.totalAmount).toBe(90);
  });

  it('Европочта: доставка бесплатная', async () => {
    await service.createOrder('user-1', {
      deliveryType: DeliveryType.EUROMAIL,
      address: 'г. Брест, ул. Советская, 2',
      paymentType: PaymentType.ONLINE,
    });

    const data = createdOrderData();
    expect(data.deliveryCost).toBe(0);
    expect(data.totalAmount).toBe(90);
  });

  it('в шлюз уходит серверная сумма с доставкой', async () => {
    await service.createOrder('user-1', {
      deliveryType: DeliveryType.DELIVERY,
      address: 'г. Минск, ул. Ленина, 1',
      paymentType: PaymentType.ONLINE,
    });

    expect(alfaBankService.registerOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        // 105 BYN в копейках
        amount: 10500,
      }),
    );
  });

  it('скидка не уменьшает стоимость доставки', async () => {
    promotionService.calculateDiscount.mockResolvedValue({
      totalDiscount: 100,
      breakdown: [],
    });

    await service.createOrder('user-1', {
      deliveryType: DeliveryType.DELIVERY,
      address: 'г. Минск, ул. Ленина, 1',
      paymentType: PaymentType.ONLINE,
    });

    const data = createdOrderData();
    expect(data.discountAmount).toBe(100);
    expect(data.totalAmount).toBe(15);
  });

  it('клиентские поля суммы в запросе не влияют на итог', async () => {
    await service.createOrder('user-1', {
      deliveryType: DeliveryType.DELIVERY,
      address: 'г. Минск, ул. Ленина, 1',
      paymentType: PaymentType.ONLINE,
      totalAmount: 1,
      subtotalAmount: 1,
      discountAmount: 0,
      deliveryCost: 0,
    } as never);

    const data = createdOrderData();
    expect(data.totalAmount).toBe(105);
    expect(data.subtotalAmount).toBe(100);
  });

  it('очищает корзину после оформления', async () => {
    await service.createOrder('user-1', {
      deliveryType: DeliveryType.PICKUP,
      paymentType: PaymentType.ONLINE,
    });

    expect(cartService.clearCart).toHaveBeenCalledWith('user-1');
  });
});
