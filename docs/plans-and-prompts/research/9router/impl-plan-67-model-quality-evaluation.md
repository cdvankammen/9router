---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-quality, evaluation, scoring, benchmarks
---

# Implementation Plan 67 — Model Quality Evaluation

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `46-branch-evaluation-and-cost-quality.md`).
> This plan covers the "model quality evaluation" option: systematic model quality evaluation.

## 1. Goal

Add systematic model quality evaluation to 9Router: quality benchmarks, evaluation pipelines, and quality tracking — so routing decisions are quality-informed.

## 2. Background (from research)

- **9Router current state**: no quality evaluation; routing by heuristics.
- **Research findings** (46-branch): quality benchmarks (standard datasets); evaluation pipelines (prompt → model → judge → score); quality tracking (per-model over time).

## 3. Design

### 3.1 Quality Benchmarks

- **Benchmark sets**: standard datasets (MMLU-style, code, reasoning).
- **Benchmark config**: per-benchmark config.
- **Benchmark results**: per-model scores.

### 3.2 Evaluation Pipeline

- **Pipeline stages**: prompt → model → response → judge → score.
- **Judges**: rubric, LLM-judge, reference.
- **Pipeline runs**: scheduled + manual.

### 3.3 Quality Tracking

- **Quality history**: per-model over time.
- **Quality trends**: improvement/regression.
- **Quality alerts**: significant changes.

### 3.4 Routing Integration

- **Quality-informed routing**: quality scores in selection.
- **Quality thresholds**: minimum quality gates.
- **Quality telemetry**: evaluation results.

## 4. Implementation Steps

1. Define benchmark sets.
2. Build evaluation pipeline.
3. Add quality tracking.
4. Integrate routing.
5. Tests: pipeline, scoring.

## 5. Files Touched

- `src/lib/eval/` (new: pipeline, judges)
- `src/lib/db/repos/qualityRepo.js` (new)
- `src/sse/handlers/chat.js` (quality integration)
- Dashboard quality page (new)
- `tests/unit/quality-eval.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Judge bias | Multiple judges |
| Benchmark cost | Sampling |
| Quality drift | Tracking |
| Integration complexity | Thresholds first |

## 7. Success Criteria

- Benchmarks runnable.
- Pipeline operational.
- Quality tracked.
- Routing quality-informed.

## 8. Related Plans
- Plan 7 (Eval Harness) — supersedes/merges.
- Plan 36 (Comparison) — comparison synergy.
- Plan 4 (Cost-Quality) — quality dimension.