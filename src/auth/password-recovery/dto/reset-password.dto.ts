import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResetPasswordDTO {
  @IsEmail({}, { message: 'введите корректный адресс электронной почты' })
  @IsNotEmpty({ message: 'Поле email не должно быть пустым' })
  email: string;
}
