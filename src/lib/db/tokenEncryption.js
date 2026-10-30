// M5: Token encryption at rest for providerConnections.
// Encrypts accessToken, refreshToken, and apiKey before writing to SQLite,
// decrypts on read. Uses AES-256-GCM with machine-specific key.
//
// This module is imported by connectionsRepo.js to wrap token fields.

import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

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
 * Returns already-encrypted values unchanged (no double-encrypt).
 */
export function encryptToken(plaintext) {
  if (!plaintext || typeof plaintext !== "string") return null;
  if (plaintext.startsWith(PREFIX)) return plaintext; // already encrypted
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
export function decryptToken(stored) {
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
export function isEncryptedToken(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

// SECURITY (#296): sensitive field names inside providerSpecificData that
// must be encrypted at rest. Case-insensitive match on the key.
const SENSITIVE_PSD_KEYS = new Set([
  "accesstoken", "refresh_token", "refreshtoken", "access_token",
  "apikey", "api_key", "token", "pat", "personal_access_token",
  "clientsecret", "client_secret", "oidcclientsecret",
  "codeverifier", "code_verifier",
  "sessiontoken", "session_token", "idtoken", "id_token",
]);

/**
 * Encrypt sensitive fields in a connection data object before DB write.
 * Returns a shallow copy with encrypted tokens. Handles accessToken,
 * refreshToken, apiKey at the top level AND sensitive keys inside
 * providerSpecificData (OAuth tokens, PATs, client secrets).
 */
export function encryptConnectionTokens(data) {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };
  if (out.accessToken) out.accessToken = encryptToken(out.accessToken) || out.accessToken;
  if (out.refreshToken) out.refreshToken = encryptToken(out.refreshToken) || out.refreshToken;
  if (out.apiKey) out.apiKey = encryptToken(out.apiKey) || out.apiKey;
  if (out.providerSpecificData && typeof out.providerSpecificData === "object") {
    const psd = { ...out.providerSpecificData };
    let changed = false;
    for (const [k, v] of Object.entries(psd)) {
      if (typeof v === "string" && v && SENSITIVE_PSD_KEYS.has(k.toLowerCase())) {
        const enc = encryptToken(v);
        if (enc) { psd[k] = enc; changed = true; }
      }
    }
    if (changed) out.providerSpecificData = psd;
  }
  return out;
}

/**
 * Decrypt sensitive fields in a connection data object after DB read.
 * Returns a shallow copy with decrypted tokens.
 */
export function decryptConnectionTokens(data) {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };
  if (out.accessToken) out.accessToken = decryptToken(out.accessToken) || out.accessToken;
  if (out.refreshToken) out.refreshToken = decryptToken(out.refreshToken) || out.refreshToken;
  if (out.apiKey) out.apiKey = decryptToken(out.apiKey) || out.apiKey;
  if (out.providerSpecificData && typeof out.providerSpecificData === "object") {
    const psd = { ...out.providerSpecificData };
    let changed = false;
    for (const [k, v] of Object.entries(psd)) {
      if (typeof v === "string" && v) {
        const dec = decryptToken(v);
        if (dec !== v) { psd[k] = dec; changed = true; }
      }
    }
    if (changed) out.providerSpecificData = psd;
  }
  return out;
}
