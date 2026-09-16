---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, oauth-details, token-refresh, credential-rotation, oauth-hardening
---

# Implementation Plan 125 — OAuth Token Lifecycle Hardening

> Mined from branch docs: `47-branch-9router-internal-threads.md` (OAuth details) and `12-oauth-deep-dive.md`.

## 1. Goal

Harden 9Router's OAuth token lifecycle: formalize token states (valid, expiring, expired, refreshing, revoked), add proactive refresh scheduling, and add credential rotation — so OAuth-backed providers never fail mid-request.

## 2. Background (from research)

- **9Router current state**: OAuth + token refresh exists (plan 11); lifecycle implicit.
- **Research findings** (47-branch):
  - OAuth details: OAuth architecture.
  - (12) OAuth deep dive: token flow design.

## 3. Design

### 3.1 Token State Machine

```
STATES = {
  valid:      usable,
  expiring:   refresh scheduled,
  refreshing: refresh in flight,
  expired:    refresh required,
  revoked:    re-auth required,
}
TRANSITIONS: valid→expiring→refreshing→valid | expired→revoked
```

### 3.2 Proactive Refresh

- **Refresh scheduling**: refresh at TTL × 0.8.
- **Refresh queue**: serialized refreshes per provider.
- **Refresh failure**: backoff + retry.
- **Refresh logging**: full refresh trace.

### 3.3 Credential Rotation

- **Rotation triggers**: expiry, revocation, security events.
- **Rotation flow**: new credential → verify → swap.
- **Rotation rollback**: revert on failure.

### 3.4 Integration

- **Executor integration**: token state in executors.
- **Observability**: token state telemetry.
- **Dashboard**: OAuth health view.

## 4. Implementation Steps

1. Build token state machine (`src/lib/oauth/state.js`).
2. Add proactive refresh.
3. Add credential rotation.
4. Integrate executors.
5. Dashboard: OAuth health view.
6. Tests: state transitions, refresh, rotation.

## 5. Files Touched

- `src/lib/oauth/` (state, refresh, rotate)
- `open-sse/executors/` (token integration)
- Dashboard oauth page (new)
- `tests/unit/oauth-lifecycle.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Refresh races | Serialized queue |
| Rotation failure | Rollback |
| Token leakage | Secure storage |
| Provider quirks | Per-provider config |

## 7. Success Criteria

- Token states tracked.
- Proactive refresh works.
- Rotation with rollback.
- OAuth health visible.

## 8. Related Plans

- Plan 11 (OAuth Credential Lifecycle) — lifecycle foundations.
- Plan 12 (OAuth Deep Dive) — architecture.
- Plan 10 (Security MITM) — credential security.
- Plan 89 (Error Classification) — auth errors.