---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, security, mitm, tls, certificate, hardening
---

# Implementation Plan 10 — Security & MITM Hardening

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md` — `14-mitm-deep-dive.md`).
> This plan covers the "security/MITM" option: harden the MITM proxy layer and the overall security posture.

## 1. Goal

Harden 9Router's MITM proxy layer and overall security: TLS/certificate handling, request interception safety, credential protection, and auditability of the proxy path.

## 2. Background (from research)

- **9Router MITM deep-dive** (doc 14): MITM proxy for intercepting upstream traffic; certificate generation; request rewriting; credential injection.
- **9Router security posture**: JWT_SECRET, API_KEY_SECRET, MACHINE_ID_SALT; custom-server.js strips attacker-controlled X-Forwarded-For; rate limiter.
- **Research findings**: MITM proxies must not leak credentials into logs; certificate handling must be auditable; interception must be opt-in and reversible.

## 3. Design

### 3.1 TLS & Certificate Hardening

- **Certificate store**: dedicated cert directory with proper permissions (0700).
- **Cert rotation**: automatic rotation with grace period; revocation support.
- **Cert validation**: pin upstream certs; reject self-signed unless explicitly trusted.
- **Audit log**: cert issuance/rotation events.

### 3.2 Interception Safety

- **Opt-in**: MITM interception only for explicitly configured providers.
- **Scope limiting**: intercept only configured hostnames; never intercept dashboard traffic.
- **Credential protection**: never log Authorization headers; redact in traces.
- **Reversibility**: clean uninstall path; restore original traffic flow.

### 3.3 Credential Protection

- **In-memory only**: credentials decrypted only at request time.
- **Redaction**: redact secrets in all logs, traces, error messages.
- **Rotation**: credential rotation workflow.

### 3.4 Auditability

- **Proxy audit log**: what was intercepted, when, for which provider.
- **Security events**: cert changes, interception changes, credential access.

## 4. Implementation Steps

1. Audit current MITM implementation (doc 14 findings).
2. Harden cert store (permissions, rotation, validation).
3. Add interception scope limiting.
4. Add credential redaction in proxy path.
5. Add audit logging.
6. Tests: cert rotation, redaction, scope limiting.

## 5. Files Touched

- `src/mitm/` (cert handling, interception)
- `src/lib/security/` (redaction, audit)
- `custom-server.js` (proxy path)
- `src/lib/db/repos/auditRepo.js` (new)
- `tests/unit/mitm-security.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Cert rotation breaks connections | Grace period; overlap |
| Redaction misses paths | Centralized redaction utility; tests |
| Interception scope creep | Explicit allowlist; tests |
| Audit log growth | Retention policy |

## 7. Success Criteria

- Cert store hardened with rotation.
- Interception scoped to configured providers only.
- No credentials in logs/traces.
- Audit log operational.

## 8. Related Plans
- Plan 11 (OAuth & Credential Lifecycle) — credential handling.
- Plan 9 (Error System) — error redaction.
- Plan 19 (Unified Error System) — error message safety.