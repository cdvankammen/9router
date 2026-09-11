// M5: Token encryption at rest for providerConnections.
// Encrypts accessToken and refreshToken before writing to SQLite,
// decrypts on read. Uses AES-256-GCM with machine-specific key.
//
// This module is imported by connectionsRepo.js to wrap token fields.

const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const SALT = "9router-token-encryption-v1";
const PREFIX = "enc:v1:";

/**
 * Derive a 256-bit key from machine-specific data.
 * Falls back to salt-only if node-machine-id unavailable.
 */
function deriveTokenKey() {
  try {
    const { machineIdSync } = require("node-machine-id");
    const raw = machineIdSync();
    return crypto.createHash("sha256").update(raw + SALT).digest();
  } catch {
    return crypto.createHash("sha256").update(SALT).digest();
  }
}

/**
 * Encrypt a plaintext token string.
 * Returns "enc:v1:<iv>:<tag>:<ciphertext>" (all hex).
 * Returns null if input is null/undefined/empty.
 */
function encryptToken(plaintext) {
  if (!plaintext || typeof plaintext !== "string") return null;
  const key = deriveTokenKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt an encrypted token string.
 * Returns plaintext on success, null on failure or if not encrypted.
 * Passes through plaintext tokens unchanged (backward compat during migration).
 */
function decryptToken(stored) {
  if (!stored || typeof stored !== "string") return null;
  if (!stored.startsWith(PREFIX)) return stored; // Plaintext — pass through
  try {
    const payload = stored.slice(PREFIX.length);
    const [ivHex, tagHex, dataHex] = payload.split(":");
    if (!ivHex || !tagHex || !dataHex) return null;
    const key = deriveTokenKey();
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return decipher.update(Buffer.from(dataHex, "hex")) + decipher.final("utf8");
  } catch {
    return null; // Decryption failed — token may be corrupted or from different machine
  }
}

/**
 * Check if a value is an encrypted token.
 */
function isEncryptedToken(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/**
 * Encrypt sensitive fields in a connection data object before DB write.
 * Returns a shallow copy with encrypted tokens.
 */
function encryptConnectionTokens(data) {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };
  if (out.accessToken) out.accessToken = encryptToken(out.accessToken) || out.accessToken;
  if (out.refreshToken) out.refreshToken = encryptToken(out.refreshToken) || out.refreshToken;
  return out;
}

/**
 * Decrypt sensitive fields in a connection data object after DB read.
 * Returns a shallow copy with decrypted tokens.
 */
function decryptConnectionTokens(data) {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };
  if (out.accessToken) out.accessToken = decryptToken(out.accessToken) || out.accessToken;
  if (out.refreshToken) out.refreshToken = decryptToken(out.refreshToken) || out.refreshToken;
  return out;
}

module.exports = {
  encryptToken,
  decryptToken,
  isEncryptedToken,
  encryptConnectionTokens,
  decryptConnectionTokens,
};
