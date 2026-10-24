# Implementation Plan 126 — SSE Layer Reliability & Protocol Compliance — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #sse #streaming #protocol #keep-alive #reliability #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (SSE layer in `src/sse/`; streaming handlers in `src/sse/handlers/chat.js`; streaming reliability from plan 22; request tracing from plan 66).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — event format; keep-alives; stall detection.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-126-sse-layer-reliability.md`, `../research/9router/impl-plan-22-streaming-reliability.md`, `../research/9router/impl-plan-13-sse-layer-deep-dive.md`.

## Scope

**In scope:** protocol compliance (event format `data:`/`event:`/`id:`/`retry:`, comment-line keep-alives, `Last-Event-ID` reconnection, `text/event-stream` headers); stream health (bytes/events/gaps/stalls metrics, stall detection timeouts, reconnect with backoff); conformance tests (protocol suite, simulated clients, interop); executor output normalization + dashboard SSE health view.
**Out of scope:** streaming foundations (plan 22); stream traces (plan 66).

## Milestones

### M1 — Protocol compliance

**Reference code (`src/sse/protocol.js`):**

```js
// Event format: data / event / id / retry fields.
export function formatEvent({ data, event = null, id = null, retry = null } = {}) {
  const lines = [];
  if (event) lines.push(`event: ${event}`);
  if (id) lines.push(`id: ${id}`);
  if (retry != null) lines.push(`retry: ${retry}`);
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  for (const line of payload.split("\n")) lines.push(`data: ${line}`);
  return `${lines.join("\n")}\n\n`;
}

// Keep-alives: comment-line heartbeats.
export function keepAlive(intervalMs = 15_000) {
  return `: keep-alive ${Date.now()}\n\n`;
}

// Headers: correct content type.
export function sseHeaders(extra = {}) {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    ...extra,
  };
}

// Reconnection: Last-Event-ID handling.
export function lastEventId(headers = {}) {
  return headers["last-event-id"] ?? null;
}
```

**Acceptance criteria:** event format; keep-alives; headers; reconnection id.

### M2 — Stream health

**Reference code (`src/sse/health.js`):**

```js
// Stream metrics: bytes, events, gaps, stalls.
export function makeStreamHealth({ stallMs = 30_000 } = {}) {
  const streams = new Map(); // streamId -> metrics
  return {
    open(streamId) {
      streams.set(streamId, { bytes: 0, events: 0, lastActivity: Date.now(), stalled: false });
    },
    record(streamId, { bytes = 0, event = false } = {}) {
      const s = streams.get(streamId);
      if (!s) return;
      s.bytes += bytes; if (event) s.events += 1;
      s.lastActivity = Date.now();
    },
    // Stall detection: no-data timeouts.
    stalled(streamId, { now = Date.now() } = {}) {
      const s = streams.get(streamId);
      if (!s) return false;
      const stalled = now - s.lastActivity > stallMs;
      s.stalled = stalled;
      return stalled;
    },
    close(streamId) { streams.delete(streamId); },
    report(streamId) { return streams.get(streamId) ?? null; },
  };
}

// Stream recovery: reconnect with backoff.
export function reconnectDelay(attempt, { baseMs = 1000, maxMs = 30_000 } = {}) {
  return Math.min(maxMs, baseMs * 2 ** attempt);
}
```

**Acceptance criteria:** metrics; stall detection; reconnect backoff.

### M3 — Conformance tests

**Reference code (`tests/unit/sse.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { formatEvent, keepAlive, sseHeaders, lastEventId } from "../../src/sse/protocol.js";
import { makeStreamHealth, reconnectDelay } from "../../src/sse/health.js";

describe("SSE protocol compliance", () => {
  it("formats data events", () => {
    expect(formatEvent({ data: "hello" })).toBe("data: hello\n\n");
  });
  it("formats multi-line data", () => {
    expect(formatEvent({ data: "a\nb" })).toBe("data: a\ndata: b\n\n");
  });
  it("includes event/id/retry fields", () => {
    const out = formatEvent({ data: "x", event: "delta", id: "1", retry: 3000 });
    expect(out).toContain("event: delta");
    expect(out).toContain("id: 1");
    expect(out).toContain("retry: 3000");
  });
  it("emits keep-alive comments", () => {
    expect(keepAlive()).toMatch(/^: keep-alive \d+\n\n$/);
  });
  it("sets text/event-stream headers", () => {
    expect(sseHeaders()["Content-Type"]).toBe("text/event-stream");
  });
});

describe("SSE stream health", () => {
  it("detects stalls", () => {
    const h = makeStreamHealth({ stallMs: 100 });
    h.open("s1");
    expect(h.stalled("s1", { now: Date.now() + 200 })).toBe(true);
  });
  it("computes reconnect backoff", () => {
    expect(reconnectDelay(0)).toBe(1000);
    expect(reconnectDelay(5)).toBe(32000);
  });
});
```

**Acceptance criteria:** conformance suite; simulated clients; interop.

### M4 — Integration + dashboard

**Reference code (`src/sse/integrate.js`):**

```js
// Executor integration: SSE output normalization.
export function normalizeStream(chunk, { event = "delta" } = {}) {
  if (typeof chunk === "string") return formatEvent({ data: chunk, event });
  return formatEvent({ data: chunk, event });
}

// Telemetry: SSE health view.
export function makeSseTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        streams: events.filter((e) => e.type === "open").length - events.filter((e) => e.type === "close").length,
        stalls: events.filter((e) => e.type === "stall").length,
        reconnects: events.filter((e) => e.type === "reconnect").length,
      };
    },
  };
}
```

**Files touched:** `src/sse/` (compliance fixes), `src/sse/handlers/chat.js` (keep-alives), `src/sse/protocol.js` (new), `src/sse/health.js` (new), `tests/unit/sse.test.js` (new), dashboard sse page (new).

**Acceptance criteria:** normalization; telemetry; dashboard.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Client incompatibility | Broken streams | Interop tests |
| Keep-alive overhead | Extra traffic | Configurable interval |
| Stall false positives | Wrong stalls | Threshold tuning |
| Reconnection storms | Load spikes | Backoff |

## Verification

- Unit: formatEvent, keepAlive, sseHeaders, makeStreamHealth, reconnectDelay
- Manual: stream with idle gap → stall detected; client reconnect with Last-Event-ID
- Regression: `tests/__baseline__/verify-no-regression.mjs`