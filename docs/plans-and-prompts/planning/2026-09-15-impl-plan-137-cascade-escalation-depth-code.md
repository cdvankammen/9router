# Implementation Plan 137 — Cascade Escalation Depth Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cascade #depth #escalation #budget #circuit-breaker #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cascade fallback from plan 2; cascade coordination from plan 90 (`src/lib/cascade/`); cost heuristics from plan 87 (`src/lib/cost/`); circuit breakers from plan 9; depth logic in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — depth config; budget tracking; early termination.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-137-cascade-escalation-depth.md`, `../research/9router/impl-plan-2-cascade-fallback.md`, `../research/9router/impl-plan-90-cascade-coordination-strategy.md`.

## Scope

**In scope:** depth configuration (global max depth, per-query adaptive depth by complexity, per-cost-tier depth, dynamic depth from time/cost budget); depth control (remaining budget tracking, early termination when quality sufficient, per-depth cost penalty, depth usage logging); cascade prevention (circuit breaker after N failures, time limit, cost limit, degraded best-effort mode); dashboard depth view.
**Out of scope:** cascade coordination internals (plan 90); cost heuristics (plan 87).

## Milestones

### M1 — Depth configuration

**Reference code (`src/lib/config/cascade.js`):**

```js
// Depth config: global + per-tier + adaptive.
export const DEFAULT_DEPTH_CONFIG = {
  globalMax: 3,
  perTier: { cheap: 2, standard: 3, premium: 4 },
  adaptive: true,
  timeBudgetMs: 60_000,
  costBudget: 10,
};

// Per-query depth: adaptive by complexity.
export function depthForQuery({ complexity = "medium", config = DEFAULT_DEPTH_CONFIG } = {}) {
  const base = config.perTier?.standard ?? 3;
  const adj = { low: -1, medium: 0, high: 1 }[complexity] ?? 0;
  return Math.max(1, Math.min(config.globalMax ?? 3, base + adj));
}

// Dynamic depth: adjust from time/cost budget.
export function dynamicDepth({ remainingTimeMs, remainingCost, config = DEFAULT_DEPTH_CONFIG } = {}) {
  let depth = config.globalMax ?? 3;
  if (remainingTimeMs != null && remainingTimeMs < (config.timeBudgetMs ?? 60_000) * 0.3) depth -= 1;
  if (remainingCost != null && remainingCost < (config.costBudget ?? 10) * 0.3) depth -= 1;
  return Math.max(1, depth);
}
```

**Acceptance criteria:** global/per-tier/adaptive/dynamic depth.

### M2 — Depth control

**Reference code (`src/lib/cascade/depth.js`):**

```js
// Depth budget: remaining budget tracking.
export function makeDepthBudget({ maxDepth = 3, maxTimeMs = 60_000, maxCost = 10, startedAt = Date.now() } = {}) {
  let depth = 0, cost = 0;
  return {
    get depth() { return depth; },
    // Can we escalate one more level?
    canEscalate({ costOfNext = 1 } = {}) {
      if (depth >= maxDepth) return { ok: false, reason: "max-depth" };
      if (Date.now() - startedAt > maxTimeMs) return { ok: false, reason: "time-budget" };
      if (cost + costOfNext > maxCost) return { ok: false, reason: "cost-budget" };
      return { ok: true };
    },
    // Record an escalation.
    escalate(costOfLevel = 1) { depth += 1; cost += costOfLevel; },
    // Early termination: stop when quality sufficient.
    shouldStop({ qualityScore = null, minQuality = 0.7 } = {}) {
      return qualityScore != null && qualityScore >= minQuality;
    },
    // Depth penalty: cost penalty per depth level.
    penalty() { return depth * 0.1; },
    report() { return { depth, cost, remaining: maxDepth - depth }; },
  };
}
```

**Acceptance criteria:** budget; early termination; penalty; logging.

### M3 — Cascade prevention

**Reference code (`src/lib/cascade/prevent.js`):**

```js
// Circuit breaker: stop after N failures.
export function makeCascadeBreaker({ failureThreshold = 3, openMs = 30_000 } = {}) {
  let failures = 0, openedAt = null;
  return {
    record(ok) {
      if (ok) { failures = 0; return; }
      failures += 1;
      if (failures >= failureThreshold) openedAt = Date.now();
    },
    allowed() {
      if (openedAt == null) return true;
      if (Date.now() - openedAt > openMs) { openedAt = null; failures = 0; return true; }
      return false;
    },
  };
}

// Timeout cascade: time limit per cascade.
export function cascadeTimeout({ startedAt = Date.now(), maxMs = 60_000 } = {}) {
  return { expired: Date.now() - startedAt > maxMs, elapsedMs: Date.now() - startedAt };
}

// Cost cascade: cost limit per cascade.
export function costLimit({ spent = 0, maxCost = 10 } = {}) {
  return { exceeded: spent > maxCost, spent };
}

// Degraded mode: serve best-effort if exhausted.
export function degradedMode({ exhausted = false, bestEffort = null } = {}) {
  return exhausted ? { mode: "degraded", serve: bestEffort } : { mode: "normal" };
}
```

**Acceptance criteria:** breaker; time/cost limits; degraded mode.

### M4 — Integration + telemetry + tests

**Reference code (`src/lib/cascade/integrate.js`):**

```js
// Integration: depth-aware cascade step.
export function cascadeStep({ budget, breaker, qualityScore, minQuality, costOfNext } = {}) {
  if (!breaker.allowed()) return { action: "stop", reason: "breaker-open" };
  if (budget.shouldStop({ qualityScore, minQuality })) return { action: "stop", reason: "quality-sufficient" };
  const can = budget.canEscalate({ costOfNext });
  if (!can.ok) return { action: "stop", reason: can.reason };
  budget.escalate(costOfNext);
  return { action: "escalate", depth: budget.depth };
}

// Telemetry: depth view.
export function makeDepthTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        cascades: events.filter((e) => e.type === "cascade").length,
        escalations: events.filter((e) => e.action === "escalate").length,
        stopped: events.filter((e) => e.action === "stop").length,
        avgDepth: events.length ? events.reduce((a, e) => a + (e.depth ?? 0), 0) / events.length : 0,
      };
    },
  };
}
```

**Files touched:** `open-sse/handlers/chatCore.js` (depth logic), `src/lib/config/cascade.js` (new: depth config), `src/lib/cascade/` (new: depth, prevent, integrate), dashboard cascade page (new), `tests/unit/cascade-depth.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Too shallow | Quality loss | Adaptive depth |
| Too deep | Cost blowup | Cost limits |
| Runaway | Resource exhaustion | Circuit breaker |
| Quality loss | Bad degraded mode | Best-effort fallback |

## Verification

- Unit: depthForQuery, dynamicDepth, makeDepthBudget, makeCascadeBreaker, cascadeTimeout, cascadeStep
- Manual: high-complexity query → deeper cascade; breaker opens after failures
- Regression: `tests/__baseline__/verify-no-regression.mjs`