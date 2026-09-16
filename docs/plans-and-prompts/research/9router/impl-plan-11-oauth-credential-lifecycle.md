---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, oauth, credentials, token-refresh, lifecycle
---

# Implementation Plan 11 — OAuth & Credential Lifecycle

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md` — `12-oauth-deep-dive.md`).
> This plan covers the "OAuth/credential lifecycle" option: robust OAuth flows, token refresh, and credential lifecycle management.

## 1. Goal

Harden 9Router's OAuth and credential lifecycle: robust OAuth flows for all providers, reliable token refresh, credential rotation, and lifecycle management (create → use → refresh → revoke).

## 2. Background (from research)

- **9Router OAuth deep-dive** (doc 12): OAuth flows for providers (xAI, Anthropic, etc.); token refresh; credential storage.
- **9Router current state**: OAuth/API-key credential management; token refresh in chatCore; oauth-cursor-auto-import (known-fail in tests).
- **Research findings**: OAuth token refresh must handle expiry races; credential rotation must be atomic; provider-specific OAuth quirks (xAI endpoint discovery).

## 3. Design

### 3.1 OAuth Flow Framework

- **Provider OAuth config**: per-provider OAuth config (auth URL, token URL, scopes, PKCE).
- **Flow states**: pending → authorized → refreshing → expired → revoked.
- **PKCE support**: for providers requiring it.
- **Device flow**: for providers supporting device authorization.

### 3.2 Token Refresh

- **Refresh scheduling**: proactive refresh before expiry (e.g., at 80% lifetime).
- **Expiry race handling**: concurrent requests during refresh — single-flight refresh.
- **Refresh failure**: fallback to re-auth; clear error.
- **Refresh logging**: refresh events with outcome.

### 3.3 Credential Lifecycle

- **Lifecycle states**: created → active → rotating → revoked.
- **Rotation**: atomic rotation (new credential staged, verified, then swapped).
- **Revocation**: revoke on provider; remove from store.
- **Audit**: credential lifecycle events.

### 3.4 Storage

- **Encryption at rest**: credentials encrypted with API_KEY_SECRET.
- **Scoped access**: credential access scoped to request path.
- **No plaintext logs**: credentials never logged.

## 4. Implementation Steps

1. Audit current OAuth implementation (doc 12 findings).
2. Build OAuth flow framework (config-driven).
3. Add single-flight refresh.
4. Add credential lifecycle states + rotation.
5. Add lifecycle audit.
6. Fix oauth-cursor-auto-import known-fail.
7. Tests: OAuth flows, refresh races, rotation.

## 5. Files Touched

- `open-sse/services/oauthService.js` (or equivalent)
- `open-sse/config/oauthConfig.js` (new)
- `src/lib/db/repos/credentialRepo.js` (lifecycle)
- `src/lib/db/repos/auditRepo.js` (events)
- `tests/unit/oauth-lifecycle.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Refresh race | Single-flight refresh |
| Rotation breaks active requests | Stage + verify before swap |
| Provider OAuth quirks | Per-provider config; tests |
| Token leakage | Encryption; redaction |

## 7. Success Criteria

- All OAuth providers flow through config-driven framework.
- Refresh is race-safe.
- Credential lifecycle fully tracked.
- oauth-cursor-auto-import test passes.

## 8. Related Plans
- Plan 10 (Security & MITM) — credential protection.
- Plan 9 (Error System) — auth error handling.
- Plan 8 (Observability) — refresh telemetry.