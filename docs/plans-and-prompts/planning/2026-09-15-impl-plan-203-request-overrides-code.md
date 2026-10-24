# Implementation Plan 203 — Per-Request Override Mechanism — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #overrides #precedence #governance #request-control #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (request parameters from plan 47; routing policy from plan 8; policy overrides from plan 170; egress rules from plan 66).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — model; hierarchy; governance.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-203-request-overrides.md`, `../research/9router/impl-plan-47-request-parameters.md`, `../research/9router/impl-plan-8-routing-policy.md`.

## Scope

**In scope:** override model (fields, syntax, validation); override hierarchy (levels, precedence, merging); override governance (policy, limits, audit).
**Out of scope:** routing policy (plan 8); egress rules (plan 66).

## Milestones

### M1 — Override model

**Reference code (`src/lib/overrides/model.js`):**

```js
// Override fields: model, provider, parameters.
export const OVERRIDE_FIELDS = ["model", "provider", "parameters"];

// Override syntax: request-level syntax.
export function parseOverrides({ request = {} } = {}) {
  const overrides = {};
  for (const f of OVERRIDE_FIELDS) {
    if (request[f] !== undefined) overrides[f] = request[f];
  }
  return overrides;
}

// Override validation: valid override values.
export function validateOverrides({ overrides = {}, valid = {} } = {}) {
  const errors = [];
  for (const [k, v] of Object.entries(overrides)) {
    if (!OVERRIDE_FIELDS.includes(k)) errors.push(`unknown field: ${k}`);
    if (valid[k] && !valid[k].includes(v)) errors.push(`invalid value for ${k}: ${v}`);
  }
  return { valid: errors.length === 0, errors };
}
```

**Acceptance criteria:** fields; parsing; validation.

### M2 — Override hierarchy

**Reference code (`src/lib/overrides/hierarchy.js`):**

```js
// Hierarchy levels: request, user, org, global.
export const OVERRIDE_LEVELS = ["request", "user", "org", "global"];

// Hierarchy precedence: higher level wins.
export function precedence(level) {
  return OVERRIDE_LEVELS.indexOf(level);
}

// Hierarchy merging: merge across levels.
export function mergeOverrides({ levels = {} } = {}) {
  // levels: {request: {}, user: {}, org: {}, global: {}}
  const merged = {};
  for (const level of OVERRIDE_LEVELS) {
    Object.assign(merged, levels[level] ?? {});
  }
  return merged;
}

// Resolve: effective override for a field.
export function resolveOverride({ levels = {}, field = "model" } = {}) {
  for (const level of OVERRIDE_LEVELS) {
    if (levels[level]?.[field] !== undefined) return { value: levels[level][field], level };
  }
  return { value: null, level: null };
}
```

**Acceptance criteria:** levels; merging; resolution.

### M3 — Override governance

**Reference code (`src/lib/overrides/govern.js`):**

```js
// Override policy: who can override.
export function canOverride({ user = null, policy = { allowed: ["admin"], fields: ["model"] } } = {}) {
  return policy.allowed.includes(user) || policy.allowed.includes("*");
}

// Override limits: override constraints.
export function overrideLimits({ overrides = {}, limits = { maxFields: 3 } } = {}) {
  return { ok: Object.keys(overrides).length <= limits.maxFields, count: Object.keys(overrides).length };
}

// Override audit: override logging.
export function makeOverrideAudit() {
  const entries = [];
  return {
    log(entry) { entries.push({ ...entry, at: Date.now() }); },
    recent({ limit = 50 } = {}) { return entries.slice(-limit); },
    all() { return entries; },
  };
}
```

**Acceptance criteria:** policy; limits; audit.

### M4 — Integration + tests

**Reference code (`src/lib/overrides/integrate.js`):**

```js
// Routing integration: override hooks.
export function applyOverrides({ request = {}, levels = {} } = {}) {
  const parsed = parseOverrides({ request });
  const merged = mergeOverrides({ levels: { ...levels, request: parsed } });
  return { ...request, ...merged };
}

// Fail-open.
export function safeOverride(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/overrides/` (new: model, hierarchy, govern, integrate), `open-sse/handlers/chatCore.js` (override hooks), dashboard override page (new), `tests/unit/overrides.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Override abuse | Bad routing | Governance |
| Precedence confusion | Wrong overrides | Clear hierarchy |
| Invalid overrides | Broken requests | Validation |
| Complexity | Confusion | Simple model |

## Verification

- Unit: parseOverrides, validateOverrides, precedence, mergeOverrides, resolveOverride, canOverride, overrideLimits, makeOverrideAudit, applyOverrides
- Manual: request override → merge → apply
- Regression: `tests/__baseline__/verify-no-regression.mjs`