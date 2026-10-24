# Implementation Plan 128 — API Route Consistency & Versioning — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #api #versioning #conventions #endpoints #governance #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (API routes in `src/app/api/`; unified error format from plan 19; API compatibility SDK from plan 40; docs from plan 33).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — conventions; versioning; endpoint registry.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-128-api-consistency-versioning.md`, `../research/9router/impl-plan-40-api-compatibility-sdk.md`, `../research/9router/impl-plan-19-unified-error-system.md`.

## Scope

**In scope:** API conventions (naming, unified error format, pagination params, validation); API versioning (URL versioning `/v1/` `/v2/`, deprecation/sunset lifecycle, backward compatibility); endpoint governance (endpoint registry, per-endpoint health, consistency reviews); docs integration + dashboard API overview.
**Out of scope:** SDK compatibility (plan 40); unified error internals (plan 19).

## Milestones

### M1 — API conventions

**Reference code (`src/lib/api/conventions.js`):**

```js
// Naming: consistent route naming (kebab-case).
export function routeName(path) {
  return path.replace(/^\/+/, "").replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/\/+/g, "/");
}

// Errors: unified error format (plan 19).
export function apiError({ status = 500, code = "internal_error", message = "Internal error", details = null } = {}) {
  return { error: { status, code, message, details } };
}

// Pagination: consistent params.
export function pagination({ page = 1, pageSize = 20, maxPageSize = 100 } = {}) {
  const size = Math.min(Math.max(1, pageSize), maxPageSize);
  return { page: Math.max(1, page), pageSize: size, offset: (Math.max(1, page) - 1) * size };
}

// Validation: request validation conventions.
export function validateRequest(body, schema) {
  const errors = [];
  for (const [field, rule] of Object.entries(schema)) {
    const v = body?.[field];
    if (rule.required && v === undefined) errors.push({ field, error: "required" });
    else if (v !== undefined && rule.type && typeof v !== rule.type) errors.push({ field, error: `expected ${rule.type}` });
  }
  return { ok: errors.length === 0, errors };
}
```

**Acceptance criteria:** naming; error format; pagination; validation.

### M2 — API versioning

**Reference code (`src/lib/api/version.js`):**

```js
// Version strategy: URL versioning.
export function versionOf(path) {
  const m = path.match(/^\/v(\d+)\//);
  return m ? Number(m[1]) : null;
}

// Version lifecycle: deprecation, sunset.
export function makeVersionRegistry() {
  const versions = new Map(); // version -> { status, sunsetAt }
  return {
    register(version, { status = "active", sunsetAt = null } = {}) {
      versions.set(version, { status, sunsetAt });
    },
    status(version) {
      const v = versions.get(version);
      if (!v) return "unknown";
      if (v.status === "deprecated" && v.sunsetAt && Date.now() >= v.sunsetAt) return "sunset";
      return v.status;
    },
    // Backward compatibility: breaking changes require new version.
    isBreaking(change) { return change.breaking === true; },
    nextVersion(version) { return version + 1; },
  };
}
```

**Acceptance criteria:** URL versioning; lifecycle; compatibility rules.

### M3 — Endpoint governance

**Reference code (`src/lib/api/registry.js`):**

```js
// Endpoint registry: all endpoints documented.
export function makeEndpointRegistry() {
  const endpoints = new Map(); // method:path -> endpoint
  return {
    register({ method, path, version = 1, description = "", params = [] } = {}) {
      endpoints.set(`${method}:${path}`, { method, path, version, description, params });
    },
    // Per-endpoint health metrics.
    record(method, path, { ok = true, latencyMs = 0 } = {}) {
      const e = endpoints.get(`${method}:${path}`);
      if (!e) return;
      e.stats = e.stats ?? { total: 0, ok: 0, latency: null };
      e.stats.total += 1; if (ok) e.stats.ok += 1;
      e.stats.latency = e.stats.latency == null ? latencyMs : 0.1 * latencyMs + 0.9 * e.stats.latency;
    },
    // Consistency review: endpoints missing conventions.
    review() {
      return [...endpoints.values()].map((e) => ({
        ...e,
        consistent: routeName(e.path) === e.path && e.description.length > 0,
      }));
    },
    all() { return [...endpoints.values()]; },
  };
}
```

**Acceptance criteria:** registry; health; consistency review.

### M4 — Integration + tests

**Reference code (`src/lib/api/integrate.js`):**

```js
// Docs integration: API docs generation.
export function generateDocs(registry) {
  return registry.all().map((e) => ({
    method: e.method, path: `/v${e.version}${e.path}`, description: e.description, params: e.params,
  }));
}

// Telemetry: API overview.
export function makeApiTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        requests: events.length,
        errors: events.filter((e) => !e.ok).length,
        byVersion: events.reduce((acc, e) => { acc[`v${e.version ?? 1}`] = (acc[`v${e.version ?? 1}`] ?? 0) + 1; return acc; }, {}),
      };
    },
  };
}
```

**Files touched:** `src/app/api/` (convention fixes), `src/lib/api/` (new: conventions, version, registry, integrate), dashboard api page (new), `tests/unit/api.test.js` (new).

**Acceptance criteria:** docs generation; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Breaking changes | Client breakage | Versioning |
| Convention drift | Inconsistent API | Reviews |
| Registry staleness | Missing endpoints | Generation |
| Version sprawl | Too many versions | Sunset policy |

## Verification

- Unit: routeName, apiError, pagination, validateRequest, versionOf, makeEndpointRegistry
- Manual: deprecated endpoint → sunset; registry review flags inconsistency
- Regression: `tests/__baseline__/verify-no-regression.mjs`