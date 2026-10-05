ALTER TABLE "monthly_report_versions"
    ADD COLUMN "share_active" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "share_token_hash" TEXT,
    ADD COLUMN "encrypted_share_token" TEXT,
    ADD COLUMN "share_revoked_at" TIMESTAMP(3);

-- Preserve each currently active monthly link on the version it points to today.
-- Future publication will no longer redirect that link to another version.
UPDATE "monthly_report_versions" AS version
SET "share_active" = report."share_active",
    "share_token_hash" = report."share_token_hash",
    "encrypted_share_token" = report."encrypted_share_token",
    "share_revoked_at" = report."share_revoked_at"
FROM "monthly_reports" AS report
WHERE version."id" = report."current_version_id";

CREATE UNIQUE INDEX "monthly_report_versions_share_token_hash_key"
    ON "monthly_report_versions"("share_token_hash");

DROP INDEX "monthly_reports_share_token_hash_key";
ALTER TABLE "monthly_reports"
    DROP COLUMN "share_active",
    DROP COLUMN "share_token_hash",
    DROP COLUMN "encrypted_share_token",
    DROP COLUMN "share_revoked_at";
