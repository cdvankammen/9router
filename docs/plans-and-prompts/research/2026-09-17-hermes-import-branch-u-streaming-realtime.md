# Branch U: Streaming & Real-Time Import — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, streaming, real-time, sse, binary-tree, branch-u

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch U: STREAMING & REAL-TIME IMPORT

Support real-time ingestion: streaming uploads, SSE push from agents, live tailing, and incremental visibility of in-flight requests.

### L2 U1: STREAMING UPLOADS

#### L3 U1a: Chunked Upload
- **L4 U1a1: NDJSON Stream**
  - L5: `POST /api/messages/import` with `Content-Type: application/x-ndjson`
  - L6: Server parses line-by-line, inserts incrementally
- **L4 U1a2: Chunked Transfer**
  - L5: Accept `Transfer-Encoding: chunked` bodies
  - L6: Process each chunk as it arrives

#### L3 U1b: Multipart Upload
- **L4 U1b1: File Upload**
  - L5: `POST /api/messages/import/upload` with multipart file
  - L6: Streams file to parser (no full-buffer)

### L2 U2: SSE PUSH FROM AGENTS

#### L3 U2a: Agent → 9Router SSE
- **L4 U2a1: Live Event Stream**
  - L5: Agents POST events to `/api/messages/import/events` (SSE-style)
  - L6: Each event = one message or partial message
- **L4 U2a2: Event Types**
  - L5: `message.started`, `message.chunk`, `message.completed`, `message.failed`
  - L6: Server assembles chunks into full messages

#### L3 U2b: 9Router → Dashboard SSE
- **L4 U2b1: Live Updates**
  - L5: Dashboard subscribes to `/api/messages/import/stream` (SSE)
  - L6: New imports appear in real-time without refresh

### L2 U3: LIVE TAILING

#### L3 U3a: Live Log Tail
- **L4 U3a1: Tail -f Equivalent**
  - L5: logWatcher streams new lines to import pipeline in real-time
  - L6: Sub-second latency for new log lines

#### L3 U3b: In-Flight Visibility
- **L4 U3b1: Partial Records**
  - L5: Show in-progress requests with `status: "streaming"`
  - L6: Updated on completion (mirrors native streaming UX)

### L2 U4: BACKPRESSURE & BUFFERING

#### L3 U4a: Backpressure
- **L4 U4a1: Flow Control**
  - L5: If DB write lags, pause reading (async iterator backpressure)
  - L6: Prevents memory blowup

#### L3 U4b: Buffering
- **L4 U4b1: Ring Buffer**
  - L5: In-memory ring buffer (e.g., 10k messages) before DB flush
  - L6: Mirrors requestDetailsRepo buffer/flush pattern

### L2 U5: REALTIME METRICS

#### L3 U5a: Live Counters
- **L4 U5a1: Import Rate**
  - L5: Dashboard shows messages/sec, errors/sec
  - L6: Rolling 60s window

#### L3 U5b: Live Errors
- **L4 U5b1: Error Toast**
  - L5: Failed imports surface as dashboard notifications
  - L6: With retry button

## Open Questions

1. Do agents need to push live, or is batch import sufficient?
2. Should the dashboard get SSE live updates or poll?
3. Is chunked upload needed for very large log files?

## Related Implementation Plans

- `9router/impl-plan-import-15-streaming-realtime.md` — NDJSON streaming, SSE push, live tail with code