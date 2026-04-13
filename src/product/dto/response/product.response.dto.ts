import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

class ProductCharacteristicResponseDto {
  @ApiProperty({ example: 'Вес упаковки' })
  name: string;

  @ApiProperty({ example: '500 г' })
  value: string;

  @Exclude()
  id?: string;
  @Exclude()
  productId?: string;
  @Exclude()
  createdAt?: Date;
  @Exclude()
  updateAt?: Date;
}

class TasteResponseDto {
  @ApiProperty({ example: 'Клубника' })
  name: string;

  @ApiProperty({ example: 1490 })
  price: number;

  @Exclude()
  id?: string;
  @Exclude()
  productId?: string;
  @Exclude()
  createdAt?: Date;
  @Exclude()
  updatedAt?: Date;
}

class SizeResponseDto {
  @ApiProperty({ example: 'XL' })
  name: string;

  @ApiProperty({ example: 1590 })
  price: number;

  @Exclude()
  id?: string;
  @Exclude()
  productId?: string;
  @Exclude()
  createdAt?: Date;
  @Exclude()
  updatedAt?: Date;
}

// ====================== Основной Response DTO ======================
export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  imageUrl: string;

  @ApiProperty()
  shortDescription: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  advantages: string;

  @ApiProperty()
  structure: string;

  @ApiProperty()
  formRelease: string;

  @ApiProperty({ type: Number })
  defaultPrice: number;

  @ApiProperty()
  subCategoryId: string;

  @ApiProperty()
  providerId: string;

  // Характеристики
  @ApiProperty({ type: () => ProductCharacteristicResponseDto })
  @ValidateNested({ each: true })
  @Type(() => ProductCharacteristicResponseDto)
  @IsArray()
  @IsOptional()
  characteristic: ProductCharacteristicResponseDto[];

  // Вкусы
  @ApiProperty({ type: () => TasteResponseDto })
  @ValidateNested({ each: true })
  @Type(() => TasteResponseDto)
  @IsArray()
  @IsOptional()
  Taste: TasteResponseDto[];

  // Размеры
  @ApiProperty({ type: () => SizeResponseDto })
  @ValidateNested({ each: true })
  @Type(() => SizeResponseDto)
  @IsArray()
  @IsOptional()
  Size: SizeResponseDto[];

  // Скрываем все технические поля продукта
  @Exclude()
  createdAt?: Date;
  @Exclude()
  updatedAt?: Date;
}
