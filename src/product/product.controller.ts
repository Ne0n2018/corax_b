import { Controller, Get, Param, Query, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { ProductService } from './product.service';

import { ProductFilterDto } from './dto/product.filter.dto';
import { plainToInstance } from 'class-transformer';
import { ProductResponseDto } from './dto/response/product.response.dto';

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'subCategoryId', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiOperation({ summary: 'Получить список всех продуктов' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Список продуктов' })
  public async findAll(@Query() filterDTO: ProductFilterDto) {
    const products = await this.productService.getAll(filterDTO);
    return plainToInstance(ProductResponseDto, products);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить продукт по ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID продукта' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Продукт не найден',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешное получение продукта',
  })
  public async findById(@Param('id') id: string) {
    const product = await this.productService.getById(id);
    return plainToInstance(ProductResponseDto, product);
  }
}
