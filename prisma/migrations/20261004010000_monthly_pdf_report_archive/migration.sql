CREATE TABLE "monthly_reports" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "share_active" BOOLEAN NOT NULL DEFAULT false,
    "share_token_hash" TEXT,
    "encrypted_share_token" TEXT,
    "share_revoked_at" TIMESTAMP(3),
    "current_version_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "monthly_reports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "monthly_reports_share_token_hash_key" ON "monthly_reports"("share_token_hash");
CREATE UNIQUE INDEX "monthly_reports_current_version_id_key" ON "monthly_reports"("current_version_id");
CREATE UNIQUE INDEX "monthly_reports_year_month_key" ON "monthly_reports"("year", "month");
CREATE INDEX "monthly_reports_year_month_idx" ON "monthly_reports"("year", "month");

CREATE TABLE "monthly_report_versions" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source_import_id" TEXT,
    "source_snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    CONSTRAINT "monthly_report_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "monthly_report_versions_report_id_version_key" ON "monthly_report_versions"("report_id", "version");
CREATE INDEX "monthly_report_versions_report_id_created_at_idx" ON "monthly_report_versions"("report_id", "created_at");

CREATE TABLE "monthly_report_documents" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "pdf_bytes" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monthly_report_documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "monthly_report_documents_public_id_key" ON "monthly_report_documents"("public_id");
CREATE UNIQUE INDEX "monthly_report_documents_version_id_report_type_key" ON "monthly_report_documents"("version_id", "report_type");

ALTER TABLE "monthly_reports" ADD CONSTRAINT "monthly_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "monthly_report_versions" ADD CONSTRAINT "monthly_report_versions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "monthly_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "monthly_report_versions" ADD CONSTRAINT "monthly_report_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "monthly_report_documents" ADD CONSTRAINT "monthly_report_documents_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "monthly_report_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "monthly_reports" ADD CONSTRAINT "monthly_reports_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "monthly_report_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
