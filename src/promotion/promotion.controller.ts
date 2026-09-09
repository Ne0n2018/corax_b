import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { PromotionService } from './promotion.service';
import { PromotionPublicResponseDto } from './dto/response/promotion.public.response.dto';

@ApiTags('Promotion')
@Controller('promotions')
export class PromotionController {
  public constructor(private readonly promotionService: PromotionService) {}

  @Get('active')
  @ApiOperation({ summary: 'Активные акции (публичный доступ)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Список активных акций: название, изображение, описание, дата истечения',
  })
  public async getActive() {
    const promotions = await this.promotionService.getActive();
    return plainToInstance(PromotionPublicResponseDto, promotions);
  }
}
