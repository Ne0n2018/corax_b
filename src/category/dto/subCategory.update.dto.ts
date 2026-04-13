import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubCategoryUpdateDto {
  @ApiProperty({
    description: 'Имя подкатегории',
    example: 'Веганский протеин',
  })
  @IsString({ message: 'Имя подкатегории должно быть стракой' })
  @IsNotEmpty({ message: 'Имя подкатегории не должно быть пустым' })
  name: string;
}
