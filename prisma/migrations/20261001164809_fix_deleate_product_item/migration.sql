-- DropForeignKey
ALTER TABLE "product_item" DROP CONSTRAINT "product_item_product_id_fkey";

-- AddForeignKey
ALTER TABLE "product_item" ADD CONSTRAINT "product_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
