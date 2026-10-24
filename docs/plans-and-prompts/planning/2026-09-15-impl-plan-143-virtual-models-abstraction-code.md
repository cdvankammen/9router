# Implementation Plan 143 — Virtual Models & Abstraction Layer — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #virtual-models #aliases #abstraction #mapping #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (model aliases from plan 50 (`src/lib/aliases/` or wherever aliases landed); provider registry in `open-sse/providers/registry/`; model lists in `open-sse/config/providerModels.js`; API routes in `src/app/api/v1/`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — virtual name resolution; mapping strategies; lifecycle.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-143-virtual-models-abstraction.md`, `../research/9router/impl-plan-50-model-aliases.md`, `../research/9router/impl-plan-44-branch-gateways-and-serving.md`.

## Scope

**In scope:** virtual model model (name, description, capabilities, versioning); mapping strategies (static, dynamic, fallback, cost-tier); lifecycle (create, update, deprecate); API + dashboard integration.
**Out of scope:** strategy selection internals (plan 44 AAA-A); cost tier bands (plan 153).

## Milestones

### M1 — Virtual model model

**Reference code (`src/lib/virtual-models/model.js`):**

```js
// Virtual model: stable client-facing name → real provider models.
export function makeVirtualModel({ name, description = "", capabilities = [], versions = [] } = {}) {
  return { name, description, capabilities, versions, createdAt: Date.now(), status: "active" };
}

// Version: pinned mapping snapshot.
export function makeVersion({ label, mapping, createdAt = Date.now() } = {}) {
  return { label, mapping, createdAt };
}

// Resolve: virtual name → real model(s) for a version.
export function resolveVirtual({ virtual, version = null, fallback = [] } = {}) {
  const v = version ? virtual.versions.find((x) => x.label === version) : virtual.versions.at(-1);
  return v?.mapping ?? fallback;
}
```

**Acceptance criteria:** model shape; versioning; resolution.

### M2 — Mapping strategies

**Reference code (`src/lib/virtual-models/mapping.js`):**

```js
// Mapping strategies: static, dynamic, fallback, cost-tier.
export const MAPPING_TYPES = ["static", "dynamic", "fallback", "cost-tier"];

export function staticMapping(real) {
  return () => real;
}

export function dynamicMapping(selector) {
  return (ctx) => selector(ctx); // routing-based selection
}

export function fallbackMapping(primary, fallbacks) {
  return (ctx) => (ctx.available?.includes(primary) ? primary : fallbacks.find((f) => ctx.available?.includes(f)));
}

export function costTierMapping(tiers) {
  return (ctx) => tiers.find((t) => ctx.budget >= t.min && ctx.budget <= t.max)?.model;
}

// Apply: run a strategy with context.
export function applyMapping(strategy, ctx = {}) {
  try {
    return strategy(ctx);
  } catch {
    return null; // fail-open
  }
}
```

**Acceptance criteria:** four strategies; fail-open apply.

### M3 — Lifecycle management

**Reference code (`src/lib/virtual-models/lifecycle.js`):**

```js
// Lifecycle: create, update, deprecate.
export const LIFECYCLE = ["active", "deprecated", "retired"];

export function makeVirtualRegistry() {
  const models = new Map();
  return {
    create(vm) { models.set(vm.name, vm); return vm; },
    get(name) { return models.get(name); },
    update(name, patch) { const vm = models.get(name); if (vm) Object.assign(vm, patch); return vm; },
    deprecate(name) { const vm = models.get(name); if (vm) vm.status = "deprecated"; return vm; },
    retire(name) { const vm = models.get(name); if (vm) vm.status = "retired"; return vm; },
    active() { return [...models.values()].filter((m) => m.status === "active"); },
    all() { return [...models.values()]; },
  };
}

// Capability validation: declared vs real.
export function validateCapabilities({ declared = [], real = [] } = {}) {
  const missing = declared.filter((c) => !real.includes(c));
  return { ok: missing.length === 0, missing };
}
```

**Acceptance criteria:** lifecycle; capability validation.

### M4 — API + dashboard + tests

**Reference code (`src/app/api/v1/virtual-models/route.js`):**

```js
import { makeVirtualRegistry } from "@/lib/virtual-models/lifecycle.js";

const registry = makeVirtualRegistry();

export async function GET() {
  return Response.json({ models: registry.all() });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const vm = makeVirtualModel(body);
  registry.create(vm);
  return Response.json({ ok: true, model: vm }, { status: 201 });
}
```

**Files touched:** `src/lib/virtual-models/` (new: model, mapping, lifecycle), `src/app/api/v1/` (virtual name support), dashboard virtual-models page (new), `tests/unit/virtual-models.test.js` (new).

**Acceptance criteria:** API; dashboard; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Mapping confusion | Wrong target | Clear docs |
| Capability mismatch | Broken promises | Validation |
| Version drift | Stale mappings | Lifecycle mgmt |
| Client breakage | Renamed models | Stable names |

## Verification

- Unit: makeVirtualModel, resolveVirtual, mapping strategies, makeVirtualRegistry, validateCapabilities
- Manual: create virtual model → resolve → deprecate
- Regression: `tests/__baseline__/verify-no-regression.mjs`