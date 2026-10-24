# Implementation Plan 130 — Provider Registry & Model Catalog Governance — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #providers #registry #model-catalog #validation #governance #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (provider registry in `open-sse/providers/registry/`; model catalog in `open-sse/config/providerModels.js`; registry index generation in `scripts/migrate-registry.mjs`; conventions in `AGENTS.md`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — validate registry; catalog complete; health checks pass.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-130-provider-registry-governance.md`, `../research/9router/impl-plan-34-provider-registry-models.md`, `../research/9router/impl-plan-17-provider-registry-deep-dive.md`.

## Scope

**In scope:** registry conventions (one file per provider, schema validation, auto-generated index); model catalog (all models documented, metadata validation, lifecycle updates); registry health (completeness/consistency checks, provider/model counts, stale-entry alerts); CI validation + dashboard registry overview.
**Out of scope:** provider registry foundations (plan 34); registry docs generation (plan 33).

## Milestones

### M1 — Registry conventions + validation

**Reference code (`open-sse/providers/registry/validate.js`):**

```js
// Registry schema: required fields per provider entry.
export const PROVIDER_SCHEMA = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  baseUrl: { type: "string", required: true },
  models: { type: "array", required: true },
  auth: { type: "string", required: false },
};

// Schema validation: validate provider entries.
export function validateProvider(entry, { schema = PROVIDER_SCHEMA } = {}) {
  const errors = [];
  for (const [field, rule] of Object.entries(schema)) {
    const v = entry?.[field];
    if (rule.required && v === undefined) errors.push({ field, error: "required" });
    else if (v !== undefined && rule.type === "array" && !Array.isArray(v)) errors.push({ field, error: "expected array" });
    else if (v !== undefined && rule.type === "string" && typeof v !== "string") errors.push({ field, error: "expected string" });
  }
  return { ok: errors.length === 0, errors };
}

// Registry validation: validate all entries.
export function validateRegistry(entries) {
  const results = entries.map((e) => ({ id: e.id, ...validateProvider(e) }));
  return { ok: results.every((r) => r.ok), results };
}
```

**Acceptance criteria:** schema; per-provider validation; registry validation.

### M2 — Model catalog

**Reference code (`open-sse/config/catalog.js`):**

```js
// Model catalog: all models documented.
export function makeCatalog() {
  const models = new Map(); // id -> model
  return {
    register(model) { models.set(model.id, model); return model; },
    // Metadata validation.
    validate(model, { required = ["id", "provider", "context"] } = {}) {
      const missing = required.filter((f) => model[f] === undefined);
      return { ok: missing.length === 0, missing };
    },
    // Lifecycle updates: deprecate, remove.
    deprecate(id, { sunsetAt = null } = {}) {
      const m = models.get(id); if (!m) return { ok: false, reason: "not-found" };
      m.status = "deprecated"; m.sunsetAt = sunsetAt;
      return { ok: true, model: m };
    },
    remove(id) { return models.delete(id); },
    all() { return [...models.values()]; },
  };
}
```

**Acceptance criteria:** catalog; validation; lifecycle.

### M3 — Registry health

**Reference code (`open-sse/providers/registry/health.js`):**

```js
// Registry checks: completeness, consistency.
export function registryHealth(entries, { expectedIds = [] } = {}) {
  const ids = entries.map((e) => e.id);
  const missing = expectedIds.filter((id) => !ids.includes(id));
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  return {
    ok: missing.length === 0 && duplicates.length === 0,
    providerCount: ids.length,
    modelCount: entries.reduce((a, e) => a + (e.models?.length ?? 0), 0),
    missing,
    duplicates,
  };
}

// Stale alerts: entries not updated recently.
export function staleEntries(entries, { maxAgeMs = 90 * 24 * 3600 * 1000 } = {}) {
  const cutoff = Date.now() - maxAgeMs;
  return entries.filter((e) => (e.updatedAt ?? 0) < cutoff).map((e) => e.id);
}

// Metrics: provider counts, model counts.
export function registryMetrics(entries) {
  return {
    providers: entries.length,
    models: entries.reduce((a, e) => a + (e.models?.length ?? 0), 0),
    byAuth: entries.reduce((acc, e) => { acc[e.auth ?? "none"] = (acc[e.auth ?? "none"] ?? 0) + 1; return acc; }, {}),
  };
}
```

**Acceptance criteria:** completeness; staleness; metrics.

### M4 — CI validation + dashboard + tests

**Reference code (`scripts/validate-registry.mjs`):**

```js
#!/usr/bin/env node
// CI: registry validation script.
import { validateRegistry } from "../open-sse/providers/registry/validate.js";
import { registryHealth } from "../open-sse/providers/registry/health.js";

const entries = await import("../open-sse/providers/registry/index.js").then((m) => m.default ?? m.registry ?? []);
const validation = validateRegistry(entries);
const health = registryHealth(entries);

if (!validation.ok || !health.ok) {
  console.error("[registry] validation failed:", JSON.stringify({ validation, health }, null, 2));
  process.exit(1);
}
console.log(`[registry] ok: ${health.providerCount} providers, ${health.modelCount} models`);
```

**Files touched:** `open-sse/providers/registry/` (validation), `open-sse/config/providerModels.js` (catalog), `scripts/validate-registry.mjs` (new), dashboard registry page (new), `tests/unit/registry.test.js` (new).

**Acceptance criteria:** CI script; dashboard; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Registry drift | Stale entries | CI validation |
| Model staleness | Wrong models | Update process |
| Schema complexity | Validation noise | Simple schema |
| Generation conflicts | Merge issues | Script ownership |

## Verification

- Unit: validateProvider, validateRegistry, makeCatalog, registryHealth, staleEntries
- Manual: add invalid provider → CI fails; deprecate model → catalog reflects
- Regression: `tests/__baseline__/verify-no-regression.mjs`