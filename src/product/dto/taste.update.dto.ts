import { IsNumber, IsOptional, IsString } from 'class-validator';

export class TasteUpdateDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsNumber()
  price?: number;
}
