import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFavoriteDto } from './dto/create.favorite.dto';

@Injectable()
export class FavoriteService {
  constructor(private prisma: PrismaService) {}

  async addToFavorites(userId: string, dto: CreateFavoriteDto) {
    // Проверяем, существует ли товар
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    try {
      this.prisma.favorite.create({
        data: {
          userId,
          productId: dto.productId,
        },
        include: {
          product: true, // возвращаем информацию о товаре
        },
      });
      return { success: true };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Этот товар уже в избранном');
      }
      throw error;
    }
  }

  async removeFromFavorites(userId: string, productId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Товар не найден в избранном');
    }

    return this.prisma.favorite.delete({
      where: {
        userId_productId: { userId, productId },
      },
    });
  }

  async getUserFavorites(userId: string) {
    const items = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    if (items.length === 0) {
      return { message: 'В избранном нет товаров' };
    }

    return items;
  }
}
