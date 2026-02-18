import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'почта пользователя для входа',
    example: 'example@gmail.com',
  })
  @IsString({ message: 'почта должна быть строкой' })
  @IsEmail({}, { message: 'не валидная почта' })
  @IsNotEmpty({ message: 'почта не должна быть пустой' })
  email: string;
  @ApiProperty({ description: 'пароль пользователя', example: '123456' })
  @IsString({ message: 'пароль должен быть строкой' })
  @IsNotEmpty({ message: 'пароль должен быть не пустым' })
  @MinLength(6, { message: 'пароль должен содержать минимум 6 символов' })
  password: string;
}
