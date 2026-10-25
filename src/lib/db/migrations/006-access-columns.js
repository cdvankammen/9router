/**
 * Add per-key access control columns to apiKeys table.
 * Restored from upstream merge — production apiKeysRepo.js references these
 * columns (INSERT/UPDATE/SELECT), but our branch's 001-initial.js predates them.
 *
 * accessRestricted (INTEGER DEFAULT 0): when 1, the key is restricted to a
 *   subset of providers/models listed in accessAllow.
 * accessAllow (TEXT): JSON-encoded allow-list (provider/model patterns).
 *
 * Both columns default to "unrestricted" when absent (0 / null), so existing
 * rows upgrade transparently.
 *
 * Idempotent: ALTER TABLE ADD COLUMN throws "duplicate column name" if the
 * column already exists (e.g. the DB was created with an upstream 001-initial
 * that bakes these columns in). We swallow that specific error.
 */
const migration = {
  version: 6,
  name: "add-access-columns",
  up(db) {
    const stmts = [
      "ALTER TABLE apiKeys ADD COLUMN accessRestricted INTEGER DEFAULT 0",
      "ALTER TABLE apiKeys ADD COLUMN accessAllow TEXT",
    ];
    for (const sql of stmts) {
      try {
        db.exec(sql);
      } catch (err) {
        const msg = (err && err.message) || String(err);
        // SQLite "duplicate column name" is the idempotent-success case.
        if (!/duplicate column/i.test(msg)) throw err;
      }
    }
  },
};

export default migration;
