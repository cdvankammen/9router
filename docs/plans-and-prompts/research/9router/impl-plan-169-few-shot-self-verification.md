---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, few-shot-verification, self-verification, lightweight-verification, verification-pipeline
---

# Implementation Plan 169 — Few-Shot Self-Verification Pipeline

> Mined from branch docs: `41-branch-learned-routing.md` (Level 4: ABAA — Few-Shot Self-Verification).

## 1. Goal

Implement few-shot self-verification for 9Router: use a small model to verify outputs with few-shot examples, catch quality issues without an expensive judge, and route verified outputs to clients — cutting verification cost.

## 2. Background (from research)

- **9Router current state**: No self-verification.
- **Research findings** (41-branch):
  - Few-shot self-verification (ABAA): lightweight verification.
  - Self-verification + POMDP (AB): verification for routing.
  - Judge approximation (42-branch): cheap judges.

## 3. Design

### 3.1 Verification Model

- **Verifier**: small model with few-shot examples.
- **Verification criteria**: correctness, coherence, completeness.
- **Verification output**: pass/fail with confidence.

### 3.2 Verification Pipeline

- **Pre-verification**: verify before routing.
- **Post-verification**: verify after response.
- **Verification cost**: per-verification cost.

### 3.3 Quality Integration

- **Pass output**: serve to client.
- **Fail output**: re-route or retry.
- **Verification logging**: all verifications logged.

### 3.4 Integration

- **Routing integration**: verification hooks.
- **Observability**: verification metrics.
- **Dashboard**: verification view.

## 4. Implementation Steps

1. Build verification model.
2. Add verification pipeline.
3. Add quality integration.
4. Integrate routing.
5. Dashboard: verification view.
6. Tests: verification, pipeline.

## 5. Files Touched

- `src/lib/verification/` (new: model, pipeline, quality)
- `open-sse/handlers/chatCore.js` (verification hooks)
- Dashboard verification page (new)
- `tests/unit/verification.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Verification errors | Few-shot quality |
| Cost overhead | Lightweight verifier |
| Latency | Async verification |
| False failures | Threshold tuning |

## 7. Success Criteria

- Verification works.
- Cost reduced.
- Quality maintained.
- Failures caught.

## 8. Related Plans

- Plan 102 (Response Verification) — verification foundations.
- Plan 151 (LLM Approximation) — cheap judges.
- Plan 133 (Cascade Judges) — judges.
- Plan 132 (POMDP) — self-verification.