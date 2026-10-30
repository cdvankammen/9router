/**
 * Encrypt usageHistory.apiKey at rest (Finding #295, phase 2).
 *
 * Before this migration, every gateway API key (the user's sk-... credential)
 * used on every request was stored in PLAINTEXT in usageHistory. A SQLite file
 * leak exposed the full historical key usage trail.
 *
 * After this migration:
 *   - `apiKey` column holds AES-256-GCM ciphertext (enc:v1:... prefix)
 *   - `apiKeyHash` column holds SHA-256(salt + plaintext) for dedup equality
 *     (saveRequestUsage uses COALESCE(apiKeyHash, '') = COALESCE(?, '') to
 *     detect duplicate entries, since random-IV encryption is non-deterministic)
 *
 * Reads decrypt on the fly (decryptToken passes through plaintext for
 * pre-migration rows). The apiKeyMap name-lookup works because getApiKeys()
 * now returns plaintext (migration 007 + apiKeysRepo.js rowToKey decrypt).
 *
 * Idempotent: re-running skips rows already starting with "enc:v1:".
 * The apiKeyHash column ALTER TABLE swallows "duplicate column" for re-runs.
 */

const migration = {
  version: 8,
  name: "usage-history-apikey-encryption",
  up(db) {
    // Defensive: if usageHistory doesn't exist yet (legacy DB from schema v1
    // that only had _meta + apiKeys), skip entirely. The schema auto-creation
    // will create usageHistory with apiKeyHash already in the TABLES definition.
    const tableRow = db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='usageHistory'`);
    if (!tableRow) return;

    try {
      db.exec("ALTER TABLE usageHistory ADD COLUMN apiKeyHash TEXT");
    } catch (err) {
      const msg = (err && err.message) || String(err);
      if (!/duplicate column/i.test(msg)) throw err;
    }

    // Create index for dedup equality lookup (non-unique — many rows can
    // share the same key across time).
    db.exec("CREATE INDEX IF NOT EXISTS idx_uh_apikeyhash ON usageHistory(apiKeyHash)");

    let encryptToken, hashApiKey;
    try {
      const mod = require("../tokenEncryption.js");
      encryptToken = mod.encryptToken;
      hashApiKey = mod.hashApiKey;
    } catch {
      console.warn("[migration 008] tokenEncryption.js unavailable — usageHistory.apiKey left plaintext");
      return;
    }

    // Transform existing rows in chunks to avoid huge single-transaction memory
    // pressure on large histories. 5000 rows per batch is well under SQLite's
    // default limits and keeps each batch sub-second on typical hardware.
    const BATCH = 5000;
    let lastId = 0;
    let transformed = 0;
    // cap at 500k rows to bound migration time on pathological DBs; remainder
    // stays plaintext and decryptToken() passes through on read.
    const MAX_ROWS = 500000;
    while (transformed < MAX_ROWS) {
      const rows = db.all(
        `SELECT id, apiKey FROM usageHistory WHERE id > ? AND apiKey IS NOT NULL AND apiKey != '' AND apiKey NOT LIKE 'enc:v1:%' ORDER BY id ASC LIMIT ?`,
        [lastId, BATCH]
      );
      if (!rows.length) break;
      const update = db.prepare(`UPDATE usageHistory SET apiKey = ?, apiKeyHash = ? WHERE id = ?`);
      const tx = db.transaction((batch) => {
        for (const row of batch) {
          const hash = hashApiKey(row.apiKey);
          const encrypted = encryptToken(row.apiKey);
          if (encrypted) update.run(encrypted, hash, row.id);
        }
      });
      tx(rows);
      transformed += rows.length;
      lastId = rows[rows.length - 1].id;
      if (rows.length < BATCH) break;
    }
    if (transformed > 0) {
      console.log(`[migration 008] encrypted ${transformed} usageHistory rows`);
    }
  },
};

export default migration;
