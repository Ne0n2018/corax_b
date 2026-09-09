import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SubCategoryCreateDto } from './subCategory.create.dto';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Имя категории', example: 'Протеин' })
  @IsString({ message: 'Название категории должно быть категорией' })
  @IsNotEmpty({ message: 'Название категории не должно быть пустым' })
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubCategoryCreateDto)
  @ApiPropertyOptional({
    type: () => [SubCategoryCreateDto],
    description: 'Массив подкатегорий, создаваемых вместе с категорией',
    example: [{ name: 'Протеины' }, { name: 'Аминокислоты' }],
  })
  subCategory: SubCategoryCreateDto[];
}
