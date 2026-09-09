import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'новое отображаемое имя пользовтеля',
    example: 'борис',
    required: false,
    type: 'string',
  })
  @IsString({ message: 'Имя должно быть стракой' })
  @IsOptional()
  name?: string;
  @ApiProperty({
    description: 'номер телефона',
    example: '+375251245689',
    type: 'string',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Номер должен быть стракой' })
  number?: string;
  @ApiProperty({
    description: 'Дата рождения',
    example: '2024-11-18T15:30:00.444Z',
    type: 'string',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Дата рождения должна быть стракой' })
  birthday?: string;
  @ApiProperty({
    description: 'адресс доставки',
    example: 'г.Минск улица ленина 1',
    type: 'string',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'адресс должен быть стракой' })
  address?: string;
}
