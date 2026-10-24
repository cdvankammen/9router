# Implementation Plan 196 — Cascade Trigger Conditions — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cascade #triggers #rules #observability #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cascade fallback from plan 2; escalation depth from plan 137; prompt adaptation from plan 150 (`src/lib/adaptation/`); fallback chains from plan 179 (`src/lib/chains/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — triggers; rules; observability.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-196-cascade-trigger-conditions.md`, `../research/9router/impl-plan-2-cascade-fallback.md`, `../research/9router/impl-plan-137-escalation-depth.md`.

## Scope

**In scope:** trigger model (types, thresholds, scope); trigger rules (definition, evaluation, priority); trigger observability (metrics, logs, alerts).
**Out of scope:** fallback chains (plan 179); prompt adaptation (plan 150).

## Milestones

### M1 — Trigger model

**Reference code (`src/lib/triggers/model.js`):**

```js
// Trigger types: error, quality, latency, cost, timeout.
export const TRIGGER_TYPES = ["error", "quality", "latency", "cost", "timeout"];

// Trigger thresholds: per-trigger thresholds.
export const DEFAULT_TRIGGER_THRESHOLDS = { error: 1, quality: 0.4, latency: 5000, cost: 0.5, timeout: 30_000 };

// Trigger evaluation.
export function evaluateTrigger({ type, value, thresholds = DEFAULT_TRIGGER_THRESHOLDS } = {}) {
  const t = thresholds[type] ?? 1;
  if (type === "quality") return value < t;
  return value >= t;
}

// Trigger scope: per-request, per-user, per-org.
export function triggerScope({ request = null, user = null, org = null } = {}) {
  return { request, user, org };
}
```

**Acceptance criteria:** types; thresholds; scope.

### M2 — Trigger rules

**Reference code (`src/lib/triggers/rules.js`):**

```js
// Rule definition: declarative trigger rules.
export function makeTriggerRule({ id, type = "error", threshold = null, priority = 0, test = null } = {}) {
  return { id, type, threshold, priority, test };
}

// Rule evaluation: fast rule engine.
export function evaluateRules({ rules = [], signals = {} } = {}) {
  const fired = [];
  for (const rule of rules) {
    const value = signals[rule.type];
    if (value === undefined) continue;
    const ok = rule.test ? rule.test(value) : evaluateTrigger({ type: rule.type, value, thresholds: { [rule.type]: rule.threshold ?? DEFAULT_TRIGGER_THRESHOLDS[rule.type] } });
    if (ok) fired.push(rule);
  }
  return fired;
}

// Rule priority: trigger precedence.
export function firstFired(rules = []) {
  return [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0] ?? null;
}
```

**Acceptance criteria:** rules; evaluation; priority.

### M3 — Trigger observability

**Reference code (`src/lib/triggers/observe.js`):**

```js
// Trigger metrics: trigger rates, types.
export function makeTriggerMetrics() {
  const perType = new Map(); // type -> count
  return {
    record(type) { perType.set(type, (perType.get(type) ?? 0) + 1); },
    get(type) { return perType.get(type) ?? 0; },
    all() { return Object.fromEntries(perType); },
  };
}

// Trigger logs: detailed trigger traces.
export function makeTriggerLog() {
  const entries = [];
  return {
    log(entry) { entries.push({ ...entry, at: Date.now() }); },
    recent({ limit = 50 } = {}) { return entries.slice(-limit); },
    all() { return entries; },
  };
}

// Trigger alerts: excessive triggers.
export function triggerAlert({ metrics, total = 0, threshold = 0.5 } = {}) {
  const fired = Object.values(metrics.all()).reduce((a, b) => a + b, 0);
  return { alert: total ? fired / total >= threshold : false, rate: total ? fired / total : 0 };
}
```

**Acceptance criteria:** metrics; logs; alerts.

### M4 — Integration + tests

**Reference code (`src/lib/triggers/integrate.js`):**

```js
// Cascade integration: trigger hooks.
export function shouldTrigger({ rules = [], signals = {}, metrics = null } = {}) {
  const fired = evaluateRules({ rules, signals });
  if (metrics) for (const r of fired) metrics.record(r.type);
  return { trigger: fired.length > 0, fired: fired.map((r) => r.id), first: firstFired(fired)?.id ?? null };
}

// Fail-open.
export function safeTrigger(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/triggers/` (new: model, rules, observe, integrate), `open-sse/handlers/chatCore.js` (trigger hooks), dashboard triggers page (new), `tests/unit/triggers.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Trigger noise | Wrong cascades | Threshold tuning |
| Missed triggers | Slow escalation | Multiple signals |
| Rule complexity | Confusion | Simple rules |
| Observability cost | Overhead | Sampling |

## Verification

- Unit: evaluateTrigger, triggerScope, makeTriggerRule, evaluateRules, firstFired, makeTriggerMetrics, makeTriggerLog, triggerAlert, shouldTrigger
- Manual: signals → rules → trigger → observe
- Regression: `tests/__baseline__/verify-no-regression.mjs`