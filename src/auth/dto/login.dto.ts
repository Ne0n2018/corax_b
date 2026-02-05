import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'почта должна быть строкой' })
  @IsEmail({}, { message: 'не валидная почта' })
  @IsNotEmpty({ message: 'почта не должна быть пустой' })
  email: string;
  @IsString({ message: 'пароль должен быть строкой' })
  @IsNotEmpty({ message: 'пароль должен быть не пустым' })
  @MinLength(6, { message: 'пароль должен содержать минимум 6 символов' })
  password: string;
}
