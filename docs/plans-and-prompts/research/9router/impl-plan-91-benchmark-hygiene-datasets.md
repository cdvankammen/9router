---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, benchmark-hygiene, dataset-balance, eval-sets, contamination
---

# Implementation Plan 91 — Benchmark Hygiene & Dataset Management

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (benchmark hygiene, dataset balance, greedy vs sampled verification, significance testing).

## 1. Goal

Add benchmark hygiene and dataset management to 9Router: versioned eval datasets, contamination checks, dataset balance controls, and verification discipline — so routing evaluations are trustworthy and reproducible.

## 2. Background (from research)

- **9Router current state**: no eval datasets; plan 7 (eval harness) is foundational.
- **Research findings** (46-branch):
  - Benchmark hygiene: avoid contamination/leakage.
  - Dataset balance: balanced classes in eval sets.
  - Greedy vs sampled verification: sampled verification more robust.
  - Significance testing: statistical validation.

## 3. Design

### 3.1 Dataset Registry

- **Dataset model**: id, version, task-type, samples, provenance.
- **Versioning**: immutable versions with changelog.
- **Provenance**: source, collection date, license.

### 3.2 Contamination Checks

- **Overlap detection**: n-gram overlap between eval samples and training/usage data.
- **Leakage prevention**: blocklist of leaked samples.
- **Continuous checks**: new usage data checked against eval sets.

### 3.3 Dataset Balance

- **Balance metrics**: class distribution, difficulty distribution, domain coverage.
- **Balance reports**: per-dataset balance dashboards.
- **Balance correction**: oversampling/undersampling tools.

### 3.4 Verification Discipline

- **Sampled verification**: verify on samples, not full sets.
- **Holdout discipline**: eval sets never used for tuning.
- **Reproducibility**: pinned model versions + seeds.

### 3.5 Integration

- **Eval harness integration**: plan 7 harness consumes registry.
- **Observability**: dataset health metrics.
- **Dashboard**: dataset management UI.

## 4. Implementation Steps

1. Build dataset registry (`src/lib/benchmarks/`).
2. Add contamination checks.
3. Add balance reporting.
4. Add verification discipline tooling.
5. Integrate eval harness.
6. Dashboard: dataset UI.
7. Tests: contamination detection, balance metrics.

## 5. Files Touched

- `src/lib/benchmarks/` (new: registry, contamination, balance, verify)
- `src/lib/eval/` (integration)
- `src/lib/db/repos/benchmarkRepo.js` (new)
- Dashboard benchmarks page (new)
- `tests/unit/benchmarks.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Contamination | Continuous checks |
| Imbalanced sets | Balance reports |
| Version drift | Immutable versions |
| Verification cost | Sampled verification |

## 7. Success Criteria

- Datasets versioned with provenance.
- Contamination checks run.
- Balance reports available.
- Verification discipline enforced.

## 8. Related Plans

- Plan 7 (Eval Harness) — evaluation infrastructure.
- Plan 82 (Calibration) — significance testing.
- Plan 36 (Leaderboard) — benchmark display.
- Plan 67 (Quality Evaluation) — quality metrics.