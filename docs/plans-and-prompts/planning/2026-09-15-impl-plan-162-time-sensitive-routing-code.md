# Implementation Plan 162 — Time-Sensitive Routing & Deadline Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #urgency #deadlines #latency #routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (latency-capacity routing from plan 86; performance from plan 31; request prioritization from plan 73; task classification from plan 154 (`src/lib/tasks/`); routing in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — urgency classification; deadlines; time-aware routing.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-162-time-sensitive-routing.md`, `../research/9router/impl-plan-86-latency-capacity-routing.md`, `../research/9router/impl-plan-73-request-prioritization.md`.

## Scope

**In scope:** urgency classification (levels, signals, confidence); deadline management (setting, tracking, enforcement); time-aware routing (urgency → model mapping, latency prediction, deadline-aware selection); integration.
**Out of scope:** latency monitoring internals (plan 31); request prioritization (plan 73).

## Milestones

### M1 — Urgency classification

**Reference code (`src/lib/urgency/classify.js`):**

```js
// Urgency levels: critical, high, normal, low.
export const URGENCY = ["critical", "high", "normal", "low"];

// Urgency signals: explicit, inferred, deadline.
export const URGENCY_PATTERNS = {
  critical: [/asap|urgent|immediately|right now|emergency|deadline in \d+ (min|sec)/i],
  high: [/soon|quickly|fast|hurry|time.?sensitive|before \d+/i],
  low: [/whenever|no rush|eventually|someday|not urgent/i],
};

export function classifyUrgency({ text = "", deadlineMs = null, patterns = URGENCY_PATTERNS } = {}) {
  if (deadlineMs !== null && deadlineMs < 60_000) return { urgency: "critical", confidence: 0.95, signals: ["deadline"] };
  for (const [level, res] of Object.entries(patterns)) {
    if (res.some((re) => re.test(text))) return { urgency: level, confidence: 0.8, signals: [level] };
  }
  return { urgency: "normal", confidence: 0.5, signals: [] };
}

// Calibrated urgency: combine signals.
export function urgencyScore({ urgency = "normal" } = {}) {
  return { critical: 4, high: 3, normal: 2, low: 1 }[urgency] ?? 2;
}
```

**Acceptance criteria:** levels; signals; score.

### M2 — Deadline management

**Reference code (`src/lib/urgency/deadline.js`):**

```js
// Deadline setting: per-request deadlines.
export function setDeadline({ now = Date.now(), timeoutMs = 30_000 } = {}) {
  return { deadline: now + timeoutMs, timeoutMs };
}

// Deadline tracking: remaining time.
export function remaining({ deadline, now = Date.now() } = {}) {
  return Math.max(0, deadline - now);
}

// Deadline enforcement: fail on deadline miss.
export function enforceDeadline({ deadline, now = Date.now() } = {}) {
  return { ok: now < deadline, remaining: Math.max(0, deadline - now) };
}

// Deadline-aware budget: how much time is left for retries.
export function retryBudget({ deadline, now = Date.now(), minRetryMs = 5_000 } = {}) {
  const left = remaining({ deadline, now });
  return { retries: Math.max(0, Math.floor(left / minRetryMs)), left };
}
```

**Acceptance criteria:** setting; tracking; enforcement.

### M3 — Time-aware routing

**Reference code (`src/lib/urgency/route.js`):**

```js
// Urgency → model mapping: fast models for urgent.
export function makeUrgencyRouter() {
  const mapping = new Map(); // urgency -> [modelIds]
  return {
    set(level, models) { mapping.set(level, models); },
    modelsFor(level) { return mapping.get(level) ?? []; },
    // Select: urgency models ∩ candidates, else general.
    select({ urgency = "normal", candidates = [], general = [] } = {}) {
      const specialized = this.modelsFor(urgency).filter((m) => candidates.includes(m));
      return specialized.length ? specialized : general.filter((m) => candidates.includes(m));
    },
  };
}

// Latency prediction: estimated latency per model.
export function predictLatency({ modelId, latencyOf = () => 5_000 } = {}) {
  return latencyOf(modelId);
}

// Deadline-aware selection: select within deadline.
export function selectWithinDeadline({ candidates = [], deadline, latencyOf = () => 5_000, now = Date.now() } = {}) {
  const left = remaining({ deadline, now });
  const feasible = candidates.filter((m) => predictLatency({ modelId: m, latencyOf }) <= left);
  return feasible.length ? feasible : candidates; // fall back to best effort
}
```

**Acceptance criteria:** mapping; prediction; deadline-aware selection.

### M4 — Integration + tests

**Reference code (`src/lib/urgency/integrate.js`):**

```js
// Routing integration: urgency hooks.
export function routeWithUrgency({ text = "", deadlineMs = null, router, candidates = [], general = [], latencyOf } = {}) {
  const { urgency, confidence } = classifyUrgency({ text, deadlineMs });
  const models = router.select({ urgency, candidates, general });
  const deadline = deadlineMs !== null ? setDeadline({ timeoutMs: deadlineMs }) : null;
  return { urgency, confidence, models, deadline };
}

// Observability: urgency metrics.
export function makeUrgencyTelemetry() {
  const counts = new Map();
  return {
    record(level) { counts.set(level, (counts.get(level) ?? 0) + 1); },
    report() { return Object.fromEntries(counts); },
  };
}

// Fail-open.
export function safeUrgency(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/urgency/` (new: classify, deadline, route, integrate), `open-sse/handlers/chatCore.js` (urgency hooks), dashboard urgency page (new), `tests/unit/urgency.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Misclassification | Wrong routing | Confidence |
| Deadline misses | SLA breach | Enforcement |
| Cost increase | Fast models pricey | Urgency budgets |
| Complexity | Confusion | Simple levels |

## Verification

- Unit: classifyUrgency, urgencyScore, setDeadline, remaining, enforceDeadline, retryBudget, makeUrgencyRouter, predictLatency, selectWithinDeadline, routeWithUrgency
- Manual: urgent query → fast model; deadline enforcement
- Regression: `tests/__baseline__/verify-no-regression.mjs`