import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { ProductUpdateDto } from './product.update.dto';

export class ProductUpdateWithImageDto extends ProductUpdateDto {
  @IsOptional()
  @ApiProperty({ type: String, format: 'binary', required: false })
  image?: Express.Multer.File | null;
}
