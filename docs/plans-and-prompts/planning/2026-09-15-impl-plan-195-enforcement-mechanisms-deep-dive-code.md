# Implementation Plan 195 — Enforcement Mechanisms Deep Dive — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #enforcement #layers #composition #policy #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (runtime enforcement from plan 13; enforcement combinations from plan 117; constraint routing from plan 135; safety guardrails from plan 109).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — layers; composition; observability.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-195-enforcement-mechanisms-deep-dive.md`, `../research/9router/impl-plan-13-runtime-enforcement.md`, `../research/9router/impl-plan-117-enforcement-combinations.md`.

## Scope

**In scope:** enforcement layers (pre-routing, in-flight, post-routing); enforcement composition (model, order, conflict resolution); enforcement observability (metrics, logs, alerts).
**Out of scope:** constraint routing (plan 135); safety guardrails (plan 109).

## Milestones

### M1 — Enforcement layers

**Reference code (`src/lib/enforcement/layers.js`):**

```js
// Enforcement layers: pre-routing, in-flight, post-routing.
export const ENFORCEMENT_LAYERS = ["pre-routing", "in-flight", "post-routing"];

// Layer: {name, check(context) → {ok, reason}}
export function makeLayer({ name, check = () => ({ ok: true }) } = {}) {
  return { name, check };
}

// Pre-routing: constraints before selection.
export function preRouting({ layers = [], context = {} } = {}) {
  return layers.filter((l) => l.name === "pre-routing").map((l) => ({ layer: l.name, ...l.check(context) }));
}

// In-flight: policies during execution.
export function inFlight({ layers = [], context = {} } = {}) {
  return layers.filter((l) => l.name === "in-flight").map((l) => ({ layer: l.name, ...l.check(context) }));
}

// Post-routing: validation after response.
export function postRouting({ layers = [], context = {} } = {}) {
  return layers.filter((l) => l.name === "post-routing").map((l) => ({ layer: l.name, ...l.check(context) }));
}
```

**Acceptance criteria:** layers; checks.

### M2 — Enforcement composition

**Reference code (`src/lib/enforcement/compose.js`):**

```js
// Composition model: combine enforcement layers.
export function composeLayers({ layers = [], context = {} } = {}) {
  const results = [];
  for (const l of layers) {
    const r = l.check(context);
    results.push({ layer: l.name, ...r });
    if (!r.ok) break; // fail-fast
  }
  return { ok: results.every((r) => r.ok), results };
}

// Composition order: layer ordering.
export const LAYER_ORDER = ["pre-routing", "in-flight", "post-routing"];

export function orderedLayers(layers = []) {
  return [...layers].sort((a, b) => LAYER_ORDER.indexOf(a.name) - LAYER_ORDER.indexOf(b.name));
}

// Composition conflict: conflict resolution.
export function resolveConflict({ results = [], precedence = "deny" } = {}) {
  const denied = results.filter((r) => !r.ok);
  if (precedence === "deny") return denied.length ? { ok: false, reason: denied[0].reason ?? "denied" } : { ok: true };
  return { ok: true }; // allow precedence
}
```

**Acceptance criteria:** composition; order; conflicts.

### M3 — Enforcement observability

**Reference code (`src/lib/enforcement/observe.js`):**

```js
// Enforcement metrics: per-layer metrics.
export function makeEnforcementMetrics() {
  const perLayer = new Map(); // layer -> {checks, denials}
  return {
    record(layer, { ok = true } = {}) {
      const s = perLayer.get(layer) ?? { checks: 0, denials: 0 };
      s.checks += 1;
      if (!ok) s.denials += 1;
      perLayer.set(layer, s);
    },
    get(layer) {
      const s = perLayer.get(layer) ?? { checks: 0, denials: 0 };
      return { ...s, denialRate: s.checks ? s.denials / s.checks : 0 };
    },
    all() { return Object.fromEntries(perLayer); },
  };
}

// Enforcement logs: detailed enforcement traces.
export function makeEnforcementLog() {
  const entries = [];
  return {
    log(entry) { entries.push({ ...entry, at: Date.now() }); },
    recent({ limit = 50 } = {}) { return entries.slice(-limit); },
    all() { return entries; },
  };
}

// Enforcement alerts: policy violations.
export function enforcementAlert({ metrics, layer, threshold = 0.5 } = {}) {
  const m = metrics.get(layer);
  return { alert: m.denialRate >= threshold, denialRate: m.denialRate };
}
```

**Acceptance criteria:** metrics; logs; alerts.

### M4 — Integration + tests

**Reference code (`src/lib/enforcement/integrate.js`):**

```js
// Routing integration: enforcement hooks.
export function enforce({ layers = [], context = {}, metrics = null } = {}) {
  const result = composeLayers({ layers: orderedLayers(layers), context });
  if (metrics) for (const r of result.results) metrics.record(r.layer, { ok: r.ok });
  return result;
}

// Fail-open.
export function safeEnforcement(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/enforcement/` (new: layers, compose, observe, integrate), `open-sse/handlers/chatCore.js` (enforcement hooks), dashboard enforcement page (new), `tests/unit/enforcement.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Enforcement overhead | Slow routing | Fast paths |
| Layer conflicts | Wrong denials | Clear precedence |
| Observability cost | Overhead | Sampling |
| Complexity | Confusion | Simple layers |

## Verification

- Unit: makeLayer, preRouting, inFlight, postRouting, composeLayers, orderedLayers, resolveConflict, makeEnforcementMetrics, makeEnforcementLog, enforcementAlert, enforce
- Manual: layers → compose → observe
- Regression: `tests/__baseline__/verify-no-regression.mjs`