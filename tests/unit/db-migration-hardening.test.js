// Backlog #2: migration runner hardening — registry integrity gate.
// Mirrors the temp-DATA_DIR + adapter-reset pattern of db-migration-chain.test.js.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-mighard-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch { /* already closed */ }
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("migration registry integrity", () => {
  it("real registry passes validation and fingerprint is deterministic", async () => {
    const reg = await import("@/lib/db/migrations/index.js");
    const check = reg.validateMigrationRegistry();
    expect(check.ok).toBe(true);
    expect(check.problems).toEqual([]);
    const fp = reg.registryFingerprint();
    expect(fp.split("|")).toHaveLength(reg.MIGRATIONS.length);
    expect(fp).toContain("3:message-facets");
    expect(reg.registryFingerprint()).toBe(fp);
  });
});

describe("runMigrationOnce hardening", () => {
  it("fresh DB → applies migrations, stamps fingerprint, leaves no warnings", async () => {
    const { getAdapter } = await import("@/lib/db/driver.js");
    const reg = await import("@/lib/db/migrations/index.js");
    const db = await getAdapter();
    expect(parseInt(db.get(`SELECT value FROM _meta WHERE key='schemaVersion'`).value, 10)).toBe(reg.latestVersion());
    expect(db.get(`SELECT value FROM _meta WHERE key='migrationRegistryFingerprint'`).value).toBe(reg.registryFingerprint());
    expect(db.get(`SELECT value FROM _meta WHERE key='migrationWarnings'`) ?? null).toBeFalsy();
  });

  it("diverged registry fingerprint → refuses to apply, persists warning, keeps data usable", async () => {
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    // Tamper: reset the version and corrupt the stamped fingerprint.
    db.run(`UPDATE _meta SET value = '0' WHERE key = 'schemaVersion'`);
    db.run(`INSERT INTO _meta(key, value) VALUES('migrationRegistryFingerprint', 'tampered|set') ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
    db.run(`INSERT INTO settings(id, data) VALUES(1, '{"keep":"me"}') ON CONFLICT(id) DO UPDATE SET data = excluded.data`);
    db.close?.();

    delete global._dbAdapter;
    vi.resetModules();
    const { getAdapter: getAdapter2 } = await import("@/lib/db/driver.js");
    const db2 = await getAdapter2();

    // Refused: schemaVersion stays 0, warning persisted, data intact.
    expect(db2.get(`SELECT value FROM _meta WHERE key='schemaVersion'`).value).toBe("0");
    const warn = db2.get(`SELECT value FROM _meta WHERE key='migrationWarnings'`);
    expect(warn?.value).toBeTruthy();
    expect(JSON.parse(warn.value).reasons.join(" ")).toMatch(/diverged/);
    expect(JSON.parse(db2.get(`SELECT data FROM settings WHERE id=1`).data)).toEqual({ keep: "me" });
  });

  it("downgrade (DB newer than build) → refuses to apply", async () => {
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    db.run(`UPDATE _meta SET value = '999' WHERE key = 'schemaVersion'`);
    db.close?.();

    delete global._dbAdapter;
    vi.resetModules();
    const { getAdapter: getAdapter2 } = await import("@/lib/db/driver.js");
    const db2 = await getAdapter2();

    expect(db2.get(`SELECT value FROM _meta WHERE key='schemaVersion'`).value).toBe("999");
    const warn = db2.get(`SELECT value FROM _meta WHERE key='migrationWarnings'`);
    expect(JSON.parse(warn.value).reasons.join(" ")).toMatch(/newer than this build/);
  });

  it("previewMigrations reports pending migrations without applying them", async () => {
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    db.run(`UPDATE _meta SET value = '0' WHERE key = 'schemaVersion'`);

    const { previewMigrations } = await import("@/lib/db/migrate.js");
    const reg = await import("@/lib/db/migrations/index.js");
    const p = previewMigrations(db);

    expect(p.currentVersion).toBe(0);
    expect(p.latestVersion).toBe(reg.latestVersion());
    expect(p.pending.map((m) => m.version)).toEqual(reg.MIGRATIONS.map((m) => m.version));
    expect(p.wouldApply).toBe(true);
    expect(p.registry.ok).toBe(true);
    // Dry-run: nothing was applied.
    expect(db.get(`SELECT value FROM _meta WHERE key='schemaVersion'`).value).toBe("0");
  });
});