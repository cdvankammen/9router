---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, error-categorization, error-inbox, error-priority, error-triage
---

# Implementation Plan 122 — Error Categorization & Error Inbox

> Mined from branch docs: `47-branch-9router-internal-threads.md` (error categorization) and `25-error-inbox-p2-design.md`, `26-programmatic-error-registry.md`.

## 1. Goal

Add error categorization and an error inbox to 9Router: categorize all errors into a unified taxonomy, route them to an error inbox with priorities, and provide triage workflows — so errors are visible, prioritized, and actionable.

## 2. Background (from research)

- **9Router current state**: errors logged; no inbox/triage.
- **Research findings** (47-branch):
  - Error categorization: unified error taxonomy.
  - (25) Error inbox P2 design: inbox design.
  - (26) Programmatic error registry: registry design.

## 3. Design

### 3.1 Error Categorization

- **Categories**: provider, network, auth, quota, rate-limit, timeout, malformed, internal.
- **Category assignment**: classifier + registry.
- **Category confidence**: per-error confidence.

### 3.2 Error Inbox

- **Inbox model**: error events with status (new, triaged, fixed, ignored).
- **Inbox priorities**: severity × frequency × impact.
- **Inbox workflows**: triage, assign, resolve.
- **Inbox dedup**: group similar errors.

### 3.3 Error Registry

- **Registry**: programmatic error definitions.
- **Registry lookup**: error → definition.
- **Registry extension**: custom error definitions.

### 3.4 Integration

- **Logging integration**: errors flow to inbox.
- **Observability**: error metrics.
- **Dashboard**: error inbox UI.

## 4. Implementation Steps

1. Build error categorization (`src/lib/errorinbox/`).
2. Build error inbox.
3. Build error registry.
4. Add triage workflows.
5. Integrate logging.
6. Dashboard: error inbox.
7. Tests: categorization, inbox, triage.

## 5. Files Touched

- `src/lib/errorinbox/` (new: categorize, inbox, registry, triage)
- `src/lib/db/repos/errorInboxRepo.js` (new)
- `src/lib/logging/` (integration)
- Dashboard error-inbox page (new)
- `tests/unit/errorinbox.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Inbox noise | Dedup + priorities |
| Misclassification | Confidence + review |
| Triage staleness | SLA reminders |
| Registry drift | Review cadence |

## 7. Success Criteria

- Errors categorized.
- Inbox with priorities.
- Triage workflows work.
- Error inbox visible.

## 8. Related Plans

- Plan 25 (Error Inbox) — inbox design.
- Plan 26 (Error Registry) — registry design.
- Plan 19 (Unified Error System) — error foundations.
- Plan 89 (Error Classification) — taxonomy.