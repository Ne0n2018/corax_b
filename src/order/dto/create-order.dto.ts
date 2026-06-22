import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export enum DeliveryType {
  PICKUP   = 'PICKUP',
  DELIVERY = 'DELIVERY',
  BELMAIL  = 'BELMAIL',
  EUROMAIL = 'EUROMAIL',
}

export enum PaymentType {
  ONLINE = 'ONLINE',
  CASH   = 'CASH',
  CARD   = 'CARD',
}

/** Типы доставки, требующие указания адреса */
const ADDRESS_REQUIRED_TYPES: DeliveryType[] = [
  DeliveryType.DELIVERY,
  DeliveryType.BELMAIL,
  DeliveryType.EUROMAIL,
];

export class CreateOrderDto {
  @IsEnum(DeliveryType, {
    message: 'Укажите тип доставки: PICKUP, DELIVERY, BELMAIL или EUROMAIL',
  })
  @IsNotEmpty()
  @ApiProperty({
    enum: DeliveryType,
    description:
      'Тип доставки: самовывоз (PICKUP), курьер (DELIVERY), Белпочта (BELMAIL), Европочта (EUROMAIL)',
    example: DeliveryType.DELIVERY,
  })
  deliveryType: DeliveryType;

  @ValidateIf((o) => ADDRESS_REQUIRED_TYPES.includes(o.deliveryType))
  @IsString({ message: 'Адрес должен быть строкой' })
  @IsNotEmpty({ message: 'Адрес обязателен для выбранного типа доставки' })
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description:
      'Адрес получения (обязателен для DELIVERY, BELMAIL, EUROMAIL). Для PICKUP не указывается.',
    example: 'г. Минск, ул. Ленина, д. 1, кв. 10',
  })
  address?: string;

  @IsEnum(PaymentType, {
    message: 'Укажите тип оплаты: ONLINE, CASH или CARD',
  })
  @IsNotEmpty()
  @ApiProperty({
    enum: PaymentType,
    description:
      'Тип оплаты: онлайн через bePaid (ONLINE), наличные при получении (CASH), картой при получении (CARD)',
    example: PaymentType.ONLINE,
  })
  paymentType: PaymentType;
}
