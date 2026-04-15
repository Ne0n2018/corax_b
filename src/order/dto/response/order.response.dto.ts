import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

class OrderItemResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String, description: 'Название товара на момент заказа' })
  productName: string;

  @ApiProperty({ type: String })
  imageUrl: string;

  @ApiProperty({ type: String })
  taste: string;

  @ApiProperty({ type: String })
  size: string;

  @ApiProperty({ type: Number, description: 'Цена на момент заказа' })
  price: number;

  @ApiProperty({ type: Number })
  quantity: number;

  @Exclude()
  orderId: string;

  @Exclude()
  productItemId: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}

export class OrderResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: Number, description: '6-значный код заказа для быстрого поиска' })
  orderCode: number;

  @ApiProperty({ enum: ['PICKUP', 'DELIVERY', 'BELMAIL', 'EUROMAIL'] })
  deliveryType: string;

  @ApiProperty({ type: String, nullable: true })
  address: string | null;

  @ApiProperty({ enum: ['ONLINE', 'CASH', 'CARD'] })
  paymentType: string;

  @ApiProperty({ enum: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] })
  status: string;

  @ApiProperty({ type: Number })
  totalAmount: number;

  @Exclude()
  userId: string;

  @Exclude()
  bepaidToken: string | null;

  @Exclude()
  bepaidUid: string | null;

  @Exclude()
  updatedAt: Date;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: () => [OrderItemResponseDto] })
  @Type(() => OrderItemResponseDto)
  items: OrderItemResponseDto[];
}

/** Ответ при создании заказа с онлайн-оплатой */
export class CreateOrderResponseDto {
  @ApiProperty({ type: () => OrderResponseDto })
  @Type(() => OrderResponseDto)
  order: OrderResponseDto;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL страницы оплаты bePaid (только для paymentType = ONLINE)',
  })
  redirectUrl: string | null;
}
