import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComparisonDto } from './dto/create-comparison.dto';

@Injectable()
export class ComparisonService {
  private readonly MAX_ITEMS = 2; // максимум товаров в сравнении

  constructor(private prisma: PrismaService) {}

  async addToComparison(userId: string, dto: CreateComparisonDto) {
    // Проверяем существование товара
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    // Проверяем лимит
    const currentCount = await this.prisma.comparison.count({
      where: { userId },
    });

    if (currentCount >= this.MAX_ITEMS) {
      throw new BadRequestException(
        `Максимум ${this.MAX_ITEMS} товаров в сравнении`,
      );
    }

    try {
      const comparison = await this.prisma.comparison.create({
        data: {
          userId,
          productId: dto.productId,
        },
        include: {
          product: true,
        },
      });
      return {
        message: `Товар ${comparison.product.name} успешно добавлен в сравнение`,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Этот товар уже добавлен в сравнение');
      }
      throw error;
    }
  }

  async removeFromComparison(userId: string, productId: string) {
    const comparison = await this.prisma.comparison.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
      include: {
        product: true,
      },
    });

    if (!comparison) {
      throw new NotFoundException('Товар не найден в сравнении');
    }

    this.prisma.comparison.delete({
      where: {
        userId_productId: { userId, productId },
      },
    });

    return { message: `Товар ${comparison.product.name} успешно удален` };
  }

  async getUserComparison(userId: string) {
    const items = await this.prisma.comparison.findMany({
      where: { userId },
      include: {
        product: true, // можно расширить нужными полями
      },
      orderBy: { createdAt: 'desc' },
    });

    if (items.length === 0) {
      return { message: `в сравнении нет товаров` };
    }
    return items;
  }

  async clearComparison(userId: string) {
    this.prisma.comparison.deleteMany({
      where: { userId },
    });
    return { message: 'Сравнение успешно отчищено' };
  }

  async isInComparison(userId: string, productId: string): Promise<boolean> {
    const item = await this.prisma.comparison.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return !!item;
  }
}
