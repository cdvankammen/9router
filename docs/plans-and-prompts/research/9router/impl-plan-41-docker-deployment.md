---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, docker, deployment, container, orchestration
---

# Implementation Plan 41 — Docker & Deployment Hardening

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "deployment" option: hardened Docker and deployment workflows.

## 1. Goal

Harden 9Router's deployment: production-grade Docker images, deployment workflows, and environment management — so deployments are reproducible and safe.

## 2. Background (from research)

- **9Router current state**: Dockerfile, docker-compose.yml, DOCKER.md, start.sh, custom-server.js (standalone server wrapper).
- **Research findings**: images must be minimal + reproducible; compose must cover common setups; env management must be documented; health checks needed for orchestration.

## 3. Design

### 3.1 Docker Image

- **Multi-stage build**: build → runtime stages.
- **Image size**: minimize (alpine/slim where possible).
- **Reproducibility**: pinned base images + lockfiles.
- **Security**: non-root user; read-only FS where possible.

### 3.2 Compose Setups

- **Compose profiles**: minimal, full (with cloud sync), dev.
- **Health checks**: container health checks.
- **Volumes**: data volume for ~/.9router.
- **Networking**: port mapping, reverse proxy notes.

### 3.3 Deployment Workflows

- **Upgrade workflow**: backup → pull → migrate → verify.
- **Rollback**: documented rollback.
- **Env management**: .env contract documented.

### 3.4 Observability in Deployment

- **Logs**: structured logs to stdout.
- **Metrics**: optional metrics endpoint.
- **Health endpoint**: /healthz.

## 4. Implementation Steps

1. Audit current Dockerfile.
2. Build multi-stage image.
3. Add compose profiles.
4. Add health checks.
5. Document deployment workflows.
6. Tests: image build, health checks.

## 5. Files Touched

- `Dockerfile` (multi-stage)
- `docker-compose.yml` (profiles)
- `DOCKER.md` (workflows)
- `custom-server.js` (health endpoint)
- `tests/unit/deployment.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Image bloat | Multi-stage; slim |
| Compose drift | Tested profiles |
| Upgrade breakage | Backup-first; rollback |
| Security | Non-root; read-only |

## 7. Success Criteria

- Image minimal + reproducible.
- Compose profiles work.
- Health checks operational.
- Upgrade/rollback documented.

## 8. Related Plans
- Plan 39 (Migration/Backup) — upgrade synergy.
- Plan 10 (Security) — image security.
- Plan 33 (Docs) — deployment docs.