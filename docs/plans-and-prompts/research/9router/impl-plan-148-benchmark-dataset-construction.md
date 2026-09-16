---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, benchmark-dataset, dataset-construction, benchmark-design, evaluation-data
---

# Implementation Plan 148 — Benchmark Dataset Construction & Maintenance

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (Level 3: AAA — Dataset Construction, AAA-A — Task Taxonomy, AAA-B — Dataset Balance).

## 1. Goal

Implement benchmark dataset construction and maintenance for 9Router: build and maintain evaluation datasets that test routing quality, cost, and latency across diverse query types — enabling rigorous routing evaluation.

## 2. Background (from research)

- **9Router current state**: Evaluation datasets ad hoc.
- **Research findings** (46-branch):
  - Dataset construction (AAA): dataset design.
  - Task taxonomy (AAA-A): query categorization.
  - Dataset balance (AAA-B): balanced datasets.
  - Benchmark hygiene (AAB-B): clean benchmarks.

## 3. Design

### 3.1 Dataset Model

- **Dataset schema**: query, expected_quality, expected_cost, domain.
- **Task taxonomy**: code/math/vision/general/conversation.
- **Dataset balance**: balanced distribution.

### 3.2 Dataset Construction

- **Source selection**: Arena data, synthetic, real logs.
- **Filtering**: quality filtering.
- **Labeling**: quality labels.
- **Versioning**: dataset versions.

### 3.3 Dataset Maintenance

- **Update cadence**: periodic refresh.
- **Quality checks**: label quality.
- **Drift detection**: dataset drift.
- **Dataset deprecation**: sunset old versions.

## 4. Implementation Steps

1. Build dataset schema.
2. Construct initial dataset.
3. Add versioning.
4. Add maintenance.
5. Tests: schema, balance, quality.

## 5. Files Touched

- `tests/benchmarks/datasets/` (new: schemas, data)
- `scripts/build-dataset.mjs` (new)
- `tests/unit/datasets.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Dataset bias | Balance checks |
| Stale labels | Versioning |
| Scale | Synthetic data |
| Quality | Filtering |

## 7. Success Criteria

- Datasets constructed.
- Balanced.
- Versioned.
- Maintained.

## 8. Related Plans

- Plan 7 (Eval Harness) — evaluation.
- Plan 91 (Benchmark Hygiene) — hygiene.
- Plan 112 (Experiment Design) — experiments.
- Plan 131 (Classifier) — training data.