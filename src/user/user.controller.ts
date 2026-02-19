import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { UserService } from './user.service';
import { Authorized } from '../auth/decorators/authorized.decorator';
import { Authorization } from '../auth/decorators/auth.decorator';
import { UpdateUserDto } from './dto/updateUserDto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('user')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get('profile')
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное получение данных пользователя',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'пользователь не авторизован',
  })
  @ApiOperation({ summary: 'получение аккаунта пользователя' })
  public async getProfile(@Authorized('id') userId: string) {
    return await this.userService.findById(userId);
  }

  @Put()
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное обновление данных пользователя',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'пользователь не авторизован',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiOperation({ summary: 'обновление профиля пользователя' })
  public async update(
    @Authorized('id') userId: string,
    @Body() data: UpdateUserDto,
  ) {
    return this.userService.update(userId, data);
  }
}
