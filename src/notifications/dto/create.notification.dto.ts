import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../generated/prisma/enums';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Заказ оформлен' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Ваш заказ #123 успешно оформлен' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: 'ORDER_CREATED' })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;
}
