---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, draft-model-selection, speculative-decoding, acceptance-rate, draft-tradeoffs
---

# Implementation Plan 155 — Draft Model Selection for Speculative Decoding

> Mined from branch docs: `48-branch-emerging-and-frontier.md` (Level 3: AAA — Draft Model Selection, AAA-A — Draft Model Tradeoffs, AAA-B — Acceptance Rate).

## 1. Goal

Implement draft model selection for speculative decoding in 9Router: formalize draft model choice (size, quality, speed), track acceptance rates, and tune draft/target pairs — enabling speculative decoding for local inference acceleration.

## 2. Background (from research)

- **9Router current state**: No speculative decoding support.
- **Research findings** (48-branch):
  - Draft model selection (AAA): draft model choice.
  - Draft model tradeoffs (AAA-A): size vs acceptance.
  - Acceptance rate (AAA-B): acceptance metrics.
  - Verification strategies (AAB): verification methods.

## 3. Design

### 3.1 Draft Model Registry

- **Draft catalog**: candidate draft models.
- **Draft properties**: size, speed, quality.
- **Draft pairing**: draft → target pairs.

### 3.2 Acceptance Tracking

- **Acceptance metrics**: acceptance rate, tokens saved.
- **Acceptance monitoring**: per-pair tracking.
- **Acceptance tuning**: pair optimization.

### 3.3 Selection Strategy

- **Selection**: best draft per target.
- **Adaptive selection**: adjust over time.
- **Fallback**: no-draft fallback.

### 3.4 Integration

- **Inference integration**: speculative decoding.
- **Observability**: acceptance metrics.
- **Dashboard**: speculation view.

## 4. Implementation Steps

1. Build draft registry.
2. Add acceptance tracking.
3. Add selection strategy.
4. Integrate inference.
5. Dashboard: speculation view.
6. Tests: selection, acceptance.

## 5. Files Touched

- `src/lib/speculative/` (new: registry, accept, select)
- `open-sse/executors/local.js` (integration)
- Dashboard speculation page (new)
- `tests/unit/speculative.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Low acceptance | Pair tuning |
| Complexity | Simple defaults |
| Memory | Draft size limits |
| Quality | Verification |

## 7. Success Criteria

- Drafts catalogued.
- Acceptance tracked.
- Selection works.
- Speed improved.

## 8. Related Plans

- Plan 92 (Local Inference) — inference.
- Plan 100 (Inference Toolkit) — toolkit.
- Plan 48 (Emerging Frontier) — frontier.
- Plan 31 (Performance) — latency.