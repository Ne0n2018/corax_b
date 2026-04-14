-- DropIndex: убираем глобальный уникальный индекс по одному productItemId
DROP INDEX "cart_item_product_item_id_key";

-- CreateIndex: новый уникальный индекс — один ProductItem может встречаться
-- в разных корзинах, но не дублироваться внутри одной корзины
CREATE UNIQUE INDEX "cart_item_product_item_id_cart_id_key" ON "cart_item"("product_item_id", "cart_id");
