import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PromoCodeService } from './promo-code.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Промокоды')
@Controller('promo-codes')
export class PromoCodeController {
  constructor(private readonly promoCodeService: PromoCodeService) {}

  /**
   * Проверить действительность промокода.
   */
  @Get('validate/:code')
  @ApiOperation({ summary: 'Проверить промокод' })
  async validatePromoCode(
    @Param('code') code: string,
    @Query('subtotal') subtotal: number,
  ) {
    return this.promoCodeService.validateAndCalculateDiscount(
      code,
      subtotal,
    );
  }

  /**
   * Получить информацию о промокоде.
   */
  @Get(':code')
  @ApiOperation({ summary: 'Получить информацию о промокоде' })
  async getPromoCode(@Param('code') code: string) {
    return this.promoCodeService.getPromoCode(code);
  }
}
