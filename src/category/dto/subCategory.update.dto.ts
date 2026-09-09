import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubCategoryUpdateDto {
  id: string;

  @IsOptional()
  @ApiProperty({
    description: 'Имя подкатегории',
    example: 'Веганский протеин',
  })
  @IsString({ message: 'Имя подкатегории должно быть стракой' })
  name?: string;
}
