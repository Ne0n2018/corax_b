import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IS_DEV_ENV } from './libs/common/utils/is-dev.util';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProviderModule } from './auth/provider/provider.module';
import { MailModule } from './libs/mail/mail.module';
import { EmailConfirmationModule } from './auth/email-confirmation/email-confirmation.module';
import { S3Module } from './libs/s3/s3.module';
import { PasswordRecoveryModule } from './auth/password-recovery/password-recovery.module';
import winston from 'winston';
import { WinstonModule } from 'nest-winston';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { ManufacturerModule } from './provider/manufacturer.module';
import { AdminModule } from './admin/admin.module';
import 'winston-daily-rotate-file';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: !IS_DEV_ENV,
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async () => {
        return {
          transports: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.colorize({ all: true }),
                winston.format.printf(
                  ({ timestamp, level, message, context, ...meta }) => {
                    const ctx = context ? `[${context}]` : '';
                    return `${timestamp}  ${level.toUpperCase()} ${ctx} ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                  },
                ),
              ),
              level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
            }),
            new winston.transports.DailyRotateFile({
              filename: 'logs/application-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              zippedArchive: true,
              maxSize: '20m',
              maxFiles: '14d',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
              level: 'info',
            }),
          ],
        };
      },
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    ManufacturerModule,
    ProviderModule,
    MailModule,
    EmailConfirmationModule,
    S3Module,
    PasswordRecoveryModule,
    CategoryModule,
    ProductModule,
    AdminModule,
  ],
})
export class AppModule {}
