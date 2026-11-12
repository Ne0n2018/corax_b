/**
 * Ключи и типы для серверного расчёта цены варианта товара.
 *
 * Цена варианта хранится в БД разнесённо: базовая цена товара
 * (products.default_price) плюс надбавки опций (tastes.price, "Size".price).
 * Клиент не влияет на сумму — она всегда пересчитывается сервером по справочникам.
 */

/**
 * Ссылка на товар и его опции. taste/size — это названия опций
 * (именно так их хранит ProductItem), а не идентификаторы.
 */
export interface VariantPriceRef {
  productId: string;
  taste?: string | null;
  size?: string | null;
}

/** Стабильный ключ Map для варианта (пустые опции приводятся к '') */
export function variantPriceKey(ref: VariantPriceRef): string {
  return `${ref.productId}||${ref.taste ?? ''}||${ref.size ?? ''}`;
}
