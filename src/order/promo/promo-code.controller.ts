import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PromoCodeService } from './promo-code.service';
import { CreatePromoDto } from './dto/create.promo.dto';
import { Authorization } from '../../auth/decorators/auth.decorator';
import { UserRole } from '@prisma/client';
import { UpdatePromoDto } from './dto/update.promo.dto';
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

  @Post()
  @Authorization(UserRole.ADMIN)
  @ApiOperation({ summary: 'Создать промокод' })
  async createPromoCode(@Body() data: CreatePromoDto) {
    return this.promoCodeService.createPromoCode(data);
  }

  @Put(':id')
  @Authorization(UserRole.ADMIN)
  @ApiOperation({ summary: 'обновление данных промокода' })
  @ApiParam({
    name: 'id',
    type: 'string',
    required: true,
  })
  async updatePromoCode(@Param('id') id: string, @Body() data: UpdatePromoDto) {
    return this.promoCodeService.updatePromoCode(data, id);
  }

  @Delete(':id')
  @Authorization(UserRole.ADMIN)
  @ApiOperation({ summary: 'удаление промокода' })
  @ApiParam({ name: 'id', type: 'string', required: true })
  async deletePromoCode(@Param('id') id: string) {
    return this.promoCodeService.deletePromoCode(id);
  }
}
