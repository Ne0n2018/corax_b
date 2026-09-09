import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../generated/prisma/enums';

export class UserUpdateRoleDto {
  @ApiProperty({
    description: 'Новая роль пользователя',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.ADMIN,
  })
  @IsNotEmpty({ message: 'Роль не может быть пустой' })
  @IsEnum(UserRole, { message: 'Указана некорректная роль пользователя' })
  role: UserRole;
}
