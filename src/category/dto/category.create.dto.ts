import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Имя категории', example: 'Протеин' })
  @IsString({ message: 'Название категории должно быть категорией' })
  @IsNotEmpty({ message: 'Название категории не должно быть пустым' })
  name: string;
}
