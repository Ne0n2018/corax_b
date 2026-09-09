import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { TopProductsService } from './top-products.service';
import { ApiOperation } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import ms from '../libs/common/utils/ms.util';

@Controller('top-products')
@UseInterceptors(CacheInterceptor)
export class TopProductsController {
  constructor(private readonly topProductsService: TopProductsService) {}
  @Get()
  @ApiOperation({ summary: 'получение топа товаров' })
  @CacheTTL(ms('1d'))
  async get() {
    return await this.topProductsService.getTopProducts();
  }
}
