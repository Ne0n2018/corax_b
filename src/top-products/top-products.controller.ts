import { Controller, Get } from '@nestjs/common';
import { TopProductsService } from './top-products.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('top-products')
export class TopProductsController {
  constructor(private readonly topProductsService: TopProductsService) {}
  @Get()
  @ApiOperation({ summary: 'получение топа товаров' })
  async get() {
    return this.topProductsService.getTopProducts();
  }
}
