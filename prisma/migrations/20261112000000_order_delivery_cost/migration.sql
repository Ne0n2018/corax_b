-- Серверный расчёт стоимости заказа: стоимость доставки хранится отдельно от товаров
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_cost" DOUBLE PRECISION NOT NULL DEFAULT 0;
