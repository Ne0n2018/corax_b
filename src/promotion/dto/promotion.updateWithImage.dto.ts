import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PromotionUpdateDto } from './promotion.update.dto';

export class PromotionUpdateWithImageDto extends PromotionUpdateDto {
  @ApiProperty({
    description: 'Новое изображение акции (необязательно)',
    type: String,
    format: 'binary',
  })
  @IsOptional()
  image?: Express.Multer.File;
}