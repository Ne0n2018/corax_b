import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserBlockedDTO {
  @ApiProperty({
    type: 'string',
    example: 'допрыгался хлопец',
    description: 'Сообщение которое получит пользователь при блокировке',
  })
  @IsString({ message: 'Сообщение должно быть строкой' })
  @IsNotEmpty({ message: 'Сообщение не должно быть пустым' })
  message: string;
}
