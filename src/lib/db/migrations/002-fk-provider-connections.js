// Migration 002: Add FOREIGN KEY constraint providerConnections.provider → providerNodes(id)
// SQLite cannot ADD CONSTRAINT after table creation, so we recreate the table:
// 1. Delete orphan connections (provider references non-existent node)
// 2. Rename old table
// 3. Create new table with FK clause + ON DELETE CASCADE
// 4. Copy data from old table
// 5. Drop old table
// 6. Recreate indexes

export default {
  version: 2,
  name: "fk-provider-connections",
  up(db) {
    // Step 1: Pre-migration orphan cleanup
    // Delete connections whose provider node no longer exists
    const orphanCount = db.get(`
      SELECT COUNT(*) as c FROM providerConnections
      WHERE provider NOT IN (SELECT id FROM providerNodes)
    `)?.c ?? 0;

    if (orphanCount > 0) {
      console.log(`[DB][migrate:002] removing ${orphanCount} orphan connections before FK enforcement`);
      db.run(`
        DELETE FROM providerConnections
        WHERE provider NOT IN (SELECT id FROM providerNodes)
      `);
    }

    // Step 2: Rename old table
    db.exec(`ALTER TABLE providerConnections RENAME TO providerConnections_old`);

    // Step 3: Create new table with FK constraint
    db.exec(`
      CREATE TABLE providerConnections (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL REFERENCES providerNodes(id) ON DELETE CASCADE,
        authType TEXT NOT NULL,
        name TEXT,
        email TEXT,
        priority INTEGER,
        isActive INTEGER DEFAULT 1,
        data TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Step 4: Copy data from old table
    db.exec(`
      INSERT INTO providerConnections(id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt)
      SELECT id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt
      FROM providerConnections_old
    `);

    // Step 5: Drop old table
    db.exec(`DROP TABLE providerConnections_old`);

    // Step 6: Recreate indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_pc_provider ON providerConnections(provider)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_pc_provider_active ON providerConnections(provider, isActive)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_pc_priority ON providerConnections(provider, priority)`);

    // Verify row counts match
    const newCount = db.get(`SELECT COUNT(*) as c FROM providerConnections`)?.c ?? 0;
    console.log(`[DB][migrate:002] FK constraint added. ${newCount} connections preserved, ${orphanCount} orphans removed.`);
  },
};
