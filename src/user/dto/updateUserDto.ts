import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'новое отображаемое имя пользовтеля',
    example: 'борис',
  })
  @IsString({ message: 'Имя должно быть стракой' })
  @IsNotEmpty({ message: 'Имя не должно быть пустым' })
  name: string;
}
