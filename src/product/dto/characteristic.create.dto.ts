import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CharacteristicCreateDto {
  @IsString({ message: 'Название характеристики должно быть стракой' })
  @IsNotEmpty({ message: 'Название характеристики не должно быть пустым' })
  @ApiProperty({
    type: String,
    description: 'Название характеристики товара',
  })
  name: string;
  @IsString({ message: 'Значение характеристики должно быть стракой' })
  @IsNotEmpty({ message: 'Значение характеристики не должно быть пустым' })
  @ApiProperty({
    type: String,
    description: 'Значение характеристики товара',
  })
  value: string;
}
