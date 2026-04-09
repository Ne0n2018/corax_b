import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryFilterDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page: number;
  @IsNumber()
  limit: number = 28;
}
