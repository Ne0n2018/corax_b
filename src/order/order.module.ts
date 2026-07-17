import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { BePaidService } from './bepaid/bepaid.service';
import { PromoCodeService } from './promo/promo-code.service';
import { PromoCodeController } from './promo/promo-code.controller';
import { CartModule } from '../cart/cart.module';
import { UserModule } from '../user/user.module';
import { MailModule } from '../libs/mail/mail.module';
import { PromotionModule } from '../promotion/promotion.module';
import { TopProductsModule } from '../top-products/top-products.module';

@Module({
  imports: [
    CartModule,
    UserModule,
    MailModule,
    PromotionModule,
    TopProductsModule,
  ],
  controllers: [OrderController, PromoCodeController],
  providers: [OrderService, BePaidService, PromoCodeService],
  exports: [PromoCodeService],
})
export class OrderModule {}
