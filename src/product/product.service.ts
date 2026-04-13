import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryService } from '../category/category.service';
import { S3Service } from '../libs/s3/s3.service';
import { ProductCreateDto } from './dto/product.create.dto';

import { ProductUpdateDto } from './dto/product.update.dto';
import { ProviderService } from '../provider/provider.service';
import { ProductFilterDto } from './dto/product.filter.dto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductService {
  public constructor(
    private readonly categoryService: CategoryService,
    private readonly s3Service: S3Service,
    private readonly prismaService: PrismaService,
    private readonly providersService: ProviderService,
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

  public async create(image: Express.Multer.File, dto: ProductCreateDto) {
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
    } = dto;

    const { originalname, mimetype, buffer } = image;

    await this.providersService.findById(providerId);
    await this.categoryService.findByIdSubCategory(subCategoryId);

    const imageUrl = await this.s3Service.uploadImage(
      originalname,
      buffer,
      mimetype,
    );

    return this.prismaService.product.create({
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
        defaultPrice,

        // === ИСПРАВЛЕНИЕ ЗДЕСЬ ===
        characteristic: {
          create: (characteristic ?? [])
            .flat() // ← убираем лишний уровень массива
            .map((char) => ({
              name: char?.name?.trim(),
              value: char?.value?.trim(),
            }))
            .filter((c) => c.name && c.value),
        },

        Taste: {
          create: (taste ?? [])
            .flat()
            .map((t) => ({
              name: t?.name?.trim(),
              price: Number(t?.price),
            }))
            .filter((t) => t.name && !isNaN(t.price)),
        },

        Size: {
          create: (size ?? [])
            .flat()
            .map((s) => ({
              name: s?.name?.trim(),
              price: Number(s?.price),
            }))
            .filter((s) => s.name && !isNaN(s.price)),
        },
      },

      include: {
        characteristic: true,
        Taste: true,
        Size: true,
        Provider: true,
        subCategory: true,
      },
    });
  }

  public async getAll(dto: ProductFilterDto) {
    const { name, subCategoryId, page, limit = 28 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (name?.trim()) {
      where.name = {
        contains: name.trim(),
        mode: 'insensitive',
      };
    }

    if (subCategoryId?.trim()) {
      where.subCategoryId = {
        contains: subCategoryId?.trim(),
        mode: 'insensitive',
      };
    }

    const [products, total] = await Promise.all([
      this.prismaService.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.product.count({ where }),
    ]);

    return products;
  }

  public async getById(id: string) {
    await this.findById(id);
    return this.prismaService.product.findUnique({
      where: { id },
      include: {
        subCategory: true,
        Provider: true,
        Taste: true,
        Size: true,
        characteristic: true,
      },
    });
  }

  public async update(
    id: string,
    image: Express.Multer.File | undefined,
    dto: ProductUpdateDto,
  ) {
    const {
      name,
      description,
      subCategoryId,
      size,
      shortDescription,
      characteristic,
      defaultPrice,
      formRelease,
      structure,
      advantages,
      providerId,
      taste,
    } = dto;
    const existingProduct = await this.findById(id);
    const updateData: any = {};
    if (name.length > 0) updateData.name = name;
    if (description.length > 0) updateData.description = description;
    if (subCategoryId.length > 0) updateData.subCategoryId = subCategoryId;
    if (shortDescription.length > 0)
      updateData.shortDescription = shortDescription;
    if (defaultPrice != existingProduct.defaultPrice)
      updateData.defaultPrice = defaultPrice;
    if (formRelease.length > 0) updateData.formRelease = formRelease;
    if (structure.length > 0) updateData.structure = structure;
    if (advantages.length > 0) updateData.advantages = advantages;
    if (providerId.length > 0) updateData.providerId = providerId;
    if (image) {
      await this.s3Service.deleteByUrl(existingProduct.imageUrl);
      const { originalname, mimetype, buffer } = image;
      updateData.imageUrl = await this.s3Service.uploadImage(
        originalname,
        buffer,
        mimetype,
      );
    }

    return this.prismaService.product.update({
      where: { id },
      data: {
        name: updateData.name,
        description: updateData.description,
        shortDescription: updateData.shortDescription,
        formRelease: updateData.formRelease,
        structure: updateData.structure,
        advantages: updateData.advantages,
        providerId: updateData.providerId,
        subCategoryId: updateData.subCategoryId,
        defaultPrice: updateData.defaultPrice,
        characteristic: {
          deleteMany: { productId: id },
          create: (dto.characteristic ?? existingProduct.characteristic)
            .flat()
            .map((char) => ({
              name: char?.name?.trim(),
              value: char?.value?.trim(),
            }))
            .filter((c) => c.name && c.value),
        },

        Taste: {
          deleteMany: { productId: id },
          create: (dto.taste ?? existingProduct.Taste)
            .flat()
            .map((t) => ({
              name: t?.name?.trim(),
              price: Number(t?.price),
            }))
            .filter((t) => t.name && !isNaN(t.price)),
        },

        Size: {
          deleteMany: { productId: id },
          create: (dto.size ?? existingProduct.Size)
            .flat()
            .map((s) => ({
              name: s?.name?.trim(),
              price: Number(s?.price),
            }))
            .filter((s) => s.name && !isNaN(s.price)),
        },
      },
      include: {
        characteristic: true,
        subCategory: true,
        Taste: true,
        Size: true,
        Provider: true,
      },
    });
  }

  public async delete(id: string) {
    await this.findById(id);
    await this.prismaService.product.delete({
      where: { id },
    });

    return true;
  }
}
