import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { ProductModule } from '../product/product.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [ProductModule, UserModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
