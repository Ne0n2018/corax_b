import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { PromotionCreateDto } from './promotion.create.dto';

export class PromotionCreateWithImageDto extends PromotionCreateDto {
  @ApiProperty({
    description: 'Изображение акции',
    type: String,
    format: 'binary',
  })
  @IsNotEmpty({ message: 'Изображение акции не должно быть пустым' })
  image: Express.Multer.File;
}