# Implementation Plan 22 — Streaming Reliability — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #streaming #sse #backpressure #heartbeat #stall-detection #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/handlers/chatCore.js` stream setup, `open-sse/executors/default.js` SSE parsing, `src/sse/` stream plumbing).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, stream a response, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-22-streaming-reliability.md`, `../research/9router/37-streaming-reliability.md`

## Scope

**In scope:** SSE chunk validation/normalization; backpressure (buffer cap, drop-oldest or pause upstream); mid-stream error injection as OpenAI-compatible error chunk; heartbeats (`: ping`); stall detection; stream telemetry.
**Out of scope:** WebSocket transport; retransmission protocols.

## Milestones

### M1 — Chunk validation + normalization

**Reference code (`open-sse/services/streamNormalizer.js`):**

```js
// Validate + normalize upstream SSE chunks into OpenAI-compatible chunks.
export function normalizeChunk(raw, provider) {
  if (typeof raw !== "string") return null;
  const lines = raw.split("\n").filter((l) => l.startsWith("data:"));
  if (!lines.length) return null;
  const data = lines.map((l) => l.slice(5).trim()).join("\n");
  if (data === "[DONE]") return { done: true };
  try {
    const parsed = JSON.parse(data);
    return { done: false, chunk: normalizeShape(parsed, provider) };
  } catch {
    return { done: false, chunk: null, malformed: true }; // skip malformed
  }
}

function normalizeShape(parsed, provider) {
  // Ensure OpenAI-compatible: { choices: [{ delta: { content } }] }
  if (parsed.choices?.[0]?.delta) return parsed;
  if (parsed.choices?.[0]?.text) {
    return { ...parsed, choices: [{ delta: { content: parsed.choices[0].text } }] };
  }
  return parsed; // pass through; validator in plan 16 catches issues
}
```

**Acceptance criteria:** malformed chunks skipped; shapes normalized; `[DONE]` handled.

### M2 — Backpressure

**Reference code (`open-sse/services/backpressure.js`):**

```js
// Buffer with cap; drop-oldest or pause upstream when full.
export class StreamBuffer {
  constructor({ cap = 1000, strategy = "pause" } = {}) {
    this.cap = cap;
    this.strategy = strategy;
    this.queue = [];
    this.waiters = [];
  }

  async push(chunk) {
    if (this.queue.length >= this.cap) {
      if (this.strategy === "drop-oldest") {
        this.queue.shift(); // drop oldest
      } else {
        // pause: wait for consumer to drain
        await new Promise((resolve) => this.waiters.push(resolve));
      }
    }
    this.queue.push(chunk);
  }

  async next() {
    while (!this.queue.length) {
      await new Promise((resolve) => this.waiters.push(resolve));
    }
    const chunk = this.queue.shift();
    this.waiters.shift()?.();
    return chunk;
  }
}
```

**Acceptance criteria:** cap enforced; both strategies work; no unbounded memory.

### M3 — Error injection + heartbeats + stall detection

**Reference code (`open-sse/services/streamGuard.js`):**

```js
// Mid-stream error -> OpenAI-compatible error chunk.
export function errorChunk(error, requestId) {
  return `data: ${JSON.stringify({
    error: { code: error.code ?? "STREAM.INTERRUPTED", message: error.message, request_id: requestId },
  })}\n\n`;
}

// Heartbeat: send `: ping` every N ms to keep connection alive.
export function startHeartbeat(writer, { intervalMs = 15_000 } = {}) {
  const timer = setInterval(() => {
    writer.write(": ping\n\n");
  }, intervalMs);
  return () => clearInterval(timer);
}

// Stall detection: no chunk for N ms -> inject error + close.
export function watchStall(onChunk, { stallMs = 60_000 } = {}) {
  let last = Date.now();
  const timer = setInterval(() => {
    if (Date.now() - last > stallMs) {
      onChunk(errorChunk({ code: "STREAM.STALLED", message: "Upstream stalled" }));
      clearInterval(timer);
    }
  }, 5000);
  return { touch: () => { last = Date.now(); }, stop: () => clearInterval(timer) };
}
```

**Acceptance criteria:** error chunks injected; heartbeats sent; stall detection fires.

### M4 — Telemetry + tests

**Reference code (`src/lib/db/repos/streamRepo.js`):**

```js
export async function recordStreamMetrics({ requestId, chunks, bytes, durationMs, stalls, errors }) {
  const db = await getAdapter();
  await db.run(`
    INSERT INTO stream_metrics (request_id, chunks, bytes, duration_ms, stalls, errors, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [requestId, chunks, bytes, durationMs, stalls, errors, Date.now()]);
}
```

**Files touched:** `tests/unit/streaming.test.js` (new).

**Acceptance criteria:** metrics recorded; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Backpressure pauses upstream | Upstream may timeout | Short pause; drop-oldest option |
| Heartbeat noise | Clients may not expect `: ping` | Standard SSE comment; safe |
| Stall false positives | Slow-but-alive streams | Configurable stallMs |

## Verification

- Unit: normalization, backpressure, guard
- Manual: stream with slow upstream → verify heartbeat + no stall
- Regression: `tests/__baseline__/verify-no-regression.mjs`