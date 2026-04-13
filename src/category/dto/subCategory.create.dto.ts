import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubCategoryCreateDto {
  @ApiProperty({
    description: 'Имя подкатегории',
    example: 'Веганский протеин',
  })
  @IsString({ message: 'Имя подкатегории должно быть стракой' })
  @IsNotEmpty({ message: 'Имя подкатегории не должно быть пустым' })
  name: string;
  @ApiProperty({ description: 'Айди категории' })
  @IsString({ message: 'Айди категории должен быть стракой' })
  @IsNotEmpty({ message: 'Айди категории не должен быть пустым' })
  id: string;
}
