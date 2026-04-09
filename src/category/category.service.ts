import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/category.create.dto';
import { SubCategoryCreateDto } from './dto/subCategory.create.dto';
import { CategoryUpdateDto } from './dto/category.update.dto';
import { SubCategoryUpdateDto } from './dto/subCategory.update.dto';
import { Prisma } from '@prisma/client';
import { SubCategoryFilterDto } from './dto/filter/subCategory.filter.dto';
import { CategoryFilterDto } from './dto/filter/category.filter.dto';

@Injectable()
export class CategoryService {
  public constructor(private readonly prismaService: PrismaService) {}
  private async findById(id: string) {
    const existingCategory = await this.prismaService.category.findUnique({
      where: { id },
    });
    if (!existingCategory) {
      throw new NotFoundException(
        `Категория не найдена. Проверьте правильность выбранной категории`,
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
        'Подкатегория не найден. Пожалуйста проверьте правильность выбранной категори',
      );
    }
  }
  public async getAll(filterDto: CategoryFilterDto) {
    const { name, page, limit } = filterDto;
    const where: Prisma.CategoryWhereInput = {};
    const skip = (page - 1) * limit;
    if (name?.trim()) {
      where.name = {
        contains: name.trim(),
        mode: 'insensitive',
      };
    }
    return this.prismaService.category.findMany({
      where,
      skip,
      take: limit,
      include: {
        SubCategory: true,
      },
    });
  }

  public async getAllSubCategories(dto: SubCategoryFilterDto) {
    const where: Prisma.SubCategoryWhereInput = {};
    const { name, categoryId, page, limit = 28 } = dto;
    const skip = (page - 1) * limit;

    if (name?.trim()) {
      where.name = {
        contains: name.trim(),
        mode: 'insensitive',
      };
    }

    if (categoryId?.trim()) {
      where.categoryId = {
        contains: categoryId.trim(),
        mode: 'insensitive',
      };
    }

    const [subCategories, total] = await Promise.all([
      this.prismaService.subCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.subCategory.count({ where }),
    ]);

    return subCategories;
  }

  public async create(dto: CreateCategoryDto) {
    const { name } = dto;
    return this.prismaService.category.create({
      data: {
        name,
      },
    });
  }

  public async createSubCategory(dto: SubCategoryCreateDto) {
    const { name, id } = dto;
    const existingCategory = await this.findById(id);
    return this.prismaService.subCategory.create({
      data: {
        name,
        categoryId: existingCategory.id,
      },
    });
  }

  public async update(id: string, dto: CategoryUpdateDto) {
    const { name } = dto;
    await this.findById(id);
    return this.prismaService.category.update({
      where: {
        id: id,
      },
      data: {
        name,
      },
    });
  }

  public async updateSubCategory(id: string, dto: SubCategoryUpdateDto) {
    const { name } = dto;
    return this.prismaService.subCategory.update({
      where: {
        id,
      },
      data: {
        name,
      },
    });
  }

  public async delete(id: string) {
    await this.findById(id);
    await this.prismaService.category.delete({
      where: {
        id,
      },
    });
    return true;
  }

  public async deleteSubCategory(id: string) {
    const existingSubCategory = await this.prismaService.subCategory.findUnique(
      {
        where: {
          id,
        },
      },
    );
    if (!existingSubCategory) {
      throw new NotFoundException(
        'Подкатегория не найдена. Проверьте правильность выбранной подкатегории',
      );
    }
    await this.prismaService.subCategory.delete({
      where: {
        id,
      },
    });
    return true;
  }
}
