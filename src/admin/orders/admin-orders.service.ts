import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../libs/mail/mail.service';
import type { AdminOrderStatus } from './dto/update-order-status.dto';
import type { OrdersFilterDto } from './dto/orders-filter.dto';
import * as React from 'react';
import OrderStatusTemplate, {
  DeliveryType,
  OrderStatus,
  getStatusSubject,
  NOTIFIABLE_STATUSES,
} from '../../libs/mail/templates/order.status.template';

@Injectable()
export class AdminOrdersService {
  private readonly logger = new Logger(AdminOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Получить все заказы с пагинацией и фильтрацией.
   * Поиск работает по UUID заказа, UUID пользователя и числовому orderCode.
   */
  async getAllOrders(filter: OrdersFilterDto) {
    const { page = 1, limit = 20, status, search } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where['status'] = status;
    }

    if (search?.trim()) {
      const searchNum = parseInt(search.trim(), 10);
      where['OR'] = [
        { id: { contains: search.trim(), mode: 'insensitive' } },
        { userId: { contains: search.trim(), mode: 'insensitive' } },
        ...(Number.isFinite(searchNum) ? [{ orderCode: searchNum }] : []),
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Получить один заказ по ID.
   */
  async getOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException(`Заказ с ID ${orderId} не найден`);

    return order;
  }

  /**
   * Обновить статус заказа.
   * Email-уведомление отправляется только для статусов: SHIPPED, DELIVERED, CANCELLED.
   */
  async updateOrderStatus(orderId: string, status: AdminOrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: true },
    });

    if (!order) throw new NotFoundException(`Заказ с ID ${orderId} не найден`);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: true },
    });

    if (NOTIFIABLE_STATUSES.includes(status as unknown as OrderStatus)) {
      this.sendStatusNotification(updated, order.user).catch((err) =>
        this.logger.error(
          `Не удалось отправить уведомление для заказа ${orderId}: ${err.message}`,
        ),
      );
    }

    return updated;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private async sendStatusNotification(
    order: { orderCode: number; status: string; deliveryType: string; address: string | null; items: { productName: string; taste: string; size: string; quantity: number }[] },
    user: { email: string; displayName: string },
  ) {
    const deliveryType = order.deliveryType as unknown as DeliveryType;
    const orderStatus  = order.status      as unknown as OrderStatus;

    await this.mailService.sendMail(
      user.email,
      getStatusSubject(orderStatus, deliveryType),
      React.createElement(OrderStatusTemplate, {
        email:        user.email,
        name:         user.displayName,
        orderCode:    order.orderCode,
        status:       orderStatus,
        deliveryType,
        address:      order.address,
        items:        order.items.map((i) => ({
          productName: i.productName,
          taste:       i.taste,
          size:        i.size,
          quantity:    i.quantity,
        })),
      }),
    );

    this.logger.log(
      `Status notification sent → ${user.email} [order ${order.orderCode}, status ${order.status}]`,
    );
  }
}
