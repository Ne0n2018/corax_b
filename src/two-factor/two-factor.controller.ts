import { Controller, Post, Query } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { Authorized } from '../auth/decorators/authorized.decorator';
import { Authorization } from '../auth/decorators/auth.decorator';
import { UserRole } from '../generated/prisma/enums';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('two-factor')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post()
  @Authorization(UserRole.ADMIN)
  @ApiOperation({ summary: 'Запрос кода двух факторной аунтефекации' })
  async get(
    @Authorized('id') id: string,
    @Authorized('displayName') name: string,
    @Authorized('email') email: string,
  ) {
    return await this.twoFactorService.sendTwoFactorCode(id, email, name);
  }

  @Post('confirm')
  @Authorization(UserRole.ADMIN)
  @ApiQuery({ name: 'token', type: 'string', required: true })
  @ApiOperation({ summary: 'Подтверждение кода двухфакторки ' })
  async confirm(@Authorized('id') id: string, @Query('token') code: string) {
    return await this.twoFactorService.verifyTwoFactorCode(id, code);
  }
}
