import { IsOptional, IsString } from 'class-validator';

export class CategoryFilterDto {
  @IsOptional()
  @IsString()
  name?: string;
}
