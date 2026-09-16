---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, code-routing, code-task-routing, math-routing, domain-specialization
---

# Implementation Plan 105 — Domain-Specialized Routing (Code, Math, Creative)

> Mined from branch docs: `47-branch-9router-internal-threads.md` (code routing, code task routing, math routing) and `41-branch-learned-routing.md` (domain specialization).

## 1. Goal

Add domain-specialized routing to 9Router: detect request domain (code, math, creative, analysis, general), route to domain-specialized models, and track domain-specific quality — so each domain gets its best model.

## 2. Background (from research)

- **9Router current state**: no domain awareness in routing.
- **Research findings** (47-branch):
  - Code routing: code tasks → code-specialized models.
  - Code task routing: sub-types of code tasks (generation, review, debug).
  - Math routing: math tasks → math-strong models.
  - (41-branch) Domain specialization: per-domain model preferences.

## 3. Design

### 3.1 Domain Detection

- **Domain classifier**: heuristic + optional LLM classification.
- **Domains**: code, math, creative, analysis, general, multilingual.
- **Confidence**: per-domain confidence score.
- **Cache**: per-session domain cache.

### 3.2 Domain Model Mapping

- **Mapping config**: domain → preferred models.
- **Code sub-types**: generation, review, debug, refactor → model preferences.
- **Math**: math-strong models.
- **Creative**: creative-strong models.

### 3.3 Domain Quality Tracking

- **Quality per domain**: per (domain, model) quality scores.
- **Domain leaderboards**: best model per domain.
- **Domain drift**: quality changes over time.

### 3.4 Integration

- **Routing integration**: domain-aware selection.
- **Combo integration**: domain-aware combos.
- **Observability**: domain distribution, domain quality.
- **Dashboard**: domain routing view.

## 4. Implementation Steps

1. Build domain classifier (`src/lib/domains/`).
2. Build domain model mapping.
3. Add domain quality tracking.
4. Integrate routing.
5. Dashboard: domain view.
6. Tests: classification, mapping, quality.

## 5. Files Touched

- `src/lib/domains/` (new: classify, map, quality)
- `src/sse/handlers/chat.js` (domain integration)
- `open-sse/config/domainConfig.js` (new)
- Dashboard domains page (new)
- `tests/unit/domains.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Misclassification | Confidence gates |
| Domain model gaps | Fallback to general |
| Quality noise | EWMA smoothing |
| Over-specialization | General fallback |

## 7. Success Criteria

- Domains detected with confidence.
- Domain models selected.
- Domain quality tracked.
- Domain view visible.

## 8. Related Plans

- Plan 81 (Intent Classification) — classification synergy.
- Plan 80 (Tool Routing) — code tool routing.
- Plan 96 (Expert Utilization) — domain experts.
- Plan 67 (Quality Evaluation) — domain quality.