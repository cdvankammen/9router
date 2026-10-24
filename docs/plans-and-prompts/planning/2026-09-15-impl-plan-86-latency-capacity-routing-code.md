# Implementation Plan 86 — Latency-Based Selection & Capacity-Aware Routing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #latency #capacity #load-balancing #cooldown #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (retry/backoff from plan 57; provider health from plan 65; combo ordering in `src/sse/handlers/chat.js`; performance work from plan 31 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — simulate a slow provider; confirm latency-sensitive requests route around it; confirm cooldown after failures.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-86-latency-capacity-routing.md`, `../research/9router/impl-plan-57-fallback-retry-semantics.md`, `../research/9router/impl-plan-65-provider-redundancy.md`.

## Scope

**In scope:** latency store (per model/provider rolling p50/p95/EWMA with decay); latency-based selection (per-request latency budget, quality-equivalent preference, quality-vs-latency slider per route); capacity awareness (per-provider concurrency limits, in-flight tracking, capacity routing, queue with timeout); health signals (acceptance rate, cooldown with hysteresis, exponential backoff with jitter, load balancing); telemetry + dashboard.
**Out of scope:** global cluster-level load balancing (plan 70); provider-side capacity APIs.

## Milestones

### M1 — Latency store

**Reference code (`src/lib/latency/store.js`):**

```js
// Rolling latency stats per (model, provider) with EWMA + decay.
const stats = new Map(); // key -> { samples: number[], ewma, lastAt }

export function recordLatency(model, provider, latencyMs, now = Date.now()) {
  const key = `${model}|${provider}`;
  const s = stats.get(key) ?? { samples: [], ewma: null, lastAt: 0 };
  s.samples.push(latencyMs);
  if (s.samples.length > 100) s.samples.shift();
  s.ewma = s.ewma == null ? latencyMs : s.ewma * 0.9 + latencyMs * 0.1;
  s.lastAt = now;
  stats.set(key, s);
}

export function latencyStats(model, provider, { decayMs = 30 * 60_000, now = Date.now() } = {}) {
  const s = stats.get(`${model}|${provider}`);
  if (!s) return null;
  const age = now - s.lastAt;
  if (age > decayMs) return null; // stale — treat as unknown
  const sorted = [...s.samples].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return { p50, p95, ewma: Number(s.ewma.toFixed(1)), samples: s.samples.length };
}

export function resetLatency() { stats.clear(); }
```

**Acceptance criteria:** samples recorded; p50/p95/EWMA computed; stale decayed.

### M2 — Latency-based selection

**Reference code (`src/lib/latency/selection.js`):**

```js
// Among quality-equivalent candidates, prefer lowest latency.
export function selectByLatency(candidates, { latencyByModel, budgetMs = null, qualityFloor = 0.5 } = {}) {
  const eligible = candidates.filter((c) => (c.quality ?? 0.5) >= qualityFloor);
  const pool = eligible.length ? eligible : candidates;
  const scored = pool.map((c) => ({ ...c, latency: latencyByModel?.[c.model]?.ewma ?? null }));
  const withinBudget = budgetMs ? scored.filter((c) => c.latency == null || c.latency <= budgetMs) : scored;
  const usable = withinBudget.length ? withinBudget : scored;
  return [...usable].sort((a, b) => (a.latency ?? Infinity) - (b.latency ?? Infinity));
}

// Quality-vs-latency slider: 0 = latency-first, 1 = quality-first.
export function tradeoffScore({ quality = 0.5, latency = 1000, slider = 0.5, maxLatency = 10_000 }) {
  const q = quality;
  const l = 1 - Math.min(1, latency / maxLatency);
  return slider * q + (1 - slider) * l;
}
```

**Acceptance criteria:** budget respected; quality floor; slider blends.

### M3 — Capacity awareness

**Reference code (`src/lib/latency/capacity.js`):**

```js
// Per-provider concurrency limits + in-flight tracking.
export function makeCapacityTracker(limits = {}) {
  const inFlight = new Map(); // providerId -> count
  return {
    limits,
    acquire(providerId) {
      const limit = limits[providerId] ?? 10;
      const cur = inFlight.get(providerId) ?? 0;
      if (cur >= limit) return { ok: false, reason: "at-capacity" };
      inFlight.set(providerId, cur + 1);
      return { ok: true };
    },
    release(providerId) {
      const cur = inFlight.get(providerId) ?? 0;
      inFlight.set(providerId, Math.max(0, cur - 1));
    },
    utilization(providerId) {
      const limit = limits[providerId] ?? 10;
      return { inFlight: inFlight.get(providerId) ?? 0, limit, pct: ((inFlight.get(providerId) ?? 0) / limit) };
    },
    // Capacity routing: filter out providers at capacity when alternatives exist.
    filter(candidates) {
      const available = candidates.filter((c) => (inFlight.get(c.providerId) ?? 0) < (limits[c.providerId] ?? 10));
      return available.length ? available : candidates;
    },
  };
}

// Queue with timeout for capacity waits.
export function makeQueue({ timeoutMs = 5_000 } = {}) {
  const queue = [];
  return {
    push(item) { queue.push({ item, at: Date.now() }); },
    pop() { return queue.shift()?.item ?? null; },
    expired(now = Date.now()) { return queue.filter((e) => now - e.at > timeoutMs); },
    depth() { return queue.length; },
  };
}
```

**Acceptance criteria:** acquire/release; utilization; capacity filter; queue timeout.

### M4 — Health signals + integration + tests

**Reference code (`src/lib/latency/health.js`):**

```js
// Acceptance rate + cooldown with hysteresis + backoff with jitter.
export function acceptanceRate({ attempts, accepted }) {
  return attempts ? accepted / attempts : 1;
}

export function makeCooldown({ cooldownMs = 60_000, hysteresis = 0.5 } = {}) {
  const state = new Map(); // providerId -> { until, failures }
  return {
    markFailure(providerId, now = Date.now()) {
      const s = state.get(providerId) ?? { until: 0, failures: 0 };
      s.failures += 1;
      // Hysteresis: only enter cooldown after repeated failures.
      if (s.failures >= 2) s.until = now + cooldownMs * Math.min(5, s.failures - 1);
      state.set(providerId, s);
    },
    markSuccess(providerId) { state.delete(providerId); },
    inCooldown(providerId, now = Date.now()) {
      const s = state.get(providerId);
      return s ? now < s.until : false;
    },
  };
}

export function backoffMs(attempt, { baseMs = 200, maxMs = 10_000, jitter = 0.3 } = {}) {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.round(exp * (1 - jitter + Math.random() * jitter * 2));
}
```

**Files touched:** `src/lib/latency/` (new: store, selection, capacity, health), `open-sse/config/latencyConfig.js` (new), `src/sse/handlers/chat.js` (selection integration), dashboard latency page (new), `tests/unit/latency.test.js` (new).

**Acceptance criteria:** latency-aware ordering; capacity respected; cooldown + backoff active.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Latency noise | Wrong choices | EWMA + percentiles |
| Capacity misjudgment | Overload | Conservative limits |
| Cooldown flapping | Provider starved | Hysteresis |
| Quality sacrifice | Bad outputs | Quality floor per route |

## Verification

- Unit: recordLatency, selectByLatency, capacity filter, cooldown, backoffMs
- Manual: slow provider → latency-sensitive request routes elsewhere; failures → cooldown
- Regression: `tests/__baseline__/verify-no-regression.mjs`