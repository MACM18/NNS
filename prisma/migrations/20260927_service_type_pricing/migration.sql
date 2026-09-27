-- Existing tiers remain FTTH. Invoices already issued retain their snapshots.
ALTER TABLE "pricing_schedules"
  ADD COLUMN "peo_tv_rate" DECIMAL(14,2) NOT NULL DEFAULT 1800,
  ADD COLUMN "optional_rates" JSONB NOT NULL DEFAULT '{"POLE_56":700,"POLE_67":800,"POLE_8":900,"HIGH_RISE":3800}'::jsonb;

ALTER TABLE "generated_invoices"
  ADD COLUMN "optional_items_snapshot" JSONB;

ALTER TABLE "pricing_tiers"
  ADD COLUMN "service_type" TEXT NOT NULL DEFAULT 'FTTH';

DROP INDEX IF EXISTS "pricing_tiers_pricing_schedule_id_min_length_max_length_idx";
CREATE INDEX "pricing_tiers_schedule_type_length_idx"
  ON "pricing_tiers"("pricing_schedule_id", "service_type", "min_length", "max_length");

-- Start the supplied rate card at the beginning of the deployment month.
-- Earlier schedules and issued invoice snapshots are retained.
WITH inserted AS (
  INSERT INTO "pricing_schedules" ("id", "name", "effective_from", "status", "peo_tv_rate", "optional_rates", "updated_at")
  SELECT gen_random_uuid()::text, 'FTTH, Data Line and Peo TV rates', date_trunc('month', CURRENT_DATE)::date,  'active', 1800, '{"POLE_56":700,"POLE_67":800,"POLE_8":900,"HIGH_RISE":3800}'::jsonb, CURRENT_TIMESTAMP
  WHERE NOT EXISTS (
    SELECT 1 FROM "pricing_schedules" WHERE "effective_from" = date_trunc('month', CURRENT_DATE)::date
  )
  RETURNING "id"
)
INSERT INTO "pricing_tiers" ("id", "pricing_schedule_id", "service_type", "min_length", "max_length", "rate")
SELECT gen_random_uuid()::text, inserted.id, rates.service_type, rates.min_length, rates.max_length, rates.rate
FROM inserted
CROSS JOIN (VALUES
  ('FTTH', 0, 100, 6650), ('FTTH', 101, 200, 7000), ('FTTH', 201, 300, 7800),
  ('FTTH', 301, 400, 8400), ('FTTH', 401, 500, 8800), ('FTTH', 501, NULL, 9000),
  ('DATA', 0, 100, 5000), ('DATA', 101, 200, 5500), ('DATA', 201, 300, 6800),
  ('DATA', 301, 400, 6800), ('DATA', 401, 500, 7200), ('DATA', 501, NULL, 7400)
) AS rates(service_type, min_length, max_length, rate);
