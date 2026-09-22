import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { REDIS_CLIENT } from '../../session/redis.provider';
import { Redis } from 'ioredis';

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);

  public constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  /**
   * Получение значения из кэша
   */
  public async get<T>(key: string): Promise<T | undefined> {
    try {
      const data = await this.cacheManager.get<T>(key);
      return data ?? undefined;
    } catch (error) {
      this.logger.error(`Ошибка при получении кэша [${key}]:`, error);
      return undefined;
    }
  }

  /**
   * Запись значения в кэш с TTL в миллисекундах
   */
  public async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttlMs);
    } catch (error) {
      this.logger.error(`Ошибка при сохранении в кэш [${key}]:`, error);
    }
  }

  /**
   * Удаление одного конкретного ключа
   */
  public async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch {}

    try {
      await this.redisClient.del(key);
      await this.redisClient.del(`keyv:${key}`);
    } catch (error) {
      this.logger.error(`Ошибка при удалении ключа [${key}] из Redis:`, error);
    }
  }

  /**
   * Удаление ключей по маске (шаблону) через Redis SCAN / KEYS
   */
  public async delByPattern(pattern: string): Promise<void> {
    try {
      const searchPattern = pattern.startsWith('*') ? pattern : `*${pattern}`;
      const keys = await this.redisClient.keys(searchPattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.logger.debug(`Сброшено ${keys.length} ключей по шаблону "${searchPattern}"`);
      }
    } catch (error) {
      this.logger.error(`Ошибка при удалении ключей по шаблону [${pattern}]:`, error);
    }
  }

  /* ==================== ДОМЕННЫЕ МЕТОДЫ ИНВАЛИДАЦИИ ==================== */

  /**
   * Сброс кэша товаров (конкретного товара, всех списков каталога и админки, а также топов)
   */
  public async clearProductCache(productId?: string): Promise<void> {
    if (productId) {
      await this.del(`product:${productId}`);
      await this.delByPattern(`*product:${productId}*`);
    }
    // Удаляем все списки каталога и админки (products:catalog:*, products:all:*, products:list:*)
    await this.delByPattern('*products:*');
    // Сбрасываем топ товаров, так как изменились характеристики/продажи/наличие
    await this.del('top-products');
    await this.del('/top-products');
    await this.delByPattern('*top-products*');
  }

  /**
   * Сброс кэша категорий и связанных списков товаров
   */
  public async clearCategoryCache(): Promise<void> {
    await this.del('category');
    await this.del('/category');
    await this.delByPattern('*category*');
    // Списки каталога зависят от категорий и подкатегорий
    await this.delByPattern('products:*');
  }

  /**
   * Сброс кэша поставщиков и связанных списков товаров
   */
  public async clearProviderCache(providerId?: string): Promise<void> {
    if (providerId) {
      await this.del(`/providers/${providerId}`);
      await this.del(`provider:${providerId}`);
    }
    await this.del('/providers');
    await this.delByPattern('*providers*');
    await this.delByPattern('*provider*');
    // Название поставщика может отображаться в карточках каталога
    await this.delByPattern('products:*');
  }

  /**
   * Сброс кэша акций (конкретной акции, активных акций, списков и топа популярных товаров)
   */
  public async clearPromotionCache(promotionId?: string): Promise<void> {
    if (promotionId) {
      await this.del(`promotion:${promotionId}`);
    }
    await this.del('promotions:active');
    await this.delByPattern('promotions:list:*');
    await this.delByPattern('promotions:popular_top:*');
  }

  /**
   * Сброс кэша топа товаров
   */
  public async clearTopProductsCache(): Promise<void> {
    await this.del('top-products');
    await this.del('/top-products');
    await this.delByPattern('*top-products*');
  }
}
