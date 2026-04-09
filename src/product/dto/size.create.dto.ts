import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SizeCreateDto {
  @IsString({ message: 'Название размера должно быть стракой' })
  @IsNotEmpty({ message: 'Название размера не должно быть пустым' })
  @ApiProperty({
    type: String,
    description: 'Название размера товара',
  })
  name: string;
  @IsNumber({}, { message: 'Допольнительная цена должна быть числом' })
  @IsNotEmpty({ message: 'Допльнительная цена не должна быть пустой' })
  @ApiProperty({
    type: Number,
    description: 'Допольнительная цена от размера',
  })
  price: number;
}
