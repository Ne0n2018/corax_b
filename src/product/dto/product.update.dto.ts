import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CharacteristicUpdateDto } from './characteristic.update.dto';
import { TasteUpdateDto } from './taste.update.dto';
import { SizeUpdateDto } from './size.update.dto';

export class ProductUpdateDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  description?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  advantages?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  structure?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  formRelease?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false })
  defaultPrice?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  subCategoryId?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
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
