ALTER TABLE "users" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "auth_rate_limit_buckets" (
  "id" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_rate_limit_buckets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "auth_rate_limit_buckets_expires_at_idx" ON "auth_rate_limit_buckets"("expires_at");
