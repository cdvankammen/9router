# Implementation Plan 96 — Expert Utilization Tracking & Capacity Tuning — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #experts #utilization #capacity #sparse-activation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (MoA orchestration from plan 85 (`src/lib/moa/`); intent classification from plan 81 (`src/lib/intent/`); cost heuristics from plan 87 (`src/lib/cost/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — register experts; record utilization; confirm capacity alerts; confirm sparse activation.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-96-expert-utilization-capacity.md`, `../research/9router/impl-plan-85-mixture-of-agents.md`, `../research/9router/impl-plan-81-request-intent-classification.md`.

## Scope

**In scope:** expert registry (id, domain, models, capacity, cost; taxonomy→expert assignment; fallback to general model); utilization tracking (requests/tokens/cost/success per expert, efficiency vs general, reports); capacity tuning (per-expert concurrent/token caps, approaching-capacity alerts, demand-based adjustment); sparse activation (route only when confident, confidence gate, low-confidence fallback); MoA dispatch integration + dashboard.
**Out of scope:** expert merging/ensembling internals (plan 85); training expert models.

## Milestones

### M1 — Expert registry

**Reference code (`src/lib/experts/registry.js`):**

```js
// Expert registry: id, domain, models, capacity, cost.
export const EXPERTS = new Map();

export function registerExpert(expert) {
  EXPERTS.set(expert.id, { ...expert, registeredAt: new Date().toISOString() });
}

// Taxonomy → expert assignment.
export function expertForTask(taskType, { taxonomy = {} } = {}) {
  const expertId = taxonomy[taskType];
  return expertId ? EXPERTS.get(expertId) ?? null : null;
}

// Fallback: expert failure → general model.
export function fallbackFor(expertId) {
  return EXPERTS.get(expertId)?.fallback ?? null;
}
```

**Acceptance criteria:** experts registered; assignment; fallback.

### M2 — Utilization tracking

**Reference code (`src/lib/experts/utilization.js`):**

```js
// Utilization metrics per expert.
export function makeUtilization() {
  const stats = new Map(); // expertId -> { requests, tokens, cost, success }
  return {
    record(expertId, { tokens = 0, cost = 0, ok = true } = {}) {
      const s = stats.get(expertId) ?? { requests: 0, tokens: 0, cost: 0, success: 0 };
      s.requests += 1; s.tokens += tokens; s.cost += cost; if (ok) s.success += 1;
      stats.set(expertId, s);
    },
    report() {
      return Object.fromEntries([...stats.entries()].map(([id, s]) => [
        id,
        { ...s, successRate: s.requests ? s.success / s.requests : 0, costPerRequest: s.requests ? s.cost / s.requests : 0 },
      ]));
    },
  };
}

// Efficiency: expert vs. general model comparison.
export function efficiency({ expertCost, expertQuality, generalCost, generalQuality }) {
  if (!expertCost || !generalCost) return null;
  const costRatio = generalCost / expertCost; // >1 → expert cheaper per unit
  const qualityRatio = expertQuality / (generalQuality || 1e-9);
  return { costRatio: Number(costRatio.toFixed(2)), qualityRatio: Number(qualityRatio.toFixed(2)), worthIt: costRatio > 1 && qualityRatio >= 1 };
}
```

**Acceptance criteria:** per-expert stats; efficiency comparison.

### M3 — Capacity tuning

**Reference code (`src/lib/experts/capacity.js`):**

```js
// Per-expert capacity limits + alerts.
export function makeCapacity({ limits = {} } = {}) {
  const current = new Map(); // expertId -> { concurrent, tokens }
  return {
    acquire(expertId, { tokens = 0 } = {}) {
      const limit = limits[expertId] ?? { maxConcurrent: 10, maxTokens: 1_000_000 };
      const c = current.get(expertId) ?? { concurrent: 0, tokens: 0 };
      if (c.concurrent >= limit.maxConcurrent || c.tokens + tokens > limit.maxTokens) {
        return { ok: false, reason: "capacity-exceeded" };
      }
      c.concurrent += 1; c.tokens += tokens;
      current.set(expertId, c);
      return { ok: true };
    },
    release(expertId) {
      const c = current.get(expertId);
      if (c) { c.concurrent = Math.max(0, c.concurrent - 1); current.set(expertId, c); }
    },
    utilization(expertId) {
      const limit = limits[expertId] ?? { maxConcurrent: 10, maxTokens: 1_000_000 };
      const c = current.get(expertId) ?? { concurrent: 0, tokens: 0 };
      return { concurrent: c.concurrent / limit.maxConcurrent, tokens: c.tokens / limit.maxTokens };
    },
    alerts() {
      const out = [];
      for (const [id, limit] of Object.entries(limits)) {
        const u = this.utilization(id);
        if (u.concurrent >= 0.8 || u.tokens >= 0.8) out.push({ expertId: id, ...u, level: "approaching-capacity" });
      }
      return out;
    },
    // Demand-based adjustment: scale limit toward observed demand.
    adjust(expertId, { demand, min = 2, max = 50 } = {}) {
      const limit = limits[expertId] ?? { maxConcurrent: 10, maxTokens: 1_000_000 };
      limit.maxConcurrent = Math.min(max, Math.max(min, Math.round(demand * 1.2)));
      limits[expertId] = limit;
      return limit;
    },
  };
}
```

**Acceptance criteria:** acquire/release; utilization; alerts; adjustment.

### M4 — Sparse activation + integration + tests

**Reference code (`src/lib/experts/activation.js`):**

```js
// Sparse activation: only route to expert when confident.
export function shouldActivate({ confidence, threshold = 0.65, expertAvailable = true }) {
  return expertAvailable && confidence >= threshold;
}

// Low confidence → general model.
export function routeFor({ taskType, confidence, taxonomy = {}, threshold = 0.65 }) {
  const expert = expertForTask(taskType, { taxonomy });
  if (!expert) return { target: "general", reason: "no-expert" };
  if (!shouldActivate({ confidence, threshold })) return { target: "general", reason: "low-confidence", confidence };
  return { target: expert.id, reason: "activated", confidence };
}
```

**Files touched:** `src/lib/experts/` (new: registry, utilization, capacity, activation), `src/lib/moa/` (integration), `open-sse/config/expertConfig.js` (new), dashboard experts page (new), `tests/unit/experts.test.js` (new).

**Acceptance criteria:** utilization tracked; capacity alerts; sparse activation; utilization view.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Expert underuse | Wasted cost | Utilization reports |
| Capacity overload | Degraded service | Alerts + limits |
| Misactivation | Wrong expert | Confidence gates |
| Cost | Expensive experts | Cost tracking |

## Verification

- Unit: expertForTask, makeUtilization, makeCapacity, shouldActivate, routeFor
- Manual: register expert → record usage → trigger capacity alert → confirm fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`