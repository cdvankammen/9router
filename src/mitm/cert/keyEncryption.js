const crypto = require("crypto");
const os = require("os");

/**
 * Root CA Key Encryption at Rest (H2 remediation)
 *
 * Derives an AES-256-GCM key from machine-specific data + API_KEY_SECRET.
 * The encrypted key file stores: algorithm:iv:authTag:ciphertext (all hex).
 * Decryption happens in-memory only when generating per-domain certs.
 *
 * If API_KEY_SECRET is unset, falls back to a machine-only derivation.
 * This is still better than plaintext since filesystem access alone isn't
 * sufficient — you need the same machine identity.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended nonce size
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from machine-specific data.
 * Uses hostname + platform + arch + homedir as machine fingerprint,
 * mixed with API_KEY_SECRET if available.
 */
function deriveKey() {
  const machineFingerprint = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.homedir(),
  ].join("|");

  const secret = process.env.API_KEY_SECRET || "";
  const salt = `9router-mitm-rootca-v1:${machineFingerprint}`;

  return crypto.pbkdf2Sync(
    secret || machineFingerprint,
    salt,
    100_000,
    KEY_LENGTH,
    "sha256"
  );
}

/**
 * Encrypt a PEM private key string. Returns a string suitable for disk storage.
 * Format: "enc:v1:aes-256-gcm:<iv_hex>:<tag_hex>:<ciphertext_hex>"
 */
function encryptPrivateKey(pemString) {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(pemString, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `enc:v1:${ALGORITHM}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a previously encrypted private key. Returns the PEM string.
 * Throws on tampering or wrong machine identity.
 */
function decryptPrivateKey(encodedString) {
  const trimmed = encodedString.trim();

  // Not encrypted? Return as-is (backward compat with existing plaintext keys)
  if (!trimmed.startsWith("enc:v1:")) {
    return trimmed;
  }

  const parts = trimmed.split(":");
  // enc:v1:algorithm:iv:tag:ciphertext = 6 parts
  if (parts.length !== 6) {
    throw new Error("Invalid encrypted key format: expected 6 colon-separated parts");
  }

  const [, , algo, ivHex, tagHex, ciphertextHex] = parts;
  if (algo !== ALGORITHM) {
    throw new Error(`Unsupported encryption algorithm: ${algo}`);
  }

  const key = deriveKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (err) {
    throw new Error(
      "Failed to decrypt Root CA key. Possible causes: " +
      "wrong machine identity, corrupted key file, or changed API_KEY_SECRET. " +
      `Details: ${err.message}`
    );
  }
}

/**
 * Check if a key file content is encrypted.
 */
function isEncrypted(content) {
  return typeof content === "string" && content.trim().startsWith("enc:v1:");
}

module.exports = {
  encryptPrivateKey,
  decryptPrivateKey,
  isEncrypted,
};
