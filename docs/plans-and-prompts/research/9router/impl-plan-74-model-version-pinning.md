---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-versioning, pinned-models, rollback, stability
---

# Implementation Plan 74 — Model Version Pinning & Rollback

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `44-branch-gateways-and-serving.md`).
> This plan covers the "model versioning" option: model version pinning and rollback.

## 1. Goal

Add model version pinning to 9Router: pin model versions, detect version changes, and rollback — so model updates don't break behavior.

## 2. Background (from research)

- **9Router current state**: model names without version awareness.
- **Research findings** (44-branch): providers update models silently; pinned versions ensure stability; version detection (API metadata); rollback (revert to previous).

## 3. Design

### 3.1 Version Pinning

- **Pin model**: alias → pinned version.
- **Pin config**: per-route pinning.
- **Pin enforcement**: resolve pinned version.

### 3.2 Version Detection

- **Detection**: provider API metadata, response headers.
- **Change alerts**: version change detection.
- **Change log**: version history.

### 3.3 Rollback

- **Rollback trigger**: quality/cost regression.
- **Rollback action**: revert to previous version.
- **Rollback safety**: tested rollback.

### 3.4 Integration

- **Alias integration**: pins via aliases.
- **Observability**: version telemetry.
- **Docs**: versioning guide.

## 4. Implementation Steps

1. Build version pinning.
2. Add version detection.
3. Add rollback.
4. Integrate aliases.
5. Tests: pinning, detection, rollback.

## 5. Files Touched

- `src/lib/versions/` (new: pinning, detection)
- `src/lib/aliases/` (pin integration)
- `src/sse/handlers/chat.js` (resolution)
- Dashboard models page (extend)
- `tests/unit/version-pinning.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Pin staleness | Detection + alerts |
| Rollback complexity | Tested rollback |
| Provider limits | Pin availability |
| Confusion | Clear versioning |

## 7. Success Criteria

- Pins enforced.
- Changes detected.
- Rollback works.
- Telemetry visible.

## 8. Related Plans
- Plan 59 (Model Lifecycle) — lifecycle synergy.
- Plan 51 (Aliases) — pin via aliases.
- Plan 8 (Observability) — version telemetry.