# Branch W: Agent Adapters & Integrations — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, agents, adapters, integrations, binary-tree, branch-w

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch W: AGENT ADAPTERS & INTEGRATIONS

Concrete integration recipes for each agent/tool that should feed 9Router: Hermes, Claude Code, Cursor, Codex, Aider, Continue, Cline, and generic SDKs.

### L2 W1: HERMES ADAPTER

#### L3 W1a: Hermes Hook Integration
- **L4 W1a1: config.yaml Hook**
  - L5: Add `post_request` hook in Hermes config pointing at 9Router import API
  - L6: Payload: model, provider, request, response, tokens, latency, error
- **L4 W1a2: Hermes Plugin**
  - L5: If Hermes supports plugins, ship a 9Router plugin
  - L6: Cleaner than config editing

#### L3 W1b: Hermes Log Adapter
- **L4 W1b1: Session Log Parser**
  - L5: Parse Hermes session logs from disk (no config change)
  - L6: Works retroactively on existing logs

### L2 W2: CLAUDE CODE ADAPTER

#### L3 W2a: Log-Based
- **L4 W2a1: Project JSONL Parser**
  - L5: Parse `~/.claude/projects/<project>/*.jsonl`
  - L6: Extract model, usage, cost, tool calls

#### L3 W2b: Proxy-Based
- **L4 W2b1: ANTHROPIC_BASE_URL**
  - L5: Set `ANTHROPIC_BASE_URL` to 9Router → all traffic captured natively
  - L6: Zero parsing needed; best fidelity

### L2 W3: CURSOR ADAPTER

#### L3 W3a: Proxy-Based
- **L4 W3a1: Cursor Base URL Override**
  - L5: Cursor supports custom API base URL in settings
  - L6: Route through 9Router

#### L3 W3b: Log-Based
- **L4 W3b1: Cursor Trace Parser**
  - L5: Parse Cursor's local traces (protobuf/JSONL)
  - L6: Reuses existing cursorProtobuf utils

### L2 W4: CODEX ADAPTER

#### L3 W4a: Proxy-Based
- **L4 W4a1: OPENAI_BASE_URL**
  - L5: Set `OPENAI_BASE_URL` to 9Router
  - L6: Captures all Codex traffic

#### L3 W4b: Log-Based
- **L4 W4b1: Codex Session Parser**
  - L5: Parse Codex session files
  - L6: Responses-format mapping

### L2 W5: OTHER AGENTS

#### L3 W5a: Aider
- **L4 W5a1: Aider Config**
  - L5: `OPENAI_API_BASE` / `ANTHROPIC_API_BASE` env vars
  - L6: Route through 9Router

#### L3 W5b: Continue / Cline / Roo
- **L4 W5b1: VS Code Extension Config**
  - L5: Set custom base URL in extension settings
  - L6: All are OpenAI-compatible

#### L3 W5c: Generic SDK
- **L4 W5c1: SDK Wrapper**
  - L5: Provide a thin wrapper that logs + forwards
  - L6: For custom agents

### L2 W6: ADAPTER SELECTION GUIDE

#### L3 W6a: Fidelity vs Effort
- **L4 W6a1: Decision Matrix**
  - L5: Proxy = highest fidelity, zero parsing; Log = retroactive, medium fidelity; Hook = real-time, high fidelity
  - L6: Recommend proxy for ongoing, log for historical

#### L3 W6b: Per-Agent Recommendation
- **L4 W6b1: Recommended Method**
  - L5: Hermes → hook; Claude Code → proxy; Cursor → proxy; Codex → proxy
  - L6: Documented in skill

## Open Questions

1. Does Hermes actually support post-request hooks?
2. Which agents does the user actually run?
3. Should 9Router ship ready-made config snippets per agent?

## Related Implementation Plans

- `9router/impl-plan-import-17-agent-adapters.md` — per-agent config snippets, hook payload spec, adapter detection with code