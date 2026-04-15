-- AlterEnum: добавляем BELMAIL и EUROMAIL в DeliveryType (если ещё не добавлены)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BELMAIL' AND enumtypid = 'public."DeliveryType"'::regtype) THEN
    ALTER TYPE "DeliveryType" ADD VALUE 'BELMAIL';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EUROMAIL' AND enumtypid = 'public."DeliveryType"'::regtype) THEN
    ALTER TYPE "DeliveryType" ADD VALUE 'EUROMAIL';
  END IF;
END $$;

-- AlterTable: добавляем order_code с временным дефолтом для существующих строк
ALTER TABLE "orders" ADD COLUMN "order_code" INTEGER;

-- Заполняем существующие заказы уникальными кодами
DO $$
DECLARE
  rec RECORD;
  new_code INT;
BEGIN
  FOR rec IN SELECT id FROM "orders" WHERE "order_code" IS NULL LOOP
    LOOP
      new_code := floor(random() * 900000 + 100000)::INT;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "orders" WHERE "order_code" = new_code);
    END LOOP;
    UPDATE "orders" SET "order_code" = new_code WHERE id = rec.id;
  END LOOP;
END $$;

-- Теперь делаем NOT NULL и уникальным
ALTER TABLE "orders" ALTER COLUMN "order_code" SET NOT NULL;
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");
