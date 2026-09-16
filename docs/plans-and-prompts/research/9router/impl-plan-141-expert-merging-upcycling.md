---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, expert-merging, sparse-upcycling, model-merging, expert-compression
---

# Implementation Plan 141 — Expert Merging & Sparse Upcycling

> Mined from branch docs: `43-branch-moe-and-expert-routing.md` (Level 4: ABA-A — Sparse Upcycling, ABA-B — Expert Merging).

## 1. Goal

Implement expert merging and sparse upcycling support for 9Router: understand and leverage expert merging techniques (merge experts to reduce model size) and sparse upcycling (convert dense models to MoE) — enabling routing to more efficient model variants.

## 2. Background (from research)

- **9Router current state**: No expert merging awareness.
- **Research findings** (43-branch):
  - Sparse upcycling (ABA-A): dense → MoE conversion.
  - Expert merging (ABA-B): merge experts for efficiency.
  - Expert specialization emergence (ABA): specialization patterns.

## 3. Design

### 3.1 Expert Merging

- **Merging techniques**: weight averaging, clustering.
- **Merge evaluation**: quality after merge.
- **Merge registry**: merged model variants.

### 3.2 Sparse Upcycling

- **Upcycling pipeline**: dense → MoE.
- **Upcycling evaluation**: quality/cost tradeoffs.
- **Upcycling registry**: upcycled variants.

### 3.3 Routing Integration

- **Variant routing**: route to merged/upcycled variants.
- **Quality monitoring**: variant quality tracking.
- **Fallback**: fallback to original model.

### 3.4 Integration

- **Provider config**: variant config.
- **Observability**: variant metrics.
- **Dashboard**: variants view.

## 4. Implementation Steps

1. Build merging techniques.
2. Add upcycling pipeline.
3. Add variant registry.
4. Add variant routing.
5. Dashboard: variants view.
6. Tests: merging, upcycling, routing.

## 5. Files Touched

- `src/lib/variants/` (new: merge, upcycle, registry)
- `open-sse/config/providerModels.js` (variant config)
- Dashboard variants page (new)
- `tests/unit/variants.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Quality loss | Evaluation |
| Complexity | Simple pipelines |
| Registry bloat | Cleanup policy |
| Provider support | Best-effort |

## 7. Success Criteria

- Merging works.
- Upcycling pipeline functional.
- Variants routed.
- Quality monitored.

## 8. Related Plans

- Plan 5 (MoE Dispatch) — MoE foundations.
- Plan 96 (Expert Utilization) — utilization.
- Plan 92 (Inference Efficiency) — efficiency.
- Plan 113 (Quantization) — model variants.