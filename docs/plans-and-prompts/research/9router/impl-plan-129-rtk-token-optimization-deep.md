---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, rtk-tokens, token-compression, context-management, prompt-optimization
---

# Implementation Plan 129 — RTK Token Optimization Deep Dive

> Mined from branch docs: `47-branch-9router-internal-threads.md` (RTK details) and `16-rtk-deep-dive.md`.

## 1. Goal

Deepen 9Router's RTK token optimization: formalize compression strategies, add context-window-aware compression, and add compression analytics — so token savings are maximized without quality loss.

## 2. Background (from research)

- **9Router current state**: RTK token saver exists (CLAUDE.md); compression basics.
- **Research findings** (47-branch):
  - RTK details: RTK architecture.
  - (16) RTK deep dive: RTK design.

## 3. Design

### 3.1 Compression Strategies

- **Tool result compression**: existing (tool_result content).
- **System prompt compression**: compress repeated system prompts.
- **History compression**: compress old conversation turns.
- **Image compression**: compress base64 images.

### 3.2 Context-Window-Aware

- **Token budget**: per-request token budget.
- **Compression priority**: what to compress first.
- **Quality guardrails**: min quality thresholds.

### 3.3 Compression Analytics

- **Savings tracking**: per-request savings.
- **Quality metrics**: post-compression quality.
- **Compression ratios**: by content type.

### 3.4 Integration

- **RTK hooks**: new compression hooks.
- **Observability**: compression telemetry.
- **Dashboard**: compression analytics.

## 4. Implementation Steps

1. Audit current RTK compression.
2. Add system prompt + history compression.
3. Add token budgets.
4. Add compression analytics.
5. Dashboard: compression view.
6. Tests: compression, budgets, quality.

## 5. Files Touched

- `open-sse/rtk/` (new compression hooks)
- `src/lib/tokens.js` (budget management)
- Dashboard compression page (new)
- `tests/unit/rtk.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Quality loss | Guardrails |
| Compression overhead | Sampling |
| Budget complexity | Simple defaults |
| Provider quirks | Per-provider config |

## 7. Success Criteria

- Multiple compression strategies.
- Token budgets work.
- Analytics tracked.
- Quality preserved.

## 8. Related Plans

- Plan 25 (Token Optimization Context) — context foundations.
- Plan 16 (RTK Deep Dive) — architecture.
- Plan 116 (DB Adapter) — storage.
- Plan 31 (Performance) — latency.