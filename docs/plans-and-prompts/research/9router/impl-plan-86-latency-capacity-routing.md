---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, latency-based-selection, capacity-tuning, load-balancing, cooldown-tuning
---

# Implementation Plan 86 — Latency-Based Selection & Capacity-Aware Routing

> Mined from branch docs: `47-branch-9router-internal-threads.md` (latency-based selection, capacity tuning, load-balancing in practice, cooldown tuning, backoff strategies, acceptance rate) and `42-branch-cascades-and-fallbacks.md` (backoff strategies).

## 1. Goal

Add latency-based model selection and capacity-aware routing to 9Router: track per-model latency and capacity, prefer fast models for latency-sensitive requests, and route around overloaded providers — so response time is optimized without sacrificing quality.

## 2. Background (from research)

- **9Router current state**: no latency awareness in selection; overloaded providers cause slow responses.
- **Research findings** (47-branch):
  - Latency-based selection: choose models by measured latency.
  - Capacity tuning: per-model capacity limits.
  - Load-balancing in practice: distribute load across providers.
  - Cooldown tuning: cooldown periods after failures.
  - Backoff strategies: exponential backoff with jitter.
  - Acceptance rate: provider acceptance rate as health signal.

## 3. Design

### 3.1 Latency Tracking

- **Latency store**: per (model, provider) rolling latency stats (p50, p95, EWMA).
- **Latency sources**: request timing, health checks, provider APIs.
- **Latency decay**: older samples decay.

### 3.2 Latency-Based Selection

- **Latency sensitivity**: per-request latency budget (from route config or user).
- **Selection**: among quality-equivalent models, prefer lowest latency.
- **Tradeoff**: quality vs. latency slider per route.

### 3.3 Capacity Awareness

- **Capacity model**: per-provider concurrent request limits.
- **In-flight tracking**: current in-flight requests per provider.
- **Capacity routing**: avoid providers at capacity.
- **Queueing**: configurable queue with timeout.

### 3.4 Health Signals

- **Acceptance rate**: success/acceptance ratio per provider.
- **Cooldown**: automatic cooldown after repeated failures.
- **Backoff**: exponential backoff with jitter for retries.
- **Load balancing**: distribute across healthy providers.

### 3.5 Integration

- **Combo integration**: latency-aware combo ordering.
- **Observability**: latency percentiles, capacity utilization.
- **Dashboard**: latency/capacity view.

## 4. Implementation Steps

1. Build latency store (`src/lib/latency/`).
2. Add latency-based selection.
3. Build capacity tracker.
4. Add health signals (acceptance, cooldown, backoff).
5. Integrate combo ordering.
6. Dashboard: latency/capacity view.
7. Tests: latency selection, capacity routing, cooldown.

## 5. Files Touched

- `src/lib/latency/` (new: store, selection, capacity, health)
- `src/sse/handlers/chat.js` (selection integration)
- `open-sse/config/latencyConfig.js` (new)
- Dashboard latency page (new)
- `tests/unit/latency.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Latency noise | EWMA + percentile stats |
| Capacity misjudgment | Conservative limits |
| Cooldown flapping | Hysteresis |
| Quality sacrifice | Quality floor per route |

## 7. Success Criteria

- Latency-sensitive requests routed to fast models.
- Overloaded providers avoided.
- Cooldown/backoff works.
- Latency telemetry visible.

## 8. Related Plans

- Plan 31 (Performance) — latency optimization.
- Plan 57 (Retry Semantics) — backoff strategies.
- Plan 65 (Provider Redundancy) — health signals.
- Plan 9 (Error Failover) — cooldown integration.