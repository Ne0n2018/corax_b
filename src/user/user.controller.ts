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

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get('profile')
  @Authorization()
  @HttpCode(HttpStatus.OK)
  public async getProfile(@Authorized('id') userId: string) {
    return await this.userService.findById(userId);
  }

  @Put()
  @Authorization()
  @HttpCode(HttpStatus.OK)
  public async update(
    @Authorized('id') userId: string,
    @Body() data: UpdateUserDto,
  ) {
    return this.userService.update(userId, data);
  }
}
