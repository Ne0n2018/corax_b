-- Удаляем поля bePaid и добавляем поля платёжного шлюза Альфа-Банка
ALTER TABLE "orders"
    DROP COLUMN "bepaid_token",
    DROP COLUMN "bepaid_uid",
    ADD COLUMN "payment_order_id" TEXT,
    ADD COLUMN "payment_order_number" TEXT;

-- orderNumber должен быть уникальным в системе мерчанта (по нему ищем заказ в callback)
CREATE UNIQUE INDEX "orders_payment_order_number_key" ON "orders"("payment_order_number");
