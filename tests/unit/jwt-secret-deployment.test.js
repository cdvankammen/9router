/**
 * SEC-3671: JWT secret deployment and rotation requirements
 *
 * Acceptance criteria:
 * 1. Production startup fails without JWT_SECRET
 * 2. Dev mode generates ephemeral secret with warning
 * 3. Test: missing JWT_SECRET in prod returns error
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Mock modules before importing the auth module
vi.mock("@/lib/dataDir", () => ({
  DATA_DIR: "/tmp/test-9router-data",
}));

vi.mock("@/lib/localDb", () => ({
  getSettings: vi.fn(() => Promise.resolve({})),
}));

vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

describe("SEC-3671: JWT Secret Deployment Requirements", () => {
  const originalEnv = process.env;
  const testDataDir = path.join(os.tmpdir(), `test-9router-data-${Date.now()}`);

  beforeEach(() => {
    // Reset modules to clear cached state
    vi.resetModules();
    // Clean test data dir
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDataDir, { recursive: true });
    // Mock DATA_DIR to point to test dir
    vi.doMock("@/lib/dataDir", () => ({ DATA_DIR: testDataDir }));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe("Production mode (NODE_ENV=production)", () => {
    it("should throw an error when JWT_SECRET is missing", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.JWT_SECRET;

      await expect(async () => {
        // Dynamic import triggers loadJwtSecret() at module evaluation time
        await import("../../src/lib/auth/dashboardSession.js");
      }).rejects.toThrow(/JWT_SECRET is required in production/);
    });

    it("should accept a valid JWT_SECRET in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "test-secret-for-production";

      // Should not throw
      const mod = await import("../../src/lib/auth/dashboardSession.js");
      expect(mod.createDashboardAuthToken).toBeDefined();
    });
  });

  describe("Development mode (NODE_ENV !== production)", () => {
    it("should generate an ephemeral secret when JWT_SECRET is missing", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.JWT_SECRET;

      // Spy on console.warn
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const mod = await import("../../src/lib/auth/dashboardSession.js");

      // Should have warned about ephemeral secret
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("JWT_SECRET not set")
      );

      // Secret file should have been created
      const secretFile = path.join(testDataDir, "jwt-secret");
      expect(fs.existsSync(secretFile)).toBe(true);

      // File should have restrictive permissions (0o600)
      const stats = fs.statSync(secretFile);
      expect(stats.mode & 0o777).toBe(0o600);

      warnSpy.mockRestore();
    });

    it("should use provided JWT_SECRET in dev mode without generating file", async () => {
      process.env.NODE_ENV = "development";
      process.env.JWT_SECRET = "my-dev-secret";

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await import("../../src/lib/auth/dashboardSession.js");

      // Should NOT warn
      expect(warnSpy).not.toHaveBeenCalled();

      // Secret file should NOT have been created
      const secretFile = path.join(testDataDir, "jwt-secret");
      expect(fs.existsSync(secretFile)).toBe(false);

      warnSpy.mockRestore();
    });
  });
});
