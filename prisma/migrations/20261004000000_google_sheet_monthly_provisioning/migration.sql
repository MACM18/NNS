CREATE TABLE "google_sheet_monthly_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "template_file_id" TEXT,
  "destination_folder_id" TEXT,
  "name_pattern" TEXT NOT NULL DEFAULT 'NNS Telecom - {Month} {Year}',
  "clear_ranges" JSONB NOT NULL DEFAULT '[]',
  "month_cell" TEXT,
  "balance_mappings" JSONB NOT NULL DEFAULT '[]',
  "editors" JSONB NOT NULL DEFAULT '[]',
  "admin_email" TEXT,
  "encrypted_refresh_token" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "google_sheet_monthly_settings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "google_sheet_monthly_runs" (
  "id" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "file_id" TEXT,
  "file_url" TEXT,
  "error" TEXT,
  "previous_sync_at" TIMESTAMP(3),
  "sheet_prepared_at" TIMESTAMP(3),
  "access_granted_at" TIMESTAMP(3),
  "connection_registered_at" TIMESTAMP(3),
  "summary_email_sent_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "google_sheet_monthly_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "google_sheet_monthly_runs_period_key" ON "google_sheet_monthly_runs"("period");
