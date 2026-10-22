import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CallbackRequestDto {
  @ApiProperty({
    type: 'string',
    example: '+375251245689',
    description: 'Номер телефона, по которому клиент просит перезвонить',
  })
  @IsString({ message: 'Номер должен быть строкой' })
  @IsNotEmpty({ message: 'Номер не должен быть пустым' })
  @Matches(/^\+?[0-9\s()-]{7,20}$/, {
    message: 'Номер телефона указан в неверном формате',
  })
  phone: string;
}
