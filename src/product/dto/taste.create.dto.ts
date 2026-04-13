import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TasteCreateDto {
  @IsString({ message: 'Название вкуса должно быть стракой' })
  @IsNotEmpty({ message: 'Название вкуса не должно быть пустым' })
  @ApiProperty({ type: String, description: 'Название вкуса товара' })
  name: string;
  @IsNumber({}, { message: 'Допольнительная цена должна быть числом' })
  @IsNotEmpty({ message: 'Допольнительная цена не должа быть пустой' })
  @ApiProperty({
    type: Number,
    description: 'Допольнительная цена товара от вкуса',
  })
  price: number;
}
