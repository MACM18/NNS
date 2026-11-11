CREATE TABLE "mobile_pairing_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_name" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "claimed_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_pairing_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_pairing_requests_token_hash_key" ON "mobile_pairing_requests"("token_hash");
CREATE INDEX "mobile_pairing_requests_user_id_expires_at_idx" ON "mobile_pairing_requests"("user_id", "expires_at");

ALTER TABLE "mobile_pairing_requests"
ADD CONSTRAINT "mobile_pairing_requests_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
