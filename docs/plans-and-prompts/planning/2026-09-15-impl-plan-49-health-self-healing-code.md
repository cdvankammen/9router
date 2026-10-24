# Implementation Plan 49 — Health Checks & Self-Healing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #health #self-healing #watchdog #liveness #readiness #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`custom-server.js` standalone wrapper — plan 41 already adds `/healthz`; `src/lib/db/driver.js` adapter; `src/lib/events/bus.js` from plan 37 for alerts; `src/lib/db/repos/settingsRepo.js` for watchdog config).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — kill the DB, confirm readiness flips; trigger a recovery action; check cooldown prevents loops.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-49-health-self-healing.md`, `../research/9router/impl-plan-41-docker-deployment.md`, `../research/9router/impl-plan-17-node-failover.md`.

## Scope

**In scope:** liveness (`/healthz`) + readiness (`/readyz`) endpoints; component checks (DB, config, upstream connectivity); self-healing actions (re-init DB, cleanup, failover) with cooldowns + max attempts; watchdog loop; health history + dashboard view; degradation alerts via event bus.
**Out of scope:** process-level restarts (orchestrator's job); predictive health.

## Milestones

### M1 — Health checks + endpoints

**Reference code (`src/lib/health/checks.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// Component checks: each returns { ok, detail }.
export async function checkDb() {
  try {
    const db = getAdapter();
    db.get("SELECT 1 AS ok");
    return { ok: true, detail: "db-ok" };
  } catch (err) {
    return { ok: false, detail: `db-failed: ${err.message}` };
  }
}

export async function checkConfig() {
  // Config loaded at startup — verify required keys present.
  const { validateConfig } = await import("@/lib/config/validate.js");
  const { ok, errors } = await validateConfig();
  return { ok, detail: ok ? "config-ok" : `config-errors: ${errors.join("; ")}` };
}

export async function checkUpstreams(providerIds = []) {
  // Optional: TCP/HTTP probe to each provider base URL (timeout 3s).
  const results = [];
  for (const id of providerIds) {
    try {
      const { getProvider } = await import("@/lib/providers/registry.js");
      const base = getProvider(id)?.baseUrl;
      if (!base) { results.push({ id, ok: false, detail: "no-base-url" }); continue; }
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(base, { method: "HEAD", signal: ctrl.signal }).catch(() => null);
      clearTimeout(t);
      results.push({ id, ok: res !== null, detail: res ? `http-${res.status}` : "unreachable" });
    } catch (err) {
      results.push({ id, ok: false, detail: err.message });
    }
  }
  return results;
}

export async function runAllChecks() {
  const [db, config, upstreams] = await Promise.all([checkDb(), checkConfig(), checkUpstreams()]);
  const ok = db.ok && config.ok && upstreams.every((u) => u.ok);
  return { ok, checks: { db, config, upstreams } };
}
```

**Reference code (`custom-server.js` additions):**

```js
// /healthz — liveness (process alive).
if (req.url === "/healthz") {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
  return;
}
// /readyz — readiness (DB + config).
if (req.url === "/readyz") {
  const { runAllChecks } = await import("./src/lib/health/checks.js");
  const result = await runAllChecks();
  res.writeHead(result.ok ? 200 : 503, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
  return;
}
```

**Acceptance criteria:** `/healthz` always 200 when alive; `/readyz` 200/503 by component state.

### M2 — Self-healing actions

**Reference code (`src/lib/health/actions.js`):**

```js
// Recovery actions with cooldown + max attempts per action.
const state = new Map(); // actionName -> { lastRunAt, attempts }

const ACTIONS = {
  "db:reinit": {
    cooldownMs: 60_000,
    maxAttempts: 3,
    run: async () => {
      // Re-open the DB adapter (close + re-init).
      const { getAdapter, resetAdapter } = await import("@/lib/db/driver.js");
      resetAdapter?.();
      getAdapter();
      return { ok: true };
    },
  },
  "cache:clear": {
    cooldownMs: 30_000,
    maxAttempts: 5,
    run: async () => {
      // Clear in-memory caches (provider registry, settings).
      const { clearCaches } = await import("@/lib/cache.js");
      clearCaches?.();
      return { ok: true };
    },
  },
};

export async function runAction(name) {
  const action = ACTIONS[name];
  if (!action) return { ok: false, reason: "unknown-action" };
  const s = state.get(name) ?? { lastRunAt: 0, attempts: 0 };
  const now = Date.now();
  if (now - s.lastRunAt < action.cooldownMs) return { ok: false, reason: "cooldown" };
  if (s.attempts >= action.maxAttempts) return { ok: false, reason: "max-attempts" };
  s.lastRunAt = now;
  s.attempts += 1;
  state.set(name, s);
  try {
    const result = await action.run();
    if (result.ok) s.attempts = 0; // reset on success
    return result;
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}
```

**Acceptance criteria:** actions respect cooldown + max attempts; success resets attempts; every run logged.

### M3 — Watchdog loop

**Reference code (`src/lib/health/watchdog.js`):**

```js
import { runAllChecks } from "./checks.js";
import { runAction } from "./actions.js";
import { emit, EVENT_TYPES } from "@/lib/events/bus.js";

// Watchdog: evaluate health periodically, trigger mapped recovery actions.
const WATCHDOG_MAP = [
  { check: "db", action: "db:reinit" },
  { check: "config", action: "cache:clear" },
];

export function startWatchdog({ intervalMs = 30_000 } = {}) {
  const timer = setInterval(async () => {
    const result = await runAllChecks();
    if (result.ok) return;
    for (const { check, action } of WATCHDOG_MAP) {
      if (!result.checks[check]?.ok) {
        const outcome = await runAction(action);
        emit(EVENT_TYPES.HEALTH_DEGRADED, { check, action, outcome, at: new Date().toISOString() });
      }
    }
  }, intervalMs);
  timer.unref?.(); // don't keep process alive on shutdown
  return timer;
}
```

**Acceptance criteria:** watchdog runs on interval; failed check triggers mapped action; events emitted; unref'd timer.

### M4 — Health history + dashboard + tests

**Reference code (migration `src/lib/db/migrations/20260915-health.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS health_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      check_name TEXT NOT NULL,
      ok INTEGER NOT NULL,
      detail TEXT,
      action_taken TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_health_ts ON health_events (ts);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS health_events"); };
```

```js
// src/lib/db/repos/healthRepo.js
export async function recordHealthEvent(db, { checkName, ok, detail, actionTaken }) {
  db.run("INSERT INTO health_events (ts, check_name, ok, detail, action_taken) VALUES (?, ?, ?, ?, ?)",
    [new Date().toISOString(), checkName, ok ? 1 : 0, detail ?? null, actionTaken ?? null]);
}
export async function recentHealthEvents(db, limit = 100) {
  return db.all("SELECT * FROM health_events ORDER BY id DESC LIMIT ?", [limit]);
}
```

**Files touched:** `src/lib/health/` (new: checks, actions, watchdog), `custom-server.js` (endpoints), `src/lib/db/migrations/20260915-health.js` (new), `src/lib/db/repos/healthRepo.js` (new), dashboard health page (new), `tests/unit/health.test.js` (new).

**Acceptance criteria:** history recorded; dashboard shows status + history; tests cover checks + cooldown.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| False positives | Unnecessary actions | Tuned thresholds + cooldowns |
| Recovery loops | Flapping | Max attempts + cooldown |
| Endpoint abuse | Load | Rate limit /healthz (plan 41) |
| Complexity | Over-engineering | Simple checks first |

## Verification

- Unit: checks, actions, watchdog
- Manual: stop DB → /readyz 503 → watchdog reinit → /readyz 200
- Regression: `tests/__baseline__/verify-no-regression.mjs`