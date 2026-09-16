---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, performance, latency, benchmarking, optimization
---

# Implementation Plan 31 — Performance & Latency Optimization

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "performance" option: end-to-end latency optimization and benchmarking.

## 1. Goal

Optimize 9Router's performance: end-to-end latency reduction (routing overhead, translation, streaming), throughput benchmarking, and performance regression protection.

## 2. Background (from research)

- **9Router current state**: routing overhead includes translation (double-hop for some pairs), account selection, RTK processing.
- **Research findings**: routing overhead should be <10ms; translation is the main overhead; streaming adds latency per chunk; benchmarks must be repeatable.

## 3. Design

### 3.1 Latency Optimization

- **Routing overhead**: profile + optimize decision path (target <10ms).
- **Translation**: optimize hot paths; direct routes for fragile pairs.
- **Streaming**: chunk forwarding latency (target <5ms/chunk).
- **Connection reuse**: keep-alive, pooling.

### 3.2 Benchmarking

- **Benchmark suite**: repeatable benchmarks (routing, translation, streaming).
- **Benchmark harness**: load generation, latency percentiles.
- **Benchmark reports**: p50/p95/p99 per operation.

### 3.3 Regression Protection

- **Performance tests**: CI performance tests with thresholds.
- **Profiling**: flame graphs on demand.
- **Performance budget**: per-operation budgets.

### 3.4 Monitoring

- **Latency telemetry**: per-stage latency (parse, classify, score, select, execute).
- **Overhead tracking**: routing overhead vs upstream latency.
- **Alerting**: latency regressions.

## 4. Implementation Steps

1. Profile current latency (per stage).
2. Optimize routing overhead.
3. Optimize translation hot paths.
4. Build benchmark suite.
5. Add performance tests.
6. Tests: benchmarks, budgets.

## 5. Files Touched

- `open-sse/handlers/chatCore.js` (hot paths)
- `open-sse/translator/` (optimization)
- `scripts/benchmark-routing.mjs` (new)
- `src/lib/db/repos/latencyRepo.js` (new)
- `tests/performance/` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Optimization complexity | Profile first; targeted |
| Benchmark flakiness | Repeatable harness; CI isolation |
| Regression | Performance tests |
| Over-optimization | Budgets; review |

## 7. Success Criteria

- Routing overhead <10ms.
- Streaming <5ms/chunk overhead.
- Benchmark suite repeatable.
- Performance regressions caught.

## 8. Related Plans
- Plan 8 (Observability) — latency telemetry.
- Plan 22 (Streaming) — stream latency.
- Plan 7 (Eval Harness) — benchmark synergy.