import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserDTO {
  @IsString({ message: 'Имя должно быть строкой' })
  @IsNotEmpty({ message: 'Имя не должно быть пустым' })
  name: string;
}
