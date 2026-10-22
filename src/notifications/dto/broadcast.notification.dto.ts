import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { NotificationEvent } from '../events/notification-events';
import type { NotificationVars } from '../events/notification-events';

export class BroadcastNotificationDto {
  @ApiProperty({
    enum: NotificationEvent,
    example: NotificationEvent.DISCOUNT_CATEGORY,
    description: 'Тип события — определяет текст уведомления',
  })
  @IsEnum(NotificationEvent)
  event: NotificationEvent;

  @ApiPropertyOptional({
    type: Object,
    example: {
      discount: '15%',
      category: 'аминокислоты и BCAA',
      until: 'конца недели',
    },
    description: 'Динамические значения для подстановки в шаблон',
  })
  @IsOptional()
  @IsObject()
  vars?: NotificationVars;

  @ApiPropertyOptional({
    type: Object,
    example: { promotionId: 'uuid' },
    description: 'Дополнительные данные, которые уйдут клиенту как есть',
  })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
