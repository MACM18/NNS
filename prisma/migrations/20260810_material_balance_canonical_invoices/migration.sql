-- Additive counters for canonical per-day Material Balance invoice updates.
-- Existing invoices, correction invoices, stock events, and snapshots are preserved.

ALTER TABLE "material_balance_imports"
  ADD COLUMN "daily_issue_invoice_update_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "daily_issue_invoice_reversal_count" INTEGER NOT NULL DEFAULT 0;
