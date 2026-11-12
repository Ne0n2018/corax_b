import { DeliveryType } from './dto/create-order.dto';

/** Стоимость доставки курьером, BYN */
export const COURIER_DELIVERY_COST = 15;

/**
 * Тарифная сетка доставки, BYN.
 *
 * Используется как единственный источник стоимости доставки: клиент не может
 * передать сумму — она определяется только типом доставки на сервере.
 *
 * Курьер — платно, самовывоз и отправка почтой/в почтомат — бесплатно.
 */
export const DELIVERY_COST_BY_TYPE: Record<DeliveryType, number> = {
  [DeliveryType.PICKUP]: 0,
  [DeliveryType.EUROMAIL]: 0,
  // Тариф Белпочты приравнен к Европочте (0) — заказчиком не задавался
  [DeliveryType.BELMAIL]: 0,
  [DeliveryType.DELIVERY]: COURIER_DELIVERY_COST,
};

/** Стоимость доставки для выбранного типа (0 для неизвестного типа) */
export function getDeliveryCost(deliveryType: DeliveryType): number {
  return DELIVERY_COST_BY_TYPE[deliveryType] ?? 0;
}
