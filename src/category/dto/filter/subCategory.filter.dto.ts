import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SubCategoryFilterDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsUUID()
  categoryId?: string;
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;
  limit: number = 28;
}
