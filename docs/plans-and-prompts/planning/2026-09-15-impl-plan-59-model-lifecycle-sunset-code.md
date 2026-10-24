# Implementation Plan 59 — Model Lifecycle & Sunset Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #model-lifecycle #sunset #deprecation #migration #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`open-sse/providers/registry/*` — one file per provider, auto-generated index; `open-sse/config/providerModels.js`; model handling in `src/sse/handlers/chat.js`; alias system from plan 51).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — mark a model deprecated, confirm warnings; auto-migrate; hard-sunset block.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-59-model-lifecycle-sunset.md`, `../research/9router/44-branch-gateways-and-serving.md`, `../research/9router/impl-plan-51-model-aliases-virtual.md`.

## Scope

**In scope:** lifecycle states (preview → GA → deprecated → sunset) with metadata (dates, replacement models); sunset workflow (deprecation warnings via headers/logs, auto-migration to replacement, hard block after sunset date, configurable schedule); migration modes (warn, auto-migrate, block); registry + alias integration; lifecycle telemetry.
**Out of scope:** automatic registry updates from provider APIs; model pricing lifecycle (plan 69).

## Milestones

### M1 — Lifecycle states + metadata

**Reference code (`src/lib/lifecycle/states.js`):**

```js
// Lifecycle states and transitions.
export const LIFECYCLE_STATES = ["preview", "ga", "deprecated", "sunset"];

export const TRANSITIONS = {
  preview: ["ga", "deprecated", "sunset"],
  ga: ["deprecated", "sunset"],
  deprecated: ["sunset", "ga"], // un-deprecate allowed
  sunset: [], // terminal
};

export function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

// Lifecycle metadata attached to models in the registry:
// { state, deprecatedAt?, sunsetAt?, replacement? }
export function lifecycleFor(model, registry) {
  return registry[model]?.lifecycle ?? { state: "ga" };
}

export function isDeprecated(lifecycle, now = new Date()) {
  return lifecycle.state === "deprecated" || (lifecycle.state === "sunset" && new Date(lifecycle.sunsetAt) > now);
}

export function isSunset(lifecycle, now = new Date()) {
  return lifecycle.state === "sunset" && new Date(lifecycle.sunsetAt) <= now;
}
```

**Acceptance criteria:** transitions validated; deprecated/sunset predicates correct.

### M2 — Sunset workflow

**Reference code (`src/lib/lifecycle/sunset.js`):**

```js
import { isDeprecated, isSunset } from "./states.js";

// Enforcement at request time. Modes: warn | auto-migrate | block (per settings.modelLifecycleMode).
export function enforceLifecycle({ model, lifecycle, mode = "warn", now = new Date() }) {
  if (isSunset(lifecycle, now)) {
    if (mode === "block") {
      return { action: "block", error: { message: `Model ${model} was sunset on ${lifecycle.sunsetAt}`, type: "invalid_request_error", param: "model", code: "model_sunset" } };
    }
    // auto-migrate or warn: route to replacement.
    if (lifecycle.replacement) return { action: "migrate", model: lifecycle.replacement, warning: `Model ${model} is sunset — using replacement ${lifecycle.replacement}` };
    return { action: "block", error: { message: `Model ${model} is sunset with no replacement`, type: "invalid_request_error", param: "model", code: "model_sunset" } };
  }

  if (isDeprecated(lifecycle, now)) {
    if (mode === "block") {
      return { action: "block", error: { message: `Model ${model} is deprecated`, type: "invalid_request_error", param: "model", code: "model_deprecated" } };
    }
    if (mode === "auto-migrate" && lifecycle.replacement) {
      return { action: "migrate", model: lifecycle.replacement, warning: `Model ${model} is deprecated — using replacement ${lifecycle.replacement}` };
    }
    return { action: "warn", model, warning: `Model ${model} is deprecated (sunset ${lifecycle.sunsetAt ?? "TBD"})` };
  }

  return { action: "none", model };
}
```

**Acceptance criteria:** warn adds header/log; auto-migrate routes to replacement; block returns OpenAI-shaped error.

### M3 — Migration support + telemetry

**Reference code (`src/lib/lifecycle/migrate.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// Record migration events for telemetry.
export async function recordMigration(db, { requestId, fromModel, toModel, reason }) {
  db.run(`
    INSERT INTO model_migrations (request_id, from_model, to_model, reason, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `, [requestId, fromModel, toModel, reason]);
}

export async function migrationStats(db, { days = 30 } = {}) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  return db.all(`
    SELECT from_model, to_model, COUNT(*) AS count
    FROM model_migrations WHERE created_at >= ?
    GROUP BY from_model, to_model ORDER BY count DESC
  `, [since]);
}
```

**Reference code (migration `src/lib/db/migrations/20260915-model-lifecycle.js`):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT,
      from_model TEXT NOT NULL,
      to_model TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_model_migrations_from ON model_migrations (from_model, created_at);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS model_migrations"); };
```

**Acceptance criteria:** migrations recorded; stats query works; dashboard shows counts.

### M4 — Registry + alias integration + tests

**Reference code (integration in `src/sse/handlers/chat.js`):**

```js
// Before combo expansion: enforce lifecycle on the requested model.
import { enforceLifecycle } from "@/lib/lifecycle/sunset.js";
import { lifecycleFor } from "@/lib/lifecycle/states.js";

export function applyLifecycle({ model, registry, mode, requestId }) {
  const lifecycle = lifecycleFor(model, registry);
  const result = enforceLifecycle({ model, lifecycle, mode });
  if (result.action === "migrate") {
    recordMigration(getAdapter(), { requestId, fromModel: model, toModel: result.model, reason: result.warning });
    // Add deprecation warning header on the response (set later in the handler).
    result.warningHeader = `Warning: ${result.warning}`;
  }
  return result;
}
```

**Files touched:** `src/lib/lifecycle/` (new: states, sunset, migrate), `src/lib/db/migrations/20260915-model-lifecycle.js` (new), `open-sse/providers/registry/*` (lifecycle metadata), `src/sse/handlers/chat.js` (enforcement), dashboard models page (extend: lifecycle badges), `tests/unit/model-lifecycle.test.js` (new).

**Acceptance criteria:** enforcement integrated; aliases resolve before lifecycle check (alias target checked); dashboard shows lifecycle.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Premature sunset | Broken requests | Configurable dates + warn-first |
| Migration breakage | Wrong replacement | Auto-migrate testing |
| Registry staleness | Wrong states | Update workflow + telemetry |
| User confusion | Silent changes | Clear warnings + headers |

## Verification

- Unit: states, transitions, sunset, migrate
- Manual: deprecate a model → warn → auto-migrate → block
- Regression: `tests/__baseline__/verify-no-regression.mjs`