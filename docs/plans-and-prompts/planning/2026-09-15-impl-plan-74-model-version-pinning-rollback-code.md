# Implementation Plan 74 — Model Version Pinning & Rollback — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #model-versioning #pinning #rollback #stability #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (alias resolution from plan 51 (`src/lib/aliases/`); model lifecycle from plan 59; provider registry in `open-sse/providers/registry/*`; model resolution in `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — pin a model, simulate a version change, confirm detection + rollback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-74-model-version-pinning.md`, `../research/9router/impl-plan-59-model-lifecycle-sunset.md`, `../research/9router/impl-plan-51-model-aliases-virtual.md`.

## Scope

**In scope:** version pinning (alias → pinned version, per-route pinning, enforcement at resolution); version detection (provider API metadata, response headers) with change alerts + history; rollback (trigger on quality/cost regression, revert to previous version, tested rollback); alias integration + version telemetry.
**Out of scope:** provider-side version guarantees (best-effort detection only); multi-version A/B serving.

## Milestones

### M1 — Version pinning

**Reference code (`src/lib/versions/pinning.js`):**

```js
// Pin registry: alias -> pinned version string.
const pins = new Map(); // seeded from DB overrides

export function setPin(alias, version) {
  pins.set(alias, version);
}
export function getPin(alias) {
  return pins.get(alias) ?? null;
}
export function clearPin(alias) {
  pins.delete(alias);
}

// Resolve a model name to its pinned version (if any).
export function resolvePinned(model, { aliasFor } = {}) {
  const alias = aliasFor?.(model) ?? model;
  const pin = getPin(alias);
  return pin ? `${model}@${pin}` : model;
}

// Per-route pinning: route config may override the global pin.
export function resolveForRoute(model, routePins = {}, { aliasFor } = {}) {
  const alias = aliasFor?.(model) ?? model;
  const pin = routePins[alias] ?? getPin(alias);
  return pin ? `${model}@${pin}` : model;
}
```

**Acceptance criteria:** pins set/cleared; resolution appends version; route pins override.

### M2 — Version detection

**Reference code (`src/lib/versions/detection.js`):**

```js
// Extract version from provider response headers or metadata.
export function detectVersion({ headers = {}, metadata = {} } = {}) {
  return headers["x-model-version"] ?? metadata.version ?? metadata.model_version ?? null;
}

// Compare detected vs pinned; report drift.
export function checkDrift({ alias, pinned, detected }) {
  if (!pinned) return { drift: false, reason: "no-pin" };
  if (!detected) return { drift: false, reason: "no-detected-version" };
  if (detected !== pinned) return { drift: true, pinned, detected };
  return { drift: false, reason: "in-sync" };
}

// Change log entry (persisted by repo).
export function versionChangeEvent({ alias, from, to, source = "detection" }) {
  return { alias, from, to, source, at: new Date().toISOString() };
}
```

**Acceptance criteria:** version extracted from headers/metadata; drift detected; change events shaped.

### M3 — Rollback

**Reference code (`src/lib/versions/rollback.js`):**

```js
import { getPin, setPin } from "./pinning.js";

// Rollback trigger: quality/cost regression beyond thresholds.
export function shouldRollback({ qualityDrop = 0, costRise = 0, qualityThreshold = 0.1, costThreshold = 0.3 } = {}) {
  if (qualityDrop > qualityThreshold) return { rollback: true, reason: "quality" };
  if (costRise > costThreshold) return { rollback: true, reason: "cost" };
  return { rollback: false };
}

// Rollback: revert alias to the previous pinned version (history kept by repo).
export function rollbackVersion(alias, history) {
  const prev = history.find((h) => h.alias === alias && h.to === getPin(alias));
  if (!prev) return { ok: false, reason: "no-previous-version" };
  setPin(alias, prev.from);
  return { ok: true, alias, from: prev.to, to: prev.from };
}
```

**Acceptance criteria:** triggers fire on regression; rollback reverts to previous; missing history handled.

### M4 — Integration + telemetry + tests

**Reference code (migration `src/lib/db/migrations/20260915-versions.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS version_pins (
      alias TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS version_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alias TEXT NOT NULL,
      from_version TEXT,
      to_version TEXT NOT NULL,
      source TEXT NOT NULL,
      at TEXT NOT NULL
    );
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS version_pins; DROP TABLE IF EXISTS version_history"); };
```

```js
// src/lib/db/repos/versionRepo.js
export async function savePin(db, alias, version) {
  db.run(`INSERT INTO version_pins (alias, version, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(alias) DO UPDATE SET version = excluded.version, updated_at = excluded.updated_at`,
    [alias, version, new Date().toISOString()]);
}
export async function recordChange(db, ev) {
  db.run(`INSERT INTO version_history (alias, from_version, to_version, source, at) VALUES (?, ?, ?, ?, ?)`,
    [ev.alias, ev.from ?? null, ev.to, ev.source, ev.at]);
}
export async function historyFor(db, alias, { limit = 20 } = {}) {
  return db.all("SELECT * FROM version_history WHERE alias = ? ORDER BY id DESC LIMIT ?", [alias, limit]);
}
```

**Files touched:** `src/lib/versions/` (new: pinning, detection, rollback), `src/lib/db/migrations/20260915-versions.js` (new), `src/lib/db/repos/versionRepo.js` (new), `src/lib/aliases/` (pin integration), `src/sse/handlers/chat.js` (resolution), dashboard models page (extend), `tests/unit/version-pinning.test.js` (new).

**Acceptance criteria:** pins persisted; changes logged; resolution uses pins; rollback works end-to-end.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Pin staleness | Pinned version retired | Detection + alerts + lifecycle synergy |
| Rollback complexity | Broken revert | Tested rollback + history |
| Provider limits | Version not exposed | Best-effort detection |
| Confusion | Versioned names leak | Clear docs + alias-first UX |

## Verification

- Unit: pinning, detection, drift, rollback
- Manual: pin → simulate header change → alert; force regression → rollback
- Regression: `tests/__baseline__/verify-no-regression.mjs`