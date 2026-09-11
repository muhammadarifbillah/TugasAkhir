import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function getMasterKey(): Buffer {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_MASTER_KEY is not set");
  }
  const normalized = key.length === 64 ? key : crypto.createHash("sha256").update(key).digest("hex");
  return Buffer.from(normalized, "hex");
}

/**
 * Encrypts a secret with AES-256-GCM.
 * Output format: iv(12) + authTag(16) + ciphertext, base64 encoded.
 */
export function encryptSecret(plaintext: string): Uint8Array<ArrayBuffer> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, getMasterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Uint8Array.from(Buffer.concat([iv, authTag, ciphertext]));
}

/**
 * Decrypts a value produced by `encryptSecret`.
 */
export function decryptSecret(payload: Uint8Array): string {
  const buf = Buffer.from(payload);
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = buf.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGO, getMasterKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Masks a secret for safe UI display: keeps first 6 and last 4 chars. */
export function maskSecret(secret: string): string {
  if (secret.length <= 12) return `${secret.slice(0, 2)}...`;
  return `${secret.slice(0, 6)}...${secret.slice(-4)}`;
}