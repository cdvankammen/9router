---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, tool-routing, function-calling, tool-fallback, agentic
---

# Implementation Plan 80 — Tool Routing & Function-Calling Agentic Gateway

> Mined from branch docs: `47-branch-9router-internal-threads.md` (tool routing, function calling, tool fallback, agent task routing, code routing, intent classification, step classification).

## 1. Goal

Add tool-call routing to 9Router: intercept `tools` parameters in chat requests, classify tool intent, route tool-bearing requests to models that support function calling, and provide tool-call fallback when the selected model drops or malfunctions tool calls.

## 2. Background (from research)

- **9Router current state**: tools pass through translation unchanged; no tool-aware routing. If a model doesn't support function calling, the user gets broken tool calls.
- **Research findings** (47-branch):
  - Tool routing: classify tool-calling intent → select model that supports tools.
  - Tool fallback: detect dropped/malformed tool calls → retry on a model that handles them.
  - Agent task routing: multi-step agent flows need stickiness (same model for entire agent trajectory).
  - Code routing: coding tools (file-edit, shell) benefit from code-specialized models.
  - Intent classification: classify user intent (chat vs. tool-use vs. code) upfront.
  - Step classification: multi-step agent workflows need per-step routing.

## 3. Design

### 3.1 Tool Intent Classifier

```
Input: { messages, tools?, model? }
Output: { intent: 'chat'|'tool-use'|'code'|'mixed', toolCount, toolComplexity, hasCodeTools }
```
- Lightweight classifier (regex on tool names + message pattern).
- Cached per request (no extra latency).

### 3.2 Tool-Aware Routing

- **Capability matching**: route to models with function-calling support (detect from `config/providerModels.js` flags).
- **Tool complexity routing**: simple tools → any model; complex multi-tool → GPT-4/Claude-tier.
- **Code tool routing**: file-edit/shell tools → code-specialized models.
- **Fallback chains**: tool-supporting model list as fallback chain.

### 3.3 Tool-Call Fallback

- **Detection**: parse SSE stream for tool_call chunks; detect incomplete/missing calls.
- **Retry**: retry on fallback model with tool-supporting flag.
- **Streaming**: detect mid-stream tool-call drops.

### 3.4 Agent Stickiness

- **Session affinity**: agent conversations stick to same model.
- **Configurable**: per-route or per-user stickiness.
- **Timeout**: break stickiness after N minutes of inactivity.

### 3.5 Integration

- **Translator**: tool-param preservation across format hops.
- **Executor**: tool-support detection per provider.
- **Dashboard**: tool-routing config page.
- **Observability**: tool-call success/fallback telemetry.

## 4. Implementation Steps

1. Define tool-intent classifier (`src/lib/tool-routing/classifier.js`).
2. Add `supportsToolCalling` flag to provider model configs.
3. Build tool-aware selection in `src/sse/handlers/chat.js`.
4. Implement tool-call detection in SSE stream (`open-sse/handlers/chatCore.js`).
5. Add tool-call fallback retry logic.
6. Implement agent stickiness (`src/lib/tool-routing/sticky.js`).
7. Dashboard: tool-routing config.
8. Observability: tool-call metrics.
9. Tests: classifier, routing, fallback, stickiness.

## 5. Files Touched

- `src/lib/tool-routing/` (new: classifier, sticky, telemetry)
- `src/sse/handlers/chat.js` (tool-aware selection)
- `open-sse/handlers/chatCore.js` (tool-call detection)
- `open-sse/config/providerModels.js` (tool-support flags)
- Dashboard tool-routing page (new)
- `tests/unit/tool-routing.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Misclassified intent | Conservative fallback to current behavior |
| Tool-call detection false positives | Validate against multiple indicators |
| Stickiness stale | Time-based expiry + model availability check |
| Translation drops tool params | Per-pair tool-param preservation tests |

## 7. Success Criteria

- Tool-bearing requests routed to tool-capable models.
- Dropped tool calls detected and retried.
- Agent stickiness works within sessions.
- No regression for non-tool requests.
- Tool-call success metrics visible.

## 8. Related Plans

- Plan 14 (Message-Driven Tools) — tool format handling.
- Plan 63 (Capability Discovery) — tool-support detection.
- Plan 68 (Session Management) — session/stickiness state.
- Plan 4 (Cost-Quality) — cost tradeoffs for tool-capable models.