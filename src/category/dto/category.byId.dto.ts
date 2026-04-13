import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CategoryByIdDto {
  @ApiProperty({ description: 'айди категории' })
  @IsString({ message: 'Поле айди не должно быть пустым' })
  @IsNotEmpty({ message: 'Поле айди не должно быть пустым' })
  id: string;
}
