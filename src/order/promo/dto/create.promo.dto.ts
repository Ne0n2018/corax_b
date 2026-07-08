import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TypeDiscount {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
  BOGO = 'BOGO',
}

export class CreatePromoDto {
  @IsNotEmpty({ message: 'код не должен быть пустым' })
  @IsString({ message: 'код должен быть стракой' })
  @ApiProperty({
    description: 'код для применения скидки',
    example: 'FIRST DAY',
    required: true,
    type: 'string',
  })
  code: string;
  @IsOptional()
  @IsString({ message: 'описание кода должно быть стракой' })
  @ApiProperty({
    type: 'string',
    description: 'описание промокода',
    required: false,
    example: 'сам придумаешь мне лень',
  })
  description?: string;
  @IsNotEmpty({ message: 'тип не должен быть пустым' })
  @IsEnum(TypeDiscount, { message: 'тип должен быть енамом' })
  @ApiProperty({
    enum: TypeDiscount,
    enumName: 'тип скидокок',
    type: 'string',
    example: 'PERCENT',
    required: false,
    description: 'тип применямой скидки',
  })
  type: TypeDiscount;
  @IsNotEmpty({ message: 'значение не должно быть пустым' })
  @IsNumber({}, { message: 'значение должно быть числом' })
  @Min(5, { message: 'минимальное значение 5' })
  @ApiProperty({
    type: 'number',
    required: true,
    minimum: 5,
    example: '5',
    description: 'значение уменьшения стоимости',
  })
  value: number;
  @IsNotEmpty({ message: 'дата начала не должна быть пустой' })
  @IsDate({ message: 'дата начала должна быть датой' })
  @ApiProperty({
    type: Date,
    required: true,
    description: 'дата начала действия промокода ',
    example: '2026-12-30T23:59:59Z',
  })
  validFrom: Date;
  @IsNotEmpty({ message: 'дата окончания не должна быть пустой' })
  @IsDate({ message: 'дата окончания должна быть датой ' })
  @ApiProperty({
    type: Date,
    required: true,
    description: 'дата окончания действия промокода',
    example: '2026-12-31T23:59:59Z',
  })
  validUntil: Date;
  @IsOptional()
  @IsInt({
    message:
      'максимальное колличество использований должно быть целочисленным числом',
  })
  @Min(1, {
    message: 'минимальное значение максимального колличество использваний 1',
  })
  @ApiProperty({
    type: 'number',
    required: false,
    description: 'максимальное колличество использований промокода',
    minimum: 1,
    example: 1,
  })
  maxUses?: number;
  @IsOptional()
  @IsNumber({}, { message: 'минимальная цена чека должна быть числом' })
  @Min(1, { message: 'значение минимальной цены чека 1' })
  @ApiProperty({
    type: 'number',
    required: false,
    minimum: 1,
    example: 1,
    description:
      'минимальная цена чека с которой промокод начинает действовать',
  })
  minOrderAmount?: number;
  @IsOptional()
  @IsInt({
    message: 'максимально возможная скидка должна быть целочисленным числом',
  })
  @Min(1, { message: 'минимальное значение максимально возможной скидки 1' })
  @ApiProperty({
    type: 'number',
    required: false,
    minimum: 1,
    example: 1,
    description: 'максимально возможная скидка при использовании промокода',
  })
  maxDiscount?: number;
  @IsOptional()
  @IsArray({ message: 'список товаров должен быть массивом' })
  @ApiProperty({
    type: 'array',
    required: false,
    description:
      'список товаров на который распростроняется действие промокода',
    example:
      '[123e4567-e89b-12d3-a456-426614174000,a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6,f47ac10b-58cc-4372-a567-0e02b2c3d4e5]',
  })
  applicableProducts?: string[];
}
