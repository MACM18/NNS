/**
 * Encryption Utility for Sensitive Data
 * Uses AES-256-GCM for authenticated encryption
 *
 * Used for:
 * - 2FA secrets
 * - Email provider credentials (API keys, SMTP passwords)
 * - Any other sensitive configuration data
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment variable
 * Falls back to a derived key from AUTH_SECRET if ENCRYPTION_KEY is not set
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY or AUTH_SECRET environment variable is required for encryption"
    );
  }

  // Derive a consistent 32-byte key using PBKDF2
  return crypto.pbkdf2Sync(
    key,
    "nns-encryption-salt",
    100000,
    KEY_LENGTH,
    "sha256"
  );
}

/**
 * Encrypt a string value
 * Returns base64-encoded encrypted data in format: iv:authTag:encryptedData
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Combine iv, authTag, and encrypted data
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt an encrypted string value
 * Expects base64-encoded data in format: iv:authTag:encryptedData
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return "";

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivBase64, authTagBase64, encrypted] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Hash a backup code for storage (one-way hash)
 * Uses bcrypt-like approach with SHA-256 + salt
 */
export function hashBackupCode(code: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(code, salt, 100000, 64, "sha512");
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

/**
 * Verify a backup code against its hash
 */
export function verifyBackupCode(code: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;

  const [saltBase64, hashBase64] = parts;
  const salt = Buffer.from(saltBase64, "base64");

  const hash = crypto.pbkdf2Sync(code, salt, 100000, 64, "sha512");
  return hash.toString("base64") === hashBase64;
}

/**
 * Generate secure random backup codes
 * Returns array of { code, hashedCode } objects
 */
export function generateBackupCodes(
  count: number = 10
): Array<{ code: string; hashedCode: string }> {
  const codes: Array<{ code: string; hashedCode: string }> = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code (uppercase for readability)
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`; // Format: XXXX-XXXX
    codes.push({
      code: formattedCode,
      hashedCode: hashBackupCode(formattedCode),
    });
  }

  return codes;
}

/**
 * Safely encrypt sensitive fields in an object
 * Only encrypts string values, preserves other types
 */
export function encryptSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: (keyof T)[]
): T {
  const result = { ...data };

  for (const field of sensitiveFields) {
    const value = result[field];
    if (typeof value === "string" && value) {
      (result[field] as unknown) = encrypt(value);
    }
  }

  return result;
}

/**
 * Safely decrypt sensitive fields in an object
 */
export function decryptSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: (keyof T)[]
): T {
  const result = { ...data };

  for (const field of sensitiveFields) {
    const value = result[field];
    if (typeof value === "string" && value) {
      try {
        (result[field] as unknown) = decrypt(value);
      } catch {
        // If decryption fails, leave the value as-is (might be unencrypted)
        console.warn(`Failed to decrypt field: ${String(field)}`);
      }
    }
  }

  return result;
}
