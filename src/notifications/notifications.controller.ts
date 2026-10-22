import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Authorization } from '../auth/decorators/auth.decorator';
import { UserRole } from '../generated/prisma/enums';
import type { User } from '../generated/prisma/client';
import { NotificationsService } from './notifications.service';
import { BroadcastNotificationDto } from './dto/broadcast.notification.dto';
import { NotificationFilterDto } from './dto/notification.filter.dto';

/** Запрос с уже загруженным AuthGuard пользователем. */
type AuthorizedRequest = Request & { user?: User };

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /* ==================== СПИСОК И СЧЁТЧИК ==================== */

  @Get()
  @Authorization()
  @ApiOperation({ summary: 'Получить уведомления текущего пользователя' })
  @ApiQuery({
    name: 'unread',
    required: false,
    type: Boolean,
    description: 'Только непрочитанные',
  })
  public async getMyNotifications(
    @Req() req: AuthorizedRequest,
    @Query() filter: NotificationFilterDto,
  ) {
    return this.notificationsService.getUserNotifications(
      req.user.id,
      filter.unread === true,
    );
  }

  @Get('unread-count')
  @Authorization()
  @ApiOperation({
    summary: 'Количество непрочитанных уведомлений (для бейджа)',
  })
  public async getUnreadCount(@Req() req: AuthorizedRequest) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  /* ==================== ПРОЧИТАНО ==================== */

  @Patch('read-all')
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отметить прочитанными все уведомления' })
  public async markAllAsRead(@Req() req: AuthorizedRequest) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отметить уведомление прочитанным' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID уведомления',
  })
  public async markAsRead(
    @Req() req: AuthorizedRequest,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  /* ==================== УДАЛЕНИЕ ==================== */

  @Delete()
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить все уведомления пользователя' })
  public async deleteAll(@Req() req: AuthorizedRequest) {
    return this.notificationsService.deleteAllNotifications(req.user.id);
  }

  @Delete(':id')
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить уведомление' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'ID уведомления',
  })
  public async deleteOne(
    @Req() req: AuthorizedRequest,
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteNotification(id, req.user.id);
  }

  /* ==================== РАССЫЛКА (ADMIN) ==================== */

  @Post('broadcast')
  @Authorization(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Разослать уведомление всем пользователям (только ADMIN)',
  })
  public async broadcast(@Body() dto: BroadcastNotificationDto) {
    const payload = await this.notificationsService.broadcast(
      dto.event,
      dto.vars,
      dto.meta,
    );

    return { message: 'Уведомление отправлено', payload };
  }
}
