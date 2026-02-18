import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Validate,
} from 'class-validator';
import { IsPasswordMatchingConstraint } from '../../libs/common/decorators/is-passwords-matching-constraint.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'отображаемое имя пользователя',
    example: 'Борис',
  })
  @IsString({ message: 'Имя должно быть стракой' })
  @IsNotEmpty({ message: 'Имя обязательно для заполнения' })
  name: string;
  @ApiProperty({
    description: 'почта пользователя',
    example: 'example@gmail.com',
  })
  @IsString({ message: 'Email должен быть стракой ' })
  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty({ message: 'email должен быть не пустым ' })
  email: string;
  @ApiProperty({ description: 'пароль пользователя', example: '123456' })
  @IsString({ message: 'Пароль должен быть стракой ' })
  @IsNotEmpty({ message: 'Пароль обязателен для заполнения  ' })
  @MinLength(6, {
    message: 'Пароль должен содержать минимум 6 символов',
  })
  password: string;
  @ApiProperty({
    description: 'потверждение пароля пользователя',
    example: '123456',
  })
  @IsString({ message: 'Пароль потверждения должен быть стракой' })
  @IsNotEmpty({ message: 'Поле потверждения пароля не может быть пустым' })
  @MinLength(6, {
    message: 'Пароль потверждения должен содержать минимум 6 символов',
  })
  @Validate(IsPasswordMatchingConstraint, {
    message: 'Пароли не совпадают',
  })
  passwordRepeat: string;
}
