-- Additive metadata for system-generated free-issued Material Balance invoices
-- and month-end reconciliation. Existing invoices and stock history are preserved.

ALTER TABLE "inventory_invoices"
  ADD COLUMN "source_type" TEXT,
  ADD COLUMN "source_key" TEXT,
  ADD COLUMN "material_balance_import_id" TEXT,
  ADD COLUMN "source_date" DATE,
  ADD COLUMN "is_system_generated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "correction_of_id" TEXT;

ALTER TABLE "material_balance_imports"
  ADD COLUMN "daily_issue_invoice_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "correction_invoice_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reconciliation_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "monthly_source_tab" TEXT,
  ADD COLUMN "monthly_checksum" TEXT,
  ADD COLUMN "monthly_item_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "stock_changes" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "material_balance_items"
  ADD COLUMN "month_opening_balance" DECIMAL(65,30),
  ADD COLUMN "month_stock_issued" DECIMAL(65,30),
  ADD COLUMN "month_in_hand" DECIMAL(65,30),
  ADD COLUMN "month_material_used" DECIMAL(65,30),
  ADD COLUMN "month_ending_wip" DECIMAL(65,30),
  ADD COLUMN "month_source_row" INTEGER;

CREATE UNIQUE INDEX "inventory_invoices_source_key_key"
  ON "inventory_invoices"("source_key");
CREATE INDEX "inventory_invoices_material_balance_import_id_idx"
  ON "inventory_invoices"("material_balance_import_id");
CREATE INDEX "inventory_invoices_source_type_source_date_idx"
  ON "inventory_invoices"("source_type", "source_date");
CREATE INDEX "inventory_invoices_correction_of_id_idx"
  ON "inventory_invoices"("correction_of_id");

ALTER TABLE "inventory_invoices"
  ADD CONSTRAINT "inventory_invoices_material_balance_import_id_fkey"
  FOREIGN KEY ("material_balance_import_id") REFERENCES "material_balance_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_invoices"
  ADD CONSTRAINT "inventory_invoices_correction_of_id_fkey"
  FOREIGN KEY ("correction_of_id") REFERENCES "inventory_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
