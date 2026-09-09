import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductFilterDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsUUID()
  subCategoryId?: string;
  @IsOptional()
  @IsString()
  cursor?: string;
  limit: number = 28;
}
