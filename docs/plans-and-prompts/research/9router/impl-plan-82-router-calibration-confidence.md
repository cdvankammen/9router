---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, router-calibration, confidence-scoring, significance-testing, benchmark-hygiene
---

# Implementation Plan 82 — Router Calibration & Confidence Scoring

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (router calibration, significance testing, benchmark hygiene, greedy vs sampled verification, LLM-as-judge, human preference evaluation).

## 1. Goal

Add calibration and confidence scoring to 9Router's routing decisions: every routing decision carries a confidence score, routing rules are calibrated against real outcomes, and routing improvements are validated with significance testing — so routing quality is measurable and trustworthy.

## 2. Background (from research)

- **9Router current state**: routing decisions are deterministic (combo order); no confidence, no calibration, no outcome feedback.
- **Research findings** (46-branch):
  - Router calibration: predicted success probability should match actual success rate.
  - Significance testing: routing improvements must be validated statistically (not by anecdote).
  - Benchmark hygiene: evaluation sets must avoid contamination/leakage.
  - Greedy vs sampled verification: sampled verification is more robust for routing evals.
  - LLM-as-judge: use LLM judges for response quality comparison.
  - Human preference evaluation: gold standard for routing quality.

## 3. Design

### 3.1 Confidence Scoring

- **Sources**: classifier confidence, historical success rate, provider health, model tier.
- **Combination**: weighted geometric mean.
- **Output**: `confidence ∈ [0,1]` attached to every routing decision.
- **Thresholds**: routing rules can gate on confidence.

### 3.2 Calibration

- **Calibration store**: per (route, model, context) success outcomes.
- **Calibration curve**: predicted vs. actual success.
- **Recalibration**: periodic recalibration from outcome logs.
- **Calibration metrics**: ECE (expected calibration error), Brier score.

### 3.3 Outcome Feedback Loop

- **Outcome capture**: success/failure/quality signals from request logs.
- **Quality signals**: user feedback, LLM-judge scores, error rates, latency.
- **Feedback → calibration**: outcomes update calibration store.

### 3.4 Significance Testing

- **A/B framework**: route A vs. route B with controlled traffic split.
- **Statistical tests**: chi-square / t-test / bootstrap.
- **Minimum sample**: configurable minimum sample size.
- **Auto-promotion**: significant winner auto-promotes (opt-in).

### 3.5 Benchmark Hygiene

- **Benchmark registry**: versioned eval sets.
- **Contamination check**: overlap detection between eval sets and training data.
- **Holdout discipline**: eval sets never used for tuning.

## 4. Implementation Steps

1. Define confidence model (`src/lib/calibration/confidence.js`).
2. Build calibration store (SQLite-backed).
3. Add outcome capture to request pipeline.
4. Build calibration curve computation.
5. Add A/B framework with significance testing.
6. Add benchmark registry with contamination checks.
7. Dashboard: calibration curves, confidence distribution, A/B results.
8. Tests: calibration math, significance tests.

## 5. Files Touched

- `src/lib/calibration/` (new: confidence, store, ab, benchmark)
- `src/sse/handlers/chat.js` (confidence attach)
- `src/lib/db/repos/calibrationRepo.js` (new)
- Dashboard calibration page (new)
- `tests/unit/calibration.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Calibration drift | Periodic recalibration |
| A/B traffic cost | Configurable split % |
| Contaminated benchmarks | Contamination checks |
| Overfitting to feedback | Holdout discipline |

## 7. Success Criteria

- Every routing decision has confidence.
- Calibration curves computed and displayed.
- A/B tests run with significance results.
- Benchmark registry with contamination checks.
- No routing behavior change without opt-in.

## 8. Related Plans

- Plan 67 (Model Quality Evaluation) — quality signals.
- Plan 7 (Eval Harness) — evaluation infrastructure.
- Plan 36 (Leaderboard) — benchmark display.
- Plan 64 (Anomaly Detection) — outcome anomaly signals.