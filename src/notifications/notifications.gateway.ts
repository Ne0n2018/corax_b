import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // В продакшене лучше указать конкретные домены
  },
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  // Отправить уведомление конкретному пользователю
  sendToUser(userId: string, notification: any) {
    this.server.to(`user-${userId}`).emit('notification', notification);
  }

  // Подключение пользователя
  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    client.join(`user-${userId}`);
    console.log(`User ${userId} joined notifications`);
  }
}
