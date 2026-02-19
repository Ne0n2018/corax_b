import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmationDto {
  @ApiProperty({ description: 'токен для потверждения почты' })
  @IsString({ message: 'Токен должен быть стракой' })
  @IsNotEmpty({ message: 'Поле токен не может быть пустым' })
  token: string;
}
