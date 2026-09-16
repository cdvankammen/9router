---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, multi-user, auth, rbac, teams
---

# Implementation Plan 38 — Multi-User & RBAC

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "multi-user/RBAC" option: multi-user support with role-based access control.

## 1. Goal

Add multi-user support to 9Router: user management, role-based access control (RBAC), per-user quotas, and audit — enabling team deployments.

## 2. Background (from research)

- **9Router current state**: single-user (INITIAL_PASSWORD, JWT_SECRET session); no user management.
- **Research findings**: multi-user needs roles (admin, operator, viewer); per-user quotas; per-user API keys; audit of user actions.

## 3. Design

### 3.1 User Management

- **User CRUD**: create/update/disable users.
- **Auth**: password + optional SSO.
- **Sessions**: per-user sessions.

### 3.2 RBAC

- **Roles**: admin (full), operator (routing config), viewer (read-only).
- **Permissions**: per-role permission matrix.
- **Enforcement**: middleware permission checks.

### 3.3 Per-User Quotas

- **Quota scopes**: per-user request/token/cost limits.
- **Quota enforcement**: pre-routing checks.
- **Quota visibility**: user sees own usage.

### 3.4 Audit

- **User actions**: login, config changes, quota changes.
- **Audit log**: who did what when.
- **Audit export**: exportable.

## 4. Implementation Steps

1. Build user management.
2. Add RBAC.
3. Add per-user quotas.
4. Add audit.
5. Build user management UI.
6. Tests: RBAC, quotas, audit.

## 5. Files Touched

- `src/lib/users/` (new: users, roles)
- `src/lib/db/repos/userRepo.js` (new)
- `src/app/api/v1/users/route.js` (new)
- Dashboard users page (new)
- `src/dashboardGuard.js` (RBAC)
- `tests/unit/rbac.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Security holes | Permission tests |
| Role confusion | Clear role definitions |
| Quota complexity | Simple defaults |
| Audit volume | Retention |

## 7. Success Criteria

- Users manageable.
- RBAC enforced.
- Per-user quotas work.
- Audit log complete.

## 8. Related Plans
- Plan 10 (Security) — auth security.
- Plan 24 (Rate Limiting) — per-user limits.
- Plan 18 (Serving Policy) — quota synergy.