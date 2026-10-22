import { Inject, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import type { RequestHandler } from 'express';
import { SESSION_MIDDLEWARE } from '../session/session.provider';
import { REDIS_CLIENT } from '../session/redis.provider';

/** Сообщение, которое уходит клиенту по WebSocket. */
export interface NotificationSocketPayload {
  /**
   * id записи в БД. `null` у общего (broadcast) уведомления:
   * его id можно узнать через `GET /notifications`.
   */
  id: string | null;
  /** Тип события (см. NotificationEvent). */
  event: string;
  /** Готовый текст уведомления с подставленными значениями. */
  message: string;
  /** Категория уведомления. */
  type: string;
  /** Прочитано ли уведомление. */
  read: boolean;
  /** Дополнительные данные события. */
  meta: Record<string, unknown>;
  /** Время формирования уведомления (ISO). */
  createdAt: string;
}

/**
 * WebSocket-шлюз уведомлений.
 *
 * Namespace: / (по умолчанию)
 *
 * Подключение возможно только с активной сессией (cookie `SESSION_NAME`),
 * поэтому клиент обязан подключаться с `withCredentials: true`.
 * После подключения сокет автоматически попадает в комнату `user-<userId>`
 * и получает как персональные, так и общие уведомления.
 *
 * Сервер → Клиент:
 *   notification  BroadcastNotification | StoredNotification
 */
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(SESSION_MIDDLEWARE)
    private readonly sessionMiddleware: RequestHandler,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  public async handleConnection(client: Socket): Promise<void> {
    try {
      const userId = await this.authenticate(client);

      // Автоматически подписываем сокет на персональную комнату пользователя
      client.data.userId = userId;
      await client.join(`user-${userId}`);

      this.logger.debug(
        `Клиент ${client.id} подключён (пользователь ${userId})`,
      );
    } catch (error) {
      this.logger.warn(
        `Отклонено подключение ${client.id}: ${(error as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  public handleDisconnect(client: Socket): void {
    this.logger.debug(`Клиент отключился: ${client.id}`);
  }

  /** Рассылает уведомление всем подключённым клиентам. */
  public broadcast(payload: NotificationSocketPayload): void {
    if (!this.server) return;
    this.server.emit('notification', payload);
  }

  /** Отправляет уведомление конкретному пользователю. */
  public sendToUser(userId: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(`user-${userId}`).emit('notification', payload);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Прогоняет express-session middleware на WS-запросе, затем проверяет
   * наличие userId и отсутствие блокировки. Возвращает id пользователя.
   */
  private async authenticate(client: Socket): Promise<string> {
    await new Promise<void>((resolve, reject) =>
      this.sessionMiddleware(
        client.request as Parameters<RequestHandler>[0],
        {} as Parameters<RequestHandler>[1],
        (err?: unknown) =>
          err
            ? reject(
                err instanceof Error
                  ? err
                  : new Error('Session middleware error'),
              )
            : resolve(),
      ),
    );

    const request = client.request as unknown as Record<string, unknown>;
    const session = request['session'] as Record<string, unknown> | undefined;
    const userId = session?.['userId'] as string | undefined;

    if (!userId) {
      throw new Error('Сессия не найдена — пользователь не авторизован');
    }

    const isBlocked = await this.redisClient.exists(`blocked_user:${userId}`);
    if (isBlocked) {
      throw new Error('Учётная запись заблокирована');
    }

    return userId;
  }
}
