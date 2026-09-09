import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SubCategoryUpdateDto } from './subCategory.update.dto';

export class CategoryUpdateDto {
  @IsOptional()
  @ApiProperty({
    description: 'имя категории',
    example: 'Протеин',
    required: false,
  })
  @IsString({ message: 'Имя категории должно быть стракой' })
  name?: string;

  @ApiPropertyOptional({
    type: () => [SubCategoryUpdateDto],
    description: 'Массив подкатегорий, создаваемых вместе с категорией',
    example: [{ name: 'Протеины' }, { name: 'Аминокислоты' }],
    required: false,
  })
  subCategory?: SubCategoryUpdateDto[];
}
