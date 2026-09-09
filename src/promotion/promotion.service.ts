import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '../libs/s3/s3.service';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionCreateDto } from './dto/promotion.create.dto';
import { PromotionUpdateDto } from './dto/promotion.update.dto';
import { PromotionFilterDto } from './dto/promotion.filter.dto';
import { DiscountMethod, PromotionType } from '../generated/prisma/enums';
import type { Prisma, Promotion } from '../generated/prisma/client';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface AppliedPromotion {
  promotionId: string;
  name: string;
  type: PromotionType;
  amount: number;
}

export interface DiscountResult {
  totalDiscount: number;
  breakdown: AppliedPromotion[];
}

interface CartForDiscount {
  totalAmount: number;
  CartItem: {
    quantity: number;
    productItem: {
      id: string;
      productId: string;
      price: number;
    };
  }[];
}

@Injectable()
export class PromotionService {
  public constructor(
    private readonly s3Service: S3Service,
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Вспомогательный метод для сброса кэша акций при изменениях.
   */
  private async clearCache(id?: string): Promise<void> {
    if (id) {
      await this.cacheManager.del(`promotion:${id}`);
    }
    await this.cacheManager.del('promotions:active');

    const store = this.cacheManager.stores as any;
    if (store.client?.keys) {
      // Сбрасываем списки акций и кэшированные топы популярных товаров
      const listKeys = await store.client.keys('promotions:list:*');
      const popularKeys = await store.client.keys('promotions:popular_top:*');
      const keysToDelete = [...listKeys, ...popularKeys];

      if (keysToDelete.length > 0) {
        await store.client.del(keysToDelete);
      }
    }
  }

  // ─── Публичные CRUD-методы ──────────────────────────────────────────────────

  public async create(image: Express.Multer.File, dto: PromotionCreateDto) {
    this.validateTypeFields(dto);

    const { originalname, mimetype, buffer } = image;
    const imageUrl = await this.s3Service.uploadImage(
      originalname,
      buffer,
      mimetype,
    );

    await this.prismaService.promotion.create({
      data: {
        name: dto.name,
        imageUrl,
        description: dto.description,
        type: dto.type,
        discountMethod: dto.discountMethod,
        discountValue: dto.discountValue,
        buyQuantity: dto.buyQuantity ?? null,
        getQuantity: dto.getQuantity ?? null,
        popularTopN: dto.popularTopN ?? null,
        active: dto.active === undefined ? true : dto.active === 'true',
        expiresAt: dto.expiresAt ?? null,
      },
    });

    await this.clearCache();

    return { message: 'Скидка успешно создана' };
  }

  public async update(
    id: string,
    image: Express.Multer.File | undefined,
    dto: PromotionUpdateDto,
  ) {
    const existing = await this.findById(id);

    const updateData: Prisma.PromotionUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.discountValue !== undefined)
      updateData.discountValue = dto.discountValue;
    if (dto.buyQuantity !== undefined) updateData.buyQuantity = dto.buyQuantity;
    if (dto.getQuantity !== undefined) updateData.getQuantity = dto.getQuantity;
    if (dto.popularTopN !== undefined) updateData.popularTopN = dto.popularTopN;
    if (dto.active !== undefined) updateData.active = dto.active === 'true';
    if (dto.expiresAt !== undefined)
      updateData.expiresAt = dto.expiresAt ?? null;

    this.validateTypeFields({
      type: existing.type,
      discountMethod: existing.discountMethod,
      discountValue: dto.discountValue ?? existing.discountValue,
      buyQuantity: dto.buyQuantity ?? existing.buyQuantity ?? undefined,
      getQuantity: dto.getQuantity ?? existing.getQuantity ?? undefined,
      popularTopN: dto.popularTopN ?? existing.popularTopN ?? undefined,
    });

    if (image) {
      await this.s3Service.deleteByUrl(existing.imageUrl);
      const { originalname, mimetype, buffer } = image;
      updateData.imageUrl = await this.s3Service.uploadImage(
        originalname,
        buffer,
        mimetype,
      );
    }

    await this.prismaService.promotion.update({
      where: { id },
      data: updateData,
    });

    await this.clearCache(id);

    return { message: 'Скидка успешно обновлена' };
  }

  public async delete(id: string) {
    const existing = await this.findById(id);
    await this.s3Service.deleteByUrl(existing.imageUrl);
    await this.prismaService.promotion.delete({ where: { id } });

    await this.clearCache(id);

    return { message: 'Скидка успешно удалена' };
  }

  public async getAll(dto: PromotionFilterDto) {
    const cacheKey = `promotions:list:${JSON.stringify(dto)}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData as Promotion[];
    }

    const { name, type, active, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.PromotionWhereInput = {};

    if (name?.trim()) {
      where.name = { contains: name.trim(), mode: 'insensitive' };
    }
    if (type) {
      where.type = type;
    }
    if (active !== undefined) {
      where.active = active === 'true';
    }

    const [items, total] = await Promise.all([
      this.prismaService.promotion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        omit: {
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prismaService.promotion.count({ where }),
    ]);

    const result = { items, total };
    await this.cacheManager.set(cacheKey, result, 120000); // 2 минуты

    return result;
  }

  public async getById(id: string) {
    const cacheKey = `promotion:${id}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached as Promotion;
    }

    const promotion = await this.findById(id);
    await this.cacheManager.set(cacheKey, promotion, 600000); // 10 минут

    return promotion;
  }

  public async getActive() {
    const cacheKey = 'promotions:active';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const activePromotions = await this.prismaService.promotion.findMany({
      where: {
        active: true,
        createdAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        name: true,
        imageUrl: true,
        description: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    await this.cacheManager.set(cacheKey, activePromotions, 300000); // 5 минут

    return activePromotions;
  }

  // ─── Движок применения скидок ───────────────────────────────────────────────

  public async calculateDiscount(
    cart: CartForDiscount,
    user: { id: string },
  ): Promise<DiscountResult> {
    const now = new Date();
    const promotions = await this.prismaService.promotion.findMany({
      where: { active: true },
    });

    const active = promotions.filter((p) => this.isActive(p, now));
    if (active.length === 0 || cart.CartItem.length === 0) {
      return { totalDiscount: 0, breakdown: [] };
    }

    const breakdown: AppliedPromotion[] = [];

    for (const promo of active) {
      const amount = await this.computePromoDiscount(promo, cart, user);
      if (amount > 0) {
        breakdown.push({
          promotionId: promo.id,
          name: promo.name,
          type: promo.type,
          amount: round2(amount),
        });
      }
    }

    const totalDiscount = Math.min(
      round2(breakdown.reduce((sum, b) => sum + b.amount, 0)),
      cart.totalAmount,
    );

    return { totalDiscount, breakdown };
  }

  private isActive(
    promo: {
      active: boolean;
      createdAt: Date;
      expiresAt: Date | null;
    },
    now: Date,
  ): boolean {
    return (
      promo.active &&
      promo.createdAt <= now &&
      (promo.expiresAt === null || promo.expiresAt > now)
    );
  }

  private async computePromoDiscount(
    promo: {
      id: string;
      type: PromotionType;
      discountMethod: DiscountMethod;
      discountValue: number;
      buyQuantity: number | null;
      getQuantity: number | null;
      popularTopN: number | null;
    },
    cart: CartForDiscount,
    user: { id: string },
  ): Promise<number> {
    switch (promo.type) {
      case PromotionType.FIRST_ORDER:
        return this.computeFirstOrder(promo, user, cart.totalAmount);
      case PromotionType.BUY_X_GET_Y:
        return this.computeBuyXGetY(promo, cart);
      case PromotionType.POPULAR:
        return this.computePopular(promo, cart);
      default:
        return 0;
    }
  }

  private async computeFirstOrder(
    promo: {
      discountMethod: DiscountMethod;
      discountValue: number;
    },
    user: { id: string },
    subtotal: number,
  ): Promise<number> {
    const orderCount = await this.prismaService.order.count({
      where: { userId: user.id },
    });
    if (orderCount > 0) return 0;

    return this.applyMethod(
      promo.discountMethod,
      promo.discountValue,
      subtotal,
    );
  }

  private computeBuyXGetY(
    promo: {
      buyQuantity: number | null;
      getQuantity: number | null;
    },
    cart: CartForDiscount,
  ): number {
    const buy = promo.buyQuantity ?? 0;
    const get = promo.getQuantity ?? 0;
    if (buy < 1 || get < 1) return 0;

    const lines = cart.CartItem.map((item) => ({
      productId: item.productItem.productId,
      price: item.productItem.price,
      quantity: item.quantity,
    }));

    const byProduct = new Map<string, { price: number; quantity: number }[]>();
    for (const line of lines) {
      const arr = byProduct.get(line.productId) ?? [];
      arr.push({ price: line.price, quantity: line.quantity });
      byProduct.set(line.productId, arr);
    }

    let discount = 0;
    for (const arr of byProduct.values()) {
      arr.sort((a, b) => a.price - b.price);
      const totalQty = arr.reduce((s, l) => s + l.quantity, 0);
      const groupSize = buy + get;
      const freeCount = Math.floor(totalQty / groupSize) * get;
      if (freeCount <= 0) continue;

      let remaining = freeCount;
      for (const line of arr) {
        if (remaining <= 0) break;
        const take = Math.min(line.quantity, remaining);
        discount += take * line.price;
        remaining -= take;
      }
    }

    return discount;
  }

  /**
   * Кэширование агрегации популярных товаров для исключения нагрузок на базу
   */
  private async computePopular(
    promo: {
      popularTopN: number | null;
      discountMethod: DiscountMethod;
      discountValue: number;
    },
    cart: CartForDiscount,
  ): Promise<number> {
    const topN = promo.popularTopN ?? 0;
    if (topN < 1) return 0;

    const cacheKey = `promotions:popular_top:${topN}`;
    let topProductIds = await this.cacheManager.get<string[]>(cacheKey);

    if (!topProductIds) {
      const grouped = await this.prismaService.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: topN,
      });

      topProductIds = grouped.map((g) => g.productId);
      // Сохраняем список популярных ID в кэше на 1 час (3 600 000 мс)
      await this.cacheManager.set(cacheKey, topProductIds, 3600000);
    }

    const topSet = new Set(topProductIds);
    if (topSet.size === 0) return 0;

    let discount = 0;
    for (const item of cart.CartItem) {
      if (!topSet.has(item.productItem.productId)) continue;
      const lineSubtotal = item.productItem.price * item.quantity;
      discount += this.applyMethod(
        promo.discountMethod,
        promo.discountValue,
        lineSubtotal,
        item.quantity,
      );
    }

    return discount;
  }

  private applyMethod(
    method: DiscountMethod,
    value: number,
    base: number,
    qty = 1,
  ): number {
    if (method === DiscountMethod.PERCENT) {
      return (base * value) / 100;
    }
    return Math.min(value * qty, base);
  }

  // ─── Приватные утилиты ──────────────────────────────────────────────────────

  private async findById(id: string) {
    const promotion = await this.prismaService.promotion.findUnique({
      where: { id },
      omit: {
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!promotion) {
      throw new NotFoundException('Акция не найдена');
    }
    return promotion;
  }

  private validateTypeFields(fields: {
    type: PromotionType;
    discountMethod: DiscountMethod;
    discountValue?: number;
    buyQuantity?: number | null;
    getQuantity?: number | null;
    popularTopN?: number | null;
  }): void {
    const { type, buyQuantity, getQuantity, popularTopN } = fields;

    if (type === PromotionType.BUY_X_GET_Y) {
      if (!buyQuantity || buyQuantity < 1) {
        throw new BadRequestException(
          'Для типа BUY_X_GET_Y обязательно поле buyQuantity (>= 1)',
        );
      }
      if (!getQuantity || getQuantity < 1) {
        throw new BadRequestException(
          'Для типа BUY_X_GET_Y обязательно поле getQuantity (>= 1)',
        );
      }
    }

    if (type === PromotionType.POPULAR) {
      if (!popularTopN || popularTopN < 1) {
        throw new BadRequestException(
          'Для типа POPULAR обязательно поле popularTopN (>= 1)',
        );
      }
    }

    if (
      fields.discountMethod === DiscountMethod.PERCENT &&
      fields.discountValue !== undefined &&
      (fields.discountValue < 0 || fields.discountValue > 100)
    ) {
      throw new BadRequestException(
        'Для метода PERCENT значение скидки должно быть в диапазоне 0–100',
      );
    }
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
