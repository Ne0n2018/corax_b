import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminOrderStatus } from './update-order-status.dto';

export class OrdersFilterDto {
  /** Номер страницы (по умолчанию 1) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** Записей на странице (по умолчанию 20) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  /** Фильтр по статусу */
  @IsOptional()
  @IsEnum(AdminOrderStatus)
  status?: AdminOrderStatus;

  /** Поиск по ID заказа или ID пользователя (подстрока) */
  @IsOptional()
  @IsString()
  search?: string;
}
