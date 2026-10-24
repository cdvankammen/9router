# Implementation Plan 76 — Routing Context Engineering — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #routing-context #enrichment #features #personalization #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (context window management from plan 55 (`src/lib/context/`); task classification from plan 56; routing selection in `src/sse/handlers/chat.js`; privacy/redaction from plan 35).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — send requests with different user tiers/times; confirm features differ and routing uses them.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-76-routing-context-engineering.md`, `../research/9router/impl-plan-56-task-classification-intent.md`, `../research/9router/impl-plan-55-context-window-management.md`.

## Scope

**In scope:** context dimensions (user: preferences/tier/history; request: task type/complexity/urgency; environment: time/load/provider health); collection with staleness handling + redaction; enrichment pipeline (raw → routing features, derived features, per-feature weights); context-aware selection integration + telemetry.
**Out of scope:** ML-based feature learning (weighted heuristics first); cross-user context sharing.

## Milestones

### M1 — Context dimensions + collection

**Reference code (`src/lib/context/collect.js`):**

```js
// Collect raw context from request, user store, and environment.
export async function collectContext({ req, userStore, healthStore }, now = new Date()) {
  const hour = now.getHours();
  const day = now.getDay();
  const raw = {
    user: await userStore?.get(req.userId).catch(() => null) ?? null,
    request: {
      taskType: req.taskType ?? null,
      complexity: req.complexity ?? null,
      urgency: req.headers.get("x-urgency") ?? null,
      model: req.model ?? null,
    },
    environment: {
      hour, day,
      isWorkHours: hour >= 9 && hour <= 18 && day >= 1 && day <= 5,
      providerHealth: healthStore?.snapshot() ?? null,
    },
  };
  return raw;
}

// Staleness: mark context older than TTL as stale (callers decide to ignore).
export function freshness(ctx, { ttlMs = 5 * 60_000 } = {}) {
  const age = Date.now() - (ctx.collectedAt ?? Date.now());
  return { fresh: age < ttlMs, ageMs: age };
}
```

**Acceptance criteria:** raw context collected from all sources; staleness computed.

### M2 — Redaction + privacy

**Reference code (`src/lib/context/redact.js`):**

```js
// Redact sensitive fields before context is used/logged.
const SENSITIVE_KEYS = new Set(["apiKey", "token", "password", "secret", "authorization"]);

export function redactContext(ctx, keys = SENSITIVE_KEYS) {
  const out = structuredClone(ctx);
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (keys.has(k.toLowerCase())) node[k] = "[REDACTED]";
      else if (v && typeof v === "object") walk(v);
    }
  };
  walk(out);
  return out;
}
```

**Acceptance criteria:** sensitive keys redacted recursively; clone preserves structure.

### M3 — Enrichment pipeline

**Reference code (`src/lib/context/enrich.js`):**

```js
// Derived features + weighted scoring for routing.
export const FEATURE_WEIGHTS = {
  userTier: 0.3,        // higher tier → prefer quality
  taskComplexity: 0.25, // complex → prefer capable models
  urgency: 0.2,         // urgent → prefer low latency
  workHours: 0.1,       // peak → prefer capacity/health
  providerHealth: 0.15, // prefer healthy providers
};

export function enrichContext(raw) {
  const features = {
    userTier: raw.user?.tier ?? "free",
    taskComplexity: raw.request.complexity ?? "medium",
    urgency: raw.request.urgency ?? "normal",
    workHours: raw.environment.isWorkHours ? 1 : 0,
    providerHealth: raw.environment.providerHealth?.avg ?? 0.5,
  };
  // Composite "quality preference" score 0..1.
  const qualityPreference =
    (features.userTier === "pro" ? 1 : features.userTier === "plus" ? 0.6 : 0.3) * FEATURE_WEIGHTS.userTier +
    (features.taskComplexity === "high" ? 1 : features.taskComplexity === "medium" ? 0.5 : 0.2) * FEATURE_WEIGHTS.taskComplexity;
  const latencySensitivity =
    (features.urgency === "high" ? 1 : features.urgency === "normal" ? 0.4 : 0.1) * FEATURE_WEIGHTS.urgency;
  return { features, qualityPreference: Number(qualityPreference.toFixed(3)), latencySensitivity: Number(latencySensitivity.toFixed(3)) };
}

// Blend into candidate ordering: quality preference raises capable models.
export function contextAdjustedScore(baseScore, { qualityPreference, modelQuality = 0.5, latencySensitivity, modelLatency = 0.5 }) {
  return baseScore + qualityPreference * modelQuality - latencySensitivity * modelLatency;
}
```

**Acceptance criteria:** features derived; composite scores computed; blending available.

### M4 — Routing integration + telemetry + tests

**Reference code (`src/lib/context/integrate.js`):**

```js
import { collectContext } from "./collect.js";
import { redactContext } from "./redact.js";
import { enrichContext, contextAdjustedScore } from "./enrich.js";

// One-call entry used by src/sse/handlers/chat.js before selection.
export async function buildRoutingContext({ req, userStore, healthStore }) {
  const raw = await collectContext({ req, userStore, healthStore });
  const enriched = enrichContext(raw);
  return { raw: redactContext(raw), enriched };
}

// Order candidates using context-adjusted scores.
export function orderCandidates(candidates, ctx, { qualityByModel, latencyByModel } = {}) {
  return [...candidates]
    .map((c) => ({
      ...c,
      score: contextAdjustedScore(c.baseScore ?? 0.5, {
        qualityPreference: ctx.enriched.qualityPreference,
        modelQuality: qualityByModel?.[c.model] ?? 0.5,
        latencySensitivity: ctx.enriched.latencySensitivity,
        modelLatency: latencyByModel?.[c.model] ?? 0.5,
      }),
    }))
    .sort((a, b) => b.score - a.score);
}
```

**Files touched:** `src/lib/context/` (extend: collect, redact, enrich, integrate), `src/sse/handlers/chat.js` (integration), `src/lib/db/repos/contextRepo.js` (extend: telemetry), `open-sse/config/contextConfig.js` (extend: weights), `tests/unit/context-engineering.test.js` (new).

**Acceptance criteria:** context built per request; redacted before logging; ordering context-aware.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Privacy | Context leaks | Redaction before use/log |
| Stale context | Wrong decisions | Freshness TTL |
| Feature noise | Skewed routing | Weighted + bounded features |
| Complexity | Hard to debug | Progressive + telemetry |

## Verification

- Unit: collect, redact, enrich, orderCandidates
- Manual: pro-tier complex urgent request → quality+latency adjusted ordering
- Regression: `tests/__baseline__/verify-no-regression.mjs`