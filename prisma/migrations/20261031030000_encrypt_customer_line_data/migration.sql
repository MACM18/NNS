-- Customer and line identifying values are encrypted by the Prisma client layer.
-- Lookup hashes preserve exact phone matching; HMAC n-gram tokens preserve partial search.
ALTER TABLE "line_details"
  ADD COLUMN "telephone_no_lookup" TEXT,
  ADD COLUMN "customer_search_tokens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "tasks"
  ADD COLUMN "telephone_no_lookup" TEXT,
  ADD COLUMN "customer_search_tokens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DROP INDEX IF EXISTS "line_details_telephone_no_date_key";
CREATE UNIQUE INDEX "line_details_telephone_no_lookup_date_key"
  ON "line_details"("telephone_no_lookup", "date");
CREATE INDEX "line_details_customer_search_tokens_idx"
  ON "line_details" USING GIN ("customer_search_tokens");
CREATE INDEX "tasks_customer_search_tokens_idx"
  ON "tasks" USING GIN ("customer_search_tokens");
