---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, acceptance-rate, provider-health, load-balancing, capacity
---

# Implementation Plan 94 — Provider Acceptance Rate & Load Balancing

> Mined from branch docs: `47-branch-9router-internal-threads.md` (acceptance rate, load-balancing in practice, capacity tuning) and `42-branch-cascades-and-fallbacks.md` (failure detection).

## 1. Goal

Add provider acceptance-rate tracking and load balancing to 9Router: measure each provider's acceptance rate (successful requests / total attempts), use it as a health signal, and balance load across healthy providers — so traffic avoids degrading providers automatically.

## 2. Background (from research)

- **9Router current state**: failover exists but no proactive load balancing.
- **Research findings** (47-branch):
  - Acceptance rate: provider health signal.
  - Load-balancing in practice: distribute load across providers.
  - Capacity tuning: per-provider capacity limits.

## 3. Design

### 3.1 Acceptance Rate Tracking

- **Definition**: accepted / attempted per provider per window.
- **Windows**: rolling 1m, 5m, 1h, 24h.
- **EWMA**: smoothed acceptance rate.
- **Classification**: accepted (2xx), rejected (4xx), failed (5xx/timeout).

### 3.2 Health Scoring

- **Health score**: weighted combination of acceptance rate, latency, error rate.
- **Health states**: healthy, degraded, unhealthy.
- **State transitions**: hysteresis to prevent flapping.

### 3.3 Load Balancing

- **Balancing strategies**: round-robin, weighted (health), least-connections.
- **Weight computation**: health score → weight.
- **Sticky balancing**: session affinity within balancing.
- **Capacity limits**: per-provider max concurrent.

### 3.4 Integration

- **Selection integration**: balancing in model selection.
- **Failover integration**: unhealthy providers skipped.
- **Observability**: acceptance/health metrics.
- **Dashboard**: provider health view.

## 4. Implementation Steps

1. Build acceptance tracker (`src/lib/health/`).
2. Build health scoring.
3. Build load balancer.
4. Integrate selection + failover.
5. Dashboard: provider health view.
6. Tests: acceptance tracking, balancing, hysteresis.

## 5. Files Touched

- `src/lib/health/` (new: acceptance, score, balancer)
- `src/sse/handlers/chat.js` (balancer integration)
- `open-sse/config/healthConfig.js` (new)
- Dashboard health page (new)
- `tests/unit/health.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Flapping | Hysteresis |
| Unbalanced load | Weighted balancing |
| Health signal noise | EWMA smoothing |
| Capacity misjudgment | Conservative limits |

## 7. Success Criteria

- Acceptance rates tracked.
- Health states computed.
- Load balanced across healthy providers.
- Health view visible.

## 8. Related Plans

- Plan 65 (Provider Redundancy) — redundancy.
- Plan 86 (Latency/Capacity) — capacity routing.
- Plan 49 (Health/Self-Healing) — health checks.
- Plan 9 (Error Failover) — failover integration.