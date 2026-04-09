import { ProviderUpdateDto } from './provider.update.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ProviderUpdateWithImageDto extends ProviderUpdateDto {
  @ApiProperty({
    description: 'Изображение производителя',
    type: String,
    format: 'binary',
    required: false,
  })
  image: Express.Multer.File;
}
