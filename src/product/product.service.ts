import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CategoryService } from '../category/category.service';
import { S3Service } from '../libs/s3/s3.service';
import { ProductCreateDto } from './dto/product.create.dto';
import { ProductUpdateDto } from './dto/product.update.dto';
import { ProviderService } from '../provider/provider.service';
import { ProductFilterDto } from './dto/product.filter.dto';
import type { Prisma, Product } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class ProductService {
  public constructor(
    private readonly categoryService: CategoryService,
    private readonly s3Service: S3Service,
    private readonly prismaService: PrismaService,
    private readonly providersService: ProviderService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Вспомогательный метод для очистки кэша всех списков товаров
   */
  private async clearListCache(): Promise<void> {
    const store = this.cacheManager.stores as any;
    // Если клиент поддерживается (ioredis / redis-yet), удаляем все ключи списков по маске
    if (store.client?.keys) {
      const keys = await store.client.keys('products:list:*');
      if (keys.length > 0) {
        await store.client.del(keys);
      }
    }
  }

  private async findById(id: string) {
    const existingProduct = await this.prismaService.product.findUnique({
      where: { id },
      include: {
        characteristic: true,
        Taste: true,
        Size: true,
      },
    });
    if (!existingProduct) {
      throw new NotFoundException(
        `Продукт не найден. Пожалуйста проверьте выбранный продукт`,
      );
    }
    return existingProduct;
  }

  public async getForCatalog(dto: ProductFilterDto) {
    const cacheKey = `products:list:${JSON.stringify(dto)}`;

    // 2. Проверяем кэш
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // 3. Выполняем запрос к БД при промахе кэша
    const { name, subCategoryId, cursor, limit = 28 } = dto;
    const where: Prisma.ProductWhereInput = {};

    if (name?.trim()) {
      where.name = {
        contains: name.trim(),
        mode: 'insensitive',
      };
    }

    if (subCategoryId?.trim()) {
      where.subCategoryId = subCategoryId.trim();
    }

    const products = await this.prismaService.product.findMany({
      where,
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      omit: {
        subCategoryId: true,
        providerId: true,
        monthlySales: true,
        totalSales: true,
        createdAt: true,
        updatedAt: true,
      },
      include: {
        Provider: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    const nextCursor =
      products.length === limit ? products[products.length - 1].id : null;

    const result = {
      data: products,
      nextCursor,
    };

    // 4. Сохраняем в кэш на 2 минуты (120 000 мс)
    await this.cacheManager.set(cacheKey, result, 120000);

    return result;
  }

  public async create(image: Express.Multer.File, dto: ProductCreateDto) {
    if (!image) {
      throw new BadRequestException(
        'Изображение товара обязательно для загрузки',
      );
    }

    const {
      name,
      defaultPrice,
      description,
      subCategoryId,
      providerId,
      shortDescription,
      characteristic = [],
      formRelease,
      structure,
      taste = [],
      advantages,
      size = [],
      isClothes,
    } = dto;

    await this.providersService.findById(providerId);
    await this.categoryService.findByIdSubCategory(subCategoryId);

    const { originalname, mimetype, buffer } = image;
    const imageUrl = await this.s3Service.uploadImage(
      originalname,
      buffer,
      mimetype,
    );

    try {
      const product = await this.prismaService.product.create({
        data: {
          providerId,
          subCategoryId,
          name,
          description,
          shortDescription,
          formRelease,
          structure,
          advantages,
          imageUrl,
          defaultPrice: Number(defaultPrice),
          isClothes: String(isClothes) === 'true',

          characteristic: {
            create: this.parseArray(characteristic)
              .map((char) => ({
                name: char?.name?.trim(),
                value: char?.value?.trim(),
              }))
              .filter((c) => c.name && c.value),
          },

          Taste: {
            create: this.parseArray(taste)
              .map((t) => ({
                name: t?.name?.trim(),
                price: Number(t?.price),
              }))
              .filter((t) => t.name && !isNaN(t.price)),
          },

          Size: {
            create: this.parseArray(size)
              .map((s) => ({
                name: s?.name?.trim(),
                price: Number(s?.price),
              }))
              .filter((s) => s.name && !isNaN(s.price)),
          },
        },
      });

      // Инвалидируем кэш списков, так как появился новый товар
      await this.clearListCache();

      return { message: 'Продукт успешно создан', productId: product.id };
    } catch (error) {
      await this.s3Service.deleteByUrl(imageUrl);
      throw new InternalServerErrorException(
        'Не удалось создать продукт. Файл удален из хранилища.',
      );
    }
  }

  private parseArray(data: any): any[] {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    return Array.isArray(data) ? data.flat() : [];
  }

  public async getAll(dto: ProductFilterDto) {
    // 1. Формируем уникальный ключ на основе параметров фильтрации
    const cacheKey = `products:list:${JSON.stringify(dto)}`;

    // 2. Проверяем кэш
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // 3. Выполняем запрос к БД при промахе кэша
    const { name, subCategoryId, cursor, limit = 28 } = dto;
    const where: Prisma.ProductWhereInput = {};

    if (name?.trim()) {
      where.name = {
        contains: name.trim(),
        mode: 'insensitive',
      };
    }

    if (subCategoryId?.trim()) {
      where.subCategoryId = subCategoryId.trim();
    }

    const products = await this.prismaService.product.findMany({
      where,
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    const nextCursor =
      products.length === limit ? products[products.length - 1].id : null;

    const result = {
      data: products,
      nextCursor,
    };

    // 4. Сохраняем в кэш на 2 минуты (120 000 мс)
    await this.cacheManager.set(cacheKey, result, 120000);

    return result;
  }

  public async getById(id: string) {
    const cacheKey = `product:${id}`;

    // 1. Проверяем кэш отдельного товара
    const cachedProduct = await this.cacheManager.get(cacheKey);
    if (cachedProduct) {
      return cachedProduct as Product;
    }

    // 2. Выполняем 1 запрос со всеми связями вместо дублирования findById
    const product = await this.prismaService.product.findUnique({
      where: { id },
      include: {
        Taste: true,
        Size: true,
        characteristic: true,
        Provider: {
          select: {
            name: true,
          },
        },
      },
      omit: {
        createdAt: true,
        updatedAt: true,
        monthlySales: true,
        totalSales: true,
        providerId: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Продукт не найден. Пожалуйста проверьте выбранный продукт',
      );
    }

    // 3. Сохраняем товар в кэш на 10 минут (600 000 мс)
    await this.cacheManager.set(cacheKey, product, 600000);

    return product;
  }

  public async update(
    id: string,
    image: Express.Multer.File | undefined,
    dto: ProductUpdateDto,
  ) {
    const existingProduct = await this.findById(id);

    let newImageUrl = existingProduct.imageUrl;
    if (image) {
      if (existingProduct.imageUrl) {
        await this.s3Service.deleteByUrl(existingProduct.imageUrl);
      }
      newImageUrl = await this.s3Service.uploadImage(
        image.originalname,
        image.buffer,
        image.mimetype,
      );
    }

    await this.prismaService.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        shortDescription: dto.shortDescription,
        formRelease: dto.formRelease,
        structure: dto.structure,
        advantages: dto.advantages,
        providerId: dto.providerId,
        subCategoryId: dto.subCategoryId,
        defaultPrice: dto.defaultPrice,
        imageUrl: newImageUrl,

        characteristic: dto.characteristic
          ? {
              deleteMany: { productId: id },
              create: dto.characteristic
                .flat()
                .map((char) => ({
                  name: char?.name?.trim(),
                  value: char?.value?.trim(),
                }))
                .filter((c) => c.name && c.value),
            }
          : undefined,

        Taste: dto.taste
          ? {
              deleteMany: { productId: id },
              create: dto.taste
                .flat()
                .map((t) => ({
                  name: t?.name?.trim(),
                  price: Number(t?.price),
                }))
                .filter((t) => t.name && !isNaN(t.price)),
            }
          : undefined,

        Size: dto.size
          ? {
              deleteMany: { productId: id },
              create: dto.size
                .flat()
                .map((s) => ({
                  name: s?.name?.trim(),
                  price: Number(s?.price),
                }))
                .filter((s) => s.name && !isNaN(s.price)),
            }
          : undefined,
      },
    });

    // Очищаем кэш конкретного товара и кэш списков
    await this.cacheManager.del(`product:${id}`);
    await this.clearListCache();

    return { message: 'Продукт успешно обновлен' };
  }

  public async delete(id: string) {
    const product = await this.findById(id);

    // Удаляем изображение из S3 перед удалением из базы
    if (product.imageUrl) {
      await this.s3Service.deleteByUrl(product.imageUrl);
    }

    await this.prismaService.product.delete({
      where: { id },
    });

    // Очищаем кэш
    await this.cacheManager.del(`product:${id}`);
    await this.clearListCache();

    return { message: 'Продукт успешно удален' };
  }
}
