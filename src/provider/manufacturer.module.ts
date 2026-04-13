import { Module } from '@nestjs/common';
import { ProviderService } from './provider.service';
import { ProviderController } from './provider.controller';
import { S3Module } from '../libs/s3/s3.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [S3Module, UserModule],
  controllers: [ProviderController],
  providers: [ProviderService],
  exports: [ProviderService],
})
export class ManufacturerModule {}
