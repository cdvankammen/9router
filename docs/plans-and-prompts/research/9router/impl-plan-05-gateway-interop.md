---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, gateway-interop, litellm, openrouter, coai, model-caching
---

# Implementation Plan 5 — Gateway Interop & Feature Parity (LiteLLM/OpenRouter/coai patterns)

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `44-branch-gateways-and-serving.md`).
> This plan covers the "gateway interop" option: adopt proven gateway features 9Router lacks — traffic mirroring, model caching, spend-share ranking, virtual models.

## 1. Goal

Bring 9Router to feature parity with leading gateways (LiteLLM, OpenRouter, coai) by adopting their proven patterns: **traffic mirroring** (silent A/B experiments), **model caching** (request-hash caching), **spend-share ranking** (market-driven routing), and **virtual models** (routing groups as callable names).

## 2. Background (from research)

- **LiteLLM**: traffic mirroring / silent experiments for A/B evaluation; Redis caching; session affinity (x-litellm-session-id, TTL 3600s); routing groups as virtual models; strategy-based load balancing.
- **OpenRouter Auto Router**: spend-share ranking over trailing 7-day window; task-type classification; cost_tier bands; session stickiness (session_id or message fingerprint).
- **coai**: model caching (same request-parameter hash → cached result, cache hit not billed); channel management with priority + weight; model redirection; upstream hiding.
- **9Router current state**: combo selection (named combos), fallback/round-robin strategies, sticky session (FNV-1a hash, TTL 5min), capacity adapter, model fallback chains. No traffic mirroring, no model caching, no spend-share ranking.

## 3. Design

### 3.1 Traffic Mirroring (LiteLLM pattern)

- **Config**: `trafficMirroring: { enabled, mirrorTo: [modelIds], sampleRate: 0.1 }`.
- **Behavior**: sample N% of requests; duplicate to mirror targets; compare outcomes (latency, quality, cost); log to usageDb with `mirrored: true`.
- **Evaluation**: silent A/B — mirror results inform routing strategy changes without affecting production traffic.
- **Dashboard**: mirror comparison view (strategy A vs B outcomes).

### 3.2 Model Caching (coai pattern)

- **Config**: `modelCaching: { enabled, ttlSeconds, maxEntries }`.
- **Behavior**: hash request parameters (model, messages, temperature, etc.) → cache key; on hit, return cached response (not billed); on miss, execute + cache.
- **Storage**: in-memory LRU + optional Redis (LiteLLM pattern).
- **Safety**: only cache idempotent requests (no tools, no streaming, temperature=0 or deterministic).
- **Dashboard**: cache hit rate, cache size, savings.

### 3.3 Spend-Share Ranking (OpenRouter pattern)

- **Config**: `spendShareRouting: { enabled, windowDays: 7, costTier: 'low' }`.
- **Behavior**: rank models by real spend share over trailing window (from usageDb); apply cost_tier band; route to top survivors with fallbacks.
- **Degradation**: if no usage data, fall back to default model set.
- **Session stickiness**: remember model per conversation (session_id or message fingerprint), reuse only while still a top candidate.

### 3.4 Virtual Models (LiteLLM pattern)

- **Config**: `virtualModels: { 'my-group': { models: [...], strategy: 'weighted' } }`.
- **Behavior**: virtual model name callable as a single model; resolves to group strategy.
- **9Router alignment**: named combos already exist — extend with strategy binding + virtual name.

## 4. Implementation Steps

1. Add traffic mirroring config + sampling + logging.
2. Add mirror comparison dashboard view.
3. Add model caching (in-memory LRU + Redis optional).
4. Add cache hit rate dashboard.
5. Add spend-share ranking (usageDb aggregation).
6. Add cost_tier bands + session stickiness.
7. Extend named combos to virtual models with strategy binding.
8. Tests: mirror sampling, cache hit/miss, spend-share ranking.

## 5. Files Touched

- `src/sse/handlers/chat.js` (mirroring, caching, spend-share wiring)
- `open-sse/services/trafficMirror.js` (new)
- `open-sse/services/modelCache.js` (new)
- `open-sse/services/spendShareRouter.js` (new)
- `src/lib/usageDb.js` (spend aggregation)
- Dashboard pages (mirror, cache, spend-share)
- `tests/unit/gateway-interop.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Mirroring doubles cost | Sample rate config; mirror to cheap models |
| Caching stale responses | TTL; only cache deterministic requests |
| Spend-share cold start | Fallback to default set; warm-up period |
| Virtual model confusion | Clear naming; dashboard management |

## 7. Success Criteria

- Traffic mirroring operational with configurable sample rate.
- Model caching hit rate ≥ 20% with zero correctness regressions.
- Spend-share ranking matches OpenRouter's behavior on eval set.
- Virtual models callable with strategy binding.

## 8. Related Plans
- Plan 4 (Cost-Quality Optimizer) — cost integration.
- Plan 7 (Eval Harness) — mirror evaluation.
- Plan 3 (Semantic Routing) — classification synergy.