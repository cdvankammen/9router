# Implementation Plan 77 — Model Preference & Fallback Order Policy — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #preferences #fallback-order #policy #combos #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (combo expansion in `src/sse/handlers/chat.js`; dynamic combos from plan 44; rules engine from plan 27 research; fallback semantics from plan 57).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — set cost-first preference; confirm fallback order generated and enforced; check policy events logged.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-77-model-preference-fallback-order.md`, `../research/9router/impl-plan-44-dynamic-combo-autoswitch.md`, `../research/9router/impl-plan-57-fallback-retry-semantics.md`.

## Scope

**In scope:** preference model (cost-first, quality-first, latency-first, balanced) with scope (per-user, per-route, global) and precedence (most-specific wins); fallback order generation from preferences with explicit-order override + validation; enforcement (strict/soft modes) with policy event logging; combo integration + preference UI.
**Out of scope:** learned preference optimization (explicit preferences only); cross-user preference sharing.

## Milestones

### M1 — Preference model

**Reference code (`open-sse/config/preferenceConfig.js`):**

```js
export const PREFERENCE_TYPES = ["cost-first", "quality-first", "latency-first", "balanced"];

export const DEFAULT_PREFERENCES = {
  global: "balanced",
  perUser: {},   // userId -> type
  perRoute: {},  // routePattern -> type
};

// Precedence: per-route > per-user > global.
export function resolvePreference({ userId, route, prefs = DEFAULT_PREFERENCES }) {
  if (prefs.perRoute?.[route]) return { type: prefs.perRoute[route], scope: "route" };
  if (prefs.perUser?.[userId]) return { type: prefs.perUser[userId], scope: "user" };
  return { type: prefs.global ?? "balanced", scope: "global" };
}

export function isValidPreference(type) {
  return PREFERENCE_TYPES.includes(type);
}
```

**Acceptance criteria:** precedence correct; validation works; defaults sane.

### M2 — Fallback order generation

**Reference code (`src/lib/preferences/orders.js`):**

```js
// Generate fallback order from a preference + candidate models with attributes.
export function generateOrder(preference, candidates, { costByModel, qualityByModel, latencyByModel } = {}) {
  const scored = candidates.map((model) => {
    const cost = costByModel?.[model] ?? 0.5;
    const quality = qualityByModel?.[model] ?? 0.5;
    const latency = latencyByModel?.[model] ?? 0.5;
    let score = 0;
    switch (preference) {
      case "cost-first": score = -cost; break;
      case "quality-first": score = quality; break;
      case "latency-first": score = -latency; break;
      default: score = quality - cost * 0.5 - latency * 0.25; // balanced
    }
    return { model, score };
  });
  return scored.sort((a, b) => b.score - a.score).map((s) => s.model);
}

// Explicit order overrides generated order; validate references.
export function applyExplicitOrder(generated, explicit, { knownModels }) {
  if (!explicit?.length) return generated;
  const valid = explicit.filter((m) => knownModels.has(m));
  if (!valid.length) return generated;
  const rest = generated.filter((m) => !valid.includes(m));
  return [...valid, ...rest];
}
```

**Acceptance criteria:** orders generated per preference; explicit orders validated + merged.

### M3 — Enforcement

**Reference code (`src/lib/preferences/enforce.js`):**

```js
import { resolvePreference } from "../../open-sse/config/preferenceConfig.js";
import { generateOrder, applyExplicitOrder } from "./orders.js";

// Enforcement at selection: returns ordered candidates + policy events.
export function enforcePreference({ userId, route, candidates, explicitOrder, knownModels, attrs, mode = "soft" }) {
  const { type, scope } = resolvePreference({ userId, route });
  const generated = generateOrder(type, candidates, attrs);
  const ordered = applyExplicitOrder(generated, explicitOrder, { knownModels });
  const events = [{ at: new Date().toISOString(), type, scope, mode, candidates: ordered }];
  if (mode === "strict" && explicitOrder?.length && ordered[0] !== explicitOrder[0]) {
    events.push({ at: new Date().toISOString(), kind: "override", detail: "explicit order first model not honored" });
  }
  return { ordered, events };
}
```

**Acceptance criteria:** enforcement returns ordered list; strict mode flags overrides; events logged.

### M4 — Integration + telemetry + tests

**Reference code (migration `src/lib/db/migrations/20260915-preferences.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS preference_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL,          -- global | user | route
      scope_key TEXT,               -- userId or route pattern
      type TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS preference_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      type TEXT NOT NULL,
      scope TEXT NOT NULL,
      mode TEXT NOT NULL,
      detail TEXT
    );
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS preference_settings; DROP TABLE IF EXISTS preference_events"); };
```

```js
// src/lib/db/repos/preferenceRepo.js
export async function setPreference(db, { scope, scopeKey = null, type }) {
  db.run(`INSERT INTO preference_settings (scope, scope_key, type, updated_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(scope, scope_key) DO UPDATE SET type = excluded.type, updated_at = excluded.updated_at`,
    [scope, scopeKey, type, new Date().toISOString()]);
}
export async function logPreferenceEvent(db, ev) {
  db.run(`INSERT INTO preference_events (ts, type, scope, mode, detail) VALUES (?, ?, ?, ?, ?)`,
    [ev.at ?? new Date().toISOString(), ev.type, ev.scope, ev.mode, ev.detail ?? null]);
}
```

**Files touched:** `src/lib/preferences/` (new: orders, enforce), `open-sse/config/preferenceConfig.js` (new), `src/sse/handlers/chat.js` (enforcement integration), `src/lib/db/migrations/20260915-preferences.js` (new), `src/lib/db/repos/preferenceRepo.js` (new), dashboard preferences page (new), `tests/unit/preferences.test.js` (new).

**Acceptance criteria:** preferences persisted; enforcement shapes combos; events logged; UI functional.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Preference conflicts | Ambiguous routing | Precedence rules (route > user > global) |
| Order errors | Invalid models | Validation against known models |
| Enforcement gaps | Preferences ignored | Tests + strict mode |
| Complexity | Confusing defaults | Simple balanced default |

## Verification

- Unit: resolvePreference, generateOrder, applyExplicitOrder, enforcePreference
- Manual: cost-first user → cheapest-first order; explicit order overrides
- Regression: `tests/__baseline__/verify-no-regression.mjs`