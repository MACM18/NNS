-- Additive inventory item lifecycle support.
-- Existing items remain active and all historical records are preserved.

ALTER TABLE "inventory_items"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "inventory_items_is_active_idx"
  ON "inventory_items"("is_active");
