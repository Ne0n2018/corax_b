import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IS_DEV_ENV } from './libs/common/utils/is-dev.util';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProviderModule } from './auth/provider/provider.module';
import { MailModule } from './libs/mail/mail.module';
import { EmailConfirmationModule } from './auth/email-confirmation/email-confirmation.module';
import { S3Module } from './libs/s3/s3.module';
import { PasswordRecoveryModule } from './auth/password-recovery/password-recovery.module';
import * as winston from 'winston';
import { WinstonModule } from 'nest-winston';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { ManufacturerModule } from './provider/manufacturer.module';
import { AdminModule } from './admin/admin.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { PromotionModule } from './promotion/promotion.module';
import { SessionModule } from './session/session.module';
import { MetricsModule } from './metrics/metrics.module';
import { FavoriteModule } from './favorite/favorite.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NotificationsGateway } from './notifications/notifications.gateway';
import { ComparisonModule } from './comparison/comparison.module';
import { TopProductsModule } from './top-products/top-products.module';
import { TwoFactorModule } from './two-factor/two-factor.module';
import 'winston-daily-rotate-file';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

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
            new winston.transports.DailyRotateFile({
              filename: 'logs/error-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              zippedArchive: true,
              maxSize: '20m',
              maxFiles: '30d',
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.printf(
                  ({ timestamp, level, message, context, stack, ...meta }) => {
                    const ctx = context ? `[${context}]` : '';
                    const metaStr = Object.keys(meta).length
                      ? ` | meta: ${JSON.stringify(meta)}`
                      : '';
                    const stackStr = stack ? `\n${stack}` : '';
                    return `${timestamp} [${level.toUpperCase()}] ${ctx} ${message}${metaStr}${stackStr}`;
                  },
                ),
              ),
              level: 'error',
            }),
          ],
        };
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url: configService.getOrThrow<string>('REDIS_URI'),
          ttl: 6 * 1000,
        }),
      }),
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
    CartModule,
    OrderModule,
    PromotionModule,
    SessionModule,
    MetricsModule,
    AdminModule,
    NotificationsModule,
    FavoriteModule,
    ComparisonModule,
    TopProductsModule,
    TwoFactorModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 1000,
          limit: 50,
        },
        {
          name: 'medium',
          ttl: 10000,
          limit: 100,
        },
      ],
      storage: new ThrottlerStorageRedisService(process.env.REDIS_URI),
    }),
  ],
  providers: [
    NotificationsGateway,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
