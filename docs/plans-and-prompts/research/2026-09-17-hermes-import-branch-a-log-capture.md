# Branch A: Log Capture Mechanisms — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, log-capture, binary-tree, branch-a

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch A: LOG CAPTURE MECHANISMS

How to get the data from external agents (Hermes, Claude Code, Cursor, Codex, etc.) that bypass 9Router.

### L2 A1: HERMES HOOK (Post-Request Webhook)

#### L3 A1a: Webhook Configuration
- **L4 A1a1: Hermes Agent Config**
  - L5: `~/.hermes/config.yaml` → `postRequestHook: http://localhost:20128/api/messages/import`
  - L6: Config schema validation, retry on failure, timeout settings
- **L4 A1a2: Payload Format**
  - L5: JSON body with `{timestamp, model, request, response, status, latencyMs, tokens}`
  - L6: Sanitization (strip auth headers), compression (gzip for large payloads)

#### L3 A1b: Webhook Receiver
- **L4 A1b1: Endpoint Design**
  - L5: `POST /api/messages/import` — accepts batch of messages
  - L6: Rate limiting (100 req/s per source), auth (API key or IP whitelist)
- **L4 A1b2: Validation & Parsing**
  - L5: Zod schema validation, reject malformed payloads
  - L6: Error responses with detailed validation errors, partial success handling

### L2 A2: LOG FILE TAIL (Parse Existing Logs)

#### L3 A2a: File Watchers
- **L4 A2a1: chokidar/fs.watch**
  - L5: Watch `~/.9router/usage.json`, `~/.hermes/logs/*.jsonl`
  - L6: Debounce events, handle file rotation, atomic reads
- **L4 A2a2: Tail -f Pattern**
  - L5: Spawn `tail -f` process, parse stdout line-by-line
  - L6: Handle process crashes, reconnect on file deletion

#### L3 A2b: Log Format Parsers
- **L4 A2b1: JSONL Parser**
  - L5: Each line = `{timestamp, model, prompt, completion, tokens, cost}`
  - L6: Handle malformed lines (skip + log), streaming parse
- **L4 A2b2: SQLite Reader**
  - L5: Read from `~/.hermes/db.sqlite` tables: `messages`, `conversations`
  - L6: WAL mode for concurrent reads, snapshot isolation

### L2 A3: TRANSPARENT PROXY (Route Through 9Router)

#### L3 A3a: HTTP Proxy
- **L4 A3a1: http-proxy-middleware**
  - L5: Configure agent to use `http://localhost:20128` as `HTTP_PROXY`
  - L6: Intercept all requests, log to `requestDetails`, forward to provider
- **L4 A3a2: MITM Proxy (Advanced)**
  - L5: Generate CA cert, install in agent trust store
  - L6: Decrypt HTTPS, log full request/response, re-encrypt

#### L3 A3b: DNS Hijack
- **L4 A3b1: /etc/hosts Override**
  - L5: `api.openai.com → 127.0.0.1` (9Router listens on 443)
  - L6: Requires root, breaks other apps — **NOT RECOMMENDED**
- **L4 A3b2: dnsmasq Local DNS**
  - L5: Configure dnsmasq to resolve `*.openai.com` → localhost
  - L6: Scoped to specific network interface, less invasive

### L2 A4: MANUAL IMPORT (Paste JSON)

#### L3 A4a: UI Import Form
- **L4 A4a1: File Upload**
  - L5: Drag-and-drop JSON/JSONL file upload in Messages page
  - L6: Client-side validation, progress bar, batch preview
- **L4 A4a2: Paste Area**
  - L5: Textarea for pasting JSON, auto-detect format
  - L6: Syntax highlighting, format detection (OpenAI/Anthropic/etc.)

#### L3 A4b: CLI Import
- **L5: `9router import <file>` Command**
  - L6: Reads file, POSTs to `/api/messages/import`, reports results

## Implementation Priority

1. **Hermes Hook** (easiest, real-time) — 2 days
2. **Log File Tail** (no agent changes) — 3 days
3. **Manual Import** (quick ad-hoc) — 1 day
4. **Transparent Proxy** (most powerful, most complex) — 5 days

## Open Questions

- How to handle duplicate imports (same request captured by hook + proxy)?
- Should import be idempotent (dedupe by request hash)?
- Max batch size for import API?
- Rate limits per source?

## Related Implementation Plans

- `9router/impl-plan-import-03-import-api.md` — the ingest endpoint every capture mechanism posts into
- `9router/impl-plan-import-04-log-file-tail.md` — log file tailing (A2) with `logWatcher.js` + persistent sync state
- `9router/impl-plan-import-05-hermes-hook.md` — Hermes post-request hook (A1) + config endpoint
- `9router/impl-plan-import-14-format-adapters.md` — per-agent log parsers (A2): Hermes/Claude Code/Cursor/Codex
- `9router/impl-plan-import-15-streaming-realtime.md` — NDJSON streaming (A4 alternative) + SSE live tail
- `9router/impl-plan-import-17-agent-adapters.md` — per-agent capture recipes (A1/A3): hook YAML, proxy env vars, detection
- `9router/impl-plan-import-20-quality-rollout.md` — staged rollout of capture mechanisms (Stage 1 Manual → 2 Log Tail → 3 Hook/Proxy)
