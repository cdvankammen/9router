---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, draft-model-tradeoffs, speculative-decoding, kv-quantization, prefix-caching, pagedattention
---

# Implementation Plan 92 — Local Inference Acceleration (Speculative Decoding & KV Optimization)

> Mined from branch docs: `43-branch-moe-and-expert-routing.md` (draft model tradeoffs, KV quantization, PagedAttention, prefix caching, continuous batching).

## 1. Goal

Add local inference acceleration to 9Router's local-model support: speculative decoding with draft models, KV cache quantization, prefix caching, and continuous batching — so local models serve requests faster and cheaper.

## 2. Background (from research)

- **9Router current state**: local model support is basic (OpenAI-compatible endpoints only).
- **Research findings** (43-branch):
  - Draft model tradeoffs: small draft model + big target model.
  - KV quantization: reduce KV cache memory (int8/int4).
  - PagedAttention: efficient KV cache management.
  - Prefix caching: cache shared prefixes across requests.
  - Continuous batching: batch concurrent requests.

## 3. Design

### 3.1 Speculative Decoding

- **Draft model config**: per-target draft model.
- **Acceptance logic**: verify draft tokens against target.
- **Tradeoff controls**: draft size, acceptance threshold.
- **Fallback**: disable when draft underperforms.

### 3.2 KV Cache Optimization

- **Quantization**: int8/int4 KV cache options.
- **PagedAttention**: page-based KV management.
- **Memory limits**: configurable KV cache memory caps.

### 3.3 Prefix Caching

- **Cache key**: system prompt + shared prefix hash.
- **Cache store**: LRU cache with memory cap.
- **Cache hit metrics**: hit rate telemetry.

### 3.4 Continuous Batching

- **Batch queue**: concurrent request batching.
- **Batch window**: configurable batching window.
- **Latency tradeoff**: batch size vs. latency.

### 3.5 Integration

- **Local executor**: acceleration in local-model executor.
- **Observability**: acceleration metrics.
- **Dashboard**: acceleration config.

## 4. Implementation Steps

1. Build speculative decoding support (`src/lib/local/`).
2. Add KV quantization options.
3. Add prefix caching.
4. Add continuous batching.
5. Integrate local executor.
6. Dashboard: acceleration config.
7. Tests: draft acceptance, cache hits, batching.

## 5. Files Touched

- `src/lib/local/` (new: draft, kv, prefix, batch)
- `open-sse/executors/local.js` (integration)
- `open-sse/config/localConfig.js` (new)
- Dashboard local page (new)
- `tests/unit/local.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Draft rejection | Acceptance monitoring |
| KV memory | Memory caps |
| Cache staleness | LRU + invalidation |
| Batching latency | Window tuning |

## 7. Success Criteria

- Speculative decoding works with fallback.
- KV quantization available.
- Prefix cache hits measured.
- Batching functional.

## 8. Related Plans

- Plan 31 (Performance) — latency.
- Plan 26 (Token Optimization) — token efficiency.
- Plan 18 (Model Serving) — serving policy.
- Plan 55 (Context Window) — KV context limits.