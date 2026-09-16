---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, ux, dashboard, ui, settings
---

# Implementation Plan 12 — UX & Dashboard Improvements

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md` — `16-ux-research.md`).
> This plan covers the "UX/dashboard" option: improve the dashboard UX based on research findings.

## 1. Goal

Improve 9Router's dashboard UX: clearer routing configuration, better provider management, usage visualization, and settings discoverability — based on UX research findings.

## 2. Background (from research)

- **9Router UX research** (doc 16): dashboard UX findings; settings discoverability; provider management UX.
- **9Router current state**: dashboard at `/dashboard`; provider management; combo/fallback rules UI; usage tracking.
- **Research findings**: routing configuration is complex; users need clearer feedback on routing decisions; usage visualization helps cost control.

## 3. Design

### 3.1 Routing Configuration UX

- **Combo builder**: visual combo/fallback rule builder (drag-and-drop).
- **Rule preview**: preview of routing behavior for sample requests.
- **Rule testing**: test a rule against a sample request.

### 3.2 Provider Management UX

- **Provider health**: per-provider health indicators (latency, error rate, quota).
- **Credential status**: credential lifecycle status visible.
- **Provider onboarding**: guided provider setup.

### 3.3 Usage Visualization

- **Usage dashboard**: cost/latency/usage charts.
- **Model comparison**: per-model cost/latency comparison.
- **Budget alerts**: budget thresholds with alerts.

### 3.4 Settings Discoverability

- **Settings search**: search across settings.
- **Settings organization**: grouped settings with descriptions.
- **Advanced settings**: progressive disclosure.

## 4. Implementation Steps

1. Audit current dashboard UX (doc 16 findings).
2. Build combo builder UX.
3. Add provider health indicators.
4. Build usage visualization.
5. Improve settings discoverability.
6. Tests: UI component tests.

## 5. Files Touched

- Dashboard pages (routing, providers, usage, settings)
- `src/app/dashboard/` components
- `src/lib/db/repos/usageRepo.js` (usage data)
- `tests/unit/dashboard-ux.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| UX complexity | Progressive disclosure |
| Performance | Lazy loading; caching |
| Design inconsistency | Design system; component library |
| Feature creep | Prioritized backlog |

## 7. Success Criteria

- Combo builder functional.
- Provider health visible.
- Usage visualization operational.
- Settings discoverable.

## 8. Related Plans
- Plan 8 (Observability) — decision telemetry in dashboard.
- Plan 4 (Cost-Quality Optimizer) — cost data.
- Plan 9 (Error System) — error inbox UX.