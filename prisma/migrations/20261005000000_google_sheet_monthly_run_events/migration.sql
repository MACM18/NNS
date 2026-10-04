ALTER TABLE "google_sheet_monthly_runs"
ADD COLUMN "events" JSONB NOT NULL DEFAULT '[]'::jsonb;
