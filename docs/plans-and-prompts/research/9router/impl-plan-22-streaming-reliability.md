---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, streaming, sse, chunking, reliability
---

# Implementation Plan 22 — Streaming Reliability & SSE Hardening

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "streaming reliability" option: robust SSE streaming with chunk validation, backpressure, and client-safe error injection.

## 1. Goal

Harden 9Router's SSE streaming: reliable chunk forwarding, backpressure handling, mid-stream error injection (OpenAI-compatible), and stream health monitoring — so long streams never silently die.

## 2. Background (from research)

- **9Router current state**: SSE streaming via `src/sse/`; chatCore stream setup; binary/protobuf upstreams handled in executors.
- **Research findings**: streams must validate chunk shape; backpressure must be handled (slow clients); mid-stream errors must be injected as OpenAI-compatible error events; stream health must be monitored (heartbeats).

## 3. Design

### 3.1 Chunk Validation

- **Chunk schema**: validate each SSE chunk (id, event, data).
- **Chunk normalization**: normalize provider chunk variants.
- **Malformed chunks**: skip + log; count toward malformation rate.

### 3.2 Backpressure

- **Slow client handling**: buffer with cap; drop policy (drop-oldest) or pause upstream.
- **Upstream backpressure**: respect upstream flow control.
- **Buffer monitoring**: buffer size telemetry.

### 3.3 Mid-Stream Errors

- **Error injection**: inject `data: {"error": {...}}` chunk on upstream failure.
- **Stream termination**: clean termination with error event.
- **Client-safe errors**: never raw upstream errors.

### 3.4 Stream Health

- **Heartbeats**: periodic `: ping` comments to keep connections alive.
- **Timeout detection**: stalled-stream detection (no chunks for N seconds).
- **Stream telemetry**: chunks, bytes, duration, errors per stream.

## 4. Implementation Steps

1. Build chunk validation layer.
2. Add backpressure handling.
3. Implement mid-stream error injection.
4. Add heartbeats + stall detection.
5. Add stream telemetry.
6. Tests: chunk validation, backpressure, error injection.

## 5. Files Touched

- `src/sse/` (stream handling)
- `open-sse/handlers/chatCore.js` (stream setup)
- `open-sse/executors/*` (chunk normalization)
- `src/lib/db/repos/streamRepo.js` (new: telemetry)
- `tests/unit/streaming.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Buffer memory | Cap + drop policy |
| Heartbeat overhead | Sparse pings |
| Error injection complexity | Standardized error chunk |
| Stall false positives | Tuned timeouts |

## 7. Success Criteria

- Malformed chunks never break streams.
- Slow clients handled without memory blowup.
- Mid-stream errors injected cleanly.
- Stalled streams detected + terminated.

## 8. Related Plans
- Plan 16 (Divergence & Malformed) — chunk validation synergy.
- Plan 9 (Error System) — error injection.
- Plan 8 (Observability) — stream telemetry.