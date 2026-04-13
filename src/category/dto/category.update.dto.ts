import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CategoryUpdateDto {
  @ApiProperty({ description: 'имя категории', example: 'Протеин' })
  @IsString({ message: 'Имя категории должно быть стракой' })
  @IsNotEmpty({ message: 'Имя категории не должно быть пустым' })
  name: string;
}
