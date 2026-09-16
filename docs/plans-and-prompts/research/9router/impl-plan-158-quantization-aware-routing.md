---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, quantization-routing, quantized-models, quantization-aware, model-variants
---

# Implementation Plan 158 — Quantization-Aware Routing

> Mined from branch docs: `48-branch-emerging-and-frontier.md` (Level 3: ABB — Quantization for Routing) and `46-branch-evaluation-and-cost-quality.md` (quantization quality).

## 1. Goal

Implement quantization-aware routing for 9Router: track quantized model variants (fp16, int8, int4), route to quantized variants when quality allows, and monitor quantization quality impact — cutting inference cost for local models.

## 2. Background (from research)

- **9Router current state**: No quantization awareness.
- **Research findings** (48-branch):
  - Quantization for routing (ABB): quantized variants.
  - Quantization quality: quality impact.
  - KV quantization (ABA-B): cache quantization.

## 3. Design

### 3.1 Quantization Registry

- **Variant catalog**: per-model quantized variants.
- **Variant properties**: precision, quality, speed.
- **Variant availability**: local availability.

### 3.2 Quantization-Aware Routing

- **Quality thresholds**: min quality per task.
- **Variant selection**: best variant per task.
- **Variant fallback**: higher precision fallback.

### 3.3 Quality Monitoring

- **Quality tracking**: variant quality.
- **Quality drift**: variant drift.
- **Quality alerts**: degradation alerts.

### 3.4 Integration

- **Inference integration**: variant selection.
- **Observability**: variant metrics.
- **Dashboard**: quantization view.

## 4. Implementation Steps

1. Build quantization registry.
2. Add variant selection.
3. Add quality monitoring.
4. Integrate inference.
5. Dashboard: quantization view.
6. Tests: registry, selection, quality.

## 5. Files Touched

- `src/lib/quantization/` (new: registry, select, quality)
- `open-sse/executors/local.js` (integration)
- Dashboard quantization page (new)
- `tests/unit/quantization.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Quality loss | Thresholds |
| Variant drift | Monitoring |
| Availability | Fallback |
| Complexity | Simple defaults |

## 7. Success Criteria

- Variants catalogued.
- Selection works.
- Quality monitored.
- Cost reduced.

## 8. Related Plans

- Plan 113 (Quantization Aware) — foundations.
- Plan 92 (Local Inference) — inference.
- Plan 141 (Expert Merging) — variants.
- Plan 97 (Quality Tiers) — quality.