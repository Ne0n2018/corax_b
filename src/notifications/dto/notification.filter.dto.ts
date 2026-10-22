import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class NotificationFilterDto {
  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    description: 'Вернуть только непрочитанные уведомления',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unread?: boolean;
}
