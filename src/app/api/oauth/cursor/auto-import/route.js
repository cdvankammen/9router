import { NextResponse } from "next/server";
import { access, constants, lstat, realpath } from "fs/promises";
import { homedir } from "os";
import { join, resolve as resolvePath } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Validate a Cursor db path against traversal/symlink attacks (GAP-P1-12).
 *
 * The candidate paths come from getCandidatePaths() which builds them from
 * homedir() + hardcoded Cursor config subdirs. An attacker who can place a
 * symlink at one of those locations could redirect sqlite3 / better-sqlite3
 * to open an arbitrary file. This function:
 *   1. Resolves the path to its real location (following symlinks).
 *   2. Confirms the real path is still under one of the allowed Cursor dirs.
 *   3. Rejects any path containing traversal segments.
 *
 * @param {string} candidatePath - The path to validate
 * @returns {Promise<string>} The validated real path
 * @throws {Error} If the path fails validation
 */
async function validateCursorDbPath(candidatePath) {
  // Reject obvious traversal attempts in the raw candidate
  if (candidatePath.includes("..") || candidatePath.includes("\0")) {
    throw new Error(`Path traversal rejected: ${candidatePath}`);
  }

  // Resolve to canonical absolute path (follows symlinks)
  let realPath;
  try {
    realPath = await realpath(candidatePath);
  } catch {
    // If realpath fails, the path doesn't exist or is inaccessible
    throw new Error(`Cannot resolve path: ${candidatePath}`);
  }

  // Build the allowed prefix set from the same homedir
  const home = homedir();
  const allowedPrefixes = [
    resolvePath(home, "Library/Application Support/Cursor"),
    resolvePath(home, "Library/Application Support/Cursor - Insiders"),
    resolvePath(home, "AppData"),                    // Windows Roaming + Local
    resolvePath(home, ".config/Cursor"),              // Linux
    resolvePath(home, ".config/cursor"),              // Linux lowercase
  ];

  const isAllowed = allowedPrefixes.some((prefix) =>
    realPath.startsWith(prefix + "/") || realPath.startsWith(prefix + "\\")
  );

  if (!isAllowed) {
    throw new Error(
      `Cursor db path outside allowed directories: ${realPath} (candidate was ${candidatePath})`
    );
  }

  return realPath;
}

const ACCESS_TOKEN_KEYS = ["cursorAuth/accessToken", "cursorAuth/token"];
const MACHINE_ID_KEYS = [
  "storage.serviceMachineId",
  "storage.machineId",
  "telemetry.machineId",
];

/** Get candidate db paths by platform */
function getCandidatePaths(platform) {
  const home = homedir();

  if (platform === "darwin") {
    return [
      join(
        home,
        "Library/Application Support/Cursor/User/globalStorage/state.vscdb",
      ),
      join(
        home,
        "Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb",
      ),
    ];
  }

  if (platform === "win32") {
    const appData = process.env.APPDATA || join(home, "AppData", "Roaming");
    const localAppData =
      process.env.LOCALAPPDATA || join(home, "AppData", "Local");
    return [
      join(appData, "Cursor", "User", "globalStorage", "state.vscdb"),
      join(
        appData,
        "Cursor - Insiders",
        "User",
        "globalStorage",
        "state.vscdb",
      ),
      join(localAppData, "Cursor", "User", "globalStorage", "state.vscdb"),
      join(
        localAppData,
        "Programs",
        "Cursor",
        "User",
        "globalStorage",
        "state.vscdb",
      ),
    ];
  }

  return [
    join(home, ".config/Cursor/User/globalStorage/state.vscdb"),
    join(home, ".config/cursor/User/globalStorage/state.vscdb"),
  ];
}

const normalize = (value) => {
  if (typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : value;
  } catch {
    return value;
  }
};

/**
 * Extract tokens via better-sqlite3 (bundled dependency).
 * This is the preferred strategy — no external CLI required.
 */
function extractTokensViaBetterSqlite(dbPath) {
  // Dynamic require so the route stays importable even if native bindings fail
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });

  const query = (key) => {
    const row = db.prepare("SELECT value FROM itemTable WHERE key=? LIMIT 1").get(key);
    return row?.value || null;
  };

  const normalize = (value) => {
    if (typeof value !== "string") return value;
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "string" ? parsed : value;
    } catch {
      return value;
    }
  };

  let accessToken = null;
  for (const key of ACCESS_TOKEN_KEYS) {
    const raw = query(key);
    if (raw) { accessToken = normalize(raw); break; }
  }

  let machineId = null;
  for (const key of MACHINE_ID_KEYS) {
    const raw = query(key);
    if (raw) { machineId = normalize(raw); break; }
  }

  db.close();
  return { accessToken, machineId };
}

/**
 * Extract tokens via sqlite3 CLI.
 * Fallback when better-sqlite3 native bindings are unavailable.
 */
async function extractTokensViaCLI(dbPath) {
  const normalize = (raw) => {
    const value = raw.trim();
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "string" ? parsed : value;
    } catch {
      return value;
    }
  };

  const query = async (sql) => {
    const { stdout } = await execFileAsync("sqlite3", [dbPath, sql], {
      timeout: 10000,
    });
    return stdout.trim();
  };

  // Try each key in priority order
  let accessToken = null;
  for (const key of ACCESS_TOKEN_KEYS) {
    try {
      const raw = await query(
        `SELECT value FROM itemTable WHERE key='${key}' LIMIT 1`,
      );
      if (raw) {
        accessToken = normalize(raw);
        break;
      }
    } catch {
      /* try next */
    }
  }

  let machineId = null;
  for (const key of MACHINE_ID_KEYS) {
    try {
      const raw = await query(
        `SELECT value FROM itemTable WHERE key='${key}' LIMIT 1`,
      );
      if (raw) {
        machineId = normalize(raw);
        break;
      }
    } catch {
      /* try next */
    }
  }

  return { accessToken, machineId };
}

/**
 * GET /api/oauth/cursor/auto-import
 * Auto-detect and extract Cursor tokens from local SQLite database.
 * Strategy: better-sqlite3 → sqlite3 CLI → manual fallback
 */
export async function GET() {
  try {
    const platform = process.platform;
    const candidates = getCandidatePaths(platform);

    let dbPath = null;
    for (const candidate of candidates) {
      try {
        await access(candidate, constants.R_OK);
        dbPath = candidate;
        break;
      } catch {
        // Try next candidate
      }
    }

    if (!dbPath) {
      return NextResponse.json({
        found: false,
        error: `Cursor database not found. Checked locations:\n${candidates.join("\n")}\n\nMake sure Cursor IDE is installed and opened at least once.`,
      });
    }

    // Security: validate dbPath against symlink/traversal attacks (GAP-P1-12)
    try {
      dbPath = await validateCursorDbPath(dbPath);
    } catch (validationError) {
      return NextResponse.json({
        found: false,
        error: `Security validation failed for Cursor database path: ${validationError.message}`,
      });
    }

    // On Linux, verify Cursor is actually installed (not just leftover config)
    if (platform === "linux") {
      let cursorInstalled = false;
      try {
        await execFileAsync("which", ["cursor"], { timeout: 5000 });
        cursorInstalled = true;
      } catch {
        try {
          const desktopFile = join(homedir(), ".local/share/applications/cursor.desktop");
          await access(desktopFile, constants.R_OK);
          cursorInstalled = true;
        } catch { /* not found */ }
      }
      if (!cursorInstalled) {
        return NextResponse.json({
          found: false,
          error: "Cursor config files found but Cursor IDE does not appear to be installed. Skipping auto-import.",
        });
      }
    }

    // Strategy 1: better-sqlite3 (bundled — no external tools required)
    try {
      const tokens = extractTokensViaBetterSqlite(dbPath);
      if (tokens.accessToken && tokens.machineId) {
        return NextResponse.json({
          found: true,
          accessToken: tokens.accessToken,
          machineId: tokens.machineId,
        });
      }
    } catch {
      // Native bindings unavailable — try CLI fallback
    }

    // Strategy 2: sqlite3 CLI
    try {
      const tokens = await extractTokensViaCLI(dbPath);
      if (tokens.accessToken && tokens.machineId) {
        return NextResponse.json({
          found: true,
          accessToken: tokens.accessToken,
          machineId: tokens.machineId,
        });
      }
    } catch {
      // sqlite3 CLI not available either
    }

    // Strategy 3: ask user to paste manually
    return NextResponse.json({ found: false, windowsManual: true, dbPath });
  } catch (error) {
    console.log("Cursor auto-import error:", error);
    return NextResponse.json(
      { found: false, error: error.message },
      { status: 500 },
    );
  }
}
