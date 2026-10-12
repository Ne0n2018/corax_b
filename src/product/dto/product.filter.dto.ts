import { IsOptional, IsString, IsUUID } from 'class-validator';

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
