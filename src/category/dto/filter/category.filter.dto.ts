import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryFilterDto {
  @IsOptional()
  @IsString()
  name?: string;
}
