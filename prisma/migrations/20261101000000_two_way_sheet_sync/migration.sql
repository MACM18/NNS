CREATE TABLE "google_sheet_line_sync" (
  "line_id" TEXT NOT NULL PRIMARY KEY,
  "connection_id" TEXT NOT NULL,
  "sheet_row" INTEGER,
  "origin" TEXT NOT NULL DEFAULT 'legacy_unknown',
  "baseline" JSONB NOT NULL DEFAULT '{}',
  "drum_baseline" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'synced',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "pending_operation" TEXT,
  "pending_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "conflict_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "app_touched" BOOLEAN NOT NULL DEFAULT false,
  "last_error" TEXT,
  "last_synced_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "google_sheet_line_sync_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "google_sheet_connections"("id") ON DELETE CASCADE
);
CREATE INDEX "google_sheet_line_sync_connection_id_status_idx" ON "google_sheet_line_sync"("connection_id", "status");
CREATE INDEX "google_sheet_line_sync_connection_id_sheet_row_idx" ON "google_sheet_line_sync"("connection_id", "sheet_row");

CREATE TABLE "google_sheet_issued_sync" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "connection_id" TEXT NOT NULL,
  "source_date" DATE NOT NULL,
  "inventory_item_id" TEXT NOT NULL,
  "sheet_row" INTEGER,
  "sheet_column" INTEGER,
  "sheet_value" DECIMAL(65,30),
  "observed_value" DECIMAL(65,30),
  "app_quantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "last_synced_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "google_sheet_issued_sync_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "google_sheet_connections"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "google_sheet_issued_sync_connection_id_source_date_inventory_item_id_key" ON "google_sheet_issued_sync"("connection_id", "source_date", "inventory_item_id");
CREATE INDEX "google_sheet_issued_sync_connection_id_status_idx" ON "google_sheet_issued_sync"("connection_id", "status");

CREATE TABLE "google_sheet_invoice_contribution" (
  "invoice_id" TEXT NOT NULL,
  "inventory_item_id" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "source_date" DATE NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "google_sheet_invoice_contribution_pkey" PRIMARY KEY ("invoice_id", "inventory_item_id")
);
CREATE INDEX "google_sheet_invoice_contribution_connection_id_source_date_inventory_item_id_idx" ON "google_sheet_invoice_contribution"("connection_id", "source_date", "inventory_item_id");
