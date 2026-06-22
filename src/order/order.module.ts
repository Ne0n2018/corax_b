import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { BePaidService } from './bepaid/bepaid.service';
import { CartModule } from '../cart/cart.module';
import { UserModule } from '../user/user.module';
import { MailModule } from '../libs/mail/mail.module';

@Module({
  imports: [CartModule, UserModule, MailModule],
  controllers: [OrderController],
  providers: [OrderService, BePaidService],
})
export class OrderModule {}
