import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { UserService } from '../user/user.service';
import { AlfaBankService } from './alfa-bank/alfa-bank.service';
import { MailService } from '../libs/mail/mail.service';
import { MetricsService } from '../metrics/metrics.service';
import { PromoCodeService } from './promo/promo-code.service';
import { PromotionService } from '../promotion/promotion.service';
import type { Prisma } from '../generated/prisma/client';
import {
  CreateOrderDto,
  DeliveryType,
  PaymentType,
} from './dto/create-order.dto';
import * as React from 'react';
import OrderConfirmTemplate from '../libs/mail/templates/order.confirm.template';
import { TopProductsService } from '../top-products/top-products.service';
import { getDeliveryCost } from './delivery-cost';

/** Длительность платёжной сессии в шлюзе по умолчанию (sessionTimeoutSecs = 1200) */
const PAYMENT_SESSION_TTL_MS = 20 * 60 * 1000;
/** Заказ ещё может быть оплачен — не трогаем свежие заказы в cron-синхронизации */
const PAYMENT_SYNC_MIN_AGE_MS = 60 * 1000;
/** Заказы старше этого срока считаем безвозвратно просроченными */
const PAYMENT_SYNC_MAX_AGE_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly cartService: CartService,
    private readonly userService: UserService,
    private readonly alfaBankService: AlfaBankService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly promoCodeService: PromoCodeService,
    private readonly promotionService: PromotionService,
    private readonly topService: TopProductsService,
  ) {}

  // ─── Приватные утилиты ──────────────────────────────────────────────────────

  private getOrderInclude() {
    return {
      items: true,
    } as const;
  }

  // ─── Публичные методы ───────────────────────────────────────────────────────

  /**
   * Создать заказ из текущей корзины пользователя.
   *
   * Итоговая сумма рассчитывается только на сервере: стоимость товаров берётся из
   * прайса (products.default_price + наценки опций), стоимость доставки — из
   * тарифной сетки по deliveryType. Клиент передаёт тип доставки и, при
   * необходимости, адрес.
   *
   * Возвращает заказ и URL оплаты (только для ONLINE).
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    const { deliveryType, address, paymentType, promoCode } = dto;

    // 1. Проверка: при доставке курьером или Европочтой адрес обязателен
    if (
      (deliveryType === DeliveryType.DELIVERY ||
        deliveryType === DeliveryType.EUROMAIL) &&
      !address?.trim()
    ) {
      throw new BadRequestException(
        'Адрес обязателен при выборе доставки курьером или Европочтой',
      );
    }

    // 1.1 Для Европочты оплата возможна только онлайн картой
    if (
      deliveryType === DeliveryType.EUROMAIL &&
      paymentType !== PaymentType.ONLINE
    ) {
      throw new BadRequestException(
        'Для доставки Европочтой доступна только оплата сразу по карте',
      );
    }

    // 2. Получаем корзину
    const cart = await this.cartService.getCart(userId);

    if (!cart.CartItem || cart.CartItem.length === 0) {
      throw new BadRequestException(
        'Корзина пуста. Добавьте товары перед оформлением заказа.',
      );
    }

    // 3. Получаем данные пользователя
    const user = await this.userService.findById(userId);

    // 3.1 Для Европочты требуются ФИО и номер телефона получателя
    if (deliveryType === DeliveryType.EUROMAIL) {
      const recipientName =
        dto.recipientName?.trim() || user?.displayName?.trim();
      const recipientPhone = dto.recipientPhone?.trim() || user?.number?.trim();

      if (!recipientName) {
        throw new BadRequestException(
          'Для доставки Европочтой необходимо указать ФИО получателя',
        );
      }
      if (!recipientPhone) {
        throw new BadRequestException(
          'Для доставки Европочтой необходимо указать номер телефона получателя',
        );
      }

      // Если в профиле пользователя не было номера или имени, дополняем их
      if (
        (dto.recipientName && !user.displayName) ||
        (dto.recipientPhone && !user.number)
      ) {
        await this.prismaService.user
          .update({
            where: { id: userId },
            data: {
              ...(dto.recipientName && !user.displayName
                ? { displayName: dto.recipientName.trim() }
                : {}),
              ...(dto.recipientPhone && !user.number
                ? { number: dto.recipientPhone.trim() }
                : {}),
            },
          })
          .catch((err) =>
            this.logger.warn(
              `Не удалось обновить профиль пользователя из заказа: ${err.message}`,
            ),
          );
      }
    }

    // 4. Считаем скидки по акциям (promotion service)
    const promotionResult = await this.promotionService.calculateDiscount(
      cart,
      { id: userId },
    );
    const promotionsDiscount = promotionResult.totalDiscount || 0;

    const subtotalAmount = cart.totalAmount;
    const subtotalAfterPromotions = round2(
      Math.max(0, subtotalAmount - promotionsDiscount),
    );

    // 5. Рассчитываем скидку по промокоду (если передан) на сумму уже после акций
    let promoDiscount = 0;
    let appliedPromoCode: string | null = null;
    if (promoCode) {
      const productIds = cart.CartItem.map(
        (item) => item.productItem.product.id,
      );
      const validation =
        await this.promoCodeService.validateAndCalculateDiscount(
          promoCode,
          subtotalAfterPromotions,
          productIds,
        );

      if (!validation.isValid) {
        throw new BadRequestException(
          validation.message || 'Ошибка применения промокода',
        );
      }
      promoDiscount = validation.discountAmount ?? 0;
      if (promoDiscount > 0) appliedPromoCode = promoCode.trim().toUpperCase();
    }

    const totalDiscount = round2(
      Math.min(subtotalAmount, promotionsDiscount + promoDiscount),
    );
    // Скидка уменьшает только стоимость товаров, доставка начисляется сверху
    const itemsTotal = Math.max(0, round2(subtotalAmount - totalDiscount));
    const deliveryCost = getDeliveryCost(deliveryType);
    const totalAmount = round2(itemsTotal + deliveryCost);

    // 6. Генерируем уникальный 6-значный цифровой код заказа
    const orderCode = await this.generateUniqueOrderCode();

    // 7. Создаём заказ и его позиции в одной транзакции
    const order = await this.prismaService.order.create({
      data: {
        userId,
        orderCode,
        deliveryType,
        address: address?.trim() ?? null,
        paymentType,
        subtotalAmount,
        discountAmount: totalDiscount,
        deliveryCost,
        totalAmount,
        promoCode: appliedPromoCode,
        appliedPromotions:
          promotionResult.breakdown as unknown as Prisma.InputJsonValue,
        // ONLINE → PENDING (ждём оплату), CASH/CARD → PROCESSING (уже можно собирать)
        status: paymentType === PaymentType.ONLINE ? 'PENDING' : 'PROCESSING',
        items: {
          create: cart.CartItem.map((item) => ({
            productItemId: item.productItem.id,
            productId: item.productItem.product.id,
            productName: item.productItem.product.name,
            imageUrl: item.productItem.product.imageUrl,
            taste: item.productItem.taste,
            size: item.productItem.size,
            price: item.productItem.price,
            quantity: item.quantity,
          })),
        },
      },
      include: this.getOrderInclude(),
    });

    // 8. Фиксируем использование промокода
    if (appliedPromoCode) {
      await this.promoCodeService.recordPromoCodeUsage(appliedPromoCode);
    }

    // 9. Очищаем корзину
    await this.cartService.clearCart(userId);

    // 10. Для CASH/CARD — сразу отправляем подтверждение и учитываем продажу.
    //     Для ONLINE — письмо и метрика продаж уйдут после подтверждения оплаты через webhook.
    const orderWithItems = order as unknown as OrderWithItems;
    if (paymentType !== PaymentType.ONLINE) {
      this.sendOrderConfirmEmail(user, orderWithItems).catch((err) =>
        this.logger.error(
          `Не удалось отправить письмо для заказа ${order.id}: ${err.message}`,
        ),
      );
      this.recordProductSales(orderWithItems);
    }

    // 11. Для онлайн-оплаты — регистрируем платёж в шлюзе Альфа-Банка
    let redirectUrl: string | null = null;

    if (paymentType === PaymentType.ONLINE) {
      redirectUrl = await this.registerGatewayPayment(
        {
          id: order.id,
          orderCode,
          totalAmount,
        },
        user.email,
      );
    }

    return { order, redirectUrl };
  }

  /**
   * Получить все заказы пользователя (от новых к старым).
   */
  async getUserOrders(userId: string) {
    return this.prismaService.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: this.getOrderInclude(),
    });
  }

  /**
   * Получить конкретный заказ пользователя по ID.
   */
  async getOrderById(userId: string, orderId: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: this.getOrderInclude(),
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Заказ не найден');
    }

    return order;
  }

  /**
   * Получить новую ссылку для оплаты (если пользователь закрыл платёжную страницу).
   *
   * Шлюз отклоняет повторную регистрацию того же orderNumber, поэтому для каждой
   * попытки оплаты генерируется новый номер, а прежняя регистрация отменяется.
   */
  async getPaymentUrl(userId: string, orderId: string) {
    const order = await this.getOrderById(userId, orderId);

    if (order.paymentType !== 'ONLINE') {
      throw new BadRequestException('Этот заказ не предполагает онлайн-оплату');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Заказ уже оплачен или отменён');
    }

    const user = await this.userService.findById(userId);

    if (order.paymentOrderId && order.paymentOrderNumber) {
      // Оплата могла пройти, пока callback не дошёл — сверяемся с шлюзом
      const gatewayStatus = await this.alfaBankService
        .getOrderStatus(order.paymentOrderId, order.paymentOrderNumber)
        .catch((err) => {
          this.logger.warn(
            `Не удалось проверить статус заказа ${order.id} в шлюзе: ${err.message}`,
          );
          return null;
        });

      if (
        gatewayStatus &&
        isPaidOrderStatus(Number(gatewayStatus.orderStatus))
      ) {
        await this.applyPaymentStatus(order.id, 'PAID', 'repeat-pay check');
        throw new BadRequestException('Заказ уже оплачен');
      }

      // Снимаем прежнюю регистрацию, чтобы в шлюзе не осталось «висячего» заказа
      await this.alfaBankService.cancelOrder(
        order.paymentOrderId,
        order.paymentOrderNumber,
      );
    }

    const formUrl = await this.registerGatewayPayment(
      {
        id: order.id,
        orderCode: order.orderCode,
        totalAmount: order.totalAmount,
      },
      user.email,
    );

    return { redirectUrl: formUrl };
  }

  /**
   * Отменить заказ (только если PENDING или PROCESSING).
   */
  async cancelOrder(userId: string, orderId: string) {
    const order = await this.getOrderById(userId, orderId);

    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      throw new BadRequestException(
        'Отменить можно только заказы со статусом PENDING или PROCESSING',
      );
    }

    // Для неоплаченного ONLINE-заказа снимаем регистрацию и в платёжном шлюзе
    if (
      order.status === 'PENDING' &&
      order.paymentOrderId &&
      order.paymentOrderNumber
    ) {
      await this.alfaBankService.cancelOrder(
        order.paymentOrderId,
        order.paymentOrderNumber,
      );
    }

    return this.prismaService.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
      include: this.getOrderInclude(),
    });
  }

  /**
   * Подтверждение оплаты после возврата покупателя на returnUrl.
   *
   * Самому редиректу не доверяем: статус запрашивается у шлюза через
   * getOrderStatusExtended.do (шаг 10 схемы redirect-интеграции).
   */
  async confirmPayment(userId: string, orderId: string) {
    const order = await this.getOrderById(userId, orderId);

    if (order.paymentType !== 'ONLINE') {
      throw new BadRequestException('Этот заказ не предполагает онлайн-оплату');
    }

    if (order.status !== 'PENDING') {
      return { status: order.status };
    }

    if (!order.paymentOrderId || !order.paymentOrderNumber) {
      throw new BadRequestException('Платёжная сессия для заказа не найдена');
    }

    const gatewayStatus = await this.alfaBankService.getOrderStatus(
      order.paymentOrderId,
      order.paymentOrderNumber,
    );

    if (isPaidOrderStatus(gatewayStatus.orderStatus)) {
      this.assertAmountMatches(order, gatewayStatus.amount, 'returnUrl');
      await this.applyPaymentStatus(order.id, 'PAID', 'returnUrl');
      return {
        status: 'PAID' as const,
        orderStatus: gatewayStatus.orderStatus,
      };
    }

    return { status: order.status, orderStatus: gatewayStatus.orderStatus };
  }

  /**
   * Обработать callback-уведомление от платёжного шлюза Альфа-Банка.
   * Публичный метод — вызывается без авторизации, подлинность по checksum.
   */
  async handleAlfaBankCallback(raw: Record<string, unknown>) {
    const params = toStringParams(raw);

    if (!params.orderNumber) {
      this.logger.warn('alfa-bank callback: отсутствует orderNumber');
      return;
    }

    // Без контрольной суммы уведомление не принимается: его мог прислать кто угодно
    if (!params.checksum) {
      this.logger.warn(
        `alfa-bank callback: отсутствует checksum для ${params.orderNumber}`,
      );
      return;
    }

    if (!this.alfaBankService.verifyCallback(params, params.checksum)) {
      this.logger.warn(
        `alfa-bank callback: неверная контрольная сумма для ${params.orderNumber}`,
      );
      return;
    }

    const order = await this.prismaService.order.findUnique({
      where: { paymentOrderNumber: params.orderNumber },
      select: { id: true, status: true },
    });

    if (!order) {
      this.logger.warn(
        `alfa-bank callback: заказ не найден [${params.orderNumber}]`,
      );
      return;
    }

    const successful = params.status === '1';
    let targetStatus: 'PAID' | 'CANCELLED' | null = null;

    switch (params.operation) {
      case 'approved':
      case 'deposited':
        targetStatus = successful ? 'PAID' : 'CANCELLED';
        break;
      case 'reversed':
      case 'refunded':
      case 'declinedByTimeout':
      case 'declinedCardPresent':
        targetStatus = 'CANCELLED';
        break;
      default:
        // События связок (bindingCreated и т. п.) нас не интересуют
        this.logger.log(
          `alfa-bank callback: операция ${params.operation} проигнорирована`,
        );
        return;
    }

    await this.applyPaymentStatus(
      order.id,
      targetStatus,
      `callback ${params.operation}/${params.status}`,
    );
  }

  /**
   * Страховка от потери callback или редиректа: периодически опрашивает шлюз
   * по неоплаченным ONLINE-заказам и приводит статус в соответствие.
   */
  @Cron('*/5 * * * *')
  async syncPendingOnlinePayments() {
    const now = Date.now();

    const orders = await this.prismaService.order.findMany({
      where: {
        status: 'PENDING',
        paymentType: 'ONLINE',
        paymentOrderId: { not: null },
        createdAt: {
          lt: new Date(now - PAYMENT_SYNC_MIN_AGE_MS),
          gt: new Date(now - PAYMENT_SYNC_MAX_AGE_MS),
        },
      },
      select: {
        id: true,
        totalAmount: true,
        paymentOrderId: true,
        paymentOrderNumber: true,
        createdAt: true,
      },
      take: 100,
    });

    if (orders.length === 0) return;

    this.logger.log(
      `Синхронизация статусов оплаты: проверено заказов ${orders.length}`,
    );

    for (const order of orders) {
      if (!order.paymentOrderId || !order.paymentOrderNumber) continue;

      try {
        const gatewayStatus = await this.alfaBankService.getOrderStatus(
          order.paymentOrderId,
          order.paymentOrderNumber,
        );

        if (isPaidOrderStatus(gatewayStatus.orderStatus)) {
          this.assertAmountMatches(order, gatewayStatus.amount, 'cron sync');
          await this.applyPaymentStatus(order.id, 'PAID', 'cron sync');
          continue;
        }

        // Платёжная сессия истекла, а оплаты так и не было — закрываем заказ
        if (now > order.createdAt.getTime() + PAYMENT_SESSION_TTL_MS) {
          await this.applyPaymentStatus(
            order.id,
            'CANCELLED',
            'cron sync (session expired)',
          );
        }
      } catch (err) {
        this.logger.warn(
          `cron sync: не удалось проверить заказ ${order.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  // ─── Работа с платёжным шлюзом ──────────────────────────────────────────────

  /**
   * Регистрирует платёж в шлюзе Альфа-Банка и сохраняет его реквизиты на заказе.
   * Возвращает formUrl — адрес платёжной страницы для редиректа покупателя.
   */
  private async registerGatewayPayment(
    order: { id: string; orderCode: number; totalAmount: number },
    email: string,
  ): Promise<string> {
    const clientUrl = this.configService.getOrThrow<string>('ALLOWED_ORIGIN');
    const currency = this.configService.get<string>('ALFA_CURRENCY') ?? '933';

    // orderNumber уникален для каждой попытки оплаты: повторная регистрация
    // того же номера шлюзом отклоняется
    const orderNumber = randomUUID();

    const result = await this.alfaBankService.registerOrder({
      orderNumber,
      amount: toCents(order.totalAmount),
      returnUrl: `${clientUrl}/orders/${order.id}/success`,
      failUrl: `${clientUrl}/orders/${order.id}/fail`,
      description: `Corax order ${order.orderCode}`,
      currency,
      email,
      language: 'ru',
    });

    await this.prismaService.order.update({
      where: { id: order.id },
      data: {
        paymentOrderId: result.orderId,
        paymentOrderNumber: orderNumber,
      },
    });

    return result.formUrl;
  }

  /**
   * Идемпотентно применяет статус оплаты к заказу.
   *
   * Переход разрешён только из PENDING, поэтому повторные callback-уведомления
   * и параллельная cron-синхронизация не приводят к двойному письму и учёту продаж.
   */
  private async applyPaymentStatus(
    orderId: string,
    targetStatus: 'PAID' | 'CANCELLED',
    source: string,
  ) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });

    if (!order) {
      this.logger.warn(`applyPaymentStatus: заказ ${orderId} не найден`);
      return;
    }

    if (order.status === targetStatus) return;

    if (order.status !== 'PENDING') {
      this.logger.warn(
        `Заказ ${order.id}: переход ${order.status} → ${targetStatus} (${source}) пропущен`,
      );
      return;
    }

    await this.prismaService.order.update({
      where: { id: order.id },
      data: { status: targetStatus },
    });

    this.logger.log(
      `Заказ ${order.id}: ${order.status} → ${targetStatus} (${source})`,
    );

    // После успешной оплаты отправляем подтверждение заказа и учитываем продажу
    if (targetStatus === 'PAID') {
      this.sendOrderConfirmEmail(order.user, order).catch((err) =>
        this.logger.error(
          `Не удалось отправить письмо после оплаты заказа ${order.id}: ${err.message}`,
        ),
      );
      this.recordProductSales(order);
    }
  }

  /** Сумма в заказе и в шлюзе должны совпадать — расхождение всегда подозрительно. */
  private assertAmountMatches(
    order: { id: string; totalAmount: number },
    gatewayAmount: number,
    source: string,
  ) {
    const expected = toCents(order.totalAmount);
    if (expected !== gatewayAmount) {
      this.logger.error(
        `Заказ ${order.id} (${source}): сумма в шлюзе ${gatewayAmount} не совпадает с ожидаемой ${expected}`,
      );
    }
  }

  /**
   * Отправляет письмо с подтверждением заказа пользователю.
   */
  private async sendOrderConfirmEmail(
    user: { email: string; displayName: string },
    order: OrderWithItems,
  ) {
    await this.mailService.sendMail(
      user.email,
      `Заказ №${order.orderCode} принят`,
      React.createElement(OrderConfirmTemplate, {
        email: user.email,
        name: user.displayName,
        orderCode: order.orderCode,
        deliveryType: order.deliveryType as DeliveryType,
        address: order.address,
        items: order.items.map((item) => ({
          productName: item.productName,
          taste: item.taste,
          size: item.size,
          quantity: item.quantity,
        })),
      }),
    );
  }

  /**
   * Учитывает продажи товаров в метриках Prometheus (текущий месяц).
   * Записывает название товара и купленные опции (вкус/размер).
   * Вызывается при подтверждении заказа: сразу для CASH/CARD, по webhook для ONLINE.
   */
  private recordProductSales(order: OrderWithItems) {
    for (const item of order.items) {
      this.metricsService.incrementProductSale(
        item.productName,
        item.taste,
        item.size,
        item.quantity,
      );
      void this.topService.incrementSales(item.productId, item.quantity);
    }
  }

  /**
   * Генерирует уникальный 6-значный числовой код заказа (100000–999999).
   * В случае коллизии повторяет попытку (практически невозможно при < 100k заказов).
   */
  private async generateUniqueOrderCode(): Promise<number> {
    const MAX_ATTEMPTS = 10;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const code = Math.floor(100000 + Math.random() * 900000);
      const exists = await this.prismaService.order.findUnique({
        where: { orderCode: code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    throw new Error('Не удалось сгенерировать уникальный код заказа');
  }
}

/** Округление до копеек, чтобы избежать накопления float-погрешности. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Сумма в минимальных единицах валюты (копейках) — формат параметра amount. */
function toCents(value: number): number {
  return Math.round(value * 100);
}

/**
 * Заказ считается оплаченным только при orderStatus 1 (авторизован)
 * или 2 (авторизован и завершён) — по документации платёжного шлюза.
 */
function isPaidOrderStatus(orderStatus: number): boolean {
  return orderStatus === 1 || orderStatus === 2;
}

/** Приводит параметры уведомления (query string или form-urlencoded) к строкам. */
function toStringParams(raw: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') result[key] = value;
    else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * Минимальная форма заказа с позициями, нужная для письма и метрик продаж.
 * В рантайме Prisma возвращает позиции через include, но на уровне типов
 * order.create не выводит relations при include из getOrderInclude() —
 * поэтому в местах вызова используется приведение к этому типу.
 */
type OrderWithItems = {
  id: string;
  orderCode: number;
  deliveryType: string;
  address: string | null;
  items: {
    id: string;
    productId: string;
    productName: string;
    taste: string;
    size: string;
    quantity: number;
  }[];
};
