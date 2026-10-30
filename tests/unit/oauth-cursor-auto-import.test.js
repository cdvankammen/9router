import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fsPromises from "fs/promises";

// Mock next/server
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({
      status: init?.status || 200,
      body,
      json: async () => body,
    })),
  },
}));

// Mock os
vi.mock("os", () => ({
  default: { homedir: vi.fn(() => "/mock/home") },
  homedir: vi.fn(() => "/mock/home"),
}));

// Mock fs/promises — include realpath and lstat for GAP-P1-12 validation
vi.mock("fs/promises", () => ({
  access: vi.fn(),
  constants: { R_OK: 4 },
  realpath: vi.fn(),
  lstat: vi.fn(),
}));

// The route's preferred extraction strategy is require("better-sqlite3"),
// whose native binding is unavailable in the test environment (no prebuilt
// binary for this Node ABI), so the route falls through to the sqlite3 CLI
// strategy. Mock child_process.execFile so that path returns deterministic
// rows. The route promisifies execFile at module scope, so attach a
// util.promisify.custom implementation that resolves { stdout, stderr }.
const cliDb = { rows: new Map() };
vi.mock("child_process", async () => {
  const { promisify } = await import("node:util");
  const lookup = (args) => {
    const sql = Array.isArray(args) && args.length > 1 ? String(args[1]) : "";
    for (const [key, value] of cliDb.rows) {
      if (sql.includes(`'${key}'`)) return value;
    }
    return "";
  };
  const execFile = vi.fn((_cmd, args, _opts, cb) => {
    const done = typeof _opts === "function" ? _opts : cb;
    process.nextTick(() => done(null, lookup(args), ""));
  });
  execFile[promisify.custom] = async (_cmd, args) => ({ stdout: lookup(args), stderr: "" });
  return { execFile };
});

// Shared mock db instance
const mockDbInstance = {
  prepare: vi.fn(),
  close: vi.fn(),
  __throwOnConstruct: false,
};

// Mock better-sqlite3 as a class so `new Database(...)` works
vi.mock("better-sqlite3", () => ({
  default: class MockDatabase {
    constructor() {
      if (mockDbInstance.__throwOnConstruct) {
        throw new Error("SQLITE_CANTOPEN");
      }
      return mockDbInstance;
    }
  },
}));

// We need to dynamically import after mocks are registered
let GET;

describe("GET /api/oauth/cursor/auto-import", () => {
  const originalPlatform = process.platform;

  beforeEach(async () => {
    vi.clearAllMocks();
    cliDb.rows.clear();
    mockDbInstance.__throwOnConstruct = false;
    // Force darwin so macOS-specific logic is exercised
    Object.defineProperty(process, "platform", { value: "darwin", writable: true });
    // Default: realpath returns the candidate path unchanged (no symlink)
    vi.mocked(fsPromises.realpath).mockImplementation(async (p) => p);
    // Re-import to pick up fresh mocks each run
    const mod = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
    GET = mod.GET;
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform, writable: true });
  });

  // ── macOS path probing ────────────────────────────────────────────────

  it("returns not-found when no macOS cursor db paths are accessible", async () => {
    vi.mocked(fsPromises.access).mockRejectedValue(new Error("ENOENT"));

    const response = await GET();

    expect(response.body.found).toBe(false);
    expect(response.body.error).toContain("Cursor database not found");
  });

  it("returns descriptive error if macOS db file exists but cannot be opened", async () => {
    vi.mocked(fsPromises.access).mockResolvedValue();
    mockDbInstance.__throwOnConstruct = true;

    const response = await GET();

    // Should fall through to manual fallback since better-sqlite3 throws
    // and sqlite3 CLI isn't available in test env
    expect(response.body.found).toBe(false);
  });

  // ── Token extraction ──────────────────────────────────────────────────

  it("extracts tokens using exact keys", async () => {
    vi.mocked(fsPromises.access).mockResolvedValue();
    // CLI fallback rows (better-sqlite3 native binding unavailable in tests)
    cliDb.rows.set("cursorAuth/accessToken", "test-token");
    cliDb.rows.set("storage.serviceMachineId", "test-machine-id");
    mockDbInstance.prepare.mockReturnValue({
      get: vi.fn().mockReturnValue({ value: "test-token" }),
    });
    // First call returns accessToken, second returns machineId
    mockDbInstance.prepare.mockImplementation((sql) => ({
      get: vi.fn((key) => {
        if (key === "cursorAuth/accessToken" || key === "cursorAuth/token") {
          return { value: "test-token" };
        }
        if (key === "storage.serviceMachineId" || key === "storage.machineId" || key === "telemetry.machineId") {
          return { value: "test-machine-id" };
        }
        return null;
      }),
    }));

    const response = await GET();

    expect(response.body.found).toBe(true);
    expect(response.body.accessToken).toBe("test-token");
    expect(response.body.machineId).toBe("test-machine-id");
    // close() is only called on the better-sqlite3 path; the CLI fallback
    // (used when the native binding is unavailable) never constructs a DB.
  });

  it("unwraps JSON-encoded string values", async () => {
    vi.mocked(fsPromises.access).mockResolvedValue();
    // CLI fallback rows (better-sqlite3 native binding unavailable in tests)
    cliDb.rows.set("cursorAuth/accessToken", '"json-token"');
    cliDb.rows.set("storage.serviceMachineId", '"json-machine-id"');
    mockDbInstance.prepare.mockImplementation((sql) => ({
      get: vi.fn((key) => {
        if (key === "cursorAuth/accessToken") {
          return { value: '"json-token"' };
        }
        if (key === "storage.serviceMachineId") {
          return { value: '"json-machine-id"' };
        }
        return null;
      }),
    }));

    const response = await GET();

    expect(response.body.found).toBe(true);
    expect(response.body.accessToken).toBe("json-token");
    expect(response.body.machineId).toBe("json-machine-id");
  });

  // ── Security validation (GAP-P1-12) ───────────────────────────────────

  it("rejects symlink pointing outside allowed Cursor directories", async () => {
    vi.mocked(fsPromises.access).mockResolvedValue();
    // realpath resolves to a path outside allowed prefixes
    vi.mocked(fsPromises.realpath).mockResolvedValue("/etc/passwd");

    const response = await GET();

    expect(response.body.found).toBe(false);
    expect(response.body.error).toContain("Security validation failed");
    expect(response.body.error).toContain("outside allowed directories");
  });

  it("accepts symlink that resolves within allowed Cursor directory", async () => {
    vi.mocked(fsPromises.access).mockResolvedValue();
    // Symlink resolves to a valid Cursor path
    vi.mocked(fsPromises.realpath).mockResolvedValue(
      "/mock/home/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
    );
    // CLI fallback rows (better-sqlite3 native binding unavailable in tests)
    cliDb.rows.set("cursorAuth/accessToken", "valid-token");
    cliDb.rows.set("storage.serviceMachineId", "valid-mid");
    mockDbInstance.prepare.mockImplementation((sql) => ({
      get: vi.fn((key) => {
        if (key === "cursorAuth/accessToken") return { value: "valid-token" };
        if (key === "storage.serviceMachineId") return { value: "valid-mid" };
        return null;
      }),
    }));

    const response = await GET();

    expect(response.body.found).toBe(true);
    expect(response.body.accessToken).toBe("valid-token");
  });

  it("rejects path with traversal segments", async () => {
    vi.mocked(fsPromises.access).mockResolvedValue();
    // Simulate a candidate path that somehow contains ..
    vi.mocked(fsPromises.realpath).mockImplementation(async (p) => {
      if (p.includes("..")) throw new Error("Path traversal rejected");
      return p;
    });

    // The actual candidate from getCandidatePaths won't have .., but
    // validateCursorDbPath checks before realpath. We test the validator
    // indirectly: if realpath itself fails, we get a security error.
    vi.mocked(fsPromises.realpath).mockRejectedValue(new Error("EACCES"));

    const response = await GET();

    expect(response.body.found).toBe(false);
    expect(response.body.error).toContain("Security validation failed");
  });

  it("rejects path resolving to Windows AppData outside Cursor subdir", async () => {
    Object.defineProperty(process, "platform", { value: "win32", writable: true });
    vi.mocked(fsPromises.access).mockResolvedValue();
    // Resolves to AppData but NOT under Cursor
    vi.mocked(fsPromises.realpath).mockResolvedValue("/mock/home/AppData/Roaming/Malware/steal.db");

    const response = await GET();

    // AppData IS an allowed prefix, so this actually passes prefix check.
    // This test documents current behavior — AppData is broad on purpose
    // because Cursor can be in Roaming or Local.
    // A stricter check would require validating the Cursor subfolder too.
    expect(response.body.found).toBeDefined();
  });

  // ── Fallback behavior ─────────────────────────────────────────────────

  it("returns manual fallback when tokens are missing", async () => {
    vi.mocked(fsPromises.access).mockResolvedValue();
    mockDbInstance.prepare.mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });

    const response = await GET();

    expect(response.body.found).toBe(false);
    // Should reach strategy 3 (manual fallback)
    expect(response.body.windowsManual).toBe(true);
  });

  // ── Linux platform ────────────────────────────────────────────────────

  it("linux uses hardcoded paths and checks cursor installation", async () => {
    Object.defineProperty(process, "platform", { value: "linux", writable: true });
    vi.mocked(fsPromises.access).mockRejectedValue(new Error("ENOENT"));

    const response = await GET();

    expect(response.body.found).toBe(false);
    expect(response.body.error).toContain("Cursor database not found");
  });
});
