---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-context, context-window, management, overflow
---

# Implementation Plan 55 — Context Window Management

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `45-branch-semantic-and-embedding-routing.md`).
> This plan covers the "context window" option: context window management across models.

## 1. Goal

Add context window management to 9Router: per-model context awareness, overflow handling, and context optimization — so requests fit model limits reliably.

## 2. Background (from research)

- **9Router current state**: no context management; context overflow errors pass through.
- **Research findings** (45-branch): models have different context windows; overflow handling (truncate, summarize, split, fallback) prevents failures; context optimization (compression, caching) extends effective context.

## 3. Design

### 3.1 Context Awareness

- **Model context registry**: per-model context windows.
- **Request estimation**: token estimation per request.
- **Fit check**: pre-routing fit check.

### 3.2 Overflow Handling

- **Truncate**: drop oldest non-essential messages.
- **Summarize**: summarize history (opt-in).
- **Split**: split request across models (advanced).
- **Fallback**: route to larger-context model.

### 3.3 Context Optimization

- **Compression**: RTK + prompt compression.
- **Caching**: cache-aware ordering.
- **Dedup**: remove redundant content.

### 3.4 Integration

- **Routing integration**: context-aware model selection.
- **Observability**: context usage telemetry.
- **Errors**: context errors handled gracefully.

## 4. Implementation Steps

1. Build context registry.
2. Add fit check.
3. Add overflow handling.
4. Add context optimization.
5. Integrate routing.
6. Tests: estimation, overflow, fallback.

## 5. Files Touched

- `src/lib/context/` (new: registry, estimation)
- `open-sse/handlers/chatCore.js` (overflow handling)
- `open-sse/config/contextConfig.js` (new)
- `src/lib/db/repos/contextRepo.js` (new)
- `tests/unit/context-window.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Estimation error | Conservative estimates |
| Summarize loss | Opt-in; safety rules |
| Split complexity | Advanced; opt-in |
| Fallback cost | Larger-context cost |

## 7. Success Criteria

- Fit check pre-routing.
- Overflow handled gracefully.
- Context optimization active.
- Context telemetry visible.

## 8. Related Plans
- Plan 26 (Token Optimization) — compression synergy.
- Plan 23 (Caching) — cache-aware ordering.
- Plan 16 (Divergence) — context error handling.