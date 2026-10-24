# Implementation Plan 94 — Provider Acceptance Rate & Load Balancing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #acceptance-rate #provider-health #load-balancing #capacity #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (provider redundancy from plan 65 (`src/lib/providers/`); latency/capacity from plan 86 (`src/lib/latency/`); health checks from plan 49 research; failover in `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — record outcomes; confirm health states; run weighted balancing; confirm hysteresis.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-94-provider-acceptance-load-balancing.md`, `../research/9router/impl-plan-65-provider-redundancy.md`, `../research/9router/impl-plan-86-latency-capacity-routing.md`.

## Scope

**In scope:** acceptance-rate tracking (accepted 2xx / rejected 4xx / failed 5xx+timeout, rolling windows 1m/5m/1h/24h, EWMA smoothing); health scoring (weighted acceptance+latency+error, states healthy/degraded/unhealthy, hysteresis); load balancing (round-robin, weighted-by-health, least-connections; sticky balancing; per-provider capacity limits); selection + failover integration; dashboard health view.
**Out of scope:** cross-instance health aggregation (plan 70); provider-side capacity negotiation.

## Milestones

### M1 — Acceptance tracker

**Reference code (`src/lib/health/acceptance.js`):**

```js
// Acceptance tracking: accepted (2xx), rejected (4xx), failed (5xx/timeout).
export const OUTCOME = { ACCEPTED: "accepted", REJECTED: "rejected", FAILED: "failed" };

export function classifyStatus(status) {
  if (status >= 200 && status < 300) return OUTCOME.ACCEPTED;
  if (status >= 400 && status < 500) return OUTCOME.REJECTED;
  return OUTCOME.FAILED;
}

export function makeAcceptanceTracker({ windowsMs = [60_000, 300_000, 3_600_000, 86_400_000] } = {}) {
  const events = []; // { at, outcome }
  return {
    record(outcome, now = Date.now()) {
      events.push({ at: now, outcome });
      const cutoff = now - Math.max(...windowsMs);
      while (events.length && events[0].at < cutoff) events.shift();
    },
    rate({ windowMs = 300_000, now = Date.now() } = {}) {
      const inWindow = events.filter((e) => e.at >= now - windowMs);
      const accepted = inWindow.filter((e) => e.outcome === OUTCOME.ACCEPTED).length;
      return inWindow.length ? accepted / inWindow.length : null;
    },
    counts({ windowMs = 300_000, now = Date.now() } = {}) {
      const inWindow = events.filter((e) => e.at >= now - windowMs);
      return {
        accepted: inWindow.filter((e) => e.outcome === OUTCOME.ACCEPTED).length,
        rejected: inWindow.filter((e) => e.outcome === OUTCOME.REJECTED).length,
        failed: inWindow.filter((e) => e.outcome === OUTCOME.FAILED).length,
      };
    },
  };
}

// EWMA smoothing: alpha 0.1 → slow adaptation.
export function ewma(prev, sample, alpha = 0.1) {
  return prev == null ? sample : alpha * sample + (1 - alpha) * prev;
}
```

**Acceptance criteria:** outcomes classified; rolling rates; EWMA.

### M2 — Health scoring

**Reference code (`src/lib/health/score.js`):**

```js
// Health score: weighted acceptance + latency + error.
export function healthScore({ acceptanceRate, latencyMs, errorRate, weights = { acceptance: 0.5, latency: 0.3, error: 0.2 }, latencyTargetMs = 5000 } = {}) {
  const latencyScore = Math.max(0, 1 - latencyMs / latencyTargetMs);
  const errorScore = 1 - (errorRate ?? 0);
  const a = acceptanceRate == null ? 0.5 : acceptanceRate;
  return Number((weights.acceptance * a + weights.latency * latencyScore + weights.error * errorScore).toFixed(3));
}

export const HEALTH_STATE = { HEALTHY: "healthy", DEGRADED: "degraded", UNHEALTHY: "unhealthy" };

// Hysteresis: thresholds differ by direction to prevent flapping.
export function stateFor(score, prev = HEALTH_STATE.HEALTHY, { degradeBelow = 0.6, recoverAbove = 0.75, unhealthyBelow = 0.3, recoverFromUnhealthyAbove = 0.45 } = {}) {
  if (prev === HEALTH_STATE.UNHEALTHY) return score >= recoverFromUnhealthyAbove ? HEALTH_STATE.DEGRADED : HEALTH_STATE.UNHEALTHY;
  if (prev === HEALTH_STATE.DEGRADED) return score >= recoverAbove ? HEALTH_STATE.HEALTHY : score < unhealthyBelow ? HEALTH_STATE.UNHEALTHY : HEALTH_STATE.DEGRADED;
  return score < unhealthyBelow ? HEALTH_STATE.UNHEALTHY : score < degradeBelow ? HEALTH_STATE.DEGRADED : HEALTH_STATE.HEALTHY;
}
```

**Acceptance criteria:** weighted score; hysteresis transitions.

### M3 — Load balancer

**Reference code (`src/lib/health/balancer.js`):**

```js
// Balancing strategies: round-robin, weighted (health), least-connections.
export function makeBalancer({ strategy = "weighted", sticky = false } = {}) {
  const state = new Map(); // provider -> { weight, connections, last }
  let rr = 0;
  return {
    setWeight(provider, weight) {
      const s = state.get(provider) ?? { weight: 0, connections: 0, last: 0 };
      s.weight = weight; state.set(provider, s);
    },
    inc(provider) { const s = state.get(provider); if (s) s.connections += 1; },
    dec(provider) { const s = state.get(provider); if (s) s.connections = Math.max(0, s.connections - 1); },
    pick({ exclude = [], sessionKey = null } = {}) {
      const candidates = [...state.entries()].filter(([p]) => !exclude.includes(p) && state.get(p).weight > 0);
      if (!candidates.length) return null;
      if (sticky && sessionKey) {
        const prev = candidates.find(([p]) => p === sessionKey);
        if (prev) return prev[0];
      }
      if (strategy === "round-robin") {
        const p = candidates[rr % candidates.length][0];
        rr += 1; return p;
      }
      if (strategy === "least-connections") {
        return candidates.sort((a, b) => a[1].connections - b[1].connections)[0][0];
      }
      // weighted random
      const total = candidates.reduce((a, [, s]) => a + s.weight, 0);
      let r = Math.random() * total;
      for (const [p, s] of candidates) { r -= s.weight; if (r <= 0) return p; }
      return candidates.at(-1)[0];
    },
  };
}

// Capacity limits: per-provider max concurrent.
export function withinCapacity({ connections, maxConcurrent = 10 }) {
  return connections < maxConcurrent;
}
```

**Acceptance criteria:** three strategies; sticky; capacity check.

### M4 — Integration + tests

**Reference code (`src/lib/health/integrate.js`):**

```js
// Selection integration: weight = health score, unhealthy skipped.
export function weightFromHealth(score) {
  if (score == null) return 0.5;
  if (score < 0.3) return 0; // unhealthy → skip
  return score;
}

// Failover integration: exclude unhealthy providers.
export function unhealthyProviders(scores, { threshold = 0.3 } = {}) {
  return Object.entries(scores).filter(([, s]) => s < threshold).map(([p]) => p);
}
```

**Files touched:** `src/lib/health/` (new: acceptance, score, balancer, integrate), `src/sse/handlers/chat.js` (balancer integration), `open-sse/config/healthConfig.js` (new), dashboard health page (new), `tests/unit/health.test.js` (new).

**Acceptance criteria:** acceptance tracked; health states; balanced selection; health view.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Flapping | Unstable routing | Hysteresis |
| Unbalanced load | Hot providers | Weighted balancing |
| Health signal noise | Wrong states | EWMA smoothing |
| Capacity misjudgment | Overload | Conservative limits |

## Verification

- Unit: classifyStatus, makeAcceptanceTracker, stateFor, makeBalancer, weightFromHealth
- Manual: record failures → provider degrades → traffic shifts; confirm no flapping
- Regression: `tests/__baseline__/verify-no-regression.mjs`