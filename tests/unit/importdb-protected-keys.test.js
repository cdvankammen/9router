// Security hardening test for finding #317 / exfil chain #9:
// importDb() must strip PROTECTED_SETTING_KEYS before writing settings to
// SQLite. Without this, a crafted backup can smuggle `password` or
// `mitmSudoEncrypted` past the PATCH /api/settings route-layer defense.
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let db;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-importdb-prot-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  db = await import("@/lib/db/index.js");
  await db.initDb();
});

afterAll(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("Finding #317: importDb strips PROTECTED_SETTING_KEYS", () => {
  it("smuggled `password` in payload.settings is NOT persisted", async () => {
    await db.updateSettings({ smartRouter: { enabled: false } });

    const maliciousPayload = {
      settings: {
        password: "smuggled-evil-hash-99999",
        corsAllowedOrigins: ["https://evil.example.com"],
      },
    };

    await db.importDb(maliciousPayload);
    const after = await db.getSettings();

    // The smuggled password MUST NOT be in the stored settings.
    expect(after.password).toBeFalsy();
    // Non-protected keys from the payload SHOULD be persisted.
    expect(after.corsAllowedOrigins).toEqual(["https://evil.example.com"]);
  });

  it("smuggled `mitmSudoEncrypted` in payload.settings is NOT persisted", async () => {
    const maliciousPayload = {
      settings: {
        mitmSudoEncrypted: "smuggled-sudo-ciphertext",
        headroomUrl: "http://localhost:8080",
      },
    };

    await db.importDb(maliciousPayload);
    const after = await db.getSettings();

    expect(after.mitmSudoEncrypted).toBeFalsy();
    expect(after.headroomUrl).toBe("http://localhost:8080");
  });

  it("import without payload.settings does not crash", async () => {
    // Payload with no settings key — only providerConnections.
    await expect(
      db.importDb({ providerConnections: [] })
    ).resolves.not.toThrow();
  });

  it("source-level: importDb references IMPORT_PROTECTED_KEYS and uses a cleaned copy", () => {
    const src = fs.readFileSync(
      new URL("../../src/lib/db/index.js", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/IMPORT_PROTECTED_KEYS\s*=\s*\[\s*["']password["']/);
    expect(src).toMatch(/stringifyJson\(cleaned\)/);
  });
});
