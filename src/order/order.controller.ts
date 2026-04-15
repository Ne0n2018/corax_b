import {
  Body,
  Controller,
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
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import type { BePaidWebhookDto } from './dto/bepaid-webhook.dto';
import {
  CreateOrderResponseDto,
  OrderResponseDto,
} from './dto/response/order.response.dto';
import { Authorization } from '../auth/decorators/auth.decorator';
import { Authorized } from '../auth/decorators/authorized.decorator';

@ApiTags('Заказы')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ─── Защищённые маршруты (требуют авторизации) ─────────────────────────────

  @Post()
  @Authorization()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Оформить заказ из корзины' })
  @ApiResponse({
    status: 200,
    description: 'Заказ создан. При ONLINE-оплате возвращает redirectUrl.',
    type: CreateOrderResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async createOrder(
    @Authorized('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    const result = await this.orderService.createOrder(userId, dto);
    return {
      order: plainToInstance(OrderResponseDto, result.order),
      redirectUrl: result.redirectUrl,
    };
  }

  @Get()
  @Authorization()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить список заказов текущего пользователя' })
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  @HttpCode(HttpStatus.OK)
  async getUserOrders(@Authorized('id') userId: string) {
    const orders = await this.orderService.getUserOrders(userId);
    return plainToInstance(OrderResponseDto, orders);
  }

  @Get(':orderId')
  @Authorization()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить заказ по ID' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Заказ не найден' })
  @HttpCode(HttpStatus.OK)
  async getOrder(
    @Authorized('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const order = await this.orderService.getOrderById(userId, orderId);
    return plainToInstance(OrderResponseDto, order);
  }

  @Get(':orderId/pay')
  @Authorization()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить ссылку для повторной оплаты (если PENDING)' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiResponse({ status: 200, schema: { properties: { redirectUrl: { type: 'string' } } } })
  @HttpCode(HttpStatus.OK)
  async getPaymentUrl(
    @Authorized('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderService.getPaymentUrl(userId, orderId);
  }

  @Patch(':orderId/cancel')
  @Authorization()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отменить заказ (PENDING или PROCESSING)' })
  @ApiParam({ name: 'orderId', type: String })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Authorized('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const order = await this.orderService.cancelOrder(userId, orderId);
    return plainToInstance(OrderResponseDto, order);
  }

  // ─── Публичный маршрут: webhook от bePaid ──────────────────────────────────

  @Post('webhook/bepaid')
  @ApiOperation({ summary: '[bePaid] Webhook-уведомление об оплате' })
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  async bepaidWebhook(@Body() body: Record<string, unknown>) {
    await this.orderService.handleBePaidWebhook(body);
    return { ok: true };
  }
}
