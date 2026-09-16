---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, feature-gaps, gap-analysis, coverage-tracking, roadmap-gaps
---

# Implementation Plan 118 — Feature Gap Tracking & Coverage Analysis

> Mined from branch docs: `47-branch-9router-internal-threads.md` (feature gaps) and `18-feature-gap-review.md`, `32-gap-analysis-comprehensive.md`.

## 1. Goal

Add feature gap tracking to 9Router: maintain a feature gap registry (missing features vs. competitors and vs. user needs), run coverage analysis, and prioritize gaps — so feature development is data-driven.

## 2. Background (from research)

- **9Router current state**: gap reviews exist as docs; no living registry.
- **Research findings** (47-branch):
  - Feature gaps: missing features identified in reviews.
  - (18) Feature gap review: competitor comparison.
  - (32) Gap analysis: comprehensive gap analysis.

## 3. Design

### 3.1 Gap Registry

- **Gap model**: id, area, description, severity, evidence, status.
- **Gap sources**: reviews, user feedback, competitor analysis.
- **Gap lifecycle**: identified → triaged → planned → done.

### 3.2 Coverage Analysis

- **Coverage model**: feature areas × implementation status.
- **Coverage metrics**: % covered per area.
- **Coverage reports**: per-area coverage dashboards.

### 3.3 Prioritization

- **Priority scoring**: severity × demand × effort.
- **Priority queue**: ranked gap backlog.
- **Roadmap integration**: plan 50 roadmap.

### 3.4 Integration

- **Docs integration**: gap registry ↔ research docs.
- **Observability**: gap metrics.
- **Dashboard**: gap tracker.

## 4. Implementation Steps

1. Build gap registry (`src/lib/gaps/`).
2. Add coverage analysis.
3. Add prioritization.
4. Integrate roadmap.
5. Dashboard: gap tracker.
6. Tests: registry, coverage, priority.

## 5. Files Touched

- `src/lib/gaps/` (new: registry, coverage, priority)
- `src/lib/db/repos/gapRepo.js` (new)
- Dashboard gaps page (new)
- `docs/plans-and-prompts/research/9router/` (gap docs)
- `tests/unit/gaps.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Registry staleness | Review cadence |
| Coverage bias | Multiple sources |
| Priority noise | Scoring model |
| Duplication | Dedup checks |

## 7. Success Criteria

- Gaps tracked with lifecycle.
- Coverage measured.
- Priorities computed.
- Gap tracker visible.

## 8. Related Plans

- Plan 50 (Roadmap) — roadmap integration.
- Plan 18 (Feature Gap Review) — gap sources.
- Plan 32 (Gap Analysis) — analysis methods.
- Plan 33 (Docs/Knowledge Base) — doc integration.