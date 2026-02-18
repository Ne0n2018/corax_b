import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { PasswordRecoveryService } from './password-recovery.service';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { Recaptcha } from '@nestlab/google-recaptcha';
import { NewPasswordDto } from './dto/new-password.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('password-recovery')
@Controller('auth/password-recovery')
export class PasswordRecoveryController {
  constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  @Recaptcha()
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешный запрос на сброс пароля',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'пользователь не найден',
  })
  @ApiBody({ type: ResetPasswordDTO })
  @ApiOperation({ summary: 'запрос на восстановление пароля' })
  public async resetPassword(@Body() dto: ResetPasswordDTO) {
    return this.passwordRecoveryService.resetPassword(dto);
  }

  @Recaptcha()
  @Post('new/:token')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'успешная смена пароля' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'пользователь или токен не найден',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'токен истек' })
  @ApiBody({ type: NewPasswordDto })
  @ApiOperation({ summary: 'восстановление пароля' })
  public async newPassword(
    @Body() dto: NewPasswordDto,
    @Param('token') token: string,
  ) {
    return this.passwordRecoveryService.newPassword(dto, token);
  }
}
