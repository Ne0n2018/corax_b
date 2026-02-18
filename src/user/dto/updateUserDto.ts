import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString({ message: 'Имя должно быть стракой' })
  @IsNotEmpty({ message: 'Имя не должно быть пустым' })
  name: string;
}
