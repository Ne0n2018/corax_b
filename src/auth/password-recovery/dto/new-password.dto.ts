import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NewPasswordDto {
  @ApiProperty({ description: 'новый пароль пользователя', example: '123456' })
  @IsString({ message: 'пароль должен быть стракой' })
  @MinLength(6, { message: 'Пароль должен содержать не менее 6 символов' })
  @IsNotEmpty({ message: 'Поле пароль не может быть пустым' })
  password: string;
}
