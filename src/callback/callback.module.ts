import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../libs/mail/mail.module';
import { CallbackController } from './callback.controller';
import { CallbackService } from './callback.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [CallbackController],
  providers: [CallbackService],
})
export class CallbackModule {}
