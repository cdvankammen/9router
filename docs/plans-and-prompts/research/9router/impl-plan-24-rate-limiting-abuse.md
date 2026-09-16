---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, rate-limiting, throttling, quota, abuse
---

# Implementation Plan 24 — Rate Limiting & Abuse Protection

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "rate limiting" option: robust rate limiting and abuse protection for the gateway.

## 1. Goal

Harden 9Router's rate limiting: per-key/per-user/per-IP limits, token-bucket throttling, abuse detection, and configurable policies — protecting upstream quota and the gateway itself.

## 2. Background (from research)

- **9Router current state**: `custom-server.rate-limiter.js` exists; IP derived from TCP socket (X-Forwarded-For stripped).
- **Research findings**: rate limiting must be multi-dimensional (key, user, IP); token-bucket for bursts; abuse detection (rapid retries, credential stuffing); limits must be configurable per tier.

## 3. Design

### 3.1 Multi-Dimensional Limits

- **Dimensions**: API key, user, IP, route.
- **Limit types**: requests/min, tokens/min, concurrent streams.
- **Limit scopes**: per-dimension, per-route, global.

### 3.2 Token Bucket

- **Bucket model**: capacity + refill rate per scope.
- **Burst handling**: allow bursts up to capacity.
- **Queue vs reject**: configurable (queue with timeout or 429).

### 3.3 Abuse Detection

- **Patterns**: rapid retries, credential stuffing, anomalous volume.
- **Actions**: throttle, challenge, block (temporary).
- **False positive protection**: thresholds tuned; audit-only mode.

### 3.4 Policy Management

- **Policy CRUD**: dashboard + API.
- **Policy tiers**: per-key tiers (free/pro/enterprise).
- **Policy testing**: test policies against traffic replay.

## 4. Implementation Steps

1. Audit current rate limiter.
2. Build multi-dimensional limits.
3. Add token-bucket throttling.
4. Add abuse detection.
5. Build policy management.
6. Tests: limits, buckets, abuse.

## 5. Files Touched

- `custom-server.rate-limiter.js` (extend)
- `src/lib/ratelimit/` (new: buckets, abuse)
- `src/app/api/v1/rate-policies/route.js` (new)
- Dashboard rate page (new)
- `tests/unit/ratelimit.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| False positives | Tuned thresholds; audit mode |
| Distributed abuse | IP + key + user correlation |
| Performance | In-memory buckets; sharding |
| Policy complexity | Tiered defaults |

## 7. Success Criteria

- Multi-dimensional limits enforced.
- Token buckets handle bursts.
- Abuse detection operational.
- Policies manageable.

## 8. Related Plans
- Plan 10 (Security) — abuse protection synergy.
- Plan 18 (Model Serving Policy) — quota synergy.
- Plan 13 (Runtime Enforcement) — policy engine.