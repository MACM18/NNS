ALTER TABLE "line_details"
ADD COLUMN "source_sheet_connection_id" TEXT;

ALTER TABLE "line_details"
ADD CONSTRAINT "line_details_source_sheet_connection_id_fkey"
FOREIGN KEY ("source_sheet_connection_id")
REFERENCES "google_sheet_connections"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "line_details_source_sheet_connection_id_idx"
ON "line_details"("source_sheet_connection_id");

ALTER TABLE "google_sheet_auto_sync_runs"
ADD COLUMN "summary_email_status" TEXT,
ADD COLUMN "summary_email_error" TEXT,
ADD COLUMN "summary_email_sent_at" TIMESTAMP(3);
