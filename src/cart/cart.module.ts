import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { ProductModule } from '../product/product.module';
import { UserModule } from '../user/user.module';
import { PromotionModule } from '../promotion/promotion.module';

@Module({
  imports: [ProductModule, UserModule, PromotionModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
