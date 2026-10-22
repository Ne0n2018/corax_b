import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationBus } from './notifications.bus';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, NotificationBus],
  // ← Чтобы использовать в других модулях
  exports: [NotificationsService, NotificationBus],
})
export class NotificationsModule {}
