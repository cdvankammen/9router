---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, multi-account, quota, fallback, account-selection
---

# Implementation Plan 21 — Multi-Account Fallback & Quota Management

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "multi-account" option: robust multi-account fallback with quota-aware account selection.

## 1. Goal

Harden 9Router's multi-account fallback: quota-aware account selection, per-account health tracking, and automatic account rotation — so quota exhaustion on one account never breaks a request.

## 2. Background (from research)

- **9Router current state**: multi-account fallback exists (account-selection loop in `src/sse/handlers/chat.js`); quota/usage tracking in usageDb.
- **Research findings**: account selection should be quota-aware (remaining quota, rate limits); accounts should be ranked by health (error rate, latency); rotation should be automatic with cooldowns.

## 3. Design

### 3.1 Account Health Model

- **Health metrics**: error rate, latency, quota remaining, rate-limit status, cooldown state.
- **Health scoring**: weighted score per account (quota > error rate > latency).
- **Health decay**: scores decay over time (stale data less relevant).

### 3.2 Quota-Aware Selection

- **Quota tracking**: per-account quota (requests, tokens, cost) with reset windows.
- **Selection ranking**: rank accounts by health score; prefer accounts with quota headroom.
- **Quota exhaustion**: mark account exhausted; exclude from selection until reset.

### 3.3 Automatic Rotation

- **Rotation triggers**: quota exhaustion, error threshold, cooldown expiry.
- **Rotation policy**: rotate to next-healthy account; cooldown on failures.
- **Rotation logging**: rotation events with reasons.

### 3.4 Fallback Chain

- **Chain construction**: build fallback chain from ranked accounts.
- **Chain execution**: try accounts in order; skip unhealthy.
- **Chain exhaustion**: all accounts failed → clear error with per-account details.

## 4. Implementation Steps

1. Build account health model.
2. Add quota tracking per account.
3. Implement quota-aware selection.
4. Add automatic rotation.
5. Harden fallback chain.
6. Tests: selection, rotation, exhaustion.

## 5. Files Touched

- `src/sse/handlers/chat.js` (account selection)
- `src/lib/db/repos/accountRepo.js` (health, quota)
- `open-sse/config/accountPolicy.js` (new)
- `tests/unit/multi-account.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Stale health data | Score decay; refresh |
| Quota tracking drift | Periodic reconciliation |
| Rotation thrash | Cooldowns; hysteresis |
| Selection latency | Cached scores |

## 7. Success Criteria

- Quota-aware selection operational.
- Automatic rotation on exhaustion.
- Fallback chain never breaks on single-account failure.
- Rotation events logged.

## 8. Related Plans
- Plan 2 (Cascade Enhancements) — fallback synergy.
- Plan 18 (Model Serving Policy) — quota policies.
- Plan 8 (Observability) — rotation telemetry.