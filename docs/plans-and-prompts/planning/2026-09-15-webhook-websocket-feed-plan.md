# Webhook Implementation Plan — WebSocket Real-Time Feed (R34)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r34 #websocket #realtime

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

Implement the WebSocket real-time feed (R34): a bidirectional channel for webhook events — dashboard live view AND potential inbound control (send commands back). This is the alternative to SSE (R33) when bidirectional or lower-latency delivery matters.

## Scope

**In scope:**
- WebSocket server on the existing HTTP server (custom-server.js)
- Client connection registry (per-session)
- Event push: outbox events → connected clients
- Heartbeat ping/pong + stale connection cleanup

**Out of scope (v1):**
- Inbound commands over WS (control plane — future)
- Multi-instance fan-out (needs Redis)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/ws.js` | new | WS server + connection registry |
| `custom-server.js` | edit | Attach WS upgrade handler |
| `src/components/webhooks/useWebSocket.js` | new | Client hook |

## Code

### 1. `src/lib/webhooks/ws.js`

```js
// src/lib/webhooks/ws.js
// WebSocket hub for webhook events. Uses the `ws` package (or native
// WebSocket in Node 22+ — agent decides).
import { WebSocketServer } from "ws";

const g = (global.__webhookWs ??= { wss: null, clients: new Set() });

/**
 * Attach a WebSocket server to the HTTP server.
 * @param {import("node:http").Server} server
 */
export function attachWebSocket(server) {
  if (g.wss) return g.wss;
  const wss = new WebSocketServer({ server, path: "/api/webhooks/ws" });
  g.wss = wss;

  wss.on("connection", (ws) => {
    g.clients.add(ws);
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    ws.on("close", () => g.clients.delete(ws));
    ws.on("error", () => g.clients.delete(ws));
  });

  // Heartbeat: ping every 30s, terminate dead connections
  const interval = setInterval(() => {
    for (const ws of g.clients) {
      if (!ws.isAlive) { ws.terminate(); g.clients.delete(ws); continue; }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30_000);
  interval.unref?.();

  return wss;
}

/**
 * Broadcast an event to all connected clients.
 * @param {object} event
 */
export function broadcastEvent(event) {
  const payload = JSON.stringify({ type: "webhook.event", data: event });
  for (const ws of g.clients) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}
```

### 2. `custom-server.js` — attach (edit)

```js
// In custom-server.js, after the HTTP server is created:
import { attachWebSocket } from "@/lib/webhooks/ws.js";
attachWebSocket(server);
```

### 3. `src/components/webhooks/useWebSocket.js`

```js
// src/components/webhooks/useWebSocket.js
"use client";
import { useEffect, useState } from "react";

export function useWebSocket() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/api/webhooks/ws`);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (msg) => {
      try {
        const { data } = JSON.parse(msg.data);
        setEvents((prev) => [data, ...prev].slice(0, 100));
      } catch { /* ignore */ }
    };
    return () => ws.close();
  }, []);

  return { events, connected };
}
```

## Acceptance Criteria

- [ ] WS server at `/api/webhooks/ws` (attached to custom-server)
- [ ] Events broadcast to all connected clients
- [ ] Ping/pong heartbeat + stale cleanup
- [ ] Client hook with auto-reconnect

## Testing

```bash
# Manual: node -e "const ws=new WebSocket('ws://localhost:20128/api/webhooks/ws'); ws.onmessage=e=>console.log(e.data)"
# then trigger an event → message appears
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R34)
- Plan: `../planning/2026-09-15-webhook-sse-feed-plan.md` (SSE alternative)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`