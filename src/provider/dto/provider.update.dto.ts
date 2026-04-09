import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProviderUpdateDto {
  @IsString({ message: 'Отображаемое имя производителя должно быть стракой' })
  @IsOptional()
  @ApiProperty({
    type: String,
    description: 'Отображаемое имя производителя',
    example: 'Corax',
    required: false,
  })
  name?: string;
  @IsString({ message: 'Описание производителя должно быть стракой' })
  @IsOptional()
  @ApiProperty({
    type: String,
    description: 'Описание производителя',
    example: 'Corax - величайшая компания на земле',
    required: false,
  })
  description?: string;
}
