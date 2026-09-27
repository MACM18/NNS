ALTER TABLE "google_sheet_connections" ADD COLUMN "auto_sync_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "google_sheet_sync_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "daily_time" TEXT NOT NULL DEFAULT '02:00',
  "time_zone" TEXT NOT NULL DEFAULT 'Asia/Colombo',
  "active_period" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "google_sheet_sync_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "google_sheet_auto_sync_runs" (
  "id" TEXT NOT NULL,
  "local_date" TEXT NOT NULL,
  "connection_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "error" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "google_sheet_auto_sync_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "google_sheet_auto_sync_runs_local_date_key" ON "google_sheet_auto_sync_runs"("local_date");

-- Start with the newest sheet for the current local month; older months stay unchecked.
UPDATE "google_sheet_connections"
SET "auto_sync_enabled" = true
WHERE "id" = (
  SELECT "id" FROM "google_sheet_connections"
  WHERE "year" = EXTRACT(YEAR FROM CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo')
    AND "month" = EXTRACT(MONTH FROM CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo')
  ORDER BY "created_at" DESC, "id" DESC LIMIT 1
);
