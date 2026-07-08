import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromoDto } from './dto/create.promo.dto';
import { UpdatePromoDto } from './dto/update.promo.dto';

export interface PromoCodeValidationResult {
  isValid: boolean;
  error?: string;
  discountAmount?: number;
  discountPercent?: number;
}

@Injectable()
export class PromoCodeService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Проверить действительность промокода и рассчитать скидку.
   */
  async validateAndCalculateDiscount(
    code: string,
    orderSubtotal: number,
    productIds?: string[],
  ): Promise<PromoCodeValidationResult> {
    if (!code || !code.trim()) {
      return { isValid: true }; // Пустой код = без скидки
    }

    const promoCode = await this.prismaService.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!promoCode) {
      return {
        isValid: false,
        error: 'Промокод не найден',
      };
    }

    // Проверка активности
    if (!promoCode.isActive) {
      return {
        isValid: false,
        error: 'Промокод неактивен',
      };
    }

    // Проверка дат
    const now = new Date();
    if (now < promoCode.validFrom || now > promoCode.validUntil) {
      return {
        isValid: false,
        error: 'Промокод истёк или ещё не активирован',
      };
    }

    // Проверка количества использований
    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      return {
        isValid: false,
        error: 'Промокод использован максимальное количество раз',
      };
    }

    // Проверка минимальной суммы заказа
    if (promoCode.minOrderAmount && orderSubtotal < promoCode.minOrderAmount) {
      return {
        isValid: false,
        error: `Минимальная сумма заказа: ${promoCode.minOrderAmount} руб.`,
      };
    }

    // Проверка применимости к товарам
    if (promoCode.applicableProducts && productIds && productIds.length > 0) {
      const applicableIds = JSON.parse(promoCode.applicableProducts);
      const hasApplicableProduct = productIds.some((id) =>
        applicableIds.includes(id),
      );
      if (!hasApplicableProduct) {
        return {
          isValid: false,
          error: 'Промокод не применим к выбранным товарам',
        };
      }
    }

    // Расчёт скидки
    let discountAmount = 0;
    let discountPercent = 0;

    if (promoCode.type === 'PERCENT') {
      discountPercent = promoCode.value;
      discountAmount = (orderSubtotal * promoCode.value) / 100;
    } else if (promoCode.type === 'FIXED') {
      discountAmount = promoCode.value;
      discountPercent = (promoCode.value / orderSubtotal) * 100;
    }
    // BOGO обрабатывается отдельно, здесь нет рассчёта

    // Применение максимальной скидки
    if (promoCode.maxDiscount && discountAmount > promoCode.maxDiscount) {
      discountAmount = promoCode.maxDiscount;
      discountPercent = (discountAmount / orderSubtotal) * 100;
    }

    // Скидка не должна быть больше суммы заказа
    if (discountAmount > orderSubtotal) {
      discountAmount = orderSubtotal;
      discountPercent = 100;
    }

    return {
      isValid: true,
      discountAmount: Math.round(discountAmount * 100) / 100,
      discountPercent: Math.round(discountPercent * 100) / 100,
    };
  }

  /**
   * Зафиксировать использование промокода.
   */
  async recordPromoCodeUsage(code: string): Promise<void> {
    const promoCode = await this.prismaService.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!promoCode) {
      throw new NotFoundException('Промокод не найден');
    }

    await this.prismaService.promoCode.update({
      where: { id: promoCode.id },
      data: { currentUses: promoCode.currentUses + 1 },
    });
  }

  /**
   * Создать новый промокод (для администратора).
   */
  async createPromoCode(data: CreatePromoDto) {
    return this.prismaService.promoCode.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description,
        type: data.type,
        value: data.value,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        maxUses: data.maxUses,
        minOrderAmount: data.minOrderAmount,
        maxDiscount: data.maxDiscount,
        applicableProducts: data.applicableProducts
          ? JSON.stringify(data.applicableProducts)
          : null,
      },
    });
  }

  /**
   * Получить промокод по коду.
   */
  async getPromoCode(code: string) {
    return this.prismaService.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });
  }

  async updatePromoCode(data: UpdatePromoDto, id: string) {
    const promoCode = await this.prismaService.promoCode.findUnique({
      where: { id },
    });
    if (!promoCode) {
      throw new NotFoundException('Промокод не найден');
    }
    return this.prismaService.promoCode.update({
      where: { id },
      data: {
        code: data.code.toUpperCase(),
        description: data.description,
        type: data.type,
        value: data.value,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        maxUses: data.maxUses,
        minOrderAmount: data.minOrderAmount,
        maxDiscount: data.maxDiscount,
        applicableProducts: data.applicableProducts
          ? JSON.stringify(data.applicableProducts)
          : null,
      },
    });
  }

  async deletePromoCode(id: string) {
    const promoCode = await this.prismaService.promoCode.findUnique({
      where: { id },
    });

    if (!promoCode) {
      throw new NotFoundException('промокод не найден');
    }

    return this.prismaService.promoCode.delete({ where: { id } });
  }
}
