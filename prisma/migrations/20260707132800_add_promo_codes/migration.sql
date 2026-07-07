-- Add DiscountType enum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED', 'BOGO');

-- Create promo_codes table
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_uses" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "min_order_amount" DOUBLE PRECISION,
    "max_discount" DOUBLE PRECISION,
    "applicable_products" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "promo_codes_code_key" UNIQUE ("code")
);

-- Update orders table: add discount-related columns
ALTER TABLE "orders" 
ADD COLUMN "subtotal_amount" DOUBLE PRECISION,
ADD COLUMN "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "promo_code" TEXT;

-- Set subtotal_amount = total_amount for existing records
UPDATE "orders" SET "subtotal_amount" = "total_amount" WHERE "subtotal_amount" IS NULL;

-- Make subtotal_amount NOT NULL
ALTER TABLE "orders" ALTER COLUMN "subtotal_amount" SET NOT NULL;
