---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, mixture-of-agents, expert-merging, expert-utilization, sparse-routing
---

# Implementation Plan 85 — Mixture-of-Agents & Expert Orchestration

> Mined from branch docs: `43-branch-moe-and-expert-routing.md` (mixture-of-agents, expert merging, expert utilization, sparse routing efficiency, sparse upcycling, expert merging, capacity tuning, continuous batching, PagedAttention, KV quantization, draft model tradeoffs, prefix caching).

## 1. Goal

Add a Mixture-of-Agents (MoA) orchestration mode to 9Router: for high-stakes requests, run multiple models in parallel (proposer + aggregator pattern), merge their outputs, and route expert-style workloads to specialized models — so complex requests get ensemble-quality responses.

## 2. Background (from research)

- **9Router current state**: single-model responses; combos are sequential fallback only.
- **Research findings** (43-branch):
  - Mixture-of-agents: multiple models propose, one aggregates.
  - Expert merging: combine expert outputs (weighted voting, best-of-N).
  - Expert utilization: track which experts/models are used.
  - Sparse routing efficiency: only activate relevant experts.
  - Capacity tuning: per-expert capacity limits.
  - Continuous batching: batch concurrent requests efficiently.
  - PagedAttention: efficient KV cache management.
  - KV quantization: reduce KV cache memory.
  - Draft model tradeoffs: speculative decoding tradeoffs.
  - Prefix caching: cache shared prefixes.

## 3. Design

### 3.1 MoA Mode

```
High-stakes request → N proposers (parallel) → aggregator model
Aggregator: synthesizes best answer from proposals
Config: N (2-4), proposer set, aggregator model, trigger rules
```

- **Trigger rules**: request complexity, user opt-in, route config.
- **Parallel execution**: Promise.allSettled across proposers.
- **Aggregation**: aggregator receives proposals + original request.

### 3.2 Expert Orchestration

- **Expert registry**: specialized models per domain (code, math, creative, analysis).
- **Expert dispatch**: taxonomy → expert model.
- **Expert merging**: weighted voting / best-of-N for expert outputs.
- **Expert utilization tracking**: usage stats per expert.

### 3.3 Efficiency Features

- **Prefix caching**: cache shared system-prompt prefixes.
- **Continuous batching**: batch concurrent MoA requests.
- **KV quantization**: optional, for local models.
- **Draft model support**: speculative decoding for local models.

### 3.4 Integration

- **Combo integration**: MoA as a combo mode.
- **Observability**: MoA cost/latency/quality telemetry.
- **Dashboard**: MoA config + results.
- **Cost control**: MoA cost multiplier warnings.

## 4. Implementation Steps

1. Build MoA orchestrator (`src/lib/moa/`).
2. Add proposer/aggregator execution.
3. Build expert registry + dispatch.
4. Add expert merging.
5. Add prefix caching.
6. Dashboard: MoA config.
7. Tests: MoA flow, merging, cost control.

## 5. Files Touched

- `src/lib/moa/` (new: orchestrator, experts, merge, cache)
- `src/sse/handlers/chat.js` (MoA mode)
- `open-sse/config/moaConfig.js` (new)
- Dashboard MoA page (new)
- `tests/unit/moa.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| MoA cost explosion | Cost caps + opt-in |
| Aggregator failure | Fallback to best proposal |
| Latency | Parallel execution + timeouts |
| Expert misdispatch | Taxonomy confidence gates |

## 7. Success Criteria

- MoA mode produces aggregated responses.
- Expert dispatch works.
- Cost caps enforced.
- Telemetry visible.

## 8. Related Plans

- Plan 6 (MoE Dispatch) — expert routing.
- Plan 81 (Intent Classification) — expert dispatch input.
- Plan 4 (Cost-Quality) — cost tradeoffs.
- Plan 31 (Performance) — latency optimization.