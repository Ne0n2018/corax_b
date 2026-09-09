import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { ManufacturerModule } from '../provider/manufacturer.module';
import { CategoryModule } from '../category/category.module';
import { AdminOrdersGateway } from './orders/admin-orders.gateway';
import { AdminOrdersService } from './orders/admin-orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../libs/mail/mail.module';
import { PromotionModule } from '../promotion/promotion.module';
import { PromoCodeService } from '../order/promo/promo-code.service';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    UserModule,
    ProductModule,
    ManufacturerModule,
    CategoryModule,
    PrismaModule,
    MailModule,
    PromotionModule,
    OrderModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminOrdersGateway, AdminOrdersService],
  exports: [AdminService],
})
export class AdminModule {}
