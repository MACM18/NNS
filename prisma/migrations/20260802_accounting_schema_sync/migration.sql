-- Reviewed additive accounting schema migration.
-- Generated from the configured development database to prisma/schema.prisma.

ALTER TABLE "accounting_periods" ADD COLUMN "financial_year_id" TEXT;

ALTER TABLE "accounting_settings"
  ADD COLUMN "default_payroll_deductions_account_id" TEXT,
  ADD COLUMN "fiscal_year_start_day" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "tax_mappings" JSONB,
  ALTER COLUMN "fiscal_year_start" SET DEFAULT 4;

ALTER TABLE "generated_invoices"
  ADD COLUMN "accounting_status" TEXT NOT NULL DEFAULT 'unposted',
  ADD COLUMN "financial_year_id" TEXT,
  ADD COLUMN "is_opening_balance" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "posted_journal_entry_id" TEXT;

ALTER TABLE "journal_entries"
  ADD COLUMN "financial_year_id" TEXT,
  ADD COLUMN "source_key" TEXT;

ALTER TABLE "worker_payments"
  ADD COLUMN "accrual_journal_entry_id" TEXT,
  ADD COLUMN "payment_journal_entry_id" TEXT;

CREATE TABLE "accounting_sequences" (
    "id" TEXT NOT NULL,
    "sequence_key" TEXT NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "accounting_sequences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_years" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year_of_assessment" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "financial_years_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partnership_partners" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capital_account_id" TEXT,
    "drawings_account_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partnership_partners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_allocations" (
    "id" TEXT NOT NULL,
    "financial_year_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "allocated_profit" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_transactions" (
    "id" TEXT NOT NULL,
    "financial_year_id" TEXT,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "is_deductible" BOOLEAN NOT NULL DEFAULT false,
    "partner_id" TEXT,
    "payment_method" TEXT,
    "cash_account_id" TEXT,
    "offset_account_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "journal_entry_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounting_vouchers" (
    "id" TEXT NOT NULL,
    "business_transaction_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "receipt_no" TEXT,
    "payee_name" TEXT,
    "payee_nic_encrypted" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounting_vouchers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounting_sequences_sequence_key_key" ON "accounting_sequences"("sequence_key");
CREATE INDEX "financial_years_start_date_end_date_idx" ON "financial_years"("start_date", "end_date");
CREATE UNIQUE INDEX "financial_years_start_date_end_date_key" ON "financial_years"("start_date", "end_date");
CREATE UNIQUE INDEX "partnership_partners_code_key" ON "partnership_partners"("code");
CREATE UNIQUE INDEX "partner_allocations_financial_year_id_partner_id_key" ON "partner_allocations"("financial_year_id", "partner_id");
CREATE UNIQUE INDEX "business_transactions_journal_entry_id_key" ON "business_transactions"("journal_entry_id");
CREATE INDEX "business_transactions_date_idx" ON "business_transactions"("date");
CREATE INDEX "business_transactions_type_is_deductible_idx" ON "business_transactions"("type", "is_deductible");
CREATE INDEX "accounting_vouchers_business_transaction_id_idx" ON "accounting_vouchers"("business_transaction_id");
CREATE UNIQUE INDEX "generated_invoices_posted_journal_entry_id_key" ON "generated_invoices"("posted_journal_entry_id");
CREATE UNIQUE INDEX "journal_entries_source_key_key" ON "journal_entries"("source_key");
CREATE UNIQUE INDEX "worker_payments_accrual_journal_entry_id_key" ON "worker_payments"("accrual_journal_entry_id");
CREATE UNIQUE INDEX "worker_payments_payment_journal_entry_id_key" ON "worker_payments"("payment_journal_entry_id");

ALTER TABLE "generated_invoices" ADD CONSTRAINT "generated_invoices_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_years" ADD CONSTRAINT "financial_years_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "partner_allocations" ADD CONSTRAINT "partner_allocations_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_allocations" ADD CONSTRAINT "partner_allocations_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partnership_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_transactions" ADD CONSTRAINT "business_transactions_financial_year_id_fkey" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_transactions" ADD CONSTRAINT "business_transactions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partnership_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_transactions" ADD CONSTRAINT "business_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_transactions" ADD CONSTRAINT "business_transactions_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "accounting_vouchers" ADD CONSTRAINT "accounting_vouchers_business_transaction_id_fkey" FOREIGN KEY ("business_transaction_id") REFERENCES "business_transactions"("id") ON DELETE CASCADE;
