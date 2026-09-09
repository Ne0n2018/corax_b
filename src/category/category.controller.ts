import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CategoryResponseDto } from './dto/response/category.response.dto';
import { CategoryFilterDto } from './dto/filter/category.filter.dto';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import ms from '../libs/common/utils/ms.util';

@Controller('category')
@UseInterceptors(CacheInterceptor)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @CacheKey('category')
  @CacheTTL(ms('10m'))
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'успешное получение всех категорий',
  })
  @ApiOperation({ summary: 'получение всех категорий вместе с подкатегориями' })
  @ApiQuery({ name: 'name', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, example: 1 })
  public async findAll(@Query() filterDto: CategoryFilterDto) {
    const categories = await this.categoryService.getAll(filterDto);

    return plainToInstance(CategoryResponseDto, categories);
  }
}
