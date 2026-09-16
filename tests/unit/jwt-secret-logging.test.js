// GAP-P1-08: JWT secret file read failure must log, not silently swallow.
// Verifies that loadJwtSecret() warns when the jwt-secret file is unreadable.
// Per master coding rule #6: anti-false-positive assertion-break included.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("GAP-P1-08: dashboardSession.js JWT secret logging", () => {
  let tmpDir;
  let consoleWarnSpy;
  let originalJwtSecret;
  let originalDataDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jwt-test-"));
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    originalJwtSecret = process.env.JWT_SECRET;
    originalDataDir = process.env.DATA_DIR;
    delete process.env.JWT_SECRET;
    process.env.DATA_DIR = tmpDir;
    vi.resetModules();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    if (originalJwtSecret !== undefined) process.env.JWT_SECRET = originalJwtSecret;
    else delete process.env.JWT_SECRET;
    if (originalDataDir !== undefined) process.env.DATA_DIR = originalDataDir;
    else delete process.env.DATA_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("logs warning when jwt-secret file is unreadable (ENOENT)", async () => {
    // No jwt-secret file exists in tmpDir -> readFileSync throws ENOENT
    await import("@/lib/auth/dashboardSession.js");

    // ANTI-FALSE-POSITIVE: Remove the console.warn in dashboardSession.js catch block -> this fails.
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[JWT] secret file unreadable (%s), regenerating:",
      "ENOENT"
    );
  });

  it("does NOT log when jwt-secret file is readable", async () => {
    const secretFile = path.join(tmpDir, "jwt-secret");
    fs.writeFileSync(secretFile, "valid-secret-here", { mode: 0o600 });

    await import("@/lib/auth/dashboardSession.js");

    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("[JWT] secret file unreadable"),
      expect.anything()
    );
  });
});
