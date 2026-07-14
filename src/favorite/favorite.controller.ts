import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { FavoriteService } from './favorite.service';
import { Authorization } from '../auth/decorators/auth.decorator';
import { Authorized } from '../auth/decorators/authorized.decorator';
import { CreateFavoriteDto } from './dto/create.favorite.dto';

@ApiTags('Favorite')
@Controller('favorite')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post()
  @ApiOperation({ summary: 'Добавить товар в избранное' })
  @Authorization()
  addToFavorites(
    @Authorized('id') id: string,
    @Body() createFavoriteDto: CreateFavoriteDto,
  ) {
    return this.favoriteService.addToFavorites(id, createFavoriteDto);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Удалить товар из избранного' })
  @ApiParam({ name: 'productId', description: 'ID товара' })
  @Authorization()
  removeFromFavorites(
    @Authorized('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.favoriteService.removeFromFavorites(id, productId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все избранные товары пользователя' })
  @Authorization()
  getFavorites(@Authorized('id') id: string) {
    return this.favoriteService.getUserFavorites(id);
  }
}
