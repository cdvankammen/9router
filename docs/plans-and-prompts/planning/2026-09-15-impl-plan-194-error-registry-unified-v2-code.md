# Implementation Plan 194 — Error Registry & Unified Error System v2 — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #errors #registry #unified #versioning #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (unified error system from plan 19; error classification from plan 89; error categorization from plan 122; user-facing errors from plan 62).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — registry; format; evolution.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-194-error-registry-unified-v2.md`, `../research/9router/impl-plan-19-unified-error-system.md`, `../research/9router/impl-plan-89-error-classification.md`.

## Scope

**In scope:** error registry (catalog, metadata, documentation); unified error v2 (format, propagation, handling); error evolution (versioning, deprecation, migration).
**Out of scope:** error classification (plan 89); user-facing errors (plan 62).

## Milestones

### M1 — Error registry

**Reference code (`src/lib/errors/registry.js`):**

```js
// Error catalog: all error codes.
export function makeErrorRegistry(initial = {}) {
  const catalog = new Map(Object.entries(initial));
  return {
    // register: {code, message, severity, action}
    register(e) { catalog.set(e.code, e); return e.code; },
    get(code) { return catalog.get(code) ?? null; },
    all() { return [...catalog.values()]; },
    // Error metadata: code, message, severity, action.
    metadata(code) { return catalog.get(code) ?? { code, message: "unknown", severity: "error", action: "report" }; },
  };
}

// Error documentation: auto-generated docs.
export function generateDocs({ registry } = {}) {
  return registry.all().map((e) => `| ${e.code} | ${e.message} | ${e.severity} | ${e.action} |`).join("\n");
}
```

**Acceptance criteria:** catalog; metadata; docs.

### M2 — Unified error v2

**Reference code (`src/lib/errors/v2.js`):**

```js
// Error format: standardized error format.
export function makeError({ code = "E_UNKNOWN", message = "", severity = "error", cause = null, meta = {} } = {}) {
  return { ok: false, error: { code, message, severity, cause, meta, at: new Date().toISOString() } };
}

// Error propagation: consistent error flow.
export function propagate(error) {
  // Preserve code through layers.
  return error?.error ? error : makeError({ code: error?.code ?? "E_UNKNOWN", message: error?.message ?? String(error) });
}

// Error handling: unified error handling.
export function handleError({ error, handlers = {} } = {}) {
  const code = error?.error?.code ?? error?.code ?? "E_UNKNOWN";
  const handler = handlers[code] ?? handlers.default ?? ((e) => e);
  return handler(error);
}
```

**Acceptance criteria:** format; propagation; handling.

### M3 — Error evolution

**Reference code (`src/lib/errors/evolution.js`):**

```js
// Error versioning: error code versions.
export function makeErrorVersions() {
  const versions = new Map(); // code -> [versions]
  return {
    add(code, version) {
      const list = versions.get(code) ?? [];
      list.push(version);
      versions.set(code, list);
    },
    latest(code) { return versions.get(code)?.at(-1) ?? null; },
    all() { return Object.fromEntries(versions); },
  };
}

// Error deprecation: deprecate old errors.
export function deprecate({ registry, code, replacement = null } = {}) {
  const e = registry.get(code);
  if (!e) return false;
  registry.register({ ...e, deprecated: true, replacement });
  return true;
}

// Error migration: migrate to new errors.
export function migrateError({ error, mapping = {} } = {}) {
  const code = error?.error?.code ?? error?.code;
  const target = mapping[code];
  return target ? { ...error, error: { ...error.error, code: target, migratedFrom: code } } : error;
}
```

**Acceptance criteria:** versioning; deprecation; migration.

### M4 — Integration + tests

**Reference code (`src/lib/errors/integrate.js`):**

```js
// Code integration: error registry in code.
export function errorFor({ registry, code, fallback = "E_UNKNOWN" } = {}) {
  return registry.get(code) ?? registry.get(fallback);
}

// Fail-open.
export function safeError(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/errors/registry.js` (new), `src/lib/errors/v2.js` (new), `src/lib/errors/evolution.js` (new), `src/lib/errors/integrate.js` (new), `src/shared/errors.js` (integration), dashboard errors page (new), `tests/unit/errors.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Registry bloat | Unmaintainable | Cleanup policy |
| Breaking changes | Broken clients | Versioning |
| Migration cost | Slow adoption | Gradual migration |
| Complexity | Confusion | Simple format |

## Verification

- Unit: makeErrorRegistry, generateDocs, makeError, propagate, handleError, makeErrorVersions, deprecate, migrateError, errorFor
- Manual: register → throw → propagate → handle
- Regression: `tests/__baseline__/verify-no-regression.mjs`