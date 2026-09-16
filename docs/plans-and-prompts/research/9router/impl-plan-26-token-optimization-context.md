---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, token-optimization, rtk, compression, context
---

# Implementation Plan 26 — Token Optimization & Context Management

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "token optimization" option: advanced token reduction and context management beyond the RTK saver.

## 1. Goal

Extend 9Router's token optimization: RTK saver enhancements, context truncation strategies, token budgeting, and per-model context management — maximizing context utilization while minimizing cost.

## 2. Background (from research)

- **9Router current state**: RTK token saver (`open-sse/rtk/`) compresses tool_result content in-place; fail-open design.
- **Research findings**: token optimization layers — prompt compression, context truncation (FrugalGPT-style), token budgeting (per-model limits), and cache-aware ordering.

## 3. Design

### 3.1 RTK Enhancements

- **Compression levels**: configurable aggressiveness per provider.
- **Selective compression**: compress only large tool results; skip small.
- **Compression metrics**: tokens saved per request.

### 3.2 Context Truncation

- **Truncation strategies**: drop-oldest, drop-largest, summary-replace.
- **Budget enforcement**: per-model context budget (max tokens).
- **Truncation safety**: never drop system prompt; never drop tool definitions.

### 3.3 Token Budgeting

- **Budget model**: per-request token budget (input/output split).
- **Budget allocation**: system > tools > history > current.
- **Budget overflow**: truncate history first; error if system+tools exceed.

### 3.4 Cache-Aware Ordering

- **Cache-friendly ordering**: order messages to maximize provider cache hits.
- **Stable prefixes**: keep system prompt + tools as stable prefix.

## 4. Implementation Steps

1. Audit RTK saver.
2. Add compression levels + metrics.
3. Build context truncation.
4. Add token budgeting.
5. Add cache-aware ordering.
6. Tests: compression, truncation, budgets.

## 5. Files Touched

- `open-sse/rtk/` (enhancements)
- `open-sse/config/tokenConfig.js` (new)
- `open-sse/handlers/chatCore.js` (truncation, budgets)
- `src/lib/db/repos/tokenRepo.js` (new: metrics)
- `tests/unit/token-optimization.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Over-compression | Levels; fail-open |
| Truncation loss | Budget priorities; safety rules |
| Budget complexity | Simple defaults |
| Cache-order regressions | Stable-prefix invariant |

## 7. Success Criteria

- RTK saves measurable tokens.
- Truncation respects budgets + safety.
- Token savings visible in telemetry.
- Cache-friendly ordering active.

## 8. Related Plans
- Plan 23 (Caching) — cache-aware ordering synergy.
- Plan 4 (Cost-Quality Optimizer) — cost impact.
- Plan 8 (Observability) — token telemetry.