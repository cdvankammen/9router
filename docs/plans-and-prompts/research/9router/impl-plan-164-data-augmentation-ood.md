---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, data-augmentation, ood-generalization, synthetic-data, training-data
---

# Implementation Plan 164 — Data Augmentation for OOD Generalization

> Mined from branch docs: `41-branch-learned-routing.md` (Level 4: AAAB — Data Augmentation for OOD).

## 1. Goal

Implement data augmentation for out-of-distribution (OOD) generalization in 9Router: augment routing training data with synthetic and transformed examples, detect OOD queries at inference, and improve router robustness — preventing routing failures on novel queries.

## 2. Background (from research)

- **9Router current state**: No augmentation; routers fail on novel queries.
- **Research findings** (41-branch):
  - Data augmentation for OOD (AAAB): augment for robustness.
  - OOD generalization: handle novel queries.
  - Preference data collection (AAAA): base data.

## 3. Design

### 3.1 Augmentation Techniques

- **Synthetic generation**: LLM-generated variants.
- **Transformation**: paraphrase, reorder, rephrase.
- **Adversarial**: hard negative examples.
- **Cross-domain**: domain mixing.

### 3.2 OOD Detection

- **OOD signals**: embedding distance, confidence.
- **OOD detection**: threshold-based detection.
- **OOD handling**: fallback routing on OOD.

### 3.3 Robustness Evaluation

- **OOD benchmarks**: novel query sets.
- **Robustness metrics**: OOD accuracy.
- **Regression testing**: OOD regressions.

### 3.4 Integration

- **Training pipeline**: augmented data.
- **Inference**: OOD detection.
- **Observability**: OOD metrics.
- **Dashboard**: OOD view.

## 4. Implementation Steps

1. Build augmentation pipeline.
2. Add OOD detection.
3. Add OOD handling.
4. Add robustness evaluation.
5. Dashboard: OOD view.
6. Tests: augmentation, OOD, robustness.

## 5. Files Touched

- `src/lib/augmentation/` (new: generate, transform, adversarial)
- `src/lib/ood/` (new: detect, handle)
- Dashboard ood page (new)
- `tests/unit/augmentation.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Augmentation noise | Quality filtering |
| OOD false positives | Threshold tuning |
| Overfitting | Validation |
| Cost | Budgeted generation |

## 7. Success Criteria

- Augmentation works.
- OOD detected.
- Robustness improved.
- Regressions caught.

## 8. Related Plans

- Plan 131 (Classifier) — training.
- Plan 148 (Dataset Construction) — data.
- Plan 163 (Preference Collection) — data source.
- Plan 136 (Causal Routers) — adaptation.