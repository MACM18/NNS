-- Accounting records are intentionally removed. Service invoices and
-- inventory invoices remain operational records.
-- Drop invoice columns first because financial_year_id has a foreign key to
-- financial_years, which is removed below. Keep these operations idempotent so
-- a partially applied deployment can safely retry the migration.
ALTER TABLE "generated_invoices"
  DROP COLUMN IF EXISTS "payment_status",
  DROP COLUMN IF EXISTS "paid_amount",
  DROP COLUMN IF EXISTS "currency_code",
  DROP COLUMN IF EXISTS "due_date",
  DROP COLUMN IF EXISTS "financial_year_id",
  DROP COLUMN IF EXISTS "accounting_status",
  DROP COLUMN IF EXISTS "is_opening_balance",
  DROP COLUMN IF EXISTS "posted_journal_entry_id";

ALTER TABLE "worker_payments"
  DROP COLUMN IF EXISTS "accrual_journal_entry_id",
  DROP COLUMN IF EXISTS "payment_journal_entry_id";

DROP TABLE IF EXISTS "accounting_vouchers";
DROP TABLE IF EXISTS "business_transactions";
DROP TABLE IF EXISTS "partner_allocations";
DROP TABLE IF EXISTS "invoice_payments";
DROP TABLE IF EXISTS "journal_entry_lines";
DROP TABLE IF EXISTS "journal_entries";
DROP TABLE IF EXISTS "bank_accounts";
DROP TABLE IF EXISTS "accounting_periods";
DROP TABLE IF EXISTS "accounting_settings";
DROP TABLE IF EXISTS "accounting_sequences";
DROP TABLE IF EXISTS "financial_years";
DROP TABLE IF EXISTS "partnership_partners";
DROP TABLE IF EXISTS "chart_of_accounts";
DROP TABLE IF EXISTS "currencies";
