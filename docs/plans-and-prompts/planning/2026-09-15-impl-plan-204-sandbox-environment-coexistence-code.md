# Implementation Plan 204 — Sandbox Environment Coexistence — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #sandbox #isolation #lifecycle #experimentation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (rule engine from plan 88; testing from plan 60; config from plan 22; canary from plan 44).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — model; patterns; lifecycle.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-204-sandbox-environment-coexistence.md`, `../research/9router/impl-plan-88-rule-engine-v2.md`, `../research/9router/impl-plan-44-canary-deployments.md`.

## Scope

**In scope:** sandbox model (definition, scope, boundaries); sandbox patterns (parallel, shadow, progressive); sandbox lifecycle (creation, promotion, retirement).
**Out of scope:** canary deployments (plan 44); config management (plan 22).

## Milestones

### M1 — Sandbox model

**Reference code (`src/lib/sandbox/model.js`):**

```js
// Sandbox definition: isolated environment.
export function makeSandbox({ id, config = {}, data = {} } = {}) {
  return {
    id,
    config: { ...config }, // isolated copy
    data: { ...data }, // isolated copy
    // Sandbox scope: routing, config, data.
    scope() { return { routing: true, config: true, data: true }; },
    // Sandbox boundaries: explicit boundaries.
    boundaries() { return { config: "copy-on-write", data: "copy-on-write", routing: "isolated" }; },
  };
}

// Sandbox registry.
export function makeSandboxRegistry() {
  const sandboxes = new Map();
  return {
    create(id, opts) { const s = makeSandbox({ id, ...opts }); sandboxes.set(id, s); return s; },
    get(id) { return sandboxes.get(id) ?? null; },
    all() { return [...sandboxes.values()]; },
  };
}
```

**Acceptance criteria:** sandbox; registry; boundaries.

### M2 — Sandbox patterns

**Reference code (`src/lib/sandbox/patterns.js`):**

```js
// Parallel sandbox: full parallel sandbox.
export function parallelSandbox({ registry, id, config = {} } = {}) {
  return registry.create(id, { config });
}

// Shadow sandbox: shadow traffic sandbox.
export function shadowSandbox({ registry, id, config = {}, shadowOf = null } = {}) {
  const s = registry.create(id, { config });
  return { ...s, shadowOf, mode: "shadow" };
}

// Progressive sandbox: progressive rollout sandbox.
export function progressiveSandbox({ registry, id, config = {}, traffic = 0.1 } = {}) {
  const s = registry.create(id, { config });
  return { ...s, traffic, mode: "progressive" };
}
```

**Acceptance criteria:** parallel; shadow; progressive.

### M3 — Sandbox lifecycle

**Reference code (`src/lib/sandbox/lifecycle.js`):**

```js
// Sandbox creation: create sandbox.
export function createSandbox({ registry, id, config = {} } = {}) {
  return registry.create(id, { config });
}

// Sandbox promotion: promote to prod.
export function promoteSandbox({ sandbox, apply = () => {} } = {}) {
  apply(sandbox.config);
  return { ...sandbox, promoted: true, promotedAt: Date.now() };
}

// Sandbox retirement: retire sandbox.
export function retireSandbox({ registry, id } = {}) {
  const s = registry.get(id);
  if (!s) return false;
  registry.all().splice(registry.all().findIndex((x) => x.id === id), 1);
  return true;
}

// Lifecycle state.
export function lifecycleState({ sandbox } = {}) {
  return sandbox.promoted ? "promoted" : "active";
}
```

**Acceptance criteria:** creation; promotion; retirement.

### M4 — Integration + tests

**Reference code (`src/lib/sandbox/integrate.js`):**

```js
// Config integration: sandbox config.
export function sandboxConfig({ sandbox, key = null } = {}) {
  return key ? sandbox.config[key] : sandbox.config;
}

// Fail-open.
export function safeSandbox(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/sandbox/` (new: model, patterns, lifecycle, integrate), `src/lib/config/` (sandbox config), dashboard sandbox page (new), `tests/unit/sandbox.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Sandbox drift | Stale sandboxes | Sync |
| Promo failures | Broken prod | Rollback |
| Isolation gaps | Contamination | Boundaries |
| Cost | Expensive sandboxes | Sharing |

## Verification

- Unit: makeSandbox, makeSandboxRegistry, parallelSandbox, shadowSandbox, progressiveSandbox, createSandbox, promoteSandbox, retireSandbox, lifecycleState, sandboxConfig
- Manual: create → experiment → promote → retire
- Regression: `tests/__baseline__/verify-no-regression.mjs`