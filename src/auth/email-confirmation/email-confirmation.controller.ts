import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { EmailConfirmationService } from './email-confirmation.service';
import express from 'express';
import { ConfirmationDto } from './dto/confirmation.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('email-confirmation')
@Controller('auth/email-confirmation')
export class EmailConfirmationController {
  constructor(
    private readonly emailConfirmationService: EmailConfirmationService,
  ) {}
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное потверждение почты',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'пользователь или токен не найден',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'токен истек',
  })
  @ApiBody({ type: ConfirmationDto })
  @ApiOperation({ summary: 'подтверждение почты пользователя' })
  public async newVerification(
    @Req() req: express.Request,
    @Body() dto: ConfirmationDto,
  ) {
    return this.emailConfirmationService.newVerification(req, dto);
  }
}
