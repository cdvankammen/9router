---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-comparison, benchmarking, leaderboard, quality
---

# Implementation Plan 36 — Model Comparison & Leaderboard

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `46-branch-evaluation-and-cost-quality.md`).
> This plan covers the "model comparison" option: in-gateway model comparison and leaderboard.

## 1. Goal

Build an in-gateway model comparison and leaderboard: side-by-side model evaluation, quality/cost/latency leaderboards, and comparison reports — using real traffic and eval harnesses.

## 2. Background (from research)

- **9Router current state**: usageDb tracks usage; no comparison tooling.
- **Research findings** (46-branch): comparison needs controlled evaluation (same prompts, multiple models); leaderboards need quality + cost + latency dimensions; real-traffic comparison complements offline evals.

## 3. Design

### 3.1 Comparison Engine

- **Side-by-side**: same prompt → multiple models → compare outputs.
- **Scoring**: quality (LLM-judge, rubric), cost, latency.
- **Comparison reports**: per-prompt and aggregate.

### 3.2 Leaderboard

- **Dimensions**: quality, cost, latency, combined score.
- **Filters**: task type, model family, provider.
- **Time windows**: daily/weekly/monthly.

### 3.3 Real-Traffic Comparison

- **Traffic sampling**: sample real requests for comparison.
- **Mirroring**: mirror requests to candidate models (opt-in).
- **Outcome tracking**: compare outcomes.

### 3.4 Eval Integration

- **Eval harness link**: run eval suites through comparison.
- **Baseline comparison**: compare against baselines.
- **Report export**: comparison reports exportable.

## 4. Implementation Steps

1. Build comparison engine.
2. Add scoring.
3. Build leaderboard.
4. Add real-traffic comparison.
5. Integrate eval harness.
6. Tests: comparison, scoring, leaderboard.

## 5. Files Touched

- `src/lib/comparison/` (new: engine, scoring)
- `src/app/api/v1/comparison/route.js` (new)
- Dashboard comparison page (new)
- `src/lib/db/repos/comparisonRepo.js` (new)
- `tests/unit/comparison.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Judge bias | Multiple judges; rubrics |
| Cost of comparison | Sampling; limits |
| Leaderboard gaming | Controlled conditions |
| Traffic mirroring cost | Opt-in; sampling |

## 7. Success Criteria

- Side-by-side comparison works.
- Leaderboard functional.
- Real-traffic comparison opt-in.
- Reports exportable.

## 8. Related Plans
- Plan 7 (Eval Harness) — eval integration.
- Plan 4 (Cost-Quality Optimizer) — cost data.
- Plan 8 (Observability) — comparison telemetry.