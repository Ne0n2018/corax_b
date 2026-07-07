import {
  IsBooleanString,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DiscountMethod, PromotionType } from '../../generated/prisma/enums';

export class PromotionCreateDto {
  @IsString({ message: 'Название акции должно быть строкой' })
  @IsNotEmpty({ message: 'Название акции не должно быть пустым' })
  @ApiProperty({ type: String, description: 'Название акции', example: 'Скидка на первый заказ' })
  name: string;

  @IsString({ message: 'Описание акции должно быть строкой' })
  @IsNotEmpty({ message: 'Описание акции не должно быть пустым' })
  @ApiProperty({ type: String, description: 'Описание акции' })
  description: string;

  @IsEnum(PromotionType, { message: 'Укажите тип акции: FIRST_ORDER, BUY_X_GET_Y, POPULAR' })
  @IsNotEmpty()
  @ApiProperty({
    enum: PromotionType,
    description:
      'Логика акции: FIRST_ORDER — скидка на первый заказ, BUY_X_GET_Y — «1+1=3», POPULAR — скидка на топ-N самых покупаемых товаров',
    example: PromotionType.FIRST_ORDER,
  })
  type: PromotionType;

  @IsEnum(DiscountMethod, { message: 'Укажите метод скидки: PERCENT или FIXED' })
  @IsNotEmpty()
  @ApiProperty({
    enum: DiscountMethod,
    description: 'Метод расчёта скидки: PERCENT — проценты (0–100), FIXED — фиксированная сумма BYN',
    example: DiscountMethod.PERCENT,
  })
  discountMethod: DiscountMethod;

  @IsNumber({}, { message: 'Значение скидки должно быть числом' })
  @Type(() => Number)
  @Min(0, { message: 'Значение скидки не может быть отрицательным' })
  @IsNotEmpty()
  @ApiProperty({
    type: Number,
    description: 'Значение скидки: для PERCENT — 0–100, для FIXED — сумма в BYN',
    example: 10,
  })
  discountValue: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'buyQuantity должно быть целым числом' })
  @Min(1, { message: 'buyQuantity должно быть не меньше 1' })
  @ApiProperty({
    type: Number,
    required: false,
    description: 'BUY_X_GET_Y: сколько купить (X). Обязательно для типа BUY_X_GET_Y',
    example: 2,
  })
  buyQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'getQuantity должно быть целым числом' })
  @Min(1, { message: 'getQuantity должно быть не меньше 1' })
  @ApiProperty({
    type: Number,
    required: false,
    description: 'BUY_X_GET_Y: сколько получить бесплатно (Y). Обязательно для типа BUY_X_GET_Y',
    example: 1,
  })
  getQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'popularTopN должно быть целым числом' })
  @Min(1, { message: 'popularTopN должно быть не меньше 1' })
  @ApiProperty({
    type: Number,
    required: false,
    description: 'POPULAR: топ-N самых покупаемых товаров, на которые действует скидка. Обязательно для типа POPULAR',
    example: 5,
  })
  popularTopN?: number;

  @IsOptional()
  @IsBooleanString({ message: 'active должно быть "true" или "false"' })
  @ApiProperty({ type: String, required: false, description: 'Активна ли акция ("true"/"false"), по умолчанию true' })
  active?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'expiresAt должно быть датой' })
  @ApiProperty({
    type: Date,
    required: false,
    description: 'Дата истечения акции. null = бессрочно. Датой начала считается createdAt',
    example: '2026-12-31T23:59:59.000Z',
  })
  expiresAt?: Date;
}