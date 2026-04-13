import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { ManufacturerModule } from '../provider/manufacturer.module';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [UserModule, ProductModule, ManufacturerModule, CategoryModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
