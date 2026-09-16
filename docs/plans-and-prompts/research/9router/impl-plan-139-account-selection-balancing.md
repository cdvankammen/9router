---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, account-selection, multi-account, account-balancing, account-health
---

# Implementation Plan 139 — Account Selection & Balancing

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 3: BBA — Account Selection).

## 1. Goal

Implement account selection and balancing for 9Router: formalize how accounts are chosen within a provider, add account health tracking, and add account-level load balancing — maximizing quota utilization across accounts.

## 2. Background (from research)

- **9Router current state**: Multi-account fallback exists (plan 21); selection ad hoc.
- **Research findings** (42-branch):
  - Account selection (BBA): which account to use.
  - Fallback chains (ABBA): account fallback chains.
  - Fallback triggers (ABBB): when to switch accounts.

## 3. Design

### 3.1 Account Model

- **Account registry**: per-provider accounts.
- **Account health**: quota, rate limits, errors.
- **Account priority**: configured priority.

### 3.2 Selection Strategies

- **Round-robin**: even distribution.
- **Least-loaded**: least quota usage.
- **Health-aware**: skip unhealthy accounts.
- **Priority-based**: configured order.

### 3.3 Balancing

- **Quota balancing**: distribute across accounts.
- **Rate-limit balancing**: avoid rate limits.
- **Cost balancing**: distribute cost.
- **Failover**: switch on failure.

### 3.4 Integration

- **Executor integration**: account selection.
- **Observability**: account metrics.
- **Dashboard**: account view.

## 4. Implementation Steps

1. Build account registry.
2. Add health tracking.
3. Add selection strategies.
4. Add balancing.
5. Dashboard: account view.
6. Tests: selection, balancing, failover.

## 5. Files Touched

- `src/lib/accounts/` (new: registry, health, select)
- `open-sse/executors/` (account integration)
- Dashboard accounts page (new)
- `tests/unit/accounts.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Quota exhaustion | Health tracking |
| Rate limits | Balancing |
| Account errors | Failover |
| Cost imbalance | Cost balancing |

## 7. Success Criteria

- Accounts tracked.
- Selection strategies work.
- Quota utilized.
- Failover functional.

## 8. Related Plans

- Plan 21 (Multi-Account Quota) — quota foundations.
- Plan 11 (OAuth Lifecycle) — account credentials.
- Plan 94 (Provider Load Balancing) — provider balancing.
- Plan 95 (Cooldown Backoff) — account cooldowns.