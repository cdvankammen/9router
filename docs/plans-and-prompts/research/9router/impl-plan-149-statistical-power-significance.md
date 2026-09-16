---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, statistical-power, significance-testing, experiment-rigor, routing-experiments
---

# Implementation Plan 149 — Statistical Power & Significance Testing

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (Level 3: AAB — Statistical Power, AAB-A — Significance Testing).

## 1. Goal

Implement statistical rigor for 9Router routing experiments: add power analysis, significance testing, and confidence intervals — so routing changes are validated with statistical confidence, not vibes.

## 2. Background (from research)

- **9Router current state**: No statistical validation.
- **Research findings** (46-branch):
  - Statistical power (AAB): sample size requirements.
  - Significance testing (AAB-A): hypothesis testing.
  - Benchmark hygiene (AAB-B): clean evaluation.

## 3. Design

### 3.1 Power Analysis

- **Power model**: effect size, sample size, alpha.
- **Sample size calculator**: required samples.
- **Power reporting**: achieved power.

### 3.2 Significance Testing

- **Test selection**: paired t-test, bootstrap, Bayesian.
- **Multiple comparisons**: correction (Bonferroni).
- **Confidence intervals**: effect size CIs.

### 3.3 Experiment Framework

- **A/B framework**: control vs treatment.
- **Randomization**: query assignment.
- **Blinding**: avoid bias.
- **Pre-registration**: declare hypotheses.

### 3.4 Integration

- **Eval harness integration**: statistical reports.
- **Observability**: experiment metrics.
- **Dashboard**: experiment results.

## 4. Implementation Steps

1. Build power analysis.
2. Add significance testing.
3. Add A/B framework.
4. Integrate eval harness.
5. Dashboard: experiments.
6. Tests: power, significance.

## 5. Files Touched

- `src/lib/stats/` (new: power, tests, ab)
- `open-sse/services/eval-harness.js` (integration)
- Dashboard experiments page (new)
- `tests/unit/stats.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Underpowered | Power analysis |
| False positives | Corrections |
| Bias | Randomization |
| Complexity | Simple defaults |

## 7. Success Criteria

- Power computed.
- Tests significant.
- A/B works.
- Results trustworthy.

## 8. Related Plans

- Plan 7 (Eval Harness) — evaluation.
- Plan 112 (Experiment Design) — design.
- Plan 91 (Benchmark Hygiene) — hygiene.
- Plan 148 (Dataset Construction) — data.