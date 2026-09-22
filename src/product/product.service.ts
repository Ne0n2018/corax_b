import {
  BadRequestException,
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
import { AppCacheService } from '../libs/cache/cache.service';

@Injectable()
export class ProductService {
  public constructor(
    private readonly categoryService: CategoryService,
    private readonly s3Service: S3Service,
    private readonly prismaService: PrismaService,
    private readonly providersService: ProviderService,
    private readonly cacheService: AppCacheService,
  ) {}

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
    const cacheKey = `products:catalog:${JSON.stringify(dto)}`;

    // 2. Проверяем кэш
    const cachedData = await this.cacheService.get(cacheKey);
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
    await this.cacheService.set(cacheKey, result, 120000);

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

      // Инвалидируем кэш списков и продукта, так как появился новый товар
      await this.cacheService.clearProductCache(product.id);

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
    const cacheKey = `products:all:${JSON.stringify(dto)}`;

    // 2. Проверяем кэш
    const cachedData = await this.cacheService.get(cacheKey);
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
    await this.cacheService.set(cacheKey, result, 120000);

    return result;
  }

  public async getById(id: string) {
    const cacheKey = `product:${id}`;

    // 1. Проверяем кэш отдельного товара
    const cachedProduct = await this.cacheService.get<Product>(cacheKey);
    if (cachedProduct) {
      return cachedProduct;
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
            id: true,
            name: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      omit: {
        createdAt: true,
        updatedAt: true,
        monthlySales: true,
        totalSales: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Продукт не найден. Пожалуйста проверьте выбранный продукт',
      );
    }

    // 3. Сохраняем товар в кэш на 10 минут (600 000 мс)
    await this.cacheService.set(cacheKey, product, 600000);

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

    const cleanString = (val?: string) => {
      if (!val || typeof val !== 'string') return undefined;
      const trimmed = val.trim();
      return !trimmed ||
        trimmed === 'string' ||
        trimmed === 'null' ||
        trimmed === 'undefined'
        ? undefined
        : trimmed;
    };

    const providerId = cleanString(dto.providerId);
    if (providerId) {
      await this.providersService.findById(providerId);
    }

    const subCategoryId = cleanString(dto.subCategoryId);
    if (subCategoryId) {
      await this.categoryService.findByIdSubCategory(subCategoryId);
    }

    await this.prismaService.product.update({
      where: { id },
      data: {
        name: cleanString(dto.name),
        description: cleanString(dto.description),
        shortDescription: cleanString(dto.shortDescription),
        formRelease: cleanString(dto.formRelease),
        structure: cleanString(dto.structure),
        advantages: cleanString(dto.advantages),
        providerId,
        subCategoryId,
        defaultPrice:
          dto.defaultPrice !== undefined &&
          !isNaN(Number(dto.defaultPrice)) &&
          Number(dto.defaultPrice) > 0
            ? Number(dto.defaultPrice)
            : undefined,
        isClothes:
          dto.isClothes !== undefined &&
          dto.isClothes !== null &&
          dto.isClothes !== '' &&
          dto.isClothes !== 'undefined' &&
          dto.isClothes !== 'null'
            ? typeof dto.isClothes === 'string'
              ? dto.isClothes.trim().toLowerCase() === 'true' ||
                dto.isClothes.trim() === '1'
              : Boolean(dto.isClothes)
            : undefined,
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

    // Очищаем кэш конкретного товара, списков и топов
    await this.cacheService.clearProductCache(id);

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

    // Очищаем кэш товара, списков и топов
    await this.cacheService.clearProductCache(id);

    return { message: 'Продукт успешно удален' };
  }
}
