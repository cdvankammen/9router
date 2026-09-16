---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, sse-layer, streaming-protocol, sse-reliability, event-stream
---

# Implementation Plan 126 — SSE Layer Reliability & Protocol Compliance

> Mined from branch docs: `47-branch-9router-internal-threads.md` (SSE details) and `13-sse-layer-deep-dive.md`.

## 1. Goal

Harden 9Router's SSE layer: formalize SSE protocol compliance (event formats, keep-alives, reconnection), add stream health monitoring, and add protocol conformance tests — so streaming works reliably across all clients.

## 2. Background (from research)

- **9Router current state**: SSE layer exists (plan 22 streaming); protocol edge cases implicit.
- **Research findings** (47-branch):
  - SSE details: SSE architecture.
  - (13) SSE layer deep dive: SSE design.

## 3. Design

### 3.1 Protocol Compliance

- **Event format**: `data:` / `event:` / `id:` / `retry:` fields.
- **Keep-alives**: comment-line keep-alives.
- **Reconnection**: `Last-Event-ID` handling.
- **Content-Type**: `text/event-stream` with correct headers.

### 3.2 Stream Health

- **Stream metrics**: bytes, events, gaps, stalls.
- **Stall detection**: no-data timeouts.
- **Stream recovery**: reconnect with backoff.

### 3.3 Conformance Tests

- **Test suite**: protocol conformance tests.
- **Client simulation**: simulated SSE clients.
- **Interop tests**: real client compatibility.

### 3.4 Integration

- **Executor integration**: SSE output normalization.
- **Observability**: stream telemetry.
- **Dashboard**: SSE health view.

## 4. Implementation Steps

1. Audit SSE compliance (`src/sse/`).
2. Add keep-alives + reconnection.
3. Add stall detection.
4. Build conformance tests.
5. Dashboard: SSE health view.
6. Tests: protocol, stalls, reconnection.

## 5. Files Touched

- `src/sse/` (compliance fixes)
- `src/sse/handlers/chat.js` (keep-alives)
- `tests/unit/sse.test.js` (new)
- Dashboard sse page (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Client incompatibility | Interop tests |
| Keep-alive overhead | Configurable interval |
| Stall false positives | Threshold tuning |
| Reconnection storms | Backoff |

## 7. Success Criteria

- Protocol compliant.
- Keep-alives work.
- Stalls detected.
- Conformance tests pass.

## 8. Related Plans

- Plan 22 (Streaming Reliability) — streaming foundations.
- Plan 13 (SSE Layer) — architecture.
- Plan 66 (Request Tracing) — stream traces.
- Plan 31 (Performance) — stream latency.