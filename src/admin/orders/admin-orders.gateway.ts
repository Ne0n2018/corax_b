import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersFilterDto } from './dto/orders-filter.dto';
import { UserService } from '../../user/user.service';
import { UserRole } from '../../generated/prisma/enums';
import { SESSION_MIDDLEWARE } from '../../session/session.provider';
import type { RequestHandler } from 'express';

/**
 * WebSocket-шлюз для управления заказами в панели администратора.
 *
 * Namespace: /admin/orders
 * Все события требуют авторизованного пользователя с ролью ADMIN.
 *
 * Клиент → Сервер:
 *   orders:getAll          { page?, limit?, status?, search? }
 *   orders:getById         { orderId: string }
 *   orders:updateStatus    { orderId: string, status: OrderStatus }
 *
 * Сервер → Клиент:
 *   orders:list            { orders[], meta }         — ответ на getAll
 *   orders:detail          order                      — ответ на getById
 *   orders:statusUpdated   order                      — broadcast всем ADMIN-сокетам
 *   orders:error           { message: string }        — ошибка операции
 */
@WebSocketGateway({
  namespace: '/admin/orders',
  transports: ['websocket'],
  cors: {
    origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class AdminOrdersGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(AdminOrdersGateway.name);

  constructor(
    private readonly ordersService: AdminOrdersService,
    private readonly userService: UserService,
    @Inject(SESSION_MIDDLEWARE)
    private readonly sessionMiddleware: RequestHandler,
  ) {}

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      await this.authenticate(client);
      this.logger.log(`Admin connected: ${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Admin disconnected: ${client.id}`);
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  @SubscribeMessage('orders:getAll')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
    }),
  )
  async handleGetAll(
    @ConnectedSocket() client: Socket,
    @MessageBody() filter: OrdersFilterDto,
  ) {
    try {
      const result = await this.ordersService.getAllOrders(filter ?? {});
      client.emit('orders:list', result);
    } catch (err) {
      client.emit('orders:error', { message: this.extractMessage(err) });
    }
  }

  @SubscribeMessage('orders:getById')
  async handleGetById(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId: string },
  ) {
    try {
      const order = await this.ordersService.getOrderById(body.orderId);
      client.emit('orders:detail', order);
    } catch (err) {
      client.emit('orders:error', { message: this.extractMessage(err) });
    }
  }

  @SubscribeMessage('orders:updateStatus')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  )
  async handleUpdateStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UpdateOrderStatusDto,
  ) {
    try {
      const updated = await this.ordersService.updateOrderStatus(
        dto.orderId,
        dto.status,
      );

      this.logger.log(
        `Order ${updated.id} status → ${updated.status} (by admin socket ${client.id})`,
      );

      // Рассылаем обновление всем подключённым администраторам
      this.server.emit('orders:statusUpdated', updated);
    } catch (err) {
      client.emit('orders:error', { message: this.extractMessage(err) });
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Запускает express-session middleware на WS-запросе, затем
   * проверяет userId и роль. Если проверка не пройдена — бросает WsException.
   */
  private async authenticate(client: Socket): Promise<void> {
    // Прогоняем session middleware вручную: после этого client.request.session
    // будет заполнен точно так же, как в обычном HTTP-запросе
    await new Promise<void>((resolve, reject) =>
      this.sessionMiddleware(
        client.request as Parameters<RequestHandler>[0],
        {} as Parameters<RequestHandler>[1],
        (err?: unknown) => (err ? reject(err) : resolve()),
      ),
    );

    const req = client.request as unknown as Record<string, unknown>;
    const session = req['session'] as Record<string, unknown> | undefined;
    const userId = session?.['userId'] as string | undefined;

    this.logger.log(
      `WS auth: session=${JSON.stringify(session)}, userId=${userId}`,
    );

    if (!userId) {
      this.logger.warn(`WS auth failed (no session): ${client.id}`);
      throw new WsException('Unauthorized');
    }

    const user = await this.userService.findById(userId);

    if (user.role !== UserRole.ADMIN) {
      this.logger.warn(
        `WS auth failed (not admin): userId=${userId} socket=${client.id}`,
      );
      throw new WsException('Forbidden');
    }
  }

  private extractMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return 'Внутренняя ошибка сервера';
  }
}
