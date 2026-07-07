import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '../libs/s3/s3.service';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionCreateDto } from './dto/promotion.create.dto';
import { PromotionUpdateDto } from './dto/promotion.update.dto';
import { PromotionFilterDto } from './dto/promotion.filter.dto';
import {
  DiscountMethod,
  PromotionType,
} from '../generated/prisma/enums';
import type { Prisma } from '../generated/prisma/client';

/** Одна применённая акция в чеке — сохраняется в order.appliedPromotions. */
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

/** Минимальная форма корзины, нужная движку скидок. */
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
  ) {}

  // ─── Публичные CRUD-методы ──────────────────────────────────────────────────

  public async create(image: Express.Multer.File, dto: PromotionCreateDto) {
    this.validateTypeFields(dto);

    const { originalname, mimetype, buffer } = image;
    const imageUrl = await this.s3Service.uploadImage(
      originalname,
      buffer,
      mimetype,
    );

    return this.prismaService.promotion.create({
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
    if (dto.discountValue !== undefined) updateData.discountValue = dto.discountValue;
    if (dto.buyQuantity !== undefined) updateData.buyQuantity = dto.buyQuantity;
    if (dto.getQuantity !== undefined) updateData.getQuantity = dto.getQuantity;
    if (dto.popularTopN !== undefined) updateData.popularTopN = dto.popularTopN;
    if (dto.active !== undefined) updateData.active = dto.active === 'true';
    if (dto.expiresAt !== undefined) updateData.expiresAt = dto.expiresAt ?? null;

    // type неизменяем после создания — игнорируем.
    // Согласованность полей по типу проверяем по уже сохранённым + новым значениям.
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

    return this.prismaService.promotion.update({
      where: { id },
      data: updateData,
    });
  }

  public async delete(id: string) {
    const existing = await this.findById(id);
    await this.s3Service.deleteByUrl(existing.imageUrl);
    await this.prismaService.promotion.delete({ where: { id } });
    return true;
  }

  public async getAll(dto: PromotionFilterDto) {
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
      }),
      this.prismaService.promotion.count({ where }),
    ]);

    return { items, total };
  }

  public async getById(id: string) {
    return this.findById(id);
  }

  /**
   * Активные акции для публичного каталога.
   * Возвращает только name/imageUrl/description/expiresAt.
   * Активной считается: active=true, дата начала (createdAt) <= сейчас,
   * и не истекла (expiresAt > сейчас или null).
   */
  public async getActive() {
    const now = new Date();
    return this.prismaService.promotion.findMany({
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
  }

  // ─── Движок применения скидок ───────────────────────────────────────────────

  /**
   * Считает суммарную скидку по всем активным акциям для текущей корзины.
   * Скидка не может превышать сумму корзины.
   */
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

  /** Активна ли акция в момент `now`. */
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

  /** Скидка по одной акции (без ограничения общей суммой). */
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

  /**
   * FIRST_ORDER: скидка на первый заказ.
   * Считаем ВСЕ заказы юзера (даже отменённые) — анти-абуз.
   */
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

    return this.applyMethod(promo.discountMethod, promo.discountValue, subtotal);
  }

  /**
   * BUY_X_GET_Y: «1+1=3».
   * Группируем корзину по productId; на каждые (buyQuantity+getQuantity) штук
   * getQuantity достаются бесплатно. Бесплатные единицы списываем с самых
   * дешёвых линий этого товара.
   * discountMethod/discountValue игнорируются.
   */
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

    // Линии корзины, сгруппированные по productId, отсортированные по цене
    // внутри группы (дешёвые первыми — списываем их).
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

      // Списываем бесплатные единицы с самых дешёвых линий.
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
   * POPULAR: скидка на топ-N самых покупаемых товаров.
   * Топ считается по всем order_items (статусы не фильтруем — это история
   * покупок, а не текущие корзины).
   * Скидка применяется к линиям корзины, чей productId входит в топ-N.
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

    const grouped = await this.prismaService.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: topN,
    });

    const topProductIds = new Set(grouped.map((g) => g.productId));
    if (topProductIds.size === 0) return 0;

    let discount = 0;
    for (const item of cart.CartItem) {
      if (!topProductIds.has(item.productItem.productId)) continue;
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

  /**
   * Применяет метод скидки.
   * PERCENT: base * value/100.
   * FIXED: min(value * qty, base) — фиксированная сумма на единицу, ограничена
   * суммой линии (по умолчанию qty=1 для FIRST_ORDER, где base = subtotal).
   */
  private applyMethod(
    method: DiscountMethod,
    value: number,
    base: number,
    qty = 1,
  ): number {
    if (method === DiscountMethod.PERCENT) {
      return (base * value) / 100;
    }
    // FIXED
    return Math.min(value * qty, base);
  }

  // ─── Приватные утилиты ──────────────────────────────────────────────────────

  private async findById(id: string) {
    const promotion = await this.prismaService.promotion.findUnique({
      where: { id },
    });
    if (!promotion) {
      throw new NotFoundException('Акция не найдена');
    }
    return promotion;
  }

  /**
   * Сервис-side валидация связки полей по типу акции.
   * Конвенция проекта — мягкая DTO-валидация + проверки в сервисе.
   */
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

/** Округление до копеек, чтобы избежать накопления float-погрешности. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}