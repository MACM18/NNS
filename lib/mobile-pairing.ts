import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const MOBILE_PAIRING_TTL_MS = 2 * 60 * 1000;

export function createMobilePairingToken() {
  return randomBytes(32).toString("base64url");
}

export function hashMobilePairingToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function matchesMobilePairingToken(token: string, expectedHash: string) {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token) || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const actual = Buffer.from(hashMobilePairingToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
