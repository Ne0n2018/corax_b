import { Module } from '@nestjs/common';
import { ResendModule } from 'nestjs-resend';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [
    ConfigModule,
    ResendModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        apiKey: configService.getOrThrow('MAIL_KEY'),
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService], // Для использования в других модулях (e.g., AuthModule)
})
export class MailModule {}
