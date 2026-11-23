ALTER TABLE "mobile_pairing_requests"
ADD COLUMN "device_key_hash" TEXT;

ALTER TABLE "mobile_sessions"
ADD COLUMN "pairing_request_id" TEXT;

CREATE UNIQUE INDEX "mobile_sessions_pairing_request_id_key"
ON "mobile_sessions"("pairing_request_id");
