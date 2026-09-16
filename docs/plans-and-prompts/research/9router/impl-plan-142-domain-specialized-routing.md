---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, code-routing, math-routing, vision-routing, domain-specialization
---

# Implementation Plan 142 — Domain-Specialized Routing (Code/Math/Vision)

> Mined from branch docs: `43-branch-moe-and-expert-routing.md` (Level 4: BAA-A — Code Routing, BAA-B — Math Routing, BAB-A — Vision Routing).

## 1. Goal

Implement domain-specialized routing for 9Router: detect query domain (code, math, vision, general) and route to domain-specialized models — improving quality by matching queries to models trained for that domain.

## 2. Background (from research)

- **9Router current state**: Task classification exists (plan 56); domain routing shallow.
- **Research findings** (43-branch):
  - Code routing (BAA-A): route code queries to code models.
  - Math routing (BAA-B): route math to math models.
  - Vision routing (BAB-A): route vision to vision models.
  - Task-expert mapping (BAA): domain → expert mapping.

## 3. Design

### 3.1 Domain Detection

- **Domain classifier**: code/math/vision/general.
- **Domain signals**: keywords, structure, modality.
- **Domain confidence**: calibrated confidence.

### 3.2 Domain Model Registry

- **Code models**: code-specialized models.
- **Math models**: math-specialized models.
- **Vision models**: vision-capable models.
- **General models**: fallback models.

### 3.3 Domain Routing

- **Domain → model mapping**: per-domain model lists.
- **Domain fallback**: general model fallback.
- **Domain mixing**: mixed-domain queries.

### 3.4 Integration

- **Pre-routing**: domain detection before selection.
- **Observability**: domain distribution.
- **Dashboard**: domain view.

## 4. Implementation Steps

1. Build domain classifier.
2. Add domain model registry.
3. Add domain routing.
4. Add domain fallback.
5. Dashboard: domain view.
6. Tests: detection, routing, fallback.

## 5. Files Touched

- `src/lib/domains/` (new: detect, registry, route)
- `open-sse/handlers/chatCore.js` (pre-routing)
- Dashboard domains page (new)
- `tests/unit/domains.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Misclassification | Confidence thresholds |
| Domain gaps | General fallback |
| Mixed queries | Mix handling |
| Model availability | Registry checks |

## 7. Success Criteria

- Domains detected.
- Specialized routing works.
- Fallback functional.
- Quality improved.

## 8. Related Plans

- Plan 56 (Task Classification) — classification.
- Plan 105 (Domain Specialized) — domain routing.
- Plan 81 (Intent Classification) — intent.
- Plan 104 (Capability Matching) — capabilities.