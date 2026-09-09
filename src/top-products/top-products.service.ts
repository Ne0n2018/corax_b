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
      },
    });

    // Если топ пустой — берём заданное количество самых дорогих
    if (top.length === 0) {
      top = await this.prisma.product.findMany({
        orderBy: { defaultPrice: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      });
    }

    return top;
  }

  // Метод для увеличения счётчика продаж
  async incrementSales(productId: string, quantity: number = 1) {
    // Добавлен обязательный await
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        monthlySales: { increment: quantity },
        totalSales: { increment: quantity },
      },
    });
  }
}
