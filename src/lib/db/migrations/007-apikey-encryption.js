/**
 * Encrypt apiKeys.key at rest (Finding #295).
 *
 * Before this migration, dashboard API keys (sk-...) were stored in plaintext
 * in the apiKeys table. A SQLite file leak exposed every gateway credential.
 *
 * After this migration:
 *   - `key` column holds AES-256-GCM ciphertext (enc:v1:...) via encryptToken()
 *   - `keyHash` column holds SHA-256(salt + plaintext) for equality lookups
 *     (validateApiKey, getApiKeyByKey) since random-IV encryption is non-deterministic
 *
 * The migration reads every existing row, computes the hash, encrypts the key,
 * and writes back. Rows with empty keys are left alone (defensive).
 *
 * Idempotent: if keyHash already exists, the ALTER TABLE throws "duplicate
 * column name" which is swallowed. Re-running the data transform on already-
 * encrypted rows is safe because encryptToken() passes through enc:v1: values.
 */

const migration = {
  version: 7,
  name: "apikey-encryption-at-rest",
  up(db) {
    // Add keyHash column (idempotent — swallow "duplicate column" error)
    try {
      db.exec("ALTER TABLE apiKeys ADD COLUMN keyHash TEXT");
    } catch (err) {
      const msg = (err && err.message) || String(err);
      if (!/duplicate column/i.test(msg)) throw err;
    }

    // Lazy-import encryption functions to avoid circular deps at migration
    // registry load time. These are pure functions with no side effects.
    let encryptToken, hashApiKey;
    try {
      // Dynamic require — migrations run in CJS context via migrate.js
      const mod = require("../tokenEncryption.js");
      encryptToken = mod.encryptToken;
      hashApiKey = mod.hashApiKey;
    } catch {
      // If tokenEncryption.js is unavailable (broken install), skip the
      // data transform. The column exists but rows stay plaintext —
      // the repo layer's decryptToken() passes through plaintext values.
      console.warn("[migration 007] tokenEncryption.js unavailable — keys left plaintext");
      return;
    }

    // Transform existing rows: hash + encrypt
    const rows = db.all(`SELECT id, key FROM apiKeys WHERE key IS NOT NULL AND key != ''`);
    for (const row of rows) {
      // Skip already-encrypted rows (re-run safety)
      if (row.key.startsWith("enc:v1:")) continue;
      const hash = hashApiKey(row.key);
      const encrypted = encryptToken(row.key);
      if (encrypted) {
        db.run(`UPDATE apiKeys SET key = ?, keyHash = ? WHERE id = ?`, [encrypted, hash, row.id]);
      }
    }

    // Index for hash-based lookups
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_ak_hash ON apiKeys(keyHash)");
  },
};

export default migration;
