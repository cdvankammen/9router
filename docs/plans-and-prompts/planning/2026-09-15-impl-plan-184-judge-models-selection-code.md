# Implementation Plan 184 — Judge Models Selection & Quality — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #judges #evaluation #quality #selection #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cascade judge quality from plan 133 (`src/lib/judges/`); router calibration from plan 82; LLM approximation from plan 151 (`src/lib/approximation/`); cascade fallback from plan 2).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — registry; quality; selection.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-184-judge-models-selection.md`, `../research/9router/impl-plan-133-cascade-judge-quality.md`, `../research/9router/impl-plan-151-llm-approximation-judges.md`.

## Scope

**In scope:** judge registry (catalog, properties, specialization); judge quality scoring (accuracy, calibration, consistency); judge selection (criteria, strategy, fallback).
**Out of scope:** judge thresholds calibration (plan 185); LLM approximation (plan 151).

## Milestones

### M1 — Judge registry

**Reference code (`src/lib/judges/registry.js`):**

```js
// Judge catalog: candidate judge models.
export function makeJudgeRegistry(catalog = {}) {
  return {
    // catalog: {modelId: {cost, speed, accuracy}}
    get(modelId) { return catalog[modelId] ?? null; },
    add(modelId, props) { catalog[modelId] = props; },
    all() { return catalog; },
    // Judge specialization: per-task judges.
    forTask(task, taskJudges = {}) { return taskJudges[task] ?? Object.keys(catalog); },
  };
}

// Judge properties: cost, speed, accuracy.
export const DEFAULT_JUDGE_PROPS = { cost: 1, speed: 1, accuracy: 0.8 };
```

**Acceptance criteria:** catalog; specialization.

### M2 — Judge quality scoring

**Reference code (`src/lib/judges/quality.js`):**

```js
// Quality metrics: accuracy, calibration, consistency.
export function judgeQuality({ accuracy = 0.8, calibration = 0.9, consistency = 0.85 } = {}) {
  return { accuracy, calibration, consistency, overall: (accuracy + calibration + consistency) / 3 };
}

// Quality tracking: per-judge quality over time.
export function makeQualityTracker() {
  const perJudge = new Map(); // modelId -> [quality]
  return {
    record(modelId, quality) {
      const list = perJudge.get(modelId) ?? [];
      list.push(quality);
      if (list.length > 100) list.shift();
      perJudge.set(modelId, list);
    },
    average(modelId) {
      const list = perJudge.get(modelId);
      return list?.length ? list.reduce((a, b) => a + b, 0) / list.length : 0.8;
    },
    all() { return Object.fromEntries(perJudge); },
  };
}

// Quality alerts: quality degradation.
export function qualityAlert({ current = 0.8, baseline = 0.8, threshold = 0.1 } = {}) {
  return { alert: baseline - current >= threshold, delta: baseline - current };
}
```

**Acceptance criteria:** metrics; tracking; alerts.

### M3 — Judge selection

**Reference code (`src/lib/judges/select.js`):**

```js
// Selection criteria: quality, cost, speed.
export function scoreJudge({ props = {}, weights = { quality: 0.5, cost: 0.3, speed: 0.2 } } = {}) {
  const quality = props.accuracy ?? 0.8;
  const cost = 1 - (props.cost ?? 1) / 10; // lower cost → higher score
  const speed = 1 - (props.speed ?? 1) / 10;
  return weights.quality * quality + weights.cost * cost + weights.speed * speed;
}

// Selection strategy: per-task selection.
export function selectJudge({ registry, task = "general", taskJudges = {}, weights } = {}) {
  const candidates = registry.forTask(task, taskJudges);
  return candidates
    .map((m) => ({ model: m, score: scoreJudge({ props: registry.get(m) ?? {}, weights }) }))
    .sort((a, b) => b.score - a.score)[0]?.model ?? null;
}

// Selection fallback: fallback judges.
export function fallbackJudge({ primary = null, fallbacks = [] } = {}) {
  return primary ?? fallbacks[0] ?? null;
}
```

**Acceptance criteria:** scoring; selection; fallback.

### M4 — Integration + tests

**Reference code (`src/lib/judges/integrate.js`):**

```js
// Cascade integration: judge selection.
export function judgeFor({ registry, task = "general", taskJudges = {}, fallbacks = [] } = {}) {
  return fallbackJudge({ primary: selectJudge({ registry, task, taskJudges }), fallbacks });
}

// Fail-open.
export function safeJudge(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/judges/` (new: registry, quality, select, integrate), `open-sse/handlers/chatCore.js` (judge hooks), dashboard judges page (new), `tests/unit/judges.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Judge errors | Wrong verdicts | Quality scoring |
| Judge cost | Expensive evals | Cost-aware selection |
| Judge drift | Stale quality | Monitoring |
| Complexity | Confusion | Simple selection |

## Verification

- Unit: makeJudgeRegistry, judgeQuality, makeQualityTracker, qualityAlert, scoreJudge, selectJudge, fallbackJudge, judgeFor
- Manual: catalog → score → select → fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`