---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, caching, prompt-cache, response-cache, kv-cache
---

# Implementation Plan 23 — Prompt & Response Caching

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "caching" option: prompt caching (provider-side) and response caching (gateway-side) for cost/latency reduction.

## 1. Goal

Add caching to 9Router: provider prompt caching (where supported) and gateway response caching (exact-match and semantic) — reducing cost and latency without correctness loss.

## 2. Background (from research)

- **Research findings**: prompt caching (Anthropic, OpenAI, DeepSeek) cuts cost 10–90% on repeated prefixes; response caching (LiteLLM caching) cuts latency for repeated queries; cache invalidation is the hard part.
- **9Router current state**: no caching layer; RTK token saver reduces tokens pre-translate.

## 3. Design

### 3.1 Provider Prompt Caching

- **Cache control**: per-provider cache_control blocks (Anthropic-style) where supported.
- **Cache hints**: automatic prefix caching hints for long system prompts.
- **Cache metrics**: cache read/write tokens per request.

### 3.2 Gateway Response Cache

- **Cache key**: normalized request hash (model, messages, params, tools).
- **Cache store**: SQLite-backed with TTL.
- **Cache modes**: exact-match only (safe) → semantic (opt-in).
- **Cache invalidation**: TTL + manual invalidation + model-version invalidation.

### 3.3 Semantic Cache (opt-in)

- **Embedding-based**: embed query; nearest-neighbor lookup.
- **Similarity threshold**: configurable; below threshold = miss.
- **Risk**: semantic cache can return wrong answers — opt-in only.

### 3.4 Cache Telemetry

- **Hit rate**: per-model, per-route.
- **Savings**: cost/latency saved.
- **Invalidation events**: logged.

## 4. Implementation Steps

1. Add provider prompt caching (cache_control).
2. Build response cache (key, store, TTL).
3. Add semantic cache (opt-in).
4. Add cache telemetry.
5. Tests: cache hit/miss, invalidation, semantic threshold.

## 5. Files Touched

- `open-sse/config/cacheConfig.js` (new)
- `open-sse/handlers/chatCore.js` (cache integration)
- `src/lib/db/repos/cacheRepo.js` (new)
- `src/lib/embeddings/` (semantic cache)
- `tests/unit/caching.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Stale responses | TTL; invalidation; exact-match default |
| Semantic wrongness | Opt-in; threshold tuning |
| Cache key collisions | Normalized canonical keys |
| Storage growth | TTL + size caps |

## 7. Success Criteria

- Prompt caching active where supported.
- Response cache hit rate measurable.
- Semantic cache opt-in only.
- Cache savings visible in telemetry.

## 8. Related Plans
- Plan 4 (Cost-Quality Optimizer) — cost savings.
- Plan 5 (Gateway Interop) — model caching.
- Plan 8 (Observability) — cache telemetry.