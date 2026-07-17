import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TopProductsService {
  private readonly logger = new Logger(TopProductsService.name);
  constructor(private readonly prisma: PrismaService) {}

  // Запускается автоматически 1-го числа каждого месяца в 00:05
  @Cron('5 0 1 * *')
  async updateMonthlyTop() {
    this.logger.log('🔄 Обновление топа товаров...');

    // Сбрасываем счётчик продаж за месяц
    await this.prisma.product.updateMany({
      data: { monthlySales: 0 },
    });

    this.logger.log('✅ Счётчики monthlySales сброшены');
  }

  async getTopProducts(limit: number = 3) {
    let top = await this.prisma.product.findMany({
      where: { monthlySales: { gt: 0 } },
      orderBy: { monthlySales: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        defaultPrice: true,
        monthlySales: true,
        shortDescription: true,
      },
    });

    // Если топ пустой — берём 3 самых дорогих
    if (top.length === 0) {
      top = await this.prisma.product.findMany({
        orderBy: { defaultPrice: 'desc' },
        take: 3,
        select: {
          id: true,
          name: true,
          imageUrl: true,
          defaultPrice: true,
          monthlySales: true,
          shortDescription: true,
        },
      });
    }

    return {
      success: true,
      message:
        top.length > 0 ? `Топ ${top.length} товаров` : 'Товары не найдены',
      data: top,
      count: top.length,
      source: top[0]?.monthlySales > 0 ? 'sales' : 'price_fallback',
    };
  }

  // Метод для увеличения счётчика продаж (вызывать при создании заказа)
  async incrementSales(productId: string, quantity: number = 1) {
    this.prisma.product.update({
      where: { id: productId },
      data: {
        monthlySales: { increment: quantity },
        totalSales: { increment: quantity },
      },
    });
  }
}
