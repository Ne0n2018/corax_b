import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationDto } from './dto/create.notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async sendToUser(userId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        message: dto.message,
        type: dto.type,
        read: false,
      },
      include: {
        user: true,
      },
    });

    // Отправляем через WebSocket в реальном времени
    this.notificationsGateway.sendToUser(userId, notification);

    return notification;
  }

  async getUserNotifications(userId: string, isRead?: boolean) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(isRead !== undefined && { read: isRead }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // можно добавить пагинацию позже
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }
}
