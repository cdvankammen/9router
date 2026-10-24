# Implementation Plan 151 — LLM Approximation for Judges & Routers — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #approximation #judges #calibration #cheap-models #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cascade judges from plan 133 (`src/lib/judges/`); cost heuristics from plan 87; calibration from plan 82; classifier from plan 131 (`src/lib/classifier/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — approximation strategies; calibration; drift.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-151-llm-approximation-judges.md`, `../research/9router/impl-plan-133-cascade-judge-quality-escalation.md`, `../research/9router/impl-plan-82-calibration.md`.

## Scope

**In scope:** approximator registry (cheap judge models, quality, cost); strategies (full, hybrid, confidence-based); calibration (paired data, mapping, drift); judge integration.
**Out of scope:** judge cascade internals (plan 133); classifier internals (plan 131).

## Milestones

### M1 — Approximator registry

**Reference code (`src/lib/approximation/registry.js`):**

```js
// Approximator registry: cheap judge models.
export function makeApproximatorRegistry() {
  const approximators = new Map(); // id -> {id, cost, quality, judge}
  return {
    register(a) { approximators.set(a.id, a); },
    get(id) { return approximators.get(id); },
    all() { return [...approximators.values()]; },
    // Best cheap approximator under cost cap.
    bestFor({ maxCost = Infinity, minQuality = 0 } = {}) {
      return this.all()
        .filter((a) => a.cost <= maxCost && a.quality >= minQuality)
        .sort((a, b) => b.quality - a.quality)[0] ?? null;
    },
  };
}

export function makeApproximator({ id, cost = 1, quality = 0.7, judge = null } = {}) {
  return { id, cost, quality, judge };
}
```

**Acceptance criteria:** registry; bestFor; shape.

### M2 — Approximation strategies

**Reference code (`src/lib/approximation/strategies.js`):**

```js
// Strategies: full / hybrid / confidence-based.
export const STRATEGIES = ["full", "hybrid", "confidence"];

// Full: always use the cheap approximator.
export function fullApprox(approx, input) {
  return { decision: approx.judge(input), source: "approx", cost: approx.cost };
}

// Hybrid: cheap first, expensive on disagreement.
export function hybridApprox({ approx, expensive, input, agree = (a, b) => a === b } = {}) {
  const cheap = approx.judge(input);
  const exp = expensive(input);
  return { decision: agree(cheap, exp) ? cheap : exp, source: agree(cheap, exp) ? "approx" : "expensive", cost: agree(cheap, exp) ? approx.cost : approx.cost + expensive.cost };
}

// Confidence-based: expensive when uncertain.
export function confidenceApprox({ approx, expensive, input, confidenceOf = () => 0.5, minConfidence = 0.8 } = {}) {
  const cheap = approx.judge(input);
  const conf = confidenceOf(cheap);
  if (conf >= minConfidence) return { decision: cheap, source: "approx", cost: approx.cost };
  return { decision: expensive(input), source: "expensive", cost: approx.cost + expensive.cost };
}

// Strategy dispatch.
export function runStrategy({ strategy = "full", ...ctx } = {}) {
  switch (strategy) {
    case "hybrid": return hybridApprox(ctx);
    case "confidence": return confidenceApprox(ctx);
    case "full":
    default: return fullApprox(ctx.approx, ctx.input);
  }
}
```

**Acceptance criteria:** three strategies; dispatch.

### M3 — Calibration

**Reference code (`src/lib/approximation/calibrate.js`):**

```js
// Calibration: paired cheap/expensive judgments.
export function calibrate({ pairs = [] } = {}) {
  // pairs: [{cheap, expensive}]
  const agreement = pairs.filter((p) => p.cheap === p.expensive).length / (pairs.length || 1);
  return { agreement, quality: agreement, pairs: pairs.length };
}

// Mapping: cheap → expensive correction (for scalar judgments).
export function makeCalibrationMap({ pairs = [], buckets = 10 } = {}) {
  const map = new Map();
  for (const p of pairs) {
    const key = Math.round(p.cheap * buckets) / buckets;
    const list = map.get(key) ?? [];
    list.push(p.expensive);
    map.set(key, list);
  }
  return {
    correct(v) {
      const key = Math.round(v * buckets) / buckets;
      const list = map.get(key);
      return list?.length ? list.reduce((a, b) => a + b, 0) / list.length : v;
    },
  };
}

// Drift: monitor agreement over time.
export function makeDriftMonitor({ window = 100 } = {}) {
  const recent = [];
  return {
    record(pair) {
      recent.push(pair);
      if (recent.length > window) recent.shift();
    },
    agreement() {
      return recent.filter((p) => p.cheap === p.expensive).length / (recent.length || 1);
    },
    drift(baseline = 0.8) { return baseline - this.agreement(); },
  };
}
```

**Acceptance criteria:** calibration; mapping; drift.

### M4 — Integration + tests

**Reference code (`src/lib/approximation/integrate.js`):**

```js
// Judge integration: approximate judge decisions.
export function approximateJudge({ registry, strategy = "full", input, expensive, maxCost = Infinity } = {}) {
  const approx = registry.bestFor({ maxCost });
  if (!approx) return { decision: expensive(input), source: "expensive", cost: expensive.cost };
  return runStrategy({ strategy, approx, expensive, input });
}

// Fail-open.
export function safeApprox(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/approximation/` (new: registry, strategies, calibrate, integrate), `src/lib/judges/` (integration), dashboard approximation page (new), `tests/unit/approximation.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quality loss | Bad decisions | Calibration |
| Drift | Stale mapping | Monitoring |
| Cost creep | No savings | Strategy control |
| Complexity | Confusion | Simple defaults |

## Verification

- Unit: makeApproximatorRegistry, fullApprox, hybridApprox, confidenceApprox, calibrate, makeCalibrationMap, makeDriftMonitor, approximateJudge
- Manual: cheap judge → hybrid on disagreement
- Regression: `tests/__baseline__/verify-no-regression.mjs`