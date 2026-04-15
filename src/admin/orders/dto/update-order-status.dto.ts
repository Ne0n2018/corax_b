import { IsEnum, IsString } from 'class-validator';

export enum AdminOrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class UpdateOrderStatusDto {
  @IsString()
  orderId: string;

  @IsEnum(AdminOrderStatus, {
    message: `Статус должен быть одним из: ${Object.values(AdminOrderStatus).join(', ')}`,
  })
  status: AdminOrderStatus;
}
