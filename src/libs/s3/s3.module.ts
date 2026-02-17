import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3 } from '@aws-sdk/client-s3';
import { S3Service } from './s3.service';

@Module({
  imports: [ConfigModule],
  providers: [
    S3Service,
    {
      provide: 'S3_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new S3({
          endpoint: configService.get('S3_ENDPOINT'),
          region: configService.getOrThrow('S3_REGION'), // Cloudian may not require (docs page 29)
          credentials: {
            accessKeyId: configService.getOrThrow('S3_ACCESS_KEY_ID'),
            secretAccessKey: configService.getOrThrow('S3_SECRET_ACCESS_KEY'),
          },
          forcePathStyle: true, // Required for Cloudian (docs page 10)
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [S3Service],
})
export class S3Module {}
