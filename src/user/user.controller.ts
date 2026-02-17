import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';
import { Authorized } from '../auth/decorators/authorized.decorator';
import { Authorization } from '../auth/decorators/auth.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get('profile')
  @Authorization()
  @HttpCode(HttpStatus.OK)
  public async getProfile(@Authorized('id') userId: string) {
    return await this.userService.findById(userId);
  }
}
