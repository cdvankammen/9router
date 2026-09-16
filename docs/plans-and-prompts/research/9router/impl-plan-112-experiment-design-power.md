---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, statistical-power, significance-testing, experiment-design, ab-testing
---

# Implementation Plan 112 — Experiment Design & Statistical Power

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (statistical power, significance testing, dataset balance, greedy vs sampled verification).

## 1. Goal

Add experiment design tooling to 9Router: compute statistical power for routing experiments, design A/B tests with proper sample sizes, and validate results with significance testing — so routing changes are proven, not guessed.

## 2. Background (from research)

- **9Router current state**: no experiment infrastructure.
- **Research findings** (46-branch):
  - Statistical power: probability of detecting real effects.
  - Significance testing: validate results statistically.
  - Dataset balance: balanced experiment groups.
  - Greedy vs sampled verification: robust verification.

## 3. Design

### 3.1 Power Analysis

- **Power computation**: given effect size, sample size, alpha → power.
- **Sample size calculator**: required sample for target power.
- **Effect size estimation**: from historical data.

### 3.2 Experiment Framework

- **Experiment model**: hypothesis, variants, metrics, duration.
- **Traffic allocation**: configurable split (50/50, 90/10).
- **Randomization**: consistent hashing for stable assignment.
- **Guardrails**: experiment safety checks.

### 3.3 Analysis

- **Significance tests**: chi-square, t-test, bootstrap, Bayesian.
- **Multiple comparison correction**: Bonferroni/FDR.
- **Result interpretation**: practical significance vs. statistical.
- **Auto-decisions**: promote/revert with confidence.

### 3.4 Experiment Registry

- **Registry**: versioned experiments.
- **History**: past experiment results.
- **Reuse**: learn from past experiments.

### 3.5 Integration

- **Routing integration**: experiment hooks in selection.
- **Observability**: experiment telemetry.
- **Dashboard**: experiment designer.

## 4. Implementation Steps

1. Build power analysis (`src/lib/experiments/`).
2. Build experiment framework.
3. Add analysis engine.
4. Build experiment registry.
5. Integrate routing.
6. Dashboard: experiment designer.
7. Tests: power math, significance tests.

## 5. Files Touched

- `src/lib/experiments/` (new: power, framework, analysis, registry)
- `src/sse/handlers/chat.js` (experiment hooks)
- `src/lib/db/repos/experimentRepo.js` (new)
- Dashboard experiments page (new)
- `tests/unit/experiments.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Underpowered tests | Power analysis |
| Multiple comparisons | Corrections |
| Traffic cost | Split control |
| Misinterpretation | Practical significance |

## 7. Success Criteria

- Power analysis available.
- Experiments run with proper design.
- Significance tests applied.
- Results registry maintained.

## 8. Related Plans

- Plan 82 (Calibration) — significance testing.
- Plan 91 (Benchmark Hygiene) — dataset discipline.
- Plan 90 (Strategy Evaluation) — strategy A/B.
- Plan 7 (Eval Harness) — evaluation infrastructure.