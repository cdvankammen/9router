---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, eval-harness, routerbench, aiq, cost-quality-plane, benchmark
---

# Implementation Plan 7 — Routing Evaluation Harness (RouterBench-style)

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `46-branch-evaluation-and-cost-quality.md`).
> This plan covers the "eval harness" option: a RouterBench-style evaluation system for 9Router's routing strategies.

## 1. Goal

Build a **routing evaluation harness** for 9Router: a RouterBench-style benchmark that measures routing strategies on the cost-quality plane, computes AIQ, compares against Zero/Oracle baselines, and drives routing improvements with data.

## 2. Background (from research)

- **RouterBench** (arXiv:2403.12031): 405,467 samples, 11 models, 8 datasets, 64 tasks. Cost-quality (c-q) plane with linear interpolation/extrapolation; null router at (0,0). AIQ = $\frac{1}{c_{max}-c_{min}} \int R_\theta \, dc$. Zero router = probabilistic mix maximizing expected quality at cost c. Oracle router near-optimal at low cost; GPT-4 seldom chosen. Predictive routers (KNN/MLP) do NOT significantly beat Zero. Cascades with judge error ≤ 0.1 beat Zero; collapse at > 0.2.
- **9Router current state**: no routing evaluation harness; no cost-quality tracking; no baseline comparison.

## 3. Design

### 3.1 Eval Dataset

- **Sources**:
  - Public benchmarks: MMLU, MT-Bench, GSM8K, HumanEval (task-type coverage).
  - 9Router's own usageDb (real prompts, anonymized).
  - Synthetic task-type samples (code, math, reasoning, etc.).
- **Format**: (prompt, task_type, expected_quality_metric) tuples.
- **Size**: 1k–10k samples per task type.

### 3.2 Eval Runner

- **New**: `scripts/run-routing-eval.mjs` — for each strategy:
  1. Run eval dataset through the strategy (real API calls or replay from logs).
  2. Record per-request: cost, latency, quality (success, correctness, judge score).
  3. Compute cost-quality curve (interpolation/extrapolation).
  4. Compute AIQ.
  5. Compare against Zero router + Oracle baselines.
- **Replay mode**: replay logged requests (no API cost) for strategy comparison.
- **Live mode**: real API calls for ground truth.

### 3.3 Baselines

- **Zero router**: probabilistic mix of models maximizing expected quality at cost c (RouterBench NDCH).
- **Oracle router**: perfect quality prediction (upper bound).
- **Null router**: (0,0) baseline.
- **Current 9Router strategies**: heuristic, combo, fallback, round-robin.

### 3.4 Dashboard

- **Cost-quality plane**: scatter/line chart of strategies.
- **AIQ comparison**: bar chart.
- **Per-task-type breakdown**: quality/cost per task.
- **Judge calibration**: judge error measurement (cascade viability).

## 4. Implementation Steps

1. Build eval dataset (public benchmarks + usageDb + synthetic).
2. Build eval runner (replay + live modes).
3. Implement Zero router baseline.
4. Implement Oracle baseline.
5. Compute c-q curves + AIQ.
6. Add dashboard visualization.
7. Add judge calibration measurement.
8. Tests: eval runner correctness, AIQ computation.

## 5. Files Touched

- `scripts/run-routing-eval.mjs` (new)
- `scripts/build-eval-dataset.mjs` (new)
- `open-sse/services/zeroRouter.js` (new)
- `open-sse/services/oracleRouter.js` (new)
- `src/lib/usageDb.js` (eval logging)
- Dashboard eval page (new)
- `tests/unit/eval-harness.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Eval cost (live mode) | Replay mode default; sample-based live mode |
| Benchmark contamination | Separate train/eval sets; benchmark hygiene |
| Judge bias | Calibrated judges; multiple judges |
| Baseline complexity | Start with Zero router (simple); Oracle later |

## 7. Success Criteria

- Eval harness runs on 1k+ samples per task type.
- AIQ computed for all strategies.
- Zero/Oracle baselines available.
- Dashboard visualization functional.
- Judge calibration measured (error ≤ 0.1 target).

## 8. Related Plans
- Plan 1 (Learned Routing) — learned router evaluation.
- Plan 2 (Cascade Enhancements) — cascade evaluation.
- Plan 4 (Cost-Quality Optimizer) — cost-quality integration.