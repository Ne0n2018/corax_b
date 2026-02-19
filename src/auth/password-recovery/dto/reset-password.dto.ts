import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDTO {
  @ApiProperty({
    description: 'электронная почта пользователя',
    example: 'example@gmail.com',
  })
  @IsEmail({}, { message: 'введите корректный адресс электронной почты' })
  @IsNotEmpty({ message: 'Поле email не должно быть пустым' })
  email: string;
}
