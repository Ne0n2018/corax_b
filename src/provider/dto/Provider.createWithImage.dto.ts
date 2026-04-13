import { ApiProperty } from '@nestjs/swagger';
import { ProviderCreateDto } from './provider.create.dto';

export class ProviderCreateWithImageDto extends ProviderCreateDto {
  @ApiProperty({
    description: 'Изображение производителя',
    type: String,
    format: 'binary',
  })
  image: Express.Multer.File;
}
