CREATE TABLE "mobile_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_version" INTEGER NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "device_name" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mobile_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mobile_sync_mutations" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "mutation_id" TEXT NOT NULL,
    "line_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mobile_sync_mutations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_sessions_refresh_token_hash_key" ON "mobile_sessions"("refresh_token_hash");
CREATE INDEX "mobile_sessions_user_id_revoked_at_idx" ON "mobile_sessions"("user_id", "revoked_at");
CREATE UNIQUE INDEX "mobile_sync_mutations_session_id_mutation_id_key" ON "mobile_sync_mutations"("session_id", "mutation_id");
CREATE INDEX "mobile_sync_mutations_line_id_created_at_idx" ON "mobile_sync_mutations"("line_id", "created_at");

ALTER TABLE "mobile_sessions" ADD CONSTRAINT "mobile_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mobile_sync_mutations" ADD CONSTRAINT "mobile_sync_mutations_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "mobile_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
