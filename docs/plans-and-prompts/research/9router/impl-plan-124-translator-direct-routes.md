---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, translator-direct-routes, translator-optimization, format-translation, direct-translation
---

# Implementation Plan 124 — Translator Direct Route Optimization

> Mined from branch docs: `47-branch-9router-internal-threads.md` (translator details) and `08-translator-deep-dive.md`.

## 1. Goal

Optimize translator direct routes in 9Router: expand direct source:target routes (skipping the OpenAI pivot), add route health tracking, and auto-suggest direct routes for fragile pairs — so translation is lossless and fast.

## 2. Background (from research)

- **9Router current state**: direct routes exist for some pairs; pivot for others.
- **Research findings** (47-branch):
  - Translator details: translator architecture.
  - (08) Translator deep dive: translator design.
  - CLAUDE.md: direct routes preferred for fragile pairs.

## 3. Design

### 3.1 Direct Route Registry

- **Route model**: source, target, translator, coverage.
- **Route coverage**: which features each route handles.
- **Route gaps**: pairs without direct routes.

### 3.2 Route Health

- **Route metrics**: success, lossiness, latency per route.
- **Route degradation**: quality regression detection.
- **Route comparison**: direct vs. pivot comparison.

### 3.3 Route Suggestions

- **Suggestion logic**: fragile pairs → suggest direct route.
- **Fragility signals**: thinking blocks, tool ids, non-base64 images, is_error.
- **Suggestion review**: manual approval.

### 3.4 Integration

- **Translator integration**: route selection.
- **Observability**: route telemetry.
- **Dashboard**: route view.

## 4. Implementation Steps

1. Build route registry (`open-sse/translator/routes.js`).
2. Add route health tracking.
3. Build suggestion engine.
4. Integrate route selection.
5. Dashboard: route view.
6. Tests: route coverage, health, suggestions.

## 5. Files Touched

- `open-sse/translator/routes.js` (new)
- `open-sse/translator/index.js` (integration)
- `open-sse/translator/*` (route metadata)
- Dashboard translator page (new)
- `tests/unit/translator-routes.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Route gaps | Coverage tracking |
| Health noise | EWMA |
| Bad suggestions | Review workflow |
| Regression | Route comparison |

## 7. Success Criteria

- Routes registered with coverage.
- Health tracked.
- Suggestions generated.
- Route view visible.

## 8. Related Plans

- Plan 8 (Translator Deep Dive) — translator architecture.
- Plan 52 (Request Normalization) — format handling.
- Plan 79 (Per-Model Adaptation) — per-model translation.
- Plan 121 (Divergence) — post-translation validation.