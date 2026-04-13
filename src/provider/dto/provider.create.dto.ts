import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProviderCreateDto {
  @IsString({ message: 'Отображаемое имя производителя должно быть стракой' })
  @IsNotEmpty({
    message: 'Отображаемое имя производителя не должно быть пустым',
  })
  @ApiProperty({
    type: String,
    description: 'Отображаемое имя производителя',
    example: 'Corax',
  })
  name: string;
  @IsString({ message: 'Описание производителя должно быть стракой' })
  @IsNotEmpty({ message: 'Описание производителя не должно быть пустым' })
  @ApiProperty({
    type: String,
    description: 'Описание производителя',
    example: 'Corax - величайшая компания на земле',
  })
  description: string;
}
