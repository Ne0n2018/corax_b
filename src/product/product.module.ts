import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

import { S3Module } from '../libs/s3/s3.module';
import { CategoryModule } from '../category/category.module';
import { UserModule } from '../user/user.module';
import { ManufacturerModule } from '../provider/manufacturer.module';

@Module({
  imports: [S3Module, CategoryModule, UserModule, ManufacturerModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
