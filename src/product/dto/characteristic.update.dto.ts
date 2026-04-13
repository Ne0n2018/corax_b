import { IsOptional, IsString } from 'class-validator';

export class CharacteristicUpdateDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsString()
  value?: string;
}
