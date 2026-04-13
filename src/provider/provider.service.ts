import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderCreateDto } from './dto/provider.create.dto';
import { S3Service } from '../libs/s3/s3.service';
import { ProviderUpdateDto } from './dto/provider.update.dto';
import { ProviderFilterDto } from './dto/provider.filter.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ProviderService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  public async findAll(filterDto: ProviderFilterDto) {
    const { name } = filterDto;
    const where: Prisma.ProviderWhereInput = {};

    if (name?.trim()) {
      where.name = {
        contains: name.trim(),
        mode: 'insensitive',
      };
    }
    const [providers, total] = await Promise.all([
      this.prismaService.provider.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.provider.count({ where }),
    ]);

    return providers;
  }

  public async findById(id: string) {
    const existingProvider = await this.prismaService.provider.findFirst({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!existingProvider) {
      throw new NotFoundException(
        'Поставщик с таким айди не был найден. Проверьте введенный айди',
      );
    }

    return existingProvider;
  }

  public async create(dto: ProviderCreateDto, image: Express.Multer.File) {
    const { name, description } = dto;
    const { originalname, mimetype, buffer } = image;

    const imageUrl = await this.s3Service.uploadImage(
      originalname,
      buffer,
      mimetype,
    );

    return this.prismaService.provider.create({
      data: {
        name,
        description,
        imageUrl,
      },
    });
  }

  public async update(
    dto: ProviderUpdateDto,
    id: string,
    image?: Express.Multer.File,
  ) {
    const { name, description } = dto;

    const existingProvider = await this.findById(id);

    const updateData: any = {};

    if (name.length > 0) {
      updateData.name = name;
    }

    if (description.length > 0) {
      updateData.description = description;
    }

    if (image) {
      const { originalname, mimetype, buffer } = image;

      updateData.imageUrl = await this.s3Service.uploadImage(
        originalname,
        buffer,
        mimetype,
      );
    }

    if (image && existingProvider.imageUrl) {
      await this.s3Service.deleteByUrl(existingProvider.imageUrl);
    }

    return this.prismaService.provider.update({
      where: { id },
      data: updateData,
    });
  }

  public async delete(id: string) {
    const existingProvider = await this.findById(id);
    await this.s3Service.deleteByUrl(existingProvider.imageUrl);
    this.prismaService.provider.delete({
      where: {
        id,
      },
    });
    return true;
  }
}
