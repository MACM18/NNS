ALTER TABLE "generated_invoices"
  ADD COLUMN "invoice_content_snapshot" JSONB;

CREATE TABLE "invoice_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "percent_a" INTEGER NOT NULL DEFAULT 90,
  "percent_b" INTEGER NOT NULL DEFAULT 10,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_settings_percentages_sum_100_check" CHECK ("percent_a" BETWEEN 1 AND 99 AND "percent_b" BETWEEN 1 AND 99 AND "percent_a" + "percent_b" = 100)
);

INSERT INTO "invoice_settings" ("id", "percent_a", "percent_b", "updated_at")
VALUES ('default', 90, 10, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
