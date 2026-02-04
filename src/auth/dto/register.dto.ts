import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Validate,
} from 'class-validator';
import { IsPasswordMatchingConstraint } from '../../libs/common/decorators/is-passwords-matching-constraint.decorator';

export class RegisterDto {
  @IsString({ message: 'Имя должно быть стракой' })
  @IsNotEmpty({ message: 'Имя обязательно для заполнения' })
  name: string;
  @IsString({ message: 'Email должен быть стракой ' })
  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty({ message: 'email должен быть не пустым ' })
  email: string;
  @IsString({ message: 'Пароль должен быть стракой ' })
  @IsNotEmpty({ message: 'Пароль обязателен для заполнения  ' })
  @MinLength(6, {
    message: 'Пароль должен содержать минимум 6 символов',
  })
  password: string;
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
