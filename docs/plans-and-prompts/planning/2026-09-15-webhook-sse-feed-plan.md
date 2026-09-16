# Webhook Implementation Plan — SSE Real-Time Feed (R33)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r33 #sse #realtime

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **The code in this plan is a starting point, not a final decision.**
> Every agent that reads this plan MUST review the code below and make a decision:
> is there a better way to implement this? If yes, **make those changes happen** —
> update the code, note the improvement, and proceed. Do not treat this code as
> sacred. It follows 9router's existing conventions (dashboard SSE streams),
> but the agent is the final arbiter of implementation quality.

---

## Objective

Implement the SSE real-time feed (R33): a dashboard stream that shows webhook events as they happen. This is the "live event log" — the M3 dashboard action already has a listener Set; this plan wires it to a real SSE endpoint.

## Scope

**In scope:**
- `GET /api/webhooks/stream` — SSE endpoint (text/event-stream)
- Event source client hook for the dashboard
- Reconnect + `Last-Event-ID` resume (optional)
- Heartbeat comments to keep connections alive

**Out of scope (v1):**
- WebSocket (separate plan R34)
- Historical events in the stream (event log API covers that)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/app/api/webhooks/stream/route.js` | new | SSE endpoint |
| `src/lib/webhooks/actions/dashboard.js` | edit | Wire listeners to SSE |
| `src/components/webhooks/useEventStream.js` | new | Client hook |

## Code

### 1. `src/app/api/webhooks/stream/route.js`

```js
// src/app/api/webhooks/stream/route.js
// GET /api/webhooks/stream — SSE live event feed.
import { addDashboardListener } from "@/lib/webhooks/actions/dashboard.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Heartbeat every 15s to keep the connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      const unsubscribe = addDashboardListener((payload) => {
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          /* client gone */
        }
      });

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

### 2. `src/components/webhooks/useEventStream.js`

```js
// src/components/webhooks/useEventStream.js
"use client";
import { useEffect, useState } from "react";

/**
 * Subscribe to the webhook SSE stream.
 * @returns {{events: Array, connected: boolean}}
 */
export function useEventStream() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/webhooks/stream");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        setEvents((prev) => [event, ...prev].slice(0, 100)); // keep last 100
      } catch { /* ignore malformed */ }
    };
    return () => es.close();
  }, []);

  return { events, connected };
}
```

### 3. `src/lib/webhooks/actions/dashboard.js` — already has the listener Set

```js
// No change needed — the SSE route consumes addDashboardListener directly.
// The M3 dashboard action pushes events into the same Set.
```

## Acceptance Criteria

- [ ] `GET /api/webhooks/stream` streams events as they happen
- [ ] Heartbeat pings every 15s
- [ ] Client hook reconnects automatically (EventSource built-in)
- [ ] Dashboard action (M3) feeds the same stream

## Testing

```bash
# Manual: curl -N http://localhost:20128/api/webhooks/stream
# then trigger an event → data line appears
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R33)
- Plan: `../planning/2026-09-15-webhook-m3-rule-engine-actions-plan.md` (dashboard action)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`