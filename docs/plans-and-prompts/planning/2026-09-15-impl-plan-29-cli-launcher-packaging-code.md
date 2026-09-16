# Implementation Plan 29 — CLI Launcher & Packaging — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cli #launcher #packaging #tray #postinstall #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `cli/hooks/postinstall.js`, `cli/hooks/sqliteRuntime.js`, `cli/hooks/trayRuntime.js`, `cli/scripts/build-cli.js`, `cli/package.json`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run `npm run cli:pack`, install the tarball, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-29-cli-launcher-packaging.md`, `../research/9router/44-branch-gateways-and-serving.md` (CLI packaging tie-in)

## Scope

**In scope:** postinstall audit (sqlite runtime detection); tray crash recovery + persisted state; npm pack asset audit + size control; version alignment (CLI checks server version on start, warns on mismatch).
**Out of scope:** code signing; auto-update infrastructure.

## Milestones

### M1 — Postinstall audit

**Reference code (`cli/hooks/postinstall.js` extension):**

```js
// Audit: detect sqlite runtime availability; warn + fallback guidance.
export async function auditSqliteRuntime() {
  const checks = [];
  // bun:sqlite
  try {
    const { Database } = await import("bun:sqlite");
    const db = new Database(":memory:");
    db.exec("SELECT 1");
    checks.push({ runtime: "bun:sqlite", ok: true });
  } catch { checks.push({ runtime: "bun:sqlite", ok: false }); }
  // better-sqlite3
  try {
    const Database = (await import("better-sqlite3")).default;
    const db = new Database(":memory:");
    db.exec("SELECT 1");
    checks.push({ runtime: "better-sqlite3", ok: true });
  } catch { checks.push({ runtime: "better-sqlite3", ok: false }); }
  // node:sqlite
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(":memory:");
    db.exec("SELECT 1");
    checks.push({ runtime: "node:sqlite", ok: true });
  } catch { checks.push({ runtime: "node:sqlite", ok: false }); }
  // sql.js (pure JS fallback — always works)
  checks.push({ runtime: "sql.js", ok: true });
  return checks;
}

// Postinstall: run audit, print table, warn if only sql.js available.
export async function postinstall() {
  const results = await auditSqliteRuntime();
  const native = results.filter((r) => r.ok && r.runtime !== "sql.js");
  console.log(`[9router] SQLite runtimes: ${results.map((r) => `${r.runtime}:${r.ok ? "✓" : "✗"}`).join(" ")}`);
  if (!native.length) {
    console.warn("[9router] WARNING: no native SQLite runtime found — using sql.js (slower). Install better-sqlite3 for best performance.");
  }
}
```

**Acceptance criteria:** audit runs on install; warns when only sql.js; no install failure.

### M2 — Tray crash recovery

**Reference code (`cli/hooks/trayRuntime.js` extension):**

```js
// Persist tray state; recover after crash.
const STATE_FILE = join(homedir(), ".9router", "tray-state.json");

export function saveTrayState(state) {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify({ ...state, savedAt: Date.now() }));
}

export function loadTrayState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

// Crash recovery: if server was running and died, restart with backoff.
export function recoverAfterCrash() {
  const state = loadTrayState();
  if (!state?.serverRunning) return;
  const attempt = state.crashCount ?? 0;
  const delay = Math.min(60_000, 1000 * 2 ** attempt);
  setTimeout(() => startServer(), delay);
  saveTrayState({ ...state, crashCount: attempt + 1 });
}
```

**Acceptance criteria:** state persisted; crash recovery with backoff; no duplicate tray instances.

### M3 — npm pack asset audit

**Reference code (`cli/scripts/build-cli.js` extension):**

```js
// Audit packed assets: list files, check size, flag unexpected.
export async function auditPack() {
  const { execSync } = await import("node:child_process");
  const out = execSync("npm pack --dry-run --json", { cwd: "cli" }).toString();
  const pack = JSON.parse(out)[0];
  const files = pack.files;
  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  const unexpected = files.filter((f) => /\.(map|tsbuildinfo|log)$/.test(f.path));
  return { files: files.length, totalBytes, unexpected };
}

// Size control: fail if > 50MB or unexpected artifacts.
export function assertPackSize(audit, { maxBytes = 50 * 1024 * 1024 } = {}) {
  if (audit.totalBytes > maxBytes) throw new Error(`pack too large: ${audit.totalBytes} bytes`);
  if (audit.unexpected.length) throw new Error(`unexpected artifacts: ${audit.unexpected.map((f) => f.path).join(", ")}`);
}
```

**Acceptance criteria:** pack audit lists assets; size gate; unexpected artifacts flagged.

### M4 — Version alignment + tests

**Reference code (`cli/src/cli/versionCheck.js`):**

```js
// CLI checks server version on start; warns on mismatch.
export async function checkServerVersion(cliVersion) {
  try {
    const res = await fetch("http://127.0.0.1:20128/api/version");
    if (!res.ok) return { ok: false, reason: "server not reachable" };
    const { version } = await res.json();
    const match = version === cliVersion;
    if (!match) {
      console.warn(`[9router] Version mismatch: CLI ${cliVersion} vs server ${version}. Run '9router update' to align.`);
    }
    return { ok: match, cliVersion, serverVersion: version };
  } catch {
    return { ok: false, reason: "server not reachable" };
  }
}
```

**Files touched:** `tests/unit/cli-packaging.test.js` (new).

**Acceptance criteria:** version check on start; warning on mismatch; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Native sqlite build | optionalDependencies; sql.js fallback |
| Tray state corruption | JSON parse guard |
| Pack size creep | CI gate |

## Verification

- Unit: audit, tray recovery, version check
- Manual: `npm run cli:pack` → install tarball → verify postinstall audit
- Regression: `tests/__baseline__/verify-no-regression.mjs`