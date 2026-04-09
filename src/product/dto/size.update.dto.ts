import { IsNumber, IsOptional, IsString } from 'class-validator';

export class SizeUpdateDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsNumber()
  price?: number;
}
