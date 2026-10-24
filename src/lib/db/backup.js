// DB safety backups — taken ONLY before a schema change (see migrate.js).
//
// ⚠️ AGENT/DEV NOTES:
// - Backups are a best-effort safety net before schema migrations. There is NO
//   automated restore path; recovery is manual (copy a backup file back).
// - Backups intentionally EXCLUDE the `requestDetails` table (observability log,
//   auto-pruned, non-critical) so a multi-hundred-MB DB backs up as a few MB.
// - Only the newest KEEP_BACKUPS are kept; older ones are pruned automatically.
import fs from "node:fs";
import path from "node:path";
import { BACKUPS_DIR, ensureDirs } from "./paths.js";
import { timestampSlug, getAppVersion } from "./version.js";

const KEEP_BACKUPS = 3;

// Tables excluded from safety backups (large, non-critical, reproducible).
const BACKUP_EXCLUDE_TABLES = ["requestDetails"];

export function makeBackupDir(label) {
  ensureDirs();
  const ver = getAppVersion();
  const slug = `${label}-${ver}-${timestampSlug()}`;
  const dir = path.join(BACKUPS_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function backupFile(srcPath, destDir, destName = null) {
  if (!fs.existsSync(srcPath)) return null;
  const name = destName || path.basename(srcPath);
  const dest = path.join(destDir, name);
  fs.copyFileSync(srcPath, dest);
  return dest;
}

// Strip FOREIGN KEY / REFERENCES clauses that point at excluded tables.
// When backup excludes `requestDetails`, surviving tables like `message_facets`
// (REFERENCES requestDetails(id) ON DELETE CASCADE) would fail CREATE TABLE in
// the `bak` schema because the referenced table doesn't exist there.
function stripExcludedFks(sql, excludedNames) {
  let result = sql;
  for (const name of excludedNames) {
    // Inline column constraint: ... REFERENCES requestDetails(...) ON DELETE ...
    const inlineRe = new RegExp(
      `\\s*REFERENCES\\s+"?${name}"?\\s*\\([^)]*\\)(\\s+ON\\s+(DELETE|UPDATE)\\s+[^,)]+)?`,
      "gi"
    );
    result = result.replace(inlineRe, "");
    // Table-level constraint: FOREIGN KEY(...) REFERENCES requestDetails(...)
    const tableRe = new RegExp(
      `,?\\s*FOREIGN\\s+KEY\\s*\\([^)]+\\)\\s*REFERENCES\\s+"?${name}"?\\s*\\([^)]*\\)(\\s+ON\\s+(DELETE|UPDATE)\\s+[^,)]+)?`,
      "gi"
    );
    result = result.replace(tableRe, "");
  }
  return result;
}

// Lightweight DB backup via ATTACH: create an empty sqlite file, copy every
// table EXCEPT the excluded ones into it. Avoids duplicating the huge
// observability log, so the backup stays small regardless of DB size.
//
// Best-effort per file policy — no transaction wrapper (SAVEPOINT + ATTACH DDL
// is fragile on node:sqlite). On failure, the partial backup is cleaned up so
// pruneOldBackups doesn't keep a corrupt file.
export function backupDbLite(adapter, destDir, destName = "data.sqlite") {
  const dest = path.join(destDir, destName);
  try { fs.rmSync(dest, { force: true }); } catch {}
  const escaped = dest.replace(/'/g, "''");

  adapter.exec(`ATTACH DATABASE '${escaped}' AS bak`);
  try {
    const excluded = new Set(BACKUP_EXCLUDE_TABLES);
    const tables = adapter
      .all(`SELECT name, sql FROM main.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
      .filter((t) => !excluded.has(t.name));

    for (const t of tables) {
      // Strip FK references to excluded tables, then recreate in bak.
      const rawCreate = t.sql.replace(/CREATE TABLE\s+/i, "CREATE TABLE bak.");
      const createSql = stripExcludedFks(rawCreate, BACKUP_EXCLUDE_TABLES);
      adapter.exec(createSql);
      adapter.exec(`INSERT INTO bak.${t.name} SELECT * FROM main.${t.name}`);
    }
    // Copy indexes (skip those referencing excluded tables)
    const indexes = adapter
      .all(`SELECT sql FROM main.sqlite_master WHERE type='index' AND sql IS NOT NULL`)
      .filter((idx) => !BACKUP_EXCLUDE_TABLES.some((ex) => idx.sql.includes(ex)));
    for (const idx of indexes) {
      try { adapter.exec(idx.sql); } catch { /* index may already exist */ }
    }
  } catch (e) {
    // Clean up partial backup so pruneOldBackups doesn't keep a corrupt file
    try { adapter.exec("DETACH DATABASE bak"); } catch {}
    try { fs.rmSync(dest, { force: true }); } catch {}
    throw e;
  }
  try { adapter.exec("DETACH DATABASE bak"); } catch {}
  return dest;
}

export function pruneOldBackups() {
  if (!fs.existsSync(BACKUPS_DIR)) return;
  const entries = fs.readdirSync(BACKUPS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, full: path.join(BACKUPS_DIR, e.name), mtime: fs.statSync(path.join(BACKUPS_DIR, e.name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const old of entries.slice(KEEP_BACKUPS)) {
    try { fs.rmSync(old.full, { recursive: true, force: true }); } catch {}
  }
}
