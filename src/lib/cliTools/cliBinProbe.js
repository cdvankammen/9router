// SECURITY (GAP-P2-17): filesystem-only CLI binary detection.
//
// The previous pattern — `execAsync("which <tool>")` / `where <tool>` —
// resolves via process.env.PATH, which a crafted `.env` with
// `PATH=/tmp/evil:$PATH` can poison to execute arbitrary commands.
// All 17 cli-tools routes that used this pattern are being migrated to
// this helper, which does filesystem-only probing.
//
// Detection semantic: "is this tool installed" = "does a known binary
// exist at a standard install location OR does the tool's config dir
// exist". This is equivalent to what `which` would report for any
// normally-installed CLI (package manager, direct download, npm global)
// without the PATH-injection surface.
//
// Callers pass tool-specific candidate binary paths + optional config
// dir/file paths. The helper returns { installed: boolean, source: string|null }.

import fs from "fs/promises";
import os from "os";
import path from "path";

/**
 * Probe for a CLI binary via filesystem checks only.
 *
 * @param {Object} opts
 * @param {string} opts.toolName — human-readable tool name (for logs)
 * @param {string[]} [opts.macCandidates] — absolute paths to probe on darwin
 * @param {string[]} [opts.linuxCandidates] — absolute paths to probe on linux
 * @param {string[]} [opts.winCandidates] — absolute paths to probe on win32
 * @param {string[]} [opts.configPaths] — absolute paths to config files/dirs whose existence implies install
 * @returns {Promise<{ installed: boolean, source: string|null }>}
 */
export async function probeCliBin({ toolName, macCandidates = [], linuxCandidates = [], winCandidates = [], configPaths = [] }) {
  const platform = os.platform();
  const candidates = platform === "win32" ? winCandidates
    : platform === "darwin" ? macCandidates
    : linuxCandidates;

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return { installed: true, source: candidate };
    } catch { /* keep probing */ }
  }
  for (const cfgPath of configPaths) {
    try {
      await fs.access(cfgPath);
      return { installed: true, source: cfgPath };
    } catch { /* keep probing */ }
  }
  return { installed: false, source: null };
}

// ── Shared candidate lists (reused across routes) ───────────────────────────

const home = () => os.homedir();

// npm-global CLIs installed via `npm install -g` land under these prefixes
// depending on the package manager / OS conventions.
export const NPM_GLOBAL_MAC = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  path.join(home(), ".npm-global", "bin"),
  path.join(home(), ".nvm", "current", "bin"),
  path.join(home(), ".volta", "bin"),
  path.join(home(), ".fnm", "current", "bin"),
];
export const NPM_GLOBAL_LINUX = [
  "/usr/bin",
  "/usr/local/bin",
  path.join(home(), ".npm-global", "bin"),
  path.join(home(), ".nvm", "current", "bin"),
  path.join(home(), ".volta", "bin"),
];
export const NPM_GLOBAL_WIN = [
  path.join(process.env.APPDATA || path.join(home(), "AppData", "Roaming"), "npm"),
  path.join(process.env.LOCALAPPDATA || path.join(home(), "AppData", "Local"), "npm"),
];

/** Build a {mac,linux,win} candidate set from a tool name + npm-global convention. */
export function npmCliCandidates(toolName) {
  return {
    macCandidates: NPM_GLOBAL_MAC.map((d) => path.join(d, toolName)),
    linuxCandidates: NPM_GLOBAL_LINUX.map((d) => path.join(d, toolName)),
    winCandidates: NPM_GLOBAL_WIN.map((d) => path.join(d, `${toolName}.cmd`)),
  };
}

// ── Per-tool wrappers ──────────────────────────────────────────────────────
// Each returns Promise<{ installed, source }> using filesystem probes only.
// Config paths whose existence implies "installed" (even without a binary on
// PATH — e.g. user copied a binary to an unusual location but left config
// behind) are passed as configPaths.

const H = () => os.homedir();

export const checkClaudeInstalled = () => probeCliBin({
  toolName: "claude",
  ...npmCliCandidates("claude"),
  configPaths: [path.join(H(), ".claude", "settings.json"), path.join(H(), ".claude.json")],
});

export const checkClineInstalled = () => probeCliBin({
  toolName: "cline",
  ...npmCliCandidates("cline"),
  configPaths: [path.join(H(), ".cline", "data", "globalState.json")],
});

export const checkCodexInstalled = () => probeCliBin({
  toolName: "codex",
  ...npmCliCandidates("codex"),
  configPaths: [path.join(H(), ".codex", "config.toml")],
});

export const checkCodewhaleInstalled = () => probeCliBin({
  toolName: "codewhale",
  ...npmCliCandidates("codewhale"),
  configPaths: [path.join(H(), ".codewhale", "config.toml")],
});

export const checkCrushInstalled = () => {
  const configDir = process.env.XDG_CONFIG_HOME || path.join(H(), ".config");
  return probeCliBin({
    toolName: "crush",
    macCandidates: ["/opt/homebrew/bin/crush", "/usr/local/bin/crush", path.join(H(), ".local/bin/crush")],
    linuxCandidates: ["/usr/bin/crush", "/usr/local/bin/crush", path.join(H(), ".local/bin/crush")],
    winCandidates: [path.join(H(), "scoop/shims/crush.exe")],
    configPaths: [path.join(configDir, "crush/crush.json")],
  });
};

export const checkDeepseekTuiInstalled = () => probeCliBin({
  toolName: "deepseek-tui",
  ...npmCliCandidates("deepseek-tui"),
  configPaths: [],
});

export const checkDevinInstalled = () => probeCliBin({
  toolName: "devin",
  macCandidates: [
    path.join(H(), ".local/share/devin/bin/devin"),
    path.join(H(), ".devin/bin/devin"),
    path.join(H(), ".local/bin/devin"),
    "/opt/homebrew/bin/devin",
    "/usr/local/bin/devin",
    "/usr/bin/devin",
  ],
  linuxCandidates: [
    path.join(H(), ".local/share/devin/bin/devin"),
    path.join(H(), ".devin/bin/devin"),
    path.join(H(), ".local/bin/devin"),
    "/usr/bin/devin",
  ],
  winCandidates: [
    path.join(process.env.LOCALAPPDATA || path.join(H(), "AppData/Local"), "devin/cli/bin/devin.exe"),
    path.join(H(), ".local/bin/devin.exe"),
    path.join(H(), "scoop/shims/devin.exe"),
  ],
  configPaths: [],
});

export const checkDroidInstalled = () => probeCliBin({
  toolName: "droid",
  macCandidates: ["/opt/homebrew/bin/droid", "/usr/local/bin/droid", path.join(H(), ".local/bin/droid")],
  linuxCandidates: ["/usr/bin/droid", "/usr/local/bin/droid", path.join(H(), ".local/bin/droid")],
  winCandidates: [path.join(H(), "scoop/shims/droid.exe")],
  configPaths: [path.join(process.env.XDG_CONFIG_HOME || path.join(H(), ".config"), "droid/config.json")],
});

export const checkForgeInstalled = () => probeCliBin({
  toolName: "forge",
  ...npmCliCandidates("forge"),
  configPaths: [path.join(process.env.XDG_CONFIG_HOME || path.join(H(), ".config"), "forge/config.json")],
});

export const checkHermesInstalled = () => probeCliBin({
  toolName: "hermes",
  macCandidates: ["/opt/homebrew/bin/hermes", "/usr/local/bin/hermes", path.join(H(), ".local/bin/hermes"), path.join(H(), ".hermes/bin/hermes")],
  linuxCandidates: ["/usr/bin/hermes", "/usr/local/bin/hermes", path.join(H(), ".local/bin/hermes"), path.join(H(), ".hermes/bin/hermes")],
  winCandidates: [path.join(H(), "scoop/shims/hermes.exe")],
  configPaths: [path.join(H(), ".hermes/config.yaml"), path.join(H(), ".hermes/config.yml")],
});

export const checkJcodeInstalled = () => probeCliBin({
  toolName: "jcode",
  ...npmCliCandidates("jcode"),
  configPaths: [path.join(H(), ".jcode/config.json")],
});

export const checkKiloInstalled = () => probeCliBin({
  toolName: "kilo",
  ...npmCliCandidates("kilo"),
  configPaths: [path.join(H(), ".kilo/config.json")],
});

export const checkOmpInstalled = () => probeCliBin({
  toolName: "omp",
  ...npmCliCandidates("omp"),
  configPaths: [path.join(H(), ".omp/agent/agent.db"), path.join(H(), ".omp/agent/models.yml")],
});

export const checkOpenClawInstalled = () => probeCliBin({
  toolName: "openclaw",
  ...npmCliCandidates("openclaw"),
  configPaths: [path.join(H(), ".openclaw/openclaw.json")],
});

export const checkOpencodeInstalled = () => probeCliBin({
  toolName: "opencode",
  ...npmCliCandidates("opencode"),
  configPaths: [path.join(process.env.XDG_CONFIG_HOME || path.join(H(), ".config"), "opencode/config.json")],
});

export const checkPiInstalled = () => probeCliBin({
  toolName: "pi",
  ...npmCliCandidates("pi"),
  configPaths: [path.join(H(), ".pi/config.json")],
});

export const checkSmeltInstalled = () => probeCliBin({
  toolName: "smelt",
  ...npmCliCandidates("smelt"),
  configPaths: [path.join(H(), ".smelt/config.json")],
});
