import { ProductCreateDto } from './product.create.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ProductCreateWithImageDto extends ProductCreateDto {
  @ApiProperty({
    description: 'изображение продукта',
    type: String,
    format: 'binary',
  })
  @IsNotEmpty({ message: 'Изображение продукта не должно быть пустым' })
  image: Express.Multer.File;
}
