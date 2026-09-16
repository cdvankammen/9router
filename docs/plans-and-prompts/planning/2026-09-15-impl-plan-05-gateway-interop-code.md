# Implementation Plan 05 — Gateway Interop & Feature Parity — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #gateway-interop #traffic-mirroring #model-caching #spend-share #virtual-models #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/sse/handlers/chat.js`, `src/lib/usageDb.js`, settings shape).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-05-gateway-interop.md`, `../research/9router/44-branch-gateways-and-serving.md`

## Scope

**In scope:** traffic mirroring (silent A/B); model caching (request-hash, in-memory LRU + optional Redis); spend-share ranking (OpenRouter pattern); virtual models (named combos with strategy binding).
**Out of scope:** Redis as a hard dependency (optional); semantic caching (plan 23).

## Milestones

### M1 — Traffic mirroring

**Reference code (`open-sse/services/trafficMirror.js`):**

```js
// Config: trafficMirroring: { enabled, mirrorTo: [modelIds], sampleRate: 0.1 }
export function shouldMirror(settings, requestId) {
  if (!settings.trafficMirroring?.enabled) return false;
  return hash(requestId) % 100 < settings.trafficMirroring.sampleRate * 100;
}

export async function mirrorRequest({ request, mirrorTo, settings }) {
  const results = [];
  for (const model of mirrorTo) {
    try {
      const res = await executeModel(model, request);
      results.push({ model, ok: true, latency: res.latency, cost: res.cost, output: res.output });
    } catch (err) {
      results.push({ model, ok: false, error: err.message });
    }
  }
  return results;
}
```

**Wiring in `chat.js`:** after main request completes, if `shouldMirror` → fire-and-forget mirror to targets; log to usageDb with `mirrored: true`.

**Acceptance criteria:** sample rate respected; mirror results logged; no impact on main request latency.

### M2 — Model caching

**Reference code (`open-sse/services/modelCache.js`):**

```js
// Config: modelCaching: { enabled, ttlSeconds, maxEntries }
// Cache key: hash of (model, messages, temperature, max_tokens, tools)
export function cacheKey(req) {
  const canonical = JSON.stringify({
    model: req.model,
    messages: req.messages,
    temperature: req.temperature ?? 0,
    max_tokens: req.max_tokens,
    tools: req.tools ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export class ModelCache {
  constructor({ ttlSeconds = 300, maxEntries = 1000 } = {}) {
    this.ttl = ttlSeconds * 1000;
    this.max = maxEntries;
    this.map = new Map(); // key -> { value, expiresAt }
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) { this.map.delete(key); return null; }
    return entry.value;
  }

  set(key, value) {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttl });
  }
}

// Safety: only cache idempotent requests (no tools, no streaming, temperature=0)
export function isCacheable(req) {
  return !req.stream && !req.tools && (req.temperature ?? 0) === 0;
}
```

**Wiring in `chat.js`:** before execution, if `isCacheable` → check cache; on hit return cached (not billed); on miss execute + cache.

**Acceptance criteria:** cache hit rate measurable; only deterministic requests cached; TTL + LRU eviction.

### M3 — Spend-share ranking

**Reference code (`open-sse/services/spendShareRouter.js`):**

```js
// Config: spendShareRouting: { enabled, windowDays: 7, costTier: 'low' }
// Rank models by real spend share over trailing window (from usageDb).
export async function rankBySpendShare(db, { windowDays = 7, costTier = "low" } = {}) {
  const since = Date.now() - windowDays * 86400_000;
  const rows = await db.all(`
    SELECT model, SUM(cost_usd) as spend, COUNT(*) as requests
    FROM usage_history
    WHERE timestamp >= ?
    GROUP BY model ORDER BY spend DESC
  `, [since]);
  // Apply cost_tier band (low/medium/high/xhigh/max)
  const tiered = rows.filter((r) => costTierMatches(r.model, costTier));
  return tiered;
}
```

**Degradation:** if no usage data → fall back to default model set. **Session stickiness:** remember model per conversation (session_id or message fingerprint), reuse while still a top candidate.

**Acceptance criteria:** ranking by real spend; cost_tier bands; degradation fallback; session stickiness.

### M4 — Virtual models + tests

**Reference code (`src/sse/handlers/chat.js`):**

```js
// Config: virtualModels: { 'my-group': { models: [...], strategy: 'weighted' } }
// Virtual model name callable as a single model; resolves to group strategy.
if (settings.virtualModels?.[modelStr]) {
  const group = settings.virtualModels[modelStr];
  return handleComboChat({ models: group.models, strategy: group.strategy, ... });
}
```

**Files touched:** `tests/unit/gateway-interop.test.js` (new), dashboard pages (mirror, cache, spend-share).

**Acceptance criteria:** virtual models resolve; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Mirroring doubles cost | Sample rate config; mirror to cheap models |
| Caching stale responses | TTL; only cache deterministic requests |
| Spend-share data sparsity | Degradation fallback |
| Redis optional | In-memory LRU default |

## Verification

- Unit: mirror sampling, cache hit/miss, spend-share ranking
- Manual: enable mirroring → verify mirror logs; enable caching → verify hit rate
- Regression: `tests/__baseline__/verify-no-regression.mjs`