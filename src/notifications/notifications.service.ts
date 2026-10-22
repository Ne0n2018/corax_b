import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Subscription } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '../generated/prisma/enums';
import type { Prisma } from '../generated/prisma/client';

import {
  NotificationsGateway,
  NotificationSocketPayload,
} from './notifications.gateway';
import { NotificationBus } from './notifications.bus';
import { CreateNotificationDto } from './dto/create.notification.dto';
import {
  NotificationEvent,
  NotificationVars,
} from './events/notification-events';
import { renderNotification } from './templates/notification.templates';

/** Категория уведомления для каждого события-шаблона. */
const EVENT_TYPE_MAP: Record<NotificationEvent, NotificationType> = {
  [NotificationEvent.DISCOUNT_LINE]: NotificationType.DISCOUNT,
  [NotificationEvent.DISCOUNT_PRODUCT]: NotificationType.DISCOUNT,
  [NotificationEvent.DISCOUNT_CATEGORY]: NotificationType.DISCOUNT,
  [NotificationEvent.PROMO_GIFT]: NotificationType.PROMO,
  [NotificationEvent.PROMO_BUNDLE]: NotificationType.PROMO,
  [NotificationEvent.PROMO_EXPIRING]: NotificationType.PROMO,
  [NotificationEvent.PERSONAL_REMINDER]: NotificationType.PROMO,
  [NotificationEvent.WELCOME]: NotificationType.PROMO,
  [NotificationEvent.WELCOME_BACK]: NotificationType.PROMO,
  [NotificationEvent.BIRTHDAY]: NotificationType.PROMO,
  [NotificationEvent.ACCOUNT_BLOCKED]: NotificationType.ACCOUNT,
};

/** Поля уведомления, безопасные для отдачи клиенту. */
const NOTIFICATION_SELECT = {
  id: true,
  message: true,
  type: true,
  event: true,
  meta: true,
  read: true,
  createdAt: true,
} as const;

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private subscription?: Subscription;

  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
    private notificationBus: NotificationBus,
  ) {}

  /**
   * Подписываемся на внутреннюю шину: все действия, опубликованные
   * другими сервисами, превращаются в уведомления и рассылаются.
   */
  public onModuleInit(): void {
    this.subscription = this.notificationBus.events$.subscribe(
      ({ event, action }) => {
        void this.dispatch(event, action.vars, action.userId, action.meta);
      },
    );
  }

  public onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  // ─── Публичное API рассылки ────────────────────────────────────────────────

  /** Рассылает событие всем пользователям (сохраняет в БД и шлёт по WS). */
  public async broadcast(
    event: NotificationEvent,
    vars: NotificationVars = {},
    meta: Record<string, unknown> = {},
  ): Promise<NotificationSocketPayload> {
    return this.dispatch(event, vars, undefined, meta);
  }

  /** Отправляет событие конкретному пользователю. */
  public async notifyUser(
    userId: string,
    event: NotificationEvent,
    vars: NotificationVars = {},
    meta: Record<string, unknown> = {},
  ): Promise<NotificationSocketPayload> {
    return this.dispatch(event, vars, userId, meta);
  }

  /**
   * Собирает текст по шаблону события, сохраняет уведомление в БД
   * и отправляет его по WebSocket.
   *
   * - с `userId` — одно персональное уведомление;
   * - без `userId` — рассылка всем активным пользователям.
   */
  private async dispatch(
    event: NotificationEvent,
    vars: NotificationVars = {},
    userId?: string,
    meta: Record<string, unknown> = {},
  ): Promise<NotificationSocketPayload> {
    const message = renderNotification(event, vars);
    const type = EVENT_TYPE_MAP[event] ?? NotificationType.PROMO;
    const metaJson = (meta ?? {}) as Prisma.InputJsonValue;

    if (userId) {
      const notification = await this.prisma.notification.create({
        data: { userId, message, type, event, meta: metaJson, read: false },
        select: NOTIFICATION_SELECT,
      });

      const payload = this.toPayload(notification);
      this.notificationsGateway.sendToUser(userId, payload);
      this.logger.debug(
        `Уведомление ${event} отправлено пользователю ${userId}`,
      );

      return payload;
    }

    const savedCount = await this.persistForAllUsers(
      event,
      message,
      type,
      metaJson,
    );

    const payload: NotificationSocketPayload = {
      id: null,
      event,
      message,
      type,
      read: false,
      meta: meta ?? {},
      createdAt: new Date().toISOString(),
    };

    this.notificationsGateway.broadcast(payload);
    this.logger.debug(
      `Уведомление ${event} разослано всем (сохранено записей: ${savedCount})`,
    );

    return payload;
  }

  /** Сохраняет общее уведомление каждому активному пользователю. */
  private async persistForAllUsers(
    event: NotificationEvent,
    message: string,
    type: NotificationType,
    meta: Prisma.InputJsonValue,
  ): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    if (users.length === 0) return 0;

    const result = await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        message,
        type,
        event,
        meta,
        read: false,
      })),
    });

    return result.count;
  }

  // ─── Персональные уведомления с сохранением в БД ───────────────────────────

  /** Создаёт произвольное уведомление (не по шаблону) конкретному пользователю. */
  async sendToUser(userId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        message: dto.message,
        type: dto.type,
        read: false,
      },
      select: NOTIFICATION_SELECT,
    });

    const payload = this.toPayload(notification);
    this.notificationsGateway.sendToUser(userId, payload);

    return payload;
  }

  /** Список уведомлений пользователя (без удалённых, новые сверху). */
  async getUserNotifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: NOTIFICATION_SELECT,
    });
  }

  /** Количество непрочитанных уведомлений (для бейджа). */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false, deletedAt: null },
    });

    return { count };
  }

  /** Отмечает одно уведомление прочитанным. */
  async markAsRead(notificationId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, deletedAt: null },
      data: { read: true },
    });

    if (result.count === 0) {
      throw new NotFoundException('Уведомление не найдено');
    }

    return { message: 'Уведомление прочитано', id: notificationId };
  }

  /** Отмечает прочитанными все уведомления пользователя. */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false, deletedAt: null },
      data: { read: true },
    });

    return { message: 'Все уведомления прочитаны', updated: result.count };
  }

  /** Мягко удаляет одно уведомление. */
  async deleteNotification(notificationId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException('Уведомление не найдено');
    }

    return { message: 'Уведомление удалено', id: notificationId };
  }

  /** Мягко удаляет все уведомления пользователя. */
  async deleteAllNotifications(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return { message: 'Уведомления удалены', deleted: result.count };
  }

  // ─── Утилиты ───────────────────────────────────────────────────────────────

  /** Приводит запись из БД к формату WebSocket-сообщения. */
  private toPayload(notification: {
    id: string;
    message: string;
    type: string;
    event: string | null;
    meta: unknown;
    read: boolean;
    createdAt: Date;
  }): NotificationSocketPayload {
    return {
      id: notification.id,
      event: notification.event ?? '',
      message: notification.message,
      type: notification.type,
      read: notification.read,
      meta: (notification.meta as Record<string, unknown>) ?? {},
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
