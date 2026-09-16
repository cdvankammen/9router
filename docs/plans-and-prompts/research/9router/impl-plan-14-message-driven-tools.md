---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, message-driven, tools, agent, protocol
---

# Implementation Plan 14 — Message-Driven Tools Protocol

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md` — `38-message-driven-tools-research.md`).
> This plan covers the "message-driven tools" option: a message-driven tools protocol for agentic workflows.

## 1. Goal

Design and implement a message-driven tools protocol: tools that communicate via structured messages (not just function calls), enabling multi-turn tool orchestration, tool chaining, and agentic workflows through 9Router.

## 2. Background (from research)

- **9Router message-driven tools research** (doc 38): message-driven tool patterns; tool orchestration; agentic workflows.
- **9Router current state**: OpenAI-compatible function calling; tool results in messages; RTK token saver for tool_result compression.
- **Research findings**: message-driven tools enable richer orchestration; tool chaining reduces round-trips; structured tool messages improve reliability.

## 3. Design

### 3.1 Tool Message Protocol

- **Tool message types**: tool_call, tool_result, tool_error, tool_progress, tool_handoff.
- **Tool message schema**: structured fields (tool_id, call_id, status, payload, metadata).
- **Tool message routing**: route tool messages to appropriate handlers.

### 3.2 Tool Orchestration

- **Tool chaining**: chain tool calls (output of one → input of next).
- **Tool branching**: conditional tool execution.
- **Tool retry**: retry failed tool calls with backoff.
- **Tool timeout**: per-tool timeouts.

### 3.3 Agentic Workflows

- **Multi-turn tools**: tools that span multiple turns (stateful).
- **Tool handoff**: hand off to another tool/agent.
- **Workflow definition**: declarative workflow definitions.

### 3.4 Integration

- **OpenAI compatibility**: expose tool messages via OpenAI-compatible API.
- **Provider translation**: translate tool messages across providers.
- **RTK integration**: token-saving for tool messages.

## 4. Implementation Steps

1. Define tool message schema.
2. Build tool message routing.
3. Implement tool orchestration (chaining, branching, retry).
4. Add multi-turn tool support.
5. Integrate with OpenAI-compatible API.
6. Tests: tool messages, chaining, retry.

## 5. Files Touched

- `open-sse/tools/` (new: message protocol, orchestration)
- `open-sse/translator/` (tool message translation)
- `open-sse/rtk/` (token saving)
- `src/sse/handlers/chat.js` (tool routing)
- `tests/unit/tools-protocol.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Protocol complexity | Minimal schema; versioning |
| Provider incompatibility | Translation layer; fallback |
| Stateful tools | Session state management |
| Token overhead | RTK integration |

## 7. Success Criteria

- Tool message protocol operational.
- Tool chaining/branching/retry functional.
- Multi-turn tools supported.
- OpenAI-compatible exposure works.

## 8. Related Plans
- Plan 15 (Goal Systems Integration) — agentic workflows.
- Plan 16 (Divergence & Malformed Responses) — tool response validation.
- Plan 9 (Error System) — tool error handling.