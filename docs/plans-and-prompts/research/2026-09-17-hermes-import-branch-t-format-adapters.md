# Branch T: Format Adapters & Parsers — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, formats, parsers, adapters, binary-tree, branch-t

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch T: FORMAT ADAPTERS & PARSERS

Each agent and tool writes logs in its own format. Build adapters that parse each format into the unified import schema.

### L2 T1: AGENT LOG FORMATS

#### L3 T1a: Hermes Logs
- **L4 T1a1: Hermes JSONL**
  - L5: Parse Hermes session JSONL (user/assistant/tool turns)
  - L6: Extract model, provider, timestamps, tokens from metadata
- **L4 T1a2: Hermes Hook Payload**
  - L5: Post-request hook payload → direct import (already structured)

#### L3 T1b: Claude Code Logs
- **L4 T1b1: Claude Code JSONL**
  - L5: Parse `~/.claude/projects/*/*.jsonl` (isSidechain, type, message fields)
  - L6: Map `type: "assistant"` → response, `type: "user"` → request
- **L4 T1b2: Claude Code Cost Tracking**
  - L5: Extract `costUSD` from usage records when present
  - L6: Fall back to costCalculator when absent

#### L3 T1c: Cursor Logs
- **L4 T1c1: Cursor Protobuf**
  - L5: Cursor uses protobuf traces — decode via existing `cursorProtobuf.js` utils
  - L6: Map decoded fields to import schema
- **L4 T1c2: Cursor JSONL**
  - L5: Some Cursor versions emit JSONL — parse directly

#### L3 T1d: Codex Logs
- **L4 T1d1: Codex JSONL**
  - L5: Parse Codex session JSONL (OpenAI Responses format)
  - L6: Map `response.output` items to messages

#### L3 T1e: Generic OpenAI-Compatible
- **L4 T1e1: OpenAI SDK Traces**
  - L5: Parse any OpenAI-compatible request/response JSON
  - L6: The universal fallback adapter

### L2 T2: PROXY LOG FORMATS

#### L3 T2a: 9Router Native Logs
- **L4 T2a1: log.txt**
  - L5: Parse existing `~/.9router/log.txt` lines
  - L6: Extract timestamps, models, statuses
- **L4 T2a2: usage.json**
  - L5: Parse existing usage records
  - L6: Map to import schema

#### L3 T2b: MITM Proxy Logs
- **L4 T2b1: mitmproxy Flow Format**
  - L5: Parse mitmproxy flow dumps (JSON)
  - L6: Extract request/response pairs

#### L3 T2c: Generic HTTP Access Logs
- **L4 T2c1: Common Log Format**
  - L5: Parse CLF/NCSA access logs
  - L6: Limited fields — only timestamp, path, status

### L2 T3: TRACE FORMATS

#### L3 T3a: OpenTelemetry Traces
- **L4 T3a1: OTLP JSON**
  - L5: Parse OTLP JSON export (gen_ai spans)
  - L6: Map span attributes to import schema

#### L3 T3b: Langfuse Export
- **L4 T3b1: Langfuse JSONL**
  - L5: Parse Langfuse trace export JSONL
  - L6: Map observations to messages

#### L3 T3c: W&B Weave
- **L4 T3c1: Weave Trace JSON**
  - L5: Parse Weave trace exports
  - L6: Map to import schema

### L2 T4: PARSER ARCHITECTURE

#### L3 T4a: Adapter Registry
- **L4 T4a1: Self-Registering Parsers**
  - L5: Each parser registers `{ id, detect(content), parse(content) }`
  - L6: Auto-detection by content sniffing (mirrors translator self-registration)
- **L4 T4a2: Format Priority**
  - L5: Detection returns confidence; highest wins
  - L6: Fallback chain

#### L3 T4b: Streaming Parsers
- **L4 T4b1: Line-Based Streaming**
  - L5: JSONL parsers stream line-by-line (memory-safe)
  - L6: Backpressure via async iteration

### L2 T5: VALIDATION & ERRORS

#### L3 T5a: Per-Format Validation
- **L4 T5a1: Schema Validation**
  - L5: Each adapter validates against its expected shape
  - L6: Invalid lines → `import_errors` with line number

#### L3 T5b: Partial Parse Recovery
- **L4 T5b1: Skip-and-Continue**
  - L5: Malformed lines are skipped, import continues
  - L6: Error count reported at end

## Open Questions

1. Which agent formats are actually in use (Hermes only, or Claude Code/Cursor/Codex too)?
2. Should parsers live in `src/lib/import/parsers/` or `open-sse/`?
3. Is protobuf decoding needed for Cursor or is JSONL enough?

## Related Implementation Plans

- `9router/impl-plan-import-14-format-adapters.md` — parser registry, Hermes/Claude Code/Cursor/Codex adapters with code