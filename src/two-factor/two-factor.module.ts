import { Module } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController } from './two-factor.controller';
import { UserModule } from '../user/user.module';
import { MailModule } from '../libs/mail/mail.module';

@Module({
  controllers: [TwoFactorController],
  providers: [TwoFactorService],
  imports: [UserModule, MailModule],
})
export class TwoFactorModule {}
