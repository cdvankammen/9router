---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, verification-strategies, greedy-verification, tree-speculation, sampled-verification
---

# Implementation Plan 156 — Verification Strategies for Speculative Decoding

> Mined from branch docs: `48-branch-emerging-and-frontier.md` (Level 3: AAB — Verification Strategies, AAB-A — Greedy vs Sampled, AAB-B — Tree Speculation).

## 1. Goal

Implement verification strategies for speculative decoding in 9Router: support greedy and sampled verification, add tree speculation, and tune verification parameters — maximizing speculative decoding efficiency.

## 2. Background (from research)

- **9Router current state**: No verification strategies.
- **Research findings** (48-branch):
  - Verification strategies (AAB): verification methods.
  - Greedy vs sampled (AAB-A): verification tradeoffs.
  - Tree speculation (AAB-B): multi-branch speculation.

## 3. Design

### 3.1 Verification Methods

- **Greedy verification**: deterministic acceptance.
- **Sampled verification**: stochastic acceptance.
- **Verification cost**: per-method cost.

### 3.2 Tree Speculation

- **Tree structure**: multi-branch speculation.
- **Tree verification**: parallel verification.
- **Tree pruning**: prune low-probability branches.

### 3.3 Parameter Tuning

- **Speculation length**: tokens per speculation.
- **Verification threshold**: acceptance thresholds.
- **Adaptive tuning**: adjust from metrics.

### 3.4 Integration

- **Inference integration**: verification engine.
- **Observability**: verification metrics.
- **Dashboard**: verification view.

## 4. Implementation Steps

1. Build verification engine.
2. Add tree speculation.
3. Add parameter tuning.
4. Integrate inference.
5. Dashboard: verification view.
6. Tests: verification, tree, tuning.

## 5. Files Touched

- `src/lib/speculative/verify.js` (new)
- `src/lib/speculative/tree.js` (new)
- `open-sse/executors/local.js` (integration)
- Dashboard verification page (new)
- `tests/unit/verification.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Verification cost | Cost tracking |
| Tree complexity | Pruning |
| Parameter drift | Adaptive tuning |
| Quality | Thresholds |

## 7. Success Criteria

- Verification works.
- Tree speculation functional.
- Parameters tuned.
- Efficiency improved.

## 8. Related Plans

- Plan 155 (Draft Selection) — drafts.
- Plan 92 (Local Inference) — inference.
- Plan 100 (Inference Toolkit) — toolkit.
- Plan 48 (Emerging Frontier) — frontier.