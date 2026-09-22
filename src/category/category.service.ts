import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/category.create.dto';
import { CategoryUpdateDto } from './dto/category.update.dto';
import type { Prisma } from '../generated/prisma/client';
import { CategoryFilterDto } from './dto/filter/category.filter.dto';
import { AppCacheService } from '../libs/cache/cache.service';

@Injectable()
export class CategoryService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly cacheService: AppCacheService,
  ) {}

  public async findById(id: string) {
    const existingCategory = await this.prismaService.category.findUnique({
      where: { id },
    });
    if (!existingCategory) {
      throw new NotFoundException(
        'Категория не найдена. Проверьте правильность выбранной категории',
      );
    }
    return existingCategory;
  }

  public async findByIdSubCategory(id: string) {
    const existingSubCategory = await this.prismaService.subCategory.findUnique(
      {
        where: { id },
      },
    );
    if (!existingSubCategory) {
      throw new NotFoundException(
        'Подкатегория не найдена. Пожалуйста проверьте правильность выбранной категории',
      );
    }
    return existingSubCategory;
  }

  public async getAll(filterDto: CategoryFilterDto) {
    const { name } = filterDto;
    const where: Prisma.CategoryWhereInput = {};

    if (name?.trim()) {
      where.name = {
        contains: name.trim(),
        mode: 'insensitive',
      };
    }

    return this.prismaService.category.findMany({
      where,
      include: {
        SubCategory: true,
      },
    });
  }

  public async getSubCategory() {
    return this.prismaService.subCategory.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  }

  // Создание категории вместе с подкатегориями (если переданы)
  public async create(dto: CreateCategoryDto) {
    const { name, subCategory } = dto;

    const created = await this.prismaService.category.create({
      data: {
        name,
        SubCategory: subCategory?.length
          ? {
              createMany: {
                data: subCategory.map((sub) => ({ name: sub.name })),
              },
            }
          : undefined,
      },
      include: {
        SubCategory: true,
      },
    });

    await this.cacheService.clearCategoryCache();

    return created;
  }

  // Обновление категории и пакетное обновление/создание подкатегорий
  public async update(id: string, dto: CategoryUpdateDto) {
    const { name, subCategory } = dto;
    await this.findById(id);

    // Разделяем подкатегории на новые (без id) и существующие (с id)
    const newSubCategories = subCategory?.filter((sub) => !sub.id) || [];
    const existingSubCategories = subCategory?.filter((sub) => sub.id) || [];

    const updated = await this.prismaService.category.update({
      where: { id },
      data: {
        name,
        SubCategory: {
          // Создаем новые подкатегории
          ...(newSubCategories.length > 0 && {
            createMany: {
              data: newSubCategories.map((sub) => ({ name: sub.name })),
            },
          }),
          // Обновляем существующие подкатегории
          ...(existingSubCategories.length > 0 && {
            update: existingSubCategories.map((sub) => ({
              where: { id: sub.id },
              data: { name: sub.name },
            })),
          }),
        },
      },
      include: {
        SubCategory: true,
      },
    });

    await this.cacheService.clearCategoryCache();

    return updated;
  }

  public async delete(id: string) {
    await this.findById(id);
    await this.prismaService.category.delete({
      where: { id },
    });
    await this.cacheService.clearCategoryCache();
    return true;
  }
}
