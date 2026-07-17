import { Module } from '@nestjs/common';
import { TopProductsService } from './top-products.service';
import { TopProductsController } from './top-products.controller';

@Module({
  controllers: [TopProductsController],
  providers: [TopProductsService],
  exports: [TopProductsService],
})
export class TopProductsModule {}
