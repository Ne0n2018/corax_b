import {
  IsBooleanString,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PromotionUpdateDto {
  @IsOptional()
  @IsString({ message: 'Название акции должно быть строкой' })
  @IsNotEmpty({ message: 'Название акции не должно быть пустым' })
  @ApiProperty({ type: String, required: false, description: 'Название акции' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Описание акции должно быть строкой' })
  @IsNotEmpty({ message: 'Описание акции не должно быть пустым' })
  @ApiProperty({ type: String, required: false, description: 'Описание акции' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Значение скидки должно быть числом' })
  @Type(() => Number)
  @Min(0, { message: 'Значение скидки не может быть отрицательным' })
  @ApiProperty({ type: Number, required: false, description: 'Значение скидки' })
  discountValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'buyQuantity должно быть целым числом' })
  @Min(1, { message: 'buyQuantity должно быть не меньше 1' })
  @ApiProperty({ type: Number, required: false, description: 'BUY_X_GET_Y: сколько купить (X)' })
  buyQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'getQuantity должно быть целым числом' })
  @Min(1, { message: 'getQuantity должно быть не меньше 1' })
  @ApiProperty({ type: Number, required: false, description: 'BUY_X_GET_Y: сколько получить бесплатно (Y)' })
  getQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'popularTopN должно быть целым числом' })
  @Min(1, { message: 'popularTopN должно быть не меньше 1' })
  @ApiProperty({ type: Number, required: false, description: 'POPULAR: топ-N самых покупаемых товаров' })
  popularTopN?: number;

  @IsOptional()
  @IsBooleanString({ message: 'active должно быть "true" или "false"' })
  @ApiProperty({ type: String, required: false, description: 'Активна ли акция ("true"/"false")' })
  active?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'expiresAt должно быть датой' })
  @ApiProperty({ type: Date, required: false, description: 'Дата истечения акции' })
  expiresAt?: Date;

  // type неизменяем после создания — в update не передаётся.
}