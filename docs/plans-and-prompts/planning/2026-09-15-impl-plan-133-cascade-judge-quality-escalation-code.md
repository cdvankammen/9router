# Implementation Plan 133 — Cascade Judge Quality & Escalation Policy — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #judges #cascade #escalation #thresholds #frugalgpt #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cascade fallback from plan 2; cascade coordination from plan 90 (`src/lib/cascade/`); calibration from plan 82 (`src/lib/calibration/`); error classification from plan 89 (`open-sse/errors/`); cascade hooks in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — judge scoring; threshold calibration; escalation policy.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-133-cascade-judge-quality-escalation.md`, `../research/9router/impl-plan-2-cascade-fallback.md`, `../research/9router/impl-plan-90-cascade-coordination-strategy.md`.

## Scope

**In scope:** judge selection (registry of candidate judges, per-judge quality scores, cost tiers cheap/medium/expensive); judge thresholds (per-task-type thresholds, calibration from logs, adaptive adjustment); escalation policy (triggers confidence < threshold, max depth, cost-aware escalation, cascade collapse circuit breaker); cascade integration + dashboard judge quality view.
**Out of scope:** cascade coordination internals (plan 90); calibration internals (plan 82).

## Milestones

### M1 — Judge registry + quality

**Reference code (`src/lib/judges/registry.js`):**

```js
// Judge registry: candidate judge models.
export const JUDGE_COST_TIERS = ["cheap", "medium", "expensive"];

export function makeJudgeRegistry() {
  const judges = new Map(); // id -> judge
  return {
    register(judge) {
      judges.set(judge.id, { costTier: "medium", qualityScore: null, ...judge });
      return judge;
    },
    // Per-judge quality scores.
    score(id, { accuracy = null, agreement = null } = {}) {
      const j = judges.get(id);
      if (!j) return null;
      j.qualityScore = accuracy != null ? accuracy : j.qualityScore;
      j.agreement = agreement ?? j.agreement;
      return j;
    },
    // Selection: best judge within cost tier.
    best({ costTier = null, minQuality = 0.7 } = {}) {
      const candidates = [...judges.values()].filter((j) =>
        (!costTier || j.costTier === costTier) && (j.qualityScore == null || j.qualityScore >= minQuality));
      return candidates.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0))[0] ?? null;
    },
    all() { return [...judges.values()]; },
  };
}
```

**Acceptance criteria:** registry; quality scores; cost-tier selection.

### M2 — Judge thresholds

**Reference code (`src/lib/judges/thresholds.js`):**

```js
// Threshold model: per-task-type thresholds.
export const DEFAULT_THRESHOLDS = { general: 0.6, code: 0.7, math: 0.75, creative: 0.5 };

// Calibration: threshold calibration from logs.
export function calibrateThresholds(logs, { alpha = 0.05, thresholds = DEFAULT_THRESHOLDS } = {}) {
  const out = { ...thresholds };
  const agg = {};
  for (const l of logs) {
    const key = l.taskType ?? "general";
    agg[key] = agg[key] ?? { n: 0, wasted: 0 };
    agg[key].n += 1;
    if (l.escalated && !l.improved) agg[key].wasted += 1; // escalation didn't help
  }
  for (const [key, v] of Object.entries(agg)) {
    const wasteRate = v.wasted / Math.max(1, v.n);
    // Too many wasted escalations → raise threshold.
    out[key] = Math.min(0.95, Math.max(0.3, (out[key] ?? 0.6) + (wasteRate - 0.2) * alpha));
  }
  return out;
}

// Adaptive thresholds: adjust based on recent accuracy.
export function adaptThreshold({ current, recentAccuracy, targetAccuracy = 0.8, step = 0.01 } = {}) {
  if (recentAccuracy == null) return current;
  return recentAccuracy < targetAccuracy ? Math.max(0.3, current - step) : Math.min(0.95, current + step);
}
```

**Acceptance criteria:** per-task thresholds; calibration; adaptation.

### M3 — Escalation policy

**Reference code (`src/lib/judges/escalate.js`):**

```js
// Escalation triggers: confidence < threshold.
export function shouldEscalate({ confidence, threshold = 0.6, depth = 0, maxDepth = 3 } = {}) {
  if (depth >= maxDepth) return { escalate: false, reason: "max-depth" };
  return { escalate: confidence < threshold, reason: confidence < threshold ? "low-confidence" : "confident" };
}

// Cost-aware escalation: only if budget allows.
export function costAwareEscalate({ confidence, threshold, remainingBudget = 0, escalateCost = 1 } = {}) {
  const base = shouldEscalate({ confidence, threshold });
  if (!base.escalate) return base;
  return { escalate: remainingBudget >= escalateCost, reason: remainingBudget >= escalateCost ? "low-confidence" : "budget-exhausted" };
}

// Collapse prevention: circuit breaker on cascade.
export function makeCascadeBreaker({ failureThreshold = 5, openMs = 30_000 } = {}) {
  let failures = 0, openedAt = null;
  return {
    // Record outcome; open on repeated failures.
    record(ok) {
      if (ok) { failures = 0; return; }
      failures += 1;
      if (failures >= failureThreshold) openedAt = Date.now();
    },
    // Is the cascade allowed to run?
    allowed() {
      if (openedAt == null) return true;
      if (Date.now() - openedAt > openMs) { openedAt = null; failures = 0; return true; } // half-open
      return false;
    },
  };
}
```

**Acceptance criteria:** triggers; cost awareness; circuit breaker.

### M4 — Integration + tests

**Reference code (`src/lib/judges/integrate.js`):**

```js
// Cascade integration: judges in cascade chain.
export function judgeDecision({ judge, output, query, threshold, depth, budget } = {}) {
  const verdict = judge.verify ? judge.verify(output, query) : { confidence: 0.5 };
  return costAwareEscalate({ confidence: verdict.confidence, threshold, depth, remainingBudget: budget, escalateCost: 1 });
}

// Telemetry: judge quality view.
export function makeJudgeTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      const escalations = events.filter((e) => e.escalated);
      return {
        judged: events.length,
        escalations: escalations.length,
        escalationRate: events.length ? escalations.length / events.length : 0,
        wasted: escalations.filter((e) => e.improved === false).length,
      };
    },
  };
}
```

**Files touched:** `src/lib/judges/` (new: registry, thresholds, escalate, integrate), `open-sse/handlers/chatCore.js` (cascade hooks), dashboard judges page (new), `tests/unit/judges.test.js` (new).

**Acceptance criteria:** cascade integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Judge errors | Wrong escalations | Quality scoring |
| Threshold drift | Bad decisions | Calibration |
| Cascade collapse | Catastrophic failure | Circuit breaker |
| Judge cost | Expensive cascades | Cost tiers |

## Verification

- Unit: makeJudgeRegistry, calibrateThresholds, adaptThreshold, shouldEscalate, costAwareEscalate, makeCascadeBreaker
- Manual: low confidence → escalate; budget exhausted → no escalate; repeated failures → breaker opens
- Regression: `tests/__baseline__/verify-no-regression.mjs`