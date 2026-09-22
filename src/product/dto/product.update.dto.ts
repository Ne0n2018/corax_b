import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { CharacteristicUpdateDto } from './characteristic.update.dto';
import { TasteUpdateDto } from './taste.update.dto';
import { SizeUpdateDto } from './size.update.dto';

const transformOptionalString = ({ value }: { value: any }) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'string' || trimmed === 'null' || trimmed === 'undefined') {
      return undefined;
    }
    return trimmed;
  }
  return value;
};

export class ProductUpdateDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '' || value === 'undefined' || value === 'null' || value === 'string') {
      return undefined;
    }
    if (value === 'false' || value === false || value === 0 || value === '0') {
      return false;
    }
    if (value === 'true' || value === true || value === 1 || value === '1') {
      return true;
    }
    return undefined;
  })
  @ApiProperty({ required: false, type: Boolean, example: true })
  isClothes?: boolean | string;

  @IsOptional()
  @IsString()
  @Transform(transformOptionalString)
  @ApiProperty({ required: false, example: 'Название товара' })
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(transformOptionalString)
  @ApiProperty({ required: false, example: 'Описание товара' })
  description?: string;

  @IsOptional()
  @IsString()
  @Transform(transformOptionalString)
  @ApiProperty({ required: false, example: 'Краткое описание' })
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @Transform(transformOptionalString)
  @ApiProperty({ required: false, example: 'Преимущества' })
  advantages?: string;

  @IsOptional()
  @IsString()
  @Transform(transformOptionalString)
  @ApiProperty({ required: false, example: 'Состав' })
  structure?: string;

  @IsOptional()
  @IsString()
  @Transform(transformOptionalString)
  @ApiProperty({ required: false, example: 'Форма выпуска' })
  formRelease?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '' || value === 'string' || value === 'undefined') {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  @ApiProperty({ required: false, example: 100 })
  defaultPrice?: number | string;

  @IsOptional()
  @IsString()
  @Transform(transformOptionalString)
  @ApiProperty({ required: false, description: 'ID подкатегории (UUID)' })
  subCategoryId?: string;

  @IsOptional()
  @IsString()
  @Transform(transformOptionalString)
  @ApiProperty({ required: false, description: 'ID поставщика (UUID)' })
  providerId?: string;

  @IsOptional()
  @Type(() => CharacteristicUpdateDto)
  @ApiProperty({
    type: () => CharacteristicUpdateDto,
    isArray: true,
    required: false,
  })
  characteristic?: CharacteristicUpdateDto[];

  @IsOptional()
  @Type(() => TasteUpdateDto)
  @ApiProperty({ type: () => TasteUpdateDto, isArray: true, required: false })
  taste?: TasteUpdateDto[];

  @IsOptional()
  @Type(() => SizeUpdateDto)
  @ApiProperty({ type: () => SizeUpdateDto, isArray: true, required: false })
  size?: SizeUpdateDto[];
}
