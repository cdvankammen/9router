# Implementation Plan 65 — Multi-Provider Redundancy — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #provider-redundancy #failover #diversity #health #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (account-selection loop in `src/sse/handlers/chat.js`; multi-account fallback; account selection in `src/lib/`; provider registry in `open-sse/providers/registry/*`; retry/fallback semantics from plan 57).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — simulate provider outage, confirm failover; check diversity shares; verify health decay.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-65-provider-redundancy.md`, `../research/9router/42-branch-cascades-and-fallbacks.md`, `../research/9router/impl-plan-21-multi-account.md`.

## Scope

**In scope:** provider health metrics (availability, latency, error rate, quota) with weighted health scoring + staleness decay; provider failover (triggers: outage, error threshold, quota exhaustion) to alternate providers for the same model, health-ranked; diversity policies (max share per provider) with enforcement + monitoring; routing integration; health telemetry + degradation alerts.
**Out of scope:** geo-distributed providers; cost-based provider pricing arbitrage (plan 4).

## Milestones

### M1 — Provider health tracking

**Reference code (`src/lib/providers/health.js`):**

```js
// Health metrics per provider, from rolling request outcomes.
const stats = new Map(); // providerId -> { attempts, failures, latencyTotal, lastAt, quotaExhaustedAt }

const DECAY_MS = Number(process.env.PROVIDER_HEALTH_DECAY_MS ?? 15 * 60_000);

export function recordOutcome(providerId, { ok, latencyMs, quotaExhausted = false }, now = Date.now()) {
  const s = stats.get(providerId) ?? { attempts: 0, failures: 0, latencyTotal: 0, lastAt: 0, quotaExhaustedAt: 0 };
  s.attempts += 1;
  if (!ok) s.failures += 1;
  s.latencyTotal += latencyMs ?? 0;
  s.lastAt = now;
  if (quotaExhausted) s.quotaExhaustedAt = now;
  stats.set(providerId, s);
}

// Weighted health score 0..1. Stale data decays toward neutral (0.5).
export function healthScore(providerId, now = Date.now()) {
  const s = stats.get(providerId);
  if (!s || s.attempts === 0) return 0.5;
  const age = now - s.lastAt;
  const staleness = Math.min(1, age / DECAY_MS); // 0 fresh → 1 stale
  const errorRate = s.failures / s.attempts;
  const avgLatency = s.latencyTotal / s.attempts;
  const latencyPenalty = Math.min(0.3, avgLatency / 10_000); // 10s → max penalty
  const raw = Math.max(0, 1 - errorRate - latencyPenalty);
  if (s.quotaExhaustedAt && now - s.quotaExhaustedAt < DECAY_MS) return Math.min(raw, 0.2);
  // Decay toward 0.5 with staleness.
  return raw * (1 - staleness) + 0.5 * staleness;
}

export function resetHealth() { stats.clear(); }
```

**Acceptance criteria:** outcomes recorded; score reflects error rate + latency; quota exhaustion penalizes; stale decays.

### M2 — Provider failover

**Reference code (`src/lib/providers/failover.js`):**

```js
import { healthScore } from "./health.js";

// Failover targets: alternate providers offering the same model.
export function failoverTargets({ model, providers, currentProvider, registry }) {
  const alternatives = providers.filter((p) => p.id !== currentProvider && (registry[p.id]?.models ?? []).includes(model));
  return alternatives
    .map((p) => ({ ...p, health: healthScore(p.id) }))
    .sort((a, b) => b.health - a.health);
}

// Failover trigger check.
export function shouldFailover({ providerId, errorRate, threshold = 0.5, quotaExhausted }) {
  if (quotaExhausted) return { failover: true, reason: "quota" };
  if (errorRate >= threshold) return { failover: true, reason: "error-threshold" };
  return { failover: false };
}

// Health-ranked provider ordering for selection.
export function rankProviders(candidates) {
  return [...candidates].sort((a, b) => healthScore(b.id) - healthScore(a.id));
}
```

**Acceptance criteria:** targets health-ranked; triggers fire on quota/threshold; ordering used in selection.

### M3 — Diversity policies

**Reference code (`open-sse/config/providerPolicy.js`):**

```js
// Diversity policy: cap a provider's share of traffic.
export const DEFAULT_POLICY = {
  maxSharePerProvider: 0.7,   // no provider serves >70% of requests
  minProvidersWhenAvailable: 2,
  windowMs: 60 * 60_000,      // 1h rolling window
};

export function makeShareTracker({ windowMs = DEFAULT_POLICY.windowMs } = {}) {
  const counts = new Map(); // providerId -> [{ ts, n }]
  const total = () => [...counts.values()].flat().filter((e) => Date.now() - e.ts < windowMs).reduce((a, e) => a + e.n, 0);

  return {
    record(providerId, n = 1) {
      const arr = counts.get(providerId) ?? [];
      arr.push({ ts: Date.now(), n });
      counts.set(providerId, arr.filter((e) => Date.now() - e.ts < windowMs));
    },
    share(providerId) {
      const t = total();
      if (!t) return 0;
      const arr = (counts.get(providerId) ?? []).filter((e) => Date.now() - e.ts < windowMs);
      return arr.reduce((a, e) => a + e.n, 0) / t;
    },
    total,
  };
}

// Enforce diversity: filter out over-share providers when alternatives exist.
export function applyDiversity(candidates, tracker, policy = DEFAULT_POLICY) {
  if (candidates.length < policy.minProvidersWhenAvailable) return candidates;
  const allowed = candidates.filter((c) => tracker.share(c.id) < policy.maxSharePerProvider);
  return allowed.length ? allowed : candidates; // never starve — fall back to all
}
```

**Acceptance criteria:** share tracked over window; over-share providers deprioritized; never starves selection.

### M4 — Integration + telemetry + tests

**Reference code (integration in `src/sse/handlers/chat.js`):**

```js
import { rankProviders, shouldFailover, failoverTargets } from "@/lib/providers/failover.js";
import { applyDiversity, makeShareTracker } from "../../open-sse/config/providerPolicy.js";

const shareTracker = makeShareTracker();

// Selection: rank by health → apply diversity → return ordered candidates.
export function selectProviders(candidates, { enforceDiversity = true } = {}) {
  const ranked = rankProviders(candidates);
  return enforceDiversity ? applyDiversity(ranked, shareTracker) : ranked;
}

// After a request: record outcome for health + diversity.
export function recordProviderResult(providerId, { ok, latencyMs, quotaExhausted }) {
  recordOutcome(providerId, { ok, latencyMs, quotaExhausted });
  shareTracker.record(providerId, 1);
}
```

**Files touched:** `src/lib/providers/` (new: health, failover), `open-sse/config/providerPolicy.js` (new), `src/sse/handlers/chat.js` (selection integration), `src/lib/db/repos/providerHealthRepo.js` (new: telemetry), `tests/unit/provider-redundancy.test.js` (new).

**Acceptance criteria:** selection health-ranked + diversity-aware; outcomes recorded; telemetry persisted.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Failover latency | Slow recovery | Pre-ranked targets |
| Diversity cost | Higher spend | Configurable share cap |
| Health noise | Flapping | Rolling window + smoothing |
| Policy conflicts | Unexpected routing | Documented precedence (diversity < availability) |

## Verification

- Unit: health, failover, diversity
- Manual: simulate outage → failover; run traffic → check shares
- Regression: `tests/__baseline__/verify-no-regression.mjs`