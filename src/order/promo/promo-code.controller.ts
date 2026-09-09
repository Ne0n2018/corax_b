import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PromoCodeService } from './promo-code.service';
@ApiTags('Промокоды')
@Controller('promo-codes')
export class PromoCodeController {
  constructor(private readonly promoCodeService: PromoCodeService) {}

  /**
   * Проверить действительность промокода.
   */
  @Get('validate/:code')
  @ApiOperation({ summary: 'Проверить промокод' })
  @ApiParam({ name: 'code', type: 'string', required: true })
  async validatePromoCode(
    @Param('code') code: string,
    @Query('subtotal') subtotal: number,
  ) {
    return this.promoCodeService.validateAndCalculateDiscount(code, subtotal);
  }

  /**
   * Получить информацию о промокоде.
   */
  @Get(':code')
  @ApiOperation({ summary: 'Получить информацию о промокоде' })
  @ApiParam({ name: 'code', type: 'string', required: true })
  async getPromoCode(@Param('code') code: string) {
    return this.promoCodeService.getPromoCode(code);
  }
}
