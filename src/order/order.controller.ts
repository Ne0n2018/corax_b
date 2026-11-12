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
  Query,
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
  @ApiOperation({
    summary: 'Получить ссылку для повторной оплаты (если PENDING)',
  })
  @ApiParam({ name: 'orderId', type: String })
  @ApiResponse({
    status: 200,
    schema: { properties: { redirectUrl: { type: 'string' } } },
  })
  @HttpCode(HttpStatus.OK)
  async getPaymentUrl(
    @Authorized('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderService.getPaymentUrl(userId, orderId);
  }

  @Post(':orderId/confirm-payment')
  @Authorization()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Проверить оплату в шлюзе после возврата на returnUrl (редиректу не доверяем)',
  })
  @ApiParam({ name: 'orderId', type: String })
  @ApiResponse({
    status: 200,
    schema: {
      properties: {
        status: { type: 'string' },
        orderStatus: { type: 'number' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @Authorized('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderService.confirmPayment(userId, orderId);
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

  // ─── Публичные маршруты: callback от платёжного шлюза Альфа-Банка ──────────

  @Post('webhook/alfa-bank')
  @ApiOperation({
    summary:
      '[Alfa-Bank] Callback-уведомление об оплате (параметры приходят в query string или теле)',
  })
  @ApiResponse({ status: 200, description: 'Шлюз ждёт именно 200 OK' })
  @HttpCode(HttpStatus.OK)
  async alfaBankCallback(
    @Query() query: Record<string, unknown>,
    @Body() body: Record<string, unknown>,
  ) {
    await this.orderService.handleAlfaBankCallback({ ...query, ...body });
    return { ok: true };
  }

  // Шлюз настраивается на HTTPS-URL с параметрами в строке запроса —
  // поддерживаем и GET, чтобы не зависеть от способа доставки
  @Get('webhook/alfa-bank')
  @ApiOperation({ summary: '[Alfa-Bank] Callback-уведомление (GET-вариант)' })
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  async alfaBankCallbackGet(@Query() query: Record<string, unknown>) {
    await this.orderService.handleAlfaBankCallback(query);
    return { ok: true };
  }
}
