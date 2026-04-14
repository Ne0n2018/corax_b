import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartDto {
  @IsInt({ message: 'Количество должно быть числом без плавующей точки' })
  @IsNotEmpty({ message: 'Количество не должно быть пустым' })
  @Min(1)
  @ApiProperty({
    type: Number,
    description: 'количество товара с одинаковыми опциями в корзине',
    minimum: 1,
    example: 2,
  })
  quantity: number;
}
