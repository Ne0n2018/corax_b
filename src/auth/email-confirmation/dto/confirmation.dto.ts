import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmationDto {
  @IsString({ message: 'Токен должен быть стракой' })
  @IsNotEmpty({ message: 'Поле токен не может быть пустым' })
  token: string;
}
