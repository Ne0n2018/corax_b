import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { UserService } from '../user/user.service';
import { BePaidService } from './bepaid/bepaid.service';
import { MailService } from '../libs/mail/mail.service';
import { MetricsService } from '../metrics/metrics.service';
import { PromoCodeService } from './promo/promo-code.service';
import { CreateOrderDto, DeliveryType, PaymentType } from './dto/create-order.dto';
import type { BePaidWebhookDto } from './dto/bepaid-webhook.dto';
import * as React from 'react';
import OrderConfirmTemplate from '../libs/mail/templates/order.confirm.template';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly cartService: CartService,
    private readonly userService: UserService,
    private readonly bepaidService: BePaidService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly promoCodeService: PromoCodeService,
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
   * Возвращает заказ и URL оплаты (только для ONLINE).
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    const { deliveryType, address, paymentType, promoCode } = dto;

    // 1. Проверка: при доставке адрес обязателен
    if (deliveryType === DeliveryType.DELIVERY && !address?.trim()) {
      throw new BadRequestException(
        'Адрес доставки обязателен при выборе типа доставки',
      );
    }

    // 2. Получаем корзину
    const cart = await this.cartService.getCart(userId);

    if (!cart.CartItem || cart.CartItem.length === 0) {
      throw new BadRequestException(
        'Корзина пуста. Добавьте товары перед оформлением заказа.',
      );
    }

    // 3. Получаем данные пользователя (email для bePaid)
    const user = await this.userService.findById(userId);

    // 4. Генерируем уникальный 6-значный цифровой код заказа
    const orderCode = await this.generateUniqueOrderCode();

    // 5. Рассчитываем скидку по промокоду
    const subtotalAmount = cart.totalAmount;
    let discountAmount = 0;
    let appliedPromoCode = null;

    if (promoCode) {
      const productIds = cart.CartItem.map(item => item.productItem.product.id);
      const validation = await this.promoCodeService.validateAndCalculateDiscount(
        promoCode,
        subtotalAmount,
        productIds,
      );

      if (validation.isValid && validation.discountAmount) {
        discountAmount = validation.discountAmount;
        appliedPromoCode = promoCode.trim().toUpperCase();
      } else if (!validation.isValid) {
        throw new BadRequestException(validation.error || 'Ошибка применения промокода');
      }
    }

    const totalAmount = Math.max(0, subtotalAmount - discountAmount);

    // 6. Создаём заказ и его позиции в одной транзакции
    const order = await this.prismaService.order.create({
      data: {
        userId,
        orderCode,
        deliveryType,
        address: address?.trim() ?? null,
        paymentType,
        subtotalAmount,
        discountAmount,
        totalAmount,
        promoCode: appliedPromoCode,
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

    // 7. Фиксируем использование промокода
    if (appliedPromoCode) {
      await this.promoCodeService.recordPromoCodeUsage(appliedPromoCode);
    }

    // 8. Очищаем корзину
    await this.cartService.clearCart(userId);

    // 9. Для CASH/CARD — сразу отправляем подтверждение и учитываем продажу.
    //    Для ONLINE — письмо и метрика продаж уйдут после подтверждения оплаты через webhook.
    if (paymentType !== PaymentType.ONLINE) {
      this.sendOrderConfirmEmail(user, order).catch((err) =>
        this.logger.error(`Не удалось отправить письмо для заказа ${order.id}: ${err.message}`),
      );
      this.recordProductSales(order);
    }

    // 10. Для онлайн-оплаты — создаём платёжную сессию bePaid
    let redirectUrl: string | null = null;

    if (paymentType === PaymentType.ONLINE) {
      const checkout = await this.bepaidService.createCheckout(
        order.id,
        order.totalAmount,
        user.email,
        `Заказ #${order.id.slice(0, 8).toUpperCase()}`,
      );

      // Сохраняем токен bePaid в заказе
      await this.prismaService.order.update({
        where: { id: order.id },
        data: { bepaidToken: checkout.token },
      });

      redirectUrl = checkout.redirectUrl;
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
   * Получить новую ссылку для оплаты (если пользователь закрыл страницу bePaid).
   */
  async getPaymentUrl(userId: string, orderId: string) {
    const order = await this.getOrderById(userId, orderId);

    if (order.paymentType !== 'ONLINE') {
      throw new BadRequestException('Этот заказ не предполагает онлайн-оплату');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Заказ уже оплачен или отменён',
      );
    }

    const user = await this.userService.findById(userId);

    const checkout = await this.bepaidService.createCheckout(
      order.id,
      order.totalAmount,
      user.email,
      `Заказ #${order.id.slice(0, 8).toUpperCase()}`,
    );

    await this.prismaService.order.update({
      where: { id: order.id },
      data: { bepaidToken: checkout.token },
    });

    return { redirectUrl: checkout.redirectUrl };
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

    return this.prismaService.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
      include: this.getOrderInclude(),
    });
  }

  /**
   * Обработать webhook-уведомление от bePaid.
   * Публичный метод — без проверки авторизации.
   */
  async handleBePaidWebhook(body: Record<string, unknown>) {
    const { transaction } = body as unknown as BePaidWebhookDto;

    if (!transaction?.tracking_id) {
      this.logger.warn('bePaid webhook: missing tracking_id');
      return;
    }

    const order = await this.prismaService.order.findUnique({
      where: { id: transaction.tracking_id },
      include: { items: true, user: true },
    });

    if (!order) {
      this.logger.warn(
        `bePaid webhook: order not found [${transaction.tracking_id}]`,
      );
      return;
    }

    // Не обрабатываем тестовые транзакции в продакшене и наоборот
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    if (isProduction && transaction.test) {
      this.logger.warn('bePaid webhook: ignoring test transaction in production');
      return;
    }

    let newStatus = order.status;

    if (transaction.status === 'successful') {
      newStatus = 'PAID';
    } else if (
      transaction.status === 'failed' ||
      transaction.status === 'expired'
    ) {
      newStatus = 'CANCELLED';
    }

    if (newStatus !== order.status) {
      await this.prismaService.order.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          bepaidUid: transaction.uid,
        },
      });

      this.logger.log(
        `Order ${order.id}: ${order.status} → ${newStatus} (bePaid uid: ${transaction.uid})`,
      );

      // После успешной оплаты отправляем подтверждение заказа и учитываем продажу
      if (newStatus === 'PAID') {
        this.sendOrderConfirmEmail(order.user, order).catch((err) =>
          this.logger.error(
            `Не удалось отправить письмо после оплаты заказа ${order.id}: ${err.message}`,
          ),
        );
        this.recordProductSales(order);
      }
    }
  }

  /**
   * Отправляет письмо с подтверждением заказа пользователю.
   */
  private async sendOrderConfirmEmail(
    user: { email: string; displayName: string },
    order: { id: string; orderCode: number; deliveryType: string; address: string | null; items: { productName: string; taste: string; size: string; quantity: number }[] },
  ) {
    await this.mailService.sendMail(
      user.email,
      `Заказ №${order.orderCode} принят`,
      React.createElement(OrderConfirmTemplate, {
        email:        user.email,
        name:         user.displayName,
        orderCode:    order.orderCode,
        deliveryType: order.deliveryType as DeliveryType,
        address:      order.address,
        items:        order.items.map((item) => ({
          productName: item.productName,
          taste:       item.taste,
          size:        item.size,
          quantity:    item.quantity,
        })),
      }),
    );
  }

  /**
   * Учитывает продажи товаров в метриках Prometheus (текущий месяц).
   * Записывает название товара и купленные опции (вкус/размер).
   * Вызывается при подтверждении заказа: сразу для CASH/CARD, по webhook для ONLINE.
   */
  private recordProductSales(order: {
    items: { productName: string; taste: string; size: string; quantity: number }[];
  }) {
    for (const item of order.items) {
      this.metricsService.incrementProductSale(
        item.productName,
        item.taste,
        item.size,
        item.quantity,
      );
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
