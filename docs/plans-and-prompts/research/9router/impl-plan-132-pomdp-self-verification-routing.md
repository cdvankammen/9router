---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, pomdp-routing, self-verification, sequential-decision, uncertainty
---

# Implementation Plan 132 — POMDP & Self-Verification Routing

> Mined from branch docs: `41-branch-learned-routing.md` (Level 2: AB — Self-Verification + POMDP, AutoMix arXiv:2310.12963).

## 1. Goal

Implement POMDP-based routing with self-verification for 9Router: model routing as a partially observable Markov decision process where the router verifies its own outputs and decides whether to escalate to a stronger model — reducing cost while maintaining quality.

## 2. Background (from research)

- **9Router current state**: Deterministic fallback chains; no uncertainty modeling.
- **Research findings** (41-branch):
  - AutoMix (arXiv:2310.12963): self-verification + POMDP formulation for routing.
  - POMDP formulation (ABAB): routing as belief-state decision process.
  - Answer confidence estimation (ABBA): confidence signals for escalation.
  - Few-shot self-verification (ABAA): lightweight verification.

## 3. Design

### 3.1 POMDP Model

- **States**: query difficulty, model capability.
- **Actions**: route to model M, verify, escalate.
- **Observations**: model output, confidence.
- **Belief state**: posterior over difficulty.

### 3.2 Self-Verification

- **Verifier**: lightweight model checks output.
- **Confidence**: calibrated confidence scores.
- **Escalation**: escalate when confidence < threshold.

### 3.3 Policy

- **Policy**: belief-state → action mapping.
- **Training**: offline RL from logs.
- **Thresholds**: per-cost-tier escalation thresholds.

### 3.4 Integration

- **Pre-routing**: POMDP policy before provider selection.
- **Post-routing**: verification after first response.
- **Observability**: belief states, escalations.
- **Dashboard**: POMDP view.

## 4. Implementation Steps

1. Build POMDP model (`src/lib/pomdp/`).
2. Add self-verification.
3. Train policy from logs.
4. Integrate pre/post routing.
5. Dashboard: POMDP view.
6. Tests: policy, verification, escalation.

## 5. Files Touched

- `src/lib/pomdp/` (new: model, policy, verify)
- `open-sse/handlers/chatCore.js` (hooks)
- Dashboard pomdp page (new)
- `tests/unit/pomdp.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Policy complexity | Simple belief states |
| Verification cost | Lightweight verifier |
| Escalation loops | Max escalation depth |
| Training data | Log-based offline RL |

## 7. Success Criteria

- POMDP policy works.
- Self-verification accurate.
- Escalation reduces cost.
- Belief states visible.

## 8. Related Plans

- Plan 1 (Learned Routing) — foundations.
- Plan 82 (Calibration) — confidence.
- Plan 98 (Oracle Gap) — quality targets.
- Plan 87 (Cost Heuristics) — cost signals.