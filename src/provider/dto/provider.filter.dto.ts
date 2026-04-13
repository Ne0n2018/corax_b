import { IsOptional, IsString } from 'class-validator';

export class ProviderFilterDto {
  @IsString()
  @IsOptional()
  name?: string;
}
