import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteDto {
  @ApiProperty({ example: 'cm2k9p3x10001abc123456def' })
  @IsString()
  @IsNotEmpty()
  productId: string;
}
