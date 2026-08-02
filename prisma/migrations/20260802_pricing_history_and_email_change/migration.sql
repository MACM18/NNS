-- Reviewed additive migration for immutable pricing history and verified email changes.
-- Existing company_settings.pricing_tiers and generated invoice rows are retained.
-- Existing invoices are intentionally not backfilled with guessed historical rates.

ALTER TABLE "generated_invoices"
  ADD COLUMN "pricing_schedule_id" TEXT,
  ADD COLUMN "pricing_snapshot" JSONB,
  ADD COLUMN "line_details_snapshot" JSONB;

CREATE TABLE "pricing_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pricing_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pricing_tiers" (
    "id" TEXT NOT NULL,
    "pricing_schedule_id" TEXT NOT NULL,
    "min_length" DECIMAL(10,2) NOT NULL,
    "max_length" DECIMAL(10,2),
    "rate" DECIMAL(14,2) NOT NULL,
    CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_change_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "new_email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pricing_schedules_effective_from_key" ON "pricing_schedules"("effective_from");
CREATE INDEX "pricing_schedules_effective_from_status_idx" ON "pricing_schedules"("effective_from", "status");
CREATE INDEX "pricing_tiers_pricing_schedule_id_min_length_max_length_idx" ON "pricing_tiers"("pricing_schedule_id", "min_length", "max_length");
CREATE UNIQUE INDEX "email_change_requests_token_hash_key" ON "email_change_requests"("token_hash");
CREATE INDEX "email_change_requests_user_id_expires_at_idx" ON "email_change_requests"("user_id", "expires_at");
CREATE INDEX "email_change_requests_new_email_expires_at_idx" ON "email_change_requests"("new_email", "expires_at");

ALTER TABLE "generated_invoices"
  ADD CONSTRAINT "generated_invoices_pricing_schedule_id_fkey"
  FOREIGN KEY ("pricing_schedule_id") REFERENCES "pricing_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pricing_schedules"
  ADD CONSTRAINT "pricing_schedules_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pricing_tiers"
  ADD CONSTRAINT "pricing_tiers_pricing_schedule_id_fkey"
  FOREIGN KEY ("pricing_schedule_id") REFERENCES "pricing_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_change_requests"
  ADD CONSTRAINT "email_change_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
