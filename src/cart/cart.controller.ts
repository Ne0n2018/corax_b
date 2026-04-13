import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CartService } from './cart.service';
import { AddCartDto } from './dto/add.cart.dto';
import { UpdateCartDto } from './dto/update.cart.dto';
import { Authorization } from '../auth/decorators/auth.decorator';
import { Authorized } from '../auth/decorators/authorized.decorator';
import { CartResponse } from './dto/response/cart.response.dto';

@ApiTags('Корзина')
@ApiBearerAuth()
@Authorization()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Получить корзину текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Корзина пользователя', type: CartResponse })
  @HttpCode(HttpStatus.OK)
  public async getCart(@Authorized('id') userId: string) {
    const cart = await this.cartService.getCart(userId);
    return plainToInstance(CartResponse, cart);
  }

  @Post()
  @ApiOperation({ summary: 'Добавить товар в корзину' })
  @ApiResponse({ status: 200, description: 'Корзина после добавления', type: CartResponse })
  @HttpCode(HttpStatus.OK)
  public async addToCart(
    @Authorized('id') userId: string,
    @Body() dto: AddCartDto,
  ) {
    const cart = await this.cartService.addToCart(userId, dto);
    return plainToInstance(CartResponse, cart);
  }

  @Patch(':cartItemId')
  @ApiOperation({ summary: 'Изменить количество позиции в корзине' })
  @ApiParam({ name: 'cartItemId', type: String, description: 'ID позиции корзины' })
  @ApiResponse({ status: 200, description: 'Корзина после обновления', type: CartResponse })
  @HttpCode(HttpStatus.OK)
  public async updateCartItem(
    @Authorized('id') userId: string,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
    @Body() dto: UpdateCartDto,
  ) {
    const cart = await this.cartService.updateCartItem(userId, cartItemId, dto);
    return plainToInstance(CartResponse, cart);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Очистить корзину' })
  @ApiResponse({ status: 200, description: 'Пустая корзина', type: CartResponse })
  @HttpCode(HttpStatus.OK)
  public async clearCart(@Authorized('id') userId: string) {
    const cart = await this.cartService.clearCart(userId);
    return plainToInstance(CartResponse, cart);
  }

  @Delete(':cartItemId')
  @ApiOperation({ summary: 'Удалить позицию из корзины' })
  @ApiParam({ name: 'cartItemId', type: String, description: 'ID позиции корзины' })
  @ApiResponse({ status: 200, description: 'Корзина после удаления', type: CartResponse })
  @HttpCode(HttpStatus.OK)
  public async removeFromCart(
    @Authorized('id') userId: string,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
  ) {
    const cart = await this.cartService.removeFromCart(userId, cartItemId);
    return plainToInstance(CartResponse, cart);
  }
}
