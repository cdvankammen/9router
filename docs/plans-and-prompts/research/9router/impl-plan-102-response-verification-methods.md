---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, greedy-vs-sampled, verification-methods, llm-judge, response-verification
---

# Implementation Plan 102 — Response Verification Methods (Greedy vs Sampled, LLM-Judge)

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (greedy vs sampled verification, LLM-as-judge, human preference evaluation, significance testing).

## 1. Goal

Add response verification methods to 9Router: verify model responses before delivery (greedy self-check, sampled verification, LLM-judge scoring), with configurable verification rates — so low-quality responses are caught and retried before reaching users.

## 2. Background (from research)

- **9Router current state**: no response verification.
- **Research findings** (46-branch):
  - Greedy vs sampled verification: sampled verification more robust.
  - LLM-as-judge: scalable quality scoring.
  - Human preference evaluation: gold standard.
  - Significance testing: validate verification improvements.

## 3. Design

### 3.1 Verification Methods

- **Greedy self-check**: model verifies own output (fast, cheap).
- **Sampled verification**: verify on sampled responses (robust).
- **LLM-judge**: separate judge model scores output.
- **Rule checks**: structural checks (format, length, safety).

### 3.2 Verification Pipeline

```
Response → verification mode (none/sample/always)
  → rule checks (always)
  → greedy self-check (sample)
  → LLM-judge (sample)
  → verdict: pass / fail / uncertain
```

### 3.3 Retry on Failure

- **Failed verification**: retry on same or higher-tier model.
- **Retry caps**: max verification retries.
- **Escalation**: repeated failure → escalate tier.

### 3.4 Verification Config

- **Per-route verification**: route-level verification mode.
- **Per-tier verification**: tier-level verification.
- **Sampling rates**: configurable sample rates.

### 3.5 Integration

- **Streaming integration**: verify after stream completes.
- **Observability**: verification pass/fail rates.
- **Dashboard**: verification config + results.

## 4. Implementation Steps

1. Build verification core (`src/lib/verify/`).
2. Add greedy self-check.
3. Add LLM-judge service.
4. Add rule checks.
5. Add retry-on-failure.
6. Dashboard: verification UI.
7. Tests: verification methods, retry logic.

## 5. Files Touched

- `src/lib/verify/` (new: methods, judge, rules, retry)
- `src/sse/handlers/chat.js` (verification integration)
- `open-sse/config/verifyConfig.js` (new)
- Dashboard verify page (new)
- `tests/unit/verify.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Verification latency | Sample mode |
| Judge cost | Sampling rates |
| False failures | Uncertain → pass |
| Retry loops | Retry caps |

## 7. Success Criteria

- Verification runs per config.
- Failed responses retried.
- Pass/fail rates visible.
- No regression without opt-in.

## 8. Related Plans

- Plan 75 (Quality Guardrails) — quality gates.
- Plan 97 (Quality Tiers) — tier verification.
- Plan 83 (Feedback Selection) — judge reuse.
- Plan 82 (Calibration) — verification stats.