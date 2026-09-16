---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cascade, fallback, frugalgpt, automix, judge
---

# Implementation Plan 2 — Cascade & Fallback Enhancements (FrugalGPT/AutoMix-style)

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `42-branch-cascades-and-fallbacks.md`).
> This plan covers the "cascade" option: escalate from cheap to expensive models with a judge, and harden fallback chains.

## 1. Goal

Enhance 9Router's fallback/combo system with **cascade semantics**: start with a cheap model, escalate to a stronger model only when a judge determines the cheap output is insufficient. Also harden fallback chains with research-backed cooldown/retry policies.

## 2. Background (from research)

- **FrugalGPT** (arXiv:2305.05176): cascade matches GPT-4 with up to 98% cost reduction.
- **RouterBench** (arXiv:2403.12031): cascading router with judge error ≤ 0.1 beats Zero significantly and approaches Oracle; collapses when judge error > 0.2.
- **AutoMix** (arXiv:2310.12963): few-shot self-verification + POMDP-based router; >50% cost reduction.
- **LiteLLM**: weighted failover (retry within group re-picking by weights, failed deployment excluded, max_fallbacks default 5), cooldowns (429 → 5s, >50% failures → 5s, 401/404/408 → 5s), retries with exponential backoff, max_retries:0 pinning to avoid (1+N)² amplification.
- **9Router current state**: model fallback chains per-model from settings; combo fallback/round-robin strategies; DEFAULT_RETRY_CONFIG (429:0, 502:3×3s, 503:3×2s, 504:2×3s); account failover; fusion judge exists.

## 3. Design

### 3.1 Cascade Strategy (new)

- **New combo strategy**: `cascade` — models ordered cheap→expensive.
- **Judge**: reuse/extend the fusion judge (`handleFusionChat`):
  - Judge evaluates cheap model output: correctness, completeness, confidence.
  - If judge confidence < threshold → escalate to next model in cascade.
  - Judge error must be ≤ 0.1 (RouterBench finding) — calibrate the judge.
- **Self-verification** (AutoMix): cheap model verifies its own output via few-shot self-verification prompt; if self-confidence low → escalate.
- **POMDP-style confidence**: track per-model confidence distributions; escalate based on expected value.

### 3.2 Fallback Hardening (LiteLLM patterns)

- **Weighted failover**: within a fallback chain, re-pick by weights with failed model excluded (LiteLLM).
- **max_fallbacks cap**: default 5 (LiteLLM).
- **Cooldown policies**:
  - 429 → immediate 5s cooldown.
  - >50% failures in current minute → 5s cooldown.
  - 401/404/408 → 5s cooldown.
  - allowed_fails + cooldown_time per deployment.
- **Retry semantics**: num_retries precedence (header → body → deployment params → settings); exponential backoff for RateLimitError; pin provider client to max_retries:0 to avoid (1+N)² amplification.
- **No-retry errors**: ContextWindowExceededError, ContentPolicyViolationError (LiteLLM) — don't retry, fail fast.

### 3.3 Integration Points

- **`src/sse/handlers/chat.js`** — decision point 6 (combo selection): add `cascade` strategy.
- **`open-sse/handlers/chatCore.js`** — retry/refresh loop: apply cooldown policies.
- **`open-sse/config/runtimeConfig.js`** — DEFAULT_RETRY_CONFIG: add cooldown map.
- **`open-sse/executors/default.js`** — retry logic: apply max_retries:0 pinning.
- **Fusion judge** — calibrate; add self-verification mode.

## 4. Implementation Steps

1. Add `cascade` combo strategy to combo selection.
2. Implement cascade judge (reuse fusion judge; add confidence threshold).
3. Add self-verification prompt mode (AutoMix-style).
4. Add weighted failover to fallback chains.
5. Add cooldown map to retry config.
6. Add max_fallbacks cap.
7. Pin provider clients to max_retries:0.
8. Add no-retry error classification.
9. Tests: cascade escalation, cooldown behavior, weighted failover.

## 5. Files Touched

- `src/sse/handlers/chat.js`
- `open-sse/handlers/chatCore.js`
- `open-sse/config/runtimeConfig.js`
- `open-sse/executors/default.js`
- `open-sse/services/fusionJudge.js` (or wherever the fusion judge lives)
- `tests/unit/cascade.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Judge error > 0.2 collapses cascade (RouterBench) | Calibrate judge; fall back to non-cascade if judge unreliable |
| Cascade latency (extra judge calls) | Judge with cheap model; parallel escalation |
| Self-verification noise (AutoMix) | POMDP-style confidence handling |
| Cooldown over-aggression | Tune cooldown times; per-deployment policies |

## 7. Success Criteria

- Cascade strategy achieves ≥50% cost reduction at comparable quality (AutoMix bar).
- Judge error ≤ 0.1 on eval set.
- Fallback chains respect cooldowns and max_fallbacks.
- No (1+N)² retry amplification.

## 8. Related Plans
- Plan 1 (Learned Routing) — learned judge alternative.
- Plan 7 (Eval Harness) — cascade evaluation.
- Plan 4 (Cost-Quality Optimizer) — cost integration.