# Implementation Plan 107 — Routing Scope Resolution (Per-Request, Per-User, Per-Route) — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #scopes #precedence #resolution #config #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (rule engine scopes from plan 88 (`src/lib/rules/`); config system from plan 42 research; governance from plan 71 (`src/lib/governance/`); RBAC from plan 38 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — resolve a request with all scopes set; confirm precedence; confirm conflict flags.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-107-routing-scope-resolution.md`, `../research/9router/impl-plan-88-routing-rule-engine-v2.md`, `../research/9router/impl-plan-71-routing-governance-standards.md`.

## Scope

**In scope:** scope model (global/route/user/task/request with precedence request > task > user > route > global); resolution pipeline (collect applicable configs → order by precedence → merge); merge semantics (most-specific overrides, partial merge, conflict detection); scope management (CRUD, validation, audit); routing integration + dashboard scope editor.
**Out of scope:** distributed config sync (plan 70); per-scope RBAC enforcement (plan 38).

## Milestones

### M1 — Scope model

**Reference code (`src/lib/scopes/model.js`):**

```js
// Scope model with precedence.
export const SCOPES = ["global", "route", "user", "task", "request"];
export const PRECEDENCE = { request: 4, task: 3, user: 2, route: 1, global: 0 };

export function scopeRank(scope) {
  return PRECEDENCE[scope] ?? -1;
}

// Validation: valid scope references.
export function validateScope({ scope, ref = null, knownRefs = {} } = {}) {
  if (!SCOPES.includes(scope)) return { ok: false, reason: `unknown-scope:${scope}` };
  if (scope !== "global" && ref == null) return { ok: false, reason: `missing-ref:${scope}` };
  if (ref != null && knownRefs[scope] && !knownRefs[scope].includes(ref)) return { ok: false, reason: `unknown-ref:${scope}:${ref}` };
  return { ok: true };
}
```

**Acceptance criteria:** precedence defined; validation.

### M2 — Resolution pipeline

**Reference code (`src/lib/scopes/resolve.js`):**

```js
// Resolution: collect applicable configs → order by precedence → merge.
export function resolveScopes({ configs, context = {} } = {}) {
  // configs: [{ scope, ref, config }]
  const applicable = configs.filter((c) => {
    if (c.scope === "global") return true;
    if (c.scope === "route") return c.ref === context.route;
    if (c.scope === "user") return c.ref === context.userId;
    if (c.scope === "task") return c.ref === context.taskType;
    if (c.scope === "request") return c.ref === context.requestId;
    return false;
  });
  applicable.sort((a, b) => scopeRank(a.scope) - scopeRank(b.scope));
  return applicable;
}

// Merge semantics: most-specific overrides, partial merge.
export function mergeConfigs(ordered) {
  const merged = {};
  for (const { config } of ordered) {
    for (const [k, v] of Object.entries(config)) {
      if (v !== undefined) merged[k] = v;
    }
  }
  return merged;
}

// Conflict detection: conflicting settings flagged.
export function detectConflicts(ordered) {
  const conflicts = [];
  const seen = new Map();
  for (const { scope, config } of ordered) {
    for (const [k, v] of Object.entries(config)) {
      if (seen.has(k) && seen.get(k).value !== v) {
        conflicts.push({ key: k, lower: seen.get(k), higher: { scope, value: v } });
      }
      seen.set(k, { scope, value: v });
    }
  }
  return conflicts;
}
```

**Acceptance criteria:** pipeline; merge; conflicts.

### M3 — Scope management

**Reference code (`src/lib/scopes/manage.js`):**

```js
// Scope CRUD with audit.
export function makeScopeStore() {
  const store = new Map(); // `${scope}:${ref}` -> { config, updatedAt }
  const audit = [];
  return {
    set(scope, ref, config) {
      const key = `${scope}:${ref ?? "global"}`;
      store.set(key, { config, updatedAt: new Date().toISOString() });
      audit.push({ action: "set", scope, ref, at: new Date().toISOString() });
      return { ok: true };
    },
    get(scope, ref) { return store.get(`${scope}:${ref ?? "global"}`)?.config ?? null; },
    delete(scope, ref) {
      const key = `${scope}:${ref ?? "global"}`;
      const existed = store.delete(key);
      if (existed) audit.push({ action: "delete", scope, ref, at: new Date().toISOString() });
      return existed;
    },
    all() { return [...store.entries()].map(([k, v]) => ({ key: k, ...v })); },
    auditLog() { return audit; },
  };
}
```

**Acceptance criteria:** CRUD; audit log.

### M4 — Integration + tests

**Reference code (`src/lib/scopes/integrate.js`):**

```js
// Routing integration: resolution in selection.
export function resolveForRequest({ store, context, configs = null } = {}) {
  const list = configs ?? store.all().map(({ key, config }) => {
    const [scope, ref] = key.split(":");
    return { scope, ref: ref === "global" ? null : ref, config };
  });
  const ordered = resolveScopes({ configs: list, context });
  return { ordered, merged: mergeConfigs(ordered), conflicts: detectConflicts(ordered) };
}

// Telemetry: resolved config usage.
export function makeScopeTelemetry() {
  const counts = new Map();
  return {
    record(scope) { counts.set(scope, (counts.get(scope) ?? 0) + 1); },
    report() { return Object.fromEntries(counts); },
  };
}
```

**Files touched:** `src/lib/scopes/` (new: model, resolve, manage, integrate), `src/sse/handlers/chat.js` (resolution integration), `src/lib/db/migrations/20260915-scopes.js` (new), `src/lib/db/repos/scopeRepo.js` (new), dashboard scopes page (new), `tests/unit/scopes.test.js` (new).

**Acceptance criteria:** scopes resolved; merges predictable; conflicts flagged; editor functional.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Precedence confusion | Wrong config | Clear docs + UI |
| Merge surprises | Unexpected values | Conflict flags |
| Config explosion | Maintenance burden | Validation |
| Audit gaps | No traceability | Change logging |

## Verification

- Unit: scopeRank, validateScope, resolveScopes, mergeConfigs, detectConflicts
- Manual: set user + route configs → request resolves user override; conflicting keys flagged
- Regression: `tests/__baseline__/verify-no-regression.mjs`