-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ONLINE', 'CASH', 'CARD');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- DropForeignKey: убираем старую связь ProductItem -> Order
ALTER TABLE "product_item" DROP COLUMN IF EXISTS "orderId";

-- DropTable: удаляем старую пустую таблицу Order (без @map она называется "Order")
DROP TABLE IF EXISTS "Order";

-- CreateTable: полноценная таблица заказов
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "delivery_type" "DeliveryType" NOT NULL,
    "address" TEXT,
    "payment_type" "PaymentType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total_amount" DOUBLE PRECISION NOT NULL,
    "bepaid_token" TEXT,
    "bepaid_uid" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: позиции заказа (снимок на момент оформления)
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "product_item_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "taste" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "order_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: заказ → пользователь
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: позиция → заказ
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
