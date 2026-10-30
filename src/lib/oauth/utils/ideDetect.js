import fs from "fs/promises";
import path from "path";
import os from "os";

// Install paths per provider per platform — Trae and standard Windsurf IDE
// app-bundle locations (filesystem-only probing, unchanged).
const IDE_PATHS = {
  trae: {
    darwin: ["/Applications/Trae.app"],
    win32: [
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Trae", "Trae.exe"),
      path.join(process.env.ProgramFiles || "", "Trae", "Trae.exe"),
    ],
    linux: ["/usr/bin/trae", "/usr/local/bin/trae", "/opt/trae", "/opt/Trae"],
  },
  windsurf: {
    darwin: ["/Applications/Windsurf.app"],
    win32: [
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Windsurf", "Windsurf.exe"),
      path.join(process.env.ProgramFiles || "", "Windsurf", "Windsurf.exe"),
    ],
    linux: ["/usr/bin/windsurf", "/usr/local/bin/windsurf", "/opt/windsurf", "/opt/Windsurf"],
  },
};

// SECURITY (GAP-P2-19 extension): per-provider, per-platform binary candidate
// lists for filesystem-only probing. The previous `which ${bin}` / `where ${bin}`
// via execAsync spread process.env.PATH into the child env — a crafted `.env`
// with PATH=/tmp/evil:$PATH would make `which trae` return /tmp/evil/trae and
// poison detection. Now probes known install locations with fs.access only.
// No PATH lookup, no shell, no injection surface.
const IDE_BIN_CANDIDATES = {
  trae: {
    darwin: ["/usr/local/bin/trae", "/opt/homebrew/bin/trae"],
    win32: [
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Trae", "trae.exe"),
      path.join(process.env.ProgramFiles || "", "Trae", "trae.exe"),
      path.join(process.env.APPDATA || "", "npm", "trae.cmd"),
    ],
    linux: ["/usr/bin/trae", "/usr/local/bin/trae", path.join(process.env.HOME || "", ".local/bin/trae")],
  },
  windsurf: {
    darwin: ["/usr/local/bin/windsurf", "/opt/homebrew/bin/windsurf"],
    win32: [
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Windsurf", "windsurf.exe"),
      path.join(process.env.ProgramFiles || "", "Windsurf", "windsurf.exe"),
      path.join(process.env.APPDATA || "", "npm", "windsurf.cmd"),
    ],
    linux: ["/usr/bin/windsurf", "/usr/local/bin/windsurf", path.join(process.env.HOME || "", ".local/bin/windsurf")],
  },
};

async function pathExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function checkBinary(providerId) {
  const platform = os.platform();
  const candidates = IDE_BIN_CANDIDATES[providerId]?.[platform] || [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      await fs.access(candidate);
      return true;
    } catch { /* keep probing */ }
  }
  return false;
}

// Returns { installed: boolean, path: string|null } for the given provider's IDE.
// `path` is the app-bundle path (if found) or the provider id string (if only
// the CLI binary was found) — matches what downstream OAuth routes expect.
export async function detectIdeInstalled(providerId) {
  const platform = os.platform();
  const paths = IDE_PATHS[providerId];
  if (!paths) return { installed: false, path: null };
  for (const p of paths[platform] || []) {
    if (p && await pathExists(p)) return { installed: true, path: p };
  }
  if (await checkBinary(providerId)) return { installed: true, path: providerId };
  return { installed: false, path: null };
}
