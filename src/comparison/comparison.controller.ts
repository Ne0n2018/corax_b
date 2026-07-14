import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ComparisonService } from './comparison.service';
import { CreateComparisonDto } from './dto/create-comparison.dto';
import { Authorization } from '../auth/decorators/auth.decorator';
import { Authorized } from '../auth/decorators/authorized.decorator';

@ApiTags('Comparison')
@Controller('comparison')
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @Post()
  @ApiOperation({ summary: 'Добавить товар в сравнение' })
  @Authorization()
  async addToComparison(
    @Authorized('id') id: string,
    @Body() dto: CreateComparisonDto,
  ) {
    return this.comparisonService.addToComparison(id, dto);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Удалить товар из сравнения' })
  @ApiParam({ name: 'productId', description: 'ID товара' })
  @Authorization()
  async removeFromComparison(
    @Authorized('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.comparisonService.removeFromComparison(id, productId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все товары в сравнении' })
  @Authorization()
  async getComparison(@Authorized('id') id: string) {
    return this.comparisonService.getUserComparison(id);
  }

  @Delete()
  @ApiOperation({ summary: 'Очистить всё сравнение' })
  @Authorization()
  async clearComparison(@Authorized('id') id: string) {
    return this.comparisonService.clearComparison(id);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Проверить, добавлен ли товар в сравнение' })
  @Authorization()
  async checkIsInComparison(
    @Authorized('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.comparisonService.isInComparison(id, productId);
  }
}
