---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, multi-provider, redundancy, diversity, resilience
---

# Implementation Plan 65 — Multi-Provider Redundancy

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `42-branch-cascades-and-fallbacks.md`).
> This plan covers the "multi-provider redundancy" option: provider-level redundancy and diversity.

## 1. Goal

Add provider-level redundancy to 9Router: provider health tracking, automatic provider failover, and provider diversity policies — so provider outages don't break service.

## 2. Background (from research)

- **9Router current state**: multi-provider support; fallback within combos.
- **Research findings** (42-branch): provider redundancy (same model via multiple providers); provider failover (outage → alternate provider); diversity policies (avoid single-provider dependence).

## 3. Design

### 3.1 Provider Health

- **Health metrics**: availability, latency, error rate, quota.
- **Health scoring**: weighted score.
- **Health decay**: stale data decays.

### 3.2 Provider Failover

- **Failover triggers**: outage, error threshold, quota exhaustion.
- **Failover targets**: alternate providers for same model.
- **Failover ordering**: health-ranked.
- **Failover logging**: failover events.

### 3.3 Diversity Policies

- **Diversity rules**: max share per provider.
- **Diversity enforcement**: route to maintain diversity.
- **Diversity monitoring**: provider share tracking.

### 3.4 Integration

- **Routing integration**: health-aware selection.
- **Observability**: provider health telemetry.
- **Alerts**: provider degradation.

## 4. Implementation Steps

1. Build provider health.
2. Add provider failover.
3. Add diversity policies.
4. Integrate routing.
5. Tests: health, failover, diversity.

## 5. Files Touched

- `src/lib/providers/` (new: health, failover)
- `src/sse/handlers/chat.js` (selection)
- `open-sse/config/providerPolicy.js` (new)
- `src/lib/db/repos/providerHealthRepo.js` (new)
- `tests/unit/provider-redundancy.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Failover latency | Pre-ranked targets |
| Diversity cost | Configurable share |
| Health noise | Smoothing |
| Policy conflicts | Precedence |

## 7. Success Criteria

- Provider health tracked.
- Failover automatic.
- Diversity enforced.
- Telemetry visible.

## 8. Related Plans
- Plan 21 (Multi-Account) — account redundancy.
- Plan 9 (Error System) — outage errors.
- Plan 8 (Observability) — health telemetry.