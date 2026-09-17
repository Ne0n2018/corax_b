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
    // 1. Проверяем существование товара
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    // 2. Проверяем, есть ли уже товар в избранном У ЭТОГО ПОЛЬЗОВАТЕЛЯ
    const existingFavorite = await this.prisma.favorite.findFirst({
      where: {
        userId,
        productId: dto.productId,
      },
    });

    if (existingFavorite) {
      throw new ConflictException('Товар уже добавлен в избранное');
    }

    // 3. Создаем запись с await и возвращаем созданный объект
    await this.prisma.favorite.create({
      data: {
        userId,
        productId: dto.productId,
      },
      include: {
        product: true,
      },
    });
    return { message: 'Товар успешно добавлен в избранное' };
  }

  public async getFavorites(userId: string) {
    return await this.prisma.favorite.findMany({
      where: { userId },
      select: {
        productId: true,
      },
    });
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

    await this.prisma.favorite.delete({
      where: {
        userId_productId: { userId, productId },
      },
    });

    return { message: 'Товар успешно удален из избранного' };
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
