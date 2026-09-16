---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, prompt-adaptation, prompt-rewriting, cascade-prompt, escalation-prompt
---

# Implementation Plan 150 — Prompt Adaptation for Cascades

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 3: AAA — Prompt Adaptation, BAAA — Cascade Trigger Conditions).

## 1. Goal

Implement prompt adaptation for cascades in 9Router: automatically adapt prompts when escalating to stronger models (e.g., add "be concise" for cheaper models, remove for expensive models) — maximizing cost savings by allowing cheaper models to handle more with tailored prompts.

## 2. Background (from research)

- **9Router current state**: No prompt adaptation; same prompt for all models.
- **Research findings** (42-branch):
  - Prompt adaptation (AAA): adjust prompts for model tiers.
  - Cascade trigger conditions (AAAA): when to adapt.
  - Escalation depth (AAAB): adaptation at each depth.

## 3. Design

### 3.1 Adaptation Rules

- **Model-tier mapping**: tier → adaptation.
- **Adaptation types**: length, detail, format.
- **Adaptation priority**: critical vs nice-to-have.

### 3.2 Adaptation Engine

- **Pre-adaptation**: adapt before routing.
- **Adaptation templates**: per-tier templates.
- **Adaptation quality**: measure impact.

### 3.3 Cascade Integration

- **Adaptation in cascade**: adapt per depth.
- **Adaptation cost**: adaptation overhead.
- **Adaptation logging**: track adaptations.

### 3.4 Integration

- **Routing integration**: adaptation hooks.
- **Observability**: adaptation metrics.
- **Dashboard**: adaptation view.

## 4. Implementation Steps

1. Build adaptation rules.
2. Add adaptation engine.
3. Add cascade integration.
4. Add quality measurement.
5. Dashboard: adaptation view.
6. Tests: adaptation, cascades.

## 5. Files Touched

- `src/lib/adaptation/` (new: rules, engine, cascade)
- `open-sse/handlers/chatCore.js` (adaptation hooks)
- Dashboard adaptation page (new)
- `tests/unit/adaptation.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Quality loss | Quality monitoring |
| Over-adaptation | Threshold tuning |
| Complexity | Simple rules |
| Latency | Pre-computation |

## 7. Success Criteria

- Adaptations work.
- Cost savings measurable.
- Quality maintained.
- Cascades improved.

## 8. Related Plans

- Plan 2 (Cascade Fallback) — cascade foundations.
- Plan 90 (Cascade Coordination) — coordination.
- Plan 44 (Prompt Templates) — templates.
- Plan 137 (Escalation Depth) — depth.