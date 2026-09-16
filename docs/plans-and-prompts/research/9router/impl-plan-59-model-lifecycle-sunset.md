---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-rotation, sunset, deprecation, lifecycle
---

# Implementation Plan 59 — Model Lifecycle & Sunset Management

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `44-branch-gateways-and-serving.md`).
> This plan covers the "model lifecycle" option: model lifecycle and sunset management.

## 1. Goal

Add model lifecycle management to 9Router: model lifecycle states, sunset workflows, and migration support — so model deprecations are handled gracefully.

## 2. Background (from research)

- **9Router current state**: model names in config; no lifecycle tracking.
- **Research findings** (44-branch): models have lifecycles (preview → GA → deprecated → sunset); sunset needs warnings + migration; aliases ease migration.

## 3. Design

### 3.1 Lifecycle States

- **States**: preview, GA, deprecated, sunset.
- **State transitions**: documented transitions.
- **State metadata**: dates, replacement models.

### 3.2 Sunset Workflow

- **Warnings**: deprecation warnings (headers, logs).
- **Migration**: automatic migration to replacement.
- **Hard sunset**: block after sunset date.
- **Sunset schedule**: configurable.

### 3.3 Migration Support

- **Replacement mapping**: deprecated → replacement.
- **Migration modes**: warn, auto-migrate, block.
- **Migration logging**: migration events.

### 3.4 Integration

- **Registry integration**: lifecycle in provider registry.
- **Alias integration**: aliases ease migration.
- **Observability**: lifecycle telemetry.

## 4. Implementation Steps

1. Define lifecycle states.
2. Build sunset workflow.
3. Add migration support.
4. Integrate registry + aliases.
5. Tests: transitions, sunset, migration.

## 5. Files Touched

- `open-sse/providers/registry/` (lifecycle metadata)
- `src/lib/lifecycle/` (new: states, sunset)
- `src/sse/handlers/chat.js` (enforcement)
- Dashboard models page (extend)
- `tests/unit/model-lifecycle.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Premature sunset | Configurable dates |
| Migration breakage | Auto-migrate testing |
| Registry staleness | Update workflow |
| User confusion | Clear warnings |

## 7. Success Criteria

- Lifecycle states tracked.
- Sunset workflow works.
- Migration automatic.
- Telemetry visible.

## 8. Related Plans
- Plan 51 (Aliases) — migration ease.
- Plan 34 (Provider Registry) — registry metadata.
- Plan 8 (Observability) — lifecycle telemetry.