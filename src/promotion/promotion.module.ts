import { Module } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { S3Module } from '../libs/s3/s3.module';
import { UserModule } from '../user/user.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [S3Module, UserModule, NotificationsModule],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
