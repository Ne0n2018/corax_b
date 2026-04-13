import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCartDto {
  @IsNotEmpty({ message: 'Айди продукта не должен быть пустым' })
  @IsUUID()
  @ApiProperty({ type: String, description: 'айди продукта' })
  productId: string;

  @IsNotEmpty({ message: 'Цена не должна быть пустой' })
  @IsNumber({}, { message: 'Цена должна быть числом' })
  @ApiProperty({
    type: Number,
    description: 'Цена выбранного товара вместе с опциями',
    example: 10,
  })
  price: number;

  @IsNotEmpty({ message: 'Вкус не должен быть пустым' })
  @IsString({ message: 'Вкус должен быть строкой' })
  @ApiProperty({ type: String, description: 'выбранный вкус продукта' })
  taste: string;

  @IsNotEmpty({ message: 'Размер не должен быть пустым' })
  @IsString({ message: 'Размер должен быть строкой' })
  @ApiProperty({ type: String, description: 'выбранный размер продукта' })
  size: string;
}
