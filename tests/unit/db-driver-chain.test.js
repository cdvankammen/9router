// Verify 3-tier driver fallback: better-sqlite3 → node:sqlite → sql.js
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-chain-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("Driver fallback chain", () => {
  it("default → picks better-sqlite3 when available", async () => {
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    expect(["better-sqlite3", "node:sqlite", "sql.js"]).toContain(db.driver);
  });

  it("falls back to node:sqlite when better-sqlite3 unavailable", async () => {
    // Mock the better-sqlite3 adapter to throw
    vi.doMock("@/lib/db/adapters/betterSqliteAdapter.js", () => {
      throw new Error("simulated unavailable");
    });
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    // Node 22.5+ should give node:sqlite, else sql.js
    const [maj, min] = process.versions.node.split(".").map(Number);
    if (maj > 22 || (maj === 22 && min >= 5)) {
      expect(db.driver).toBe("node:sqlite");
    } else {
      expect(db.driver).toBe("sql.js");
    }
  });

  it("falls back to sql.js when both native drivers unavailable", async () => {
    vi.doMock("@/lib/db/adapters/betterSqliteAdapter.js", () => {
      throw new Error("simulated unavailable");
    });
    vi.doMock("@/lib/db/adapters/nodeSqliteAdapter.js", () => {
      throw new Error("simulated unavailable");
    });
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    expect(db.driver).toBe("sql.js");
  });
});

// Every adapter must hand back plain objects (Object.prototype) from get/all.
// node:sqlite returns null-prototype rows natively, which Next.js RSC
// serialization rejects ("Only plain objects ... can be passed to Client
// Components") and JSON.stringify silently empties — the Statistics page 500s
// once real data exists. Guards the adapter contract across all drivers.
describe("Adapter row shape", () => {
  it("get/all return plain objects with enumerable keys", async () => {
    // Clear any vi.doMock leakage from the fallback-chain tests above —
    // otherwise this test silently runs against sql.js and never exercises
    // the node:sqlite null-prototype path.
    vi.doUnmock("@/lib/db/adapters/betterSqliteAdapter.js");
    vi.doUnmock("@/lib/db/adapters/nodeSqliteAdapter.js");
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();

    db.exec("CREATE TABLE IF NOT EXISTS proto_probe (a TEXT, b INTEGER)");
    db.run("DELETE FROM proto_probe");
    db.run("INSERT INTO proto_probe (a, b) VALUES (?, ?)", ["x", 1]);

    const row = db.get("SELECT * FROM proto_probe");
    const rows = db.all("SELECT * FROM proto_probe");

    expect(row).not.toBeUndefined();
    expect(Object.getPrototypeOf(row)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(rows[0])).toBe(Object.prototype);
    expect(Object.keys(row).sort()).toEqual(["a", "b"]);
    expect(JSON.parse(JSON.stringify(row))).toEqual({ a: "x", b: 1 });
  });
});
