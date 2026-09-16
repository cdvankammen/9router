---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, deployment-stages, dev-staging-prod, environments, pipelines
---

# Implementation Plan 78 — Multi-Environment Deployment

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "multi-environment" option: dev/staging/production deployment workflows.

## 1. Goal

Add multi-environment deployment to 9Router: dev/staging/production environments, promotion workflows, and environment isolation — so changes are validated before production.

## 2. Background (from research)

- **9Router current state**: single environment.
- **Research findings**: environments (dev, staging, prod); promotion (promote through stages); isolation (separate data, configs).

## 3. Design

### 3.1 Environment Model

- **Environments**: dev (local), staging (shared), production.
- **Environment config**: per-environment overrides.
- **Environment data**: separate data stores.

### 3.2 Promotion

- **Promotion workflow**: dev → staging → prod.
- **Promotion gates**: tests, approval.
- **Promotion rollback**: per-stage rollback.

### 3.3 Isolation

- **Config isolation**: per-environment config.
- **Data isolation**: separate DBs.
- **Network isolation**: separate ports.

### 3.4 Integration

- **CLI**: environment switching.
- **Dashboard**: environment indicator.
- **CI**: environment-specific CI.

## 4. Implementation Steps

1. Define environment model.
2. Build config isolation.
3. Add promotion workflows.
4. Add isolation.
5. Tests: promotion, isolation.

## 5. Files Touched

- `src/lib/environments/` (new)
- `.env.dev`, `.env.staging`, `.env.prod` (new)
- `cli/src/` (environment switching)
- `docs/DEPLOYMENT.md` (new)
- `tests/unit/environments.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Env confusion | Clear naming |
| Promotion breakage | Gates |
| Data leaks | Isolation |
| Complexity | Progressive |

## 7. Success Criteria

- Environments isolated.
- Promotion works.
- Rollback works.
- Docs complete.

## 8. Related Plans
- Plan 41 (Docker) — deployment synergy.
- Plan 39 (Migration/Backup) — migration.
- Plan 32 (CI) — CI pipelines.