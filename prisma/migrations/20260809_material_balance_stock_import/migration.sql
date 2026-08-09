-- Additive Material Balance stock import migration.
-- The source Google Sheet remains read-only. Existing inventory and accounting
-- rows are preserved; this migration only adds audit and snapshot tables.

CREATE TABLE "material_balance_imports" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "source_tab" TEXT NOT NULL DEFAULT 'Material Balance',
    "source_checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_row_count" INTEGER NOT NULL DEFAULT 0,
    "source_day_count" INTEGER NOT NULL DEFAULT 0,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "mapped_item_count" INTEGER NOT NULL DEFAULT 0,
    "unmapped_item_count" INTEGER NOT NULL DEFAULT 0,
    "updated_stock_count" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "discrepancies" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_balance_imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "material_balance_items" (
    "id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "source_item_name" TEXT NOT NULL,
    "normalized_source_name" TEXT NOT NULL,
    "source_unit" TEXT,
    "source_row" INTEGER NOT NULL,
    "inventory_item_id" TEXT,
    "opening_balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_issued" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_usage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_returned" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "final_balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'unmapped',
    "warning" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_balance_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "material_balance_daily_entries" (
    "id" TEXT NOT NULL,
    "material_balance_item_id" TEXT NOT NULL,
    "balance_date" DATE NOT NULL,
    "previous_balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "issued" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "usage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance_return" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(65,30),
    "source_column" INTEGER,
    "source_block_index" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_balance_daily_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "material_balance_item_mappings" (
    "id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "normalized_source_name" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_balance_item_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_stock_events" (
    "id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_reference_id" TEXT,
    "material_balance_import_id" TEXT,
    "previous_stock" DECIMAL(65,30) NOT NULL,
    "new_stock" DECIMAL(65,30) NOT NULL,
    "quantity_delta" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_stock_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "material_balance_imports_connection_id_source_checksum_key"
    ON "material_balance_imports"("connection_id", "source_checksum");
CREATE INDEX "material_balance_imports_connection_id_imported_at_idx"
    ON "material_balance_imports"("connection_id", "imported_at");
CREATE INDEX "material_balance_imports_status_idx"
    ON "material_balance_imports"("status");

CREATE INDEX "material_balance_items_import_id_status_idx"
    ON "material_balance_items"("import_id", "status");
CREATE INDEX "material_balance_items_inventory_item_id_idx"
    ON "material_balance_items"("inventory_item_id");

CREATE UNIQUE INDEX "material_balance_daily_entries_material_balance_item_id_balance_date_key"
    ON "material_balance_daily_entries"("material_balance_item_id", "balance_date");
CREATE INDEX "material_balance_daily_entries_balance_date_idx"
    ON "material_balance_daily_entries"("balance_date");

CREATE UNIQUE INDEX "material_balance_item_mappings_normalized_source_name_key"
    ON "material_balance_item_mappings"("normalized_source_name");
CREATE INDEX "material_balance_item_mappings_inventory_item_id_idx"
    ON "material_balance_item_mappings"("inventory_item_id");

CREATE INDEX "inventory_stock_events_inventory_item_id_created_at_idx"
    ON "inventory_stock_events"("inventory_item_id", "created_at");
CREATE INDEX "inventory_stock_events_source_type_source_reference_id_idx"
    ON "inventory_stock_events"("source_type", "source_reference_id");
CREATE INDEX "inventory_stock_events_material_balance_import_id_idx"
    ON "inventory_stock_events"("material_balance_import_id");

ALTER TABLE "material_balance_imports"
  ADD CONSTRAINT "material_balance_imports_connection_id_fkey"
  FOREIGN KEY ("connection_id") REFERENCES "google_sheet_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_balance_imports"
  ADD CONSTRAINT "material_balance_imports_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "material_balance_items"
  ADD CONSTRAINT "material_balance_items_import_id_fkey"
  FOREIGN KEY ("import_id") REFERENCES "material_balance_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_balance_items"
  ADD CONSTRAINT "material_balance_items_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "material_balance_daily_entries"
  ADD CONSTRAINT "material_balance_daily_entries_material_balance_item_id_fkey"
  FOREIGN KEY ("material_balance_item_id") REFERENCES "material_balance_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "material_balance_item_mappings"
  ADD CONSTRAINT "material_balance_item_mappings_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_balance_item_mappings"
  ADD CONSTRAINT "material_balance_item_mappings_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_stock_events"
  ADD CONSTRAINT "inventory_stock_events_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_stock_events"
  ADD CONSTRAINT "inventory_stock_events_material_balance_import_id_fkey"
  FOREIGN KEY ("material_balance_import_id") REFERENCES "material_balance_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_stock_events"
  ADD CONSTRAINT "inventory_stock_events_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
