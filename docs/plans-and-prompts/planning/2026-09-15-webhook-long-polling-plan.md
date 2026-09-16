# Webhook Implementation Plan — Long-Polling Fallback (R35)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r35 #long-polling

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **The code in this plan is a starting point, not a final decision.**
> Every agent that reads this plan MUST review the code below and make a decision:
> is there a better way to implement this? If yes, **make those changes happen** —
> update the code, note the improvement, and proceed. Do not treat this code as
> sacred. It follows 9router's existing conventions, but the agent is the final
> arbiter of implementation quality.

---

## Objective

Implement the long-polling fallback (R35): a `GET /api/webhooks/poll` endpoint that holds the request open until an event arrives (or timeout). This is the compatibility path for clients that can't do SSE/WebSocket — and the pattern used by many chat/notification clients.

## Scope

**In scope:**
- `GET /api/webhooks/poll?since=<cursor>` — holds open up to 25s
- Cursor-based: returns events after `since` (event_id or timestamp)
- Empty response on timeout (client re-polls)
- Batch: returns all events since cursor, not just one

**Out of scope (v1):**
- Streaming (that's SSE — R33)
- Push (that's WS — R34)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/app/api/webhooks/poll/route.js` | new | Long-poll endpoint |
| `src/lib/webhooks/poller.js` | new | Wait-for-event helper |

## Code

### 1. `src/lib/webhooks/poller.js`

```js
// src/lib/webhooks/poller.js
// Wait-for-event helper: resolves when a new event arrives or timeout.
import { on } from "./bus.js";

/**
 * Wait for events after a cursor, or timeout.
 * @param {string} since - cursor (event_id or ISO timestamp)
 * @param {number} timeoutMs - max hold time (default 25s)
 * @returns {Promise<Array>} new events (empty on timeout)
 */
export function waitForEvents(since, timeoutMs = 25_000) {
  return new Promise((resolve) => {
    const collected = [];
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(collected);
    }, timeoutMs);

    const unsubscribe = on("*", (event) => {
      collected.push(event);
      // Resolve early if we have events (client can re-poll for more)
      clearTimeout(timer);
      unsubscribe();
      resolve(collected);
    });
  });
}
```

### 2. `src/app/api/webhooks/poll/route.js`

```js
// src/app/api/webhooks/poll/route.js
// GET /api/webhooks/poll?since=<cursor> — long-poll for new events.
import { NextResponse } from "next/server";
import { waitForEvents } from "@/lib/webhooks/poller.js";
import { getAdapter } from "@/lib/db/driver.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") || "";

  // First: return any events already stored after the cursor
  const db = await getAdapter();
  const rows = since
    ? await db.all("SELECT * FROM webhook_events WHERE event_id > ? ORDER BY created_at ASC LIMIT 50", [since])
    : await db.all("SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 50");

  if (rows.length) {
    return NextResponse.json({ events: rows, cursor: rows[rows.length - 1].event_id });
  }

  // No stored events: hold the request until one arrives (or timeout)
  const fresh = await waitForEvents(since, 25_000);
  return NextResponse.json({
    events: fresh,
    cursor: fresh.length ? fresh[fresh.length - 1].event_id : since,
  });
}
```

## Acceptance Criteria

- [ ] Request holds open up to 25s when no events
- [ ] Returns all events after cursor (batch)
- [ ] Empty + same cursor on timeout (client re-polls)
- [ ] Works alongside SSE/WS (all three can coexist)

## Testing

```bash
# Manual: curl -N "http://localhost:20128/api/webhooks/poll" (holds ~25s)
# trigger an event in another terminal → it returns immediately
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R35)
- Plan: `../planning/2026-09-15-webhook-sse-feed-plan.md` (SSE alternative)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`