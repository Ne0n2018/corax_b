import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Recaptcha } from '@nestlab/google-recaptcha';
import { AuthProviderGuard } from './guards/provider.guard';
import { ConfigService } from '@nestjs/config';
import { ProviderService } from './provider/provider.service';

@Controller('auth')
export class AuthController {
  public constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly providerService: ProviderService,
  ) {}
  @Post('register')
  @Recaptcha()
  @HttpCode(HttpStatus.OK)
  public async register(@Req() req: Request, @Body() data: RegisterDto) {
    return this.authService.register(req, data);
  }

  @Post('login')
  @Recaptcha()
  @HttpCode(HttpStatus.OK)
  public async login(@Req() req: Request, @Body() dto: LoginDto) {
    return this.authService.login(req, dto);
  }

  @Get('oauth/callback/:provider')
  @UseGuards(AuthProviderGuard)
  public async callback(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('code') code: string,
  ) {
    if (!code) {
      throw new BadRequestException('Не был предоставлен код авторизации');
    }

    await this.authService.extractProfileFromCode(req, provider, code);

    return res.redirect(
      `${this.configService.getOrThrow<string>('ALLOWED_ORIGIN')}/dashboard`,
    );
  }

  @UseGuards(AuthProviderGuard)
  @Get('oauth/connect/:provider')
  public async connect(@Param('provider') provider: string) {
    const providerInstance = this.providerService.FindByServices(provider);

    return {
      url: providerInstance.getAuthUrl(),
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  public async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(req, res);
  }
}
