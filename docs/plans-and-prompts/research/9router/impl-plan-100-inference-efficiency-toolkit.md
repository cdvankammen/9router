---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, continuous-batching, pagedattention, kv-quantization, inference-efficiency
---

# Implementation Plan 100 — Inference Efficiency Toolkit (Batching, KV, Prefix)

> Mined from branch docs: `43-branch-moe-and-expert-routing.md` (continuous batching, PagedAttention, KV quantization, prefix caching, draft model tradeoffs).

## 1. Goal

Add an inference efficiency toolkit to 9Router's local-model path: continuous batching, PagedAttention-style KV management, KV quantization, and prefix caching — so local inference throughput improves measurably.

## 2. Background (from research)

- **9Router current state**: local models served via OpenAI-compatible endpoints; no efficiency controls.
- **Research findings** (43-branch):
  - Continuous batching: batch concurrent requests.
  - PagedAttention: page-based KV cache.
  - KV quantization: int8/int4 KV.
  - Prefix caching: shared prefix reuse.
  - Draft model tradeoffs: speculative decoding.

## 3. Design

### 3.1 Continuous Batching

- **Batch queue**: requests wait for batch window.
- **Batch window**: configurable (e.g., 50ms).
- **Batch limits**: max batch size, max tokens.
- **Priority batching**: high-priority requests bypass.

### 3.2 KV Cache Management

- **PagedAttention**: page-based allocation (via vLLM/llama.cpp backends).
- **KV quantization**: int8/int4 options.
- **Memory caps**: configurable KV memory limits.

### 3.3 Prefix Caching

- **Cache key**: system prompt + prefix hash.
- **Cache store**: LRU with memory cap.
- **Hit metrics**: hit rate telemetry.

### 3.4 Speculative Decoding

- **Draft model**: per-target draft config.
- **Acceptance**: token acceptance verification.
- **Fallback**: disable on poor acceptance.

### 3.5 Integration

- **Local executor**: efficiency options.
- **Observability**: throughput, cache hits, acceptance.
- **Dashboard**: efficiency config.

## 4. Implementation Steps

1. Build batching (`src/lib/inference/batch.js`).
2. Add KV options.
3. Add prefix caching.
4. Add speculative decoding.
5. Integrate local executor.
6. Dashboard: efficiency UI.
7. Tests: batching, cache, acceptance.

## 5. Files Touched

- `src/lib/inference/` (new: batch, kv, prefix, draft)
- `open-sse/executors/local.js` (integration)
- `open-sse/config/inferenceConfig.js` (new)
- Dashboard inference page (new)
- `tests/unit/inference.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Batching latency | Window tuning |
| KV memory | Caps |
| Cache staleness | LRU + invalidation |
| Draft rejection | Monitoring + fallback |

## 7. Success Criteria

- Batching improves throughput.
- KV options available.
- Prefix cache hits measured.
- Speculative decoding with fallback.

## 8. Related Plans

- Plan 92 (Local Acceleration) — acceleration synergy.
- Plan 31 (Performance) — latency.
- Plan 18 (Model Serving) — serving policy.
- Plan 26 (Token Optimization) — token efficiency.