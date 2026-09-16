---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, route-design, utterance-engineering, route-granularity, semantic-routes
---

# Implementation Plan 147 — Semantic Route Design & Utterance Engineering

> Mined from branch docs: `45-branch-semantic-and-embedding-routing.md` (Level 3: ABA — Route Design, ABA-A — Route Granularity, ABA-B — Utterance Engineering).

## 1. Goal

Implement semantic route design tooling for 9Router: formalize route definition (utterances, thresholds, granularity), add route testing, and add route maintenance — making semantic routes robust and maintainable.

## 2. Background (from research)

- **9Router current state**: Semantic routes exist; design ad hoc.
- **Research findings** (45-branch):
  - Route design (ABA): route definition.
  - Route granularity (ABA-A): coarse vs fine routes.
  - Utterance engineering (ABA-B): utterance quality.
  - Rule composition (BAA): rule-based routes.

## 3. Design

### 3.1 Route Definition

- **Route model**: name, utterances, threshold, target.
- **Route granularity**: coarse/fine balance.
- **Route conflicts**: overlapping routes.

### 3.2 Utterance Engineering

- **Utterance quality**: coverage, diversity.
- **Utterance generation**: LLM-assisted generation.
- **Utterance validation**: test utterances.

### 3.3 Route Testing

- **Route tests**: utterance → route mapping.
- **Route evaluation**: precision/recall.
- **Route regression**: prevent regressions.

### 3.4 Integration

- **Semantic router integration**: route definitions.
- **Observability**: route metrics.
- **Dashboard**: route management.

## 4. Implementation Steps

1. Build route model.
2. Add utterance tooling.
3. Add route testing.
4. Integrate semantic router.
5. Dashboard: route management.
6. Tests: routes, utterances.

## 5. Files Touched

- `src/lib/routes/` (new: model, utterances, tests)
- `open-sse/services/semantic-router.js` (integration)
- Dashboard routes page (new)
- `tests/unit/routes.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Route conflicts | Conflict detection |
| Utterance gaps | Generation + validation |
| Granularity issues | Design guidelines |
| Regression | Route tests |

## 7. Success Criteria

- Routes well-defined.
- Utterances validated.
- Tests pass.
- Routes maintainable.

## 8. Related Plans

- Plan 3 (Semantic Routing) — foundations.
- Plan 88 (Rule Engine v2) — rules.
- Plan 81 (Intent Classification) — intents.
- Plan 146 (Similarity Metrics) — metrics.