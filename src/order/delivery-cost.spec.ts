import { DeliveryType } from './dto/create-order.dto';
import {
  getDeliveryCost,
  DELIVERY_COST_BY_TYPE,
  COURIER_DELIVERY_COST,
} from './delivery-cost';

describe('Тарифы доставки', () => {
  it('курьер (DELIVERY) стоит 15 BYN', () => {
    expect(getDeliveryCost(DeliveryType.DELIVERY)).toBe(15);
    expect(COURIER_DELIVERY_COST).toBe(15);
  });

  it('самовывоз (PICKUP) — бесплатно', () => {
    expect(getDeliveryCost(DeliveryType.PICKUP)).toBe(0);
  });

  it('Белпочта (BELMAIL) — бесплатно', () => {
    expect(getDeliveryCost(DeliveryType.BELMAIL)).toBe(0);
  });

  it('Европочта (EUROMAIL) — бесплатно', () => {
    expect(getDeliveryCost(DeliveryType.EUROMAIL)).toBe(0);
  });

  it('неизвестный тип доставки возвращает 0', () => {
    expect(getDeliveryCost('NOPE' as DeliveryType)).toBe(0);
  });

  it('сетка покрывает все типы доставки из DTO', () => {
    expect(Object.keys(DELIVERY_COST_BY_TYPE).sort()).toEqual(
      Object.values(DeliveryType).sort(),
    );
  });
});
