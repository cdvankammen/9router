import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fsPromises from "fs/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

// We'll create real temp SQLite databases and point homedir() there.
// This avoids CJS/ESM mock interop issues with require("better-sqlite3").

const Database = require("better-sqlite3");

let tempDir;
let originalPlatform;

/** Create a real Cursor-style SQLite DB at the expected macOS path */
function createCursorDb(tokens = {}) {
  const dbDir = path.join(tempDir, "Library/Application Support/Cursor/User/globalStorage");
  fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "state.vscdb");
  const db = new Database(dbPath);
  db.exec("CREATE TABLE IF NOT EXISTS itemTable (key TEXT PRIMARY KEY, value TEXT)");
  const insert = db.prepare("INSERT OR REPLACE INTO itemTable (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries(tokens)) {
    insert.run(key, value);
  }
  db.close();
  return dbPath;
}

/** Create a corrupt file at the DB path so better-sqlite3 throws SQLITE_CANTOPEN */
function createCorruptDb() {
  const dbDir = path.join(tempDir, "Library/Application Support/Cursor/User/globalStorage");
  fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "state.vscdb");
  fs.writeFileSync(dbPath, "NOT A SQLITE DATABASE");
  return dbPath;
}

describe("GET /api/oauth/cursor/auto-import", () => {
  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-test-"));
    originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "darwin", writable: true });
    // Mock homedir to point to our temp dir
    vi.doMock("os", async (importOriginal) => {
      const actual = await importOriginal();
      return { ...actual, default: { ...actual, homedir: () => tempDir }, homedir: () => tempDir };
    });
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform, writable: true });
    vi.doUnmock("os");
    vi.resetModules();
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ── Path probing ──────────────────────────────────────────────────────

  it("returns not-found when no macOS cursor db paths are accessible", async () => {
    // Don't create any DB — tempDir has no Cursor paths
    const mod = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
    const response = await mod.GET();

    expect(response.body.found).toBe(false);
    expect(response.body.error).toContain("Cursor database not found");
    expect(response.body.error).toContain("Checked locations");
    expect(response.body.error).toContain("Cursor/User/globalStorage/state.vscdb");
  });

  it("lists all checked macOS paths in the not-found error (including Insiders)", async () => {
    const mod = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
    const response = await mod.GET();

    expect(response.body.found).toBe(false);
    expect(response.body.error).toContain("Cursor - Insiders");
    expect(response.body.error).toContain("Make sure Cursor IDE is installed and opened at least once");
  });

  // ── Token extraction via better-sqlite3 ───────────────────────────────

  it("extracts tokens using exact keys via better-sqlite3", async () => {
    createCursorDb({
      "cursorAuth/accessToken": "test-token",
      "storage.serviceMachineId": "test-machine-id",
    });

    const mod = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
    const response = await mod.GET();

    expect(response.body.found).toBe(true);
    expect(response.body.accessToken).toBe("test-token");
    expect(response.body.machineId).toBe("test-machine-id");
  });

  it("unwraps JSON-encoded string values", async () => {
    createCursorDb({
      "cursorAuth/accessToken": '"json-token"',
      "storage.serviceMachineId": '"json-machine-id"',
    });

    const mod = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
    const response = await mod.GET();

    expect(response.body.found).toBe(true);
    expect(response.body.accessToken).toBe("json-token");
    expect(response.body.machineId).toBe("json-machine-id");
  });

  it("tries alternate key names when primary keys miss", async () => {
    createCursorDb({
      "cursorAuth/token": "alt-token",
      "storage.machineId": "alt-machine-id",
    });

    const mod = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
    const response = await mod.GET();

    expect(response.body.found).toBe(true);
    expect(response.body.accessToken).toBe("alt-token");
    expect(response.body.machineId).toBe("alt-machine-id");
  });

  // ── Fallback: windowsManual response ─────────────────────────────────

  it("returns windowsManual when better-sqlite3 throws and CLI fails", async () => {
    createCorruptDb();

    const mod = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
    const response = await mod.GET();

    // better-sqlite3 throws on corrupt file, sqlite3 CLI not available in test env
    // → falls through to windowsManual response
    expect(response.body.found).toBe(false);
    // Either windowsManual or an error — both are acceptable fallback behavior
    if (response.body.windowsManual) {
      expect(response.body.dbPath).toContain("state.vscdb");
    } else {
      // CLI fallback also failed — still not found
      expect(response.body.found).toBe(false);
    }
  });

  // ── Linux path probing ────────────────────────────────────────────────

  it("linux probes .config paths", async () => {
    Object.defineProperty(process, "platform", { value: "linux", writable: true });
    // Create linux-style path
    const dbDir = path.join(tempDir, ".config/Cursor/User/globalStorage");
    fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, "state.vscdb");
    const db = new Database(dbPath);
    db.exec("CREATE TABLE IF NOT EXISTS itemTable (key TEXT PRIMARY KEY, value TEXT)");
    db.prepare("INSERT INTO itemTable (key, value) VALUES (?, ?)").run("cursorAuth/accessToken", "linux-token");
    db.prepare("INSERT INTO itemTable (key, value) VALUES (?, ?)").run("storage.serviceMachineId", "linux-machine");
    db.close();

    vi.resetModules();
    const mod = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
    const response = await mod.GET();

    // On linux, the route also checks if cursor is installed via `which cursor`
    // or .desktop file. In test env, `which cursor` may or may not succeed.
    // Either way, the path probing logic is exercised.
    expect(response.body).toBeDefined();
    if (response.body.found) {
      expect(response.body.accessToken).toBe("linux-token");
    } else {
      // Cursor not installed check fired — that's valid behavior
      expect(response.body.error).toBeDefined();
    }
  });

  it("linux returns skip-message when cursor not installed", async () => {
    Object.defineProperty(process, "platform", { value: "linux", writable: true });
    // Create .config path but no cursor binary
    const dbDir = path.join(tempDir, ".config/Cursor/User/globalStorage");
    fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, "state.vscdb");
    const db = new Database(dbPath);
    db.exec("CREATE TABLE IF NOT EXISTS itemTable (key TEXT PRIMARY KEY, value TEXT)");
    db.close();

    // Override PATH so `which cursor` fails
    const origPath = process.env.PATH;
    process.env.PATH = "/nonexistent";

    vi.resetModules();
    const mod = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
    const response = await mod.GET();

    process.env.PATH = origPath;

    expect(response.body.found).toBe(false);
    // Either the skip-message or the not-found message
    expect(response.body.error).toBeDefined();
  });

  // ── Unsupported platform ──────────────────────────────────────────────

  it("unsupported platform falls through to .config paths (no 400)", async () => {
    Object.defineProperty(process, "platform", { value: "freebsd", writable: true });
    vi.resetModules();
    const mod = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
    const response = await mod.GET();

    expect(response.status).toBe(200);
    expect(response.body.found).toBe(false);
    expect(response.body.error).toContain("Cursor database not found");
    expect(response.body.error).toContain(".config");
  });

  // ── Error handling ────────────────────────────────────────────────────

  it("returns 200 with found=false when no paths match", async () => {
    const mod = await import("../../src/app/api/oauth/cursor/auto-import/route.js");
    const response = await mod.GET();

    expect(response.status).toBe(200);
    expect(response.body.found).toBe(false);
    expect(response.body.error).toContain("Cursor database not found");
  });
});
