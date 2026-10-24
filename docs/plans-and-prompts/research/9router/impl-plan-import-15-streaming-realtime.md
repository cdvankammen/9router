# Implementation Plan 15: Streaming & Real-Time Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, streaming, real-time, sse, ndjson

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-u-streaming-realtime.md` (primary — NDJSON streaming, SSE push, live tail)
- `../2026-09-17-hermes-import-branch-f-proxy-intercept.md` (proxy stream tee-ing into the import pipeline)
- `../2026-09-17-hermes-import-branch-k-performance-scalability.md` (backpressure and throughput targets)

## Goal

Real-time ingestion: NDJSON streaming uploads, SSE push from agents, live log tailing, incremental dashboard updates. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| Adapter API | `db.run/get/all/exec` positional params — **no `.prepare()`, no named `@param` objects** |
| `getRecentImports` signature | Plan 01: `getRecentImports(sinceIso)` — takes an **ISO string**, NOT `{ since: Date.now() }` (original plan was wrong) |
| `insertImportedMessages` | Plan 01: batch insert with `INSERT OR IGNORE`, returns `{ imported, duplicates }` — reuse it instead of raw inserts |
| `crypto` | Must import `node:crypto` |
| SSE precedent | `src/sse/` — the app already has SSE infrastructure for chat streaming |

## Scope

- NDJSON streaming POST
- SSE event ingestion endpoint
- Live dashboard SSE updates
- Backpressure handling

## Design

### 1. NDJSON Streaming Import — `src/app/api/messages/import/stream/route.js`

**Purpose:** Stream NDJSON lines, enrich + batch-insert via plan 01's repo.

**⚠️ GROUNDING FIXES (original plan was wrong):**
1. Used `db.prepare(...)` with named `@param` objects — adapter has no `.prepare()`. **Reuse `insertImportedMessages` from plan 01** instead of raw inserts.
2. `crypto` not imported — add `import crypto from "node:crypto"`.

```javascript
// src/app/api/messages/import/stream/route.js
// SUGGESTION ONLY — review against actual codebase before implementing
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { matchBatch } from "@/lib/import/matcher.js";
import { computeFingerprint } from "@/lib/import/fingerprint.js";
import { insertImportedMessages } from "@/lib/db/repos/importedMessagesRepo.js";

export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("ndjson") && !contentType.includes("x-ndjson")) {
    return NextResponse.json({ error: "Content-Type must be application/x-ndjson" }, { status: 400 });
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let imported = 0;
  let duplicates = 0;
  let errors = 0;

  const batch = [];
  const FLUSH_SIZE = 100;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        const enriched = await enrichMessage(msg);
        batch.push(enriched);
        if (batch.length >= FLUSH_SIZE) {
          const r = await insertImportedMessages(batch); // plan 01 repo
          imported += r.imported;
          duplicates += r.duplicates;
          batch.length = 0;
        }
      } catch (e) {
        errors++;
      }
    }
  }
  if (buffer.trim()) {
    try {
      const msg = JSON.parse(buffer);
      batch.push(await enrichMessage(msg));
    } catch (e) {
      errors++;
    }
  }
  if (batch.length) {
    const r = await insertImportedMessages(batch);
    imported += r.imported;
    duplicates += r.duplicates;
  }

  return NextResponse.json({ imported, duplicates, errors });
}

async function enrichMessage(msg) {
  const match = matchBatch([msg]); // sync (plan 02)
  const m = match[0];
  const fp = computeFingerprint(m);
  return {
    id: `import-${crypto.randomUUID()}`,
    source: "stream",
    sourceSessionId: m.sourceSessionId || null,
    provider: m.provider,
    model: m.model,
    modelMatchConfidence: m.confidence,
    status: m.status || "success",
    latencyMs: m.latencyMs ?? null,
    promptTokens: m.promptTokens ?? null,
    completionTokens: m.completionTokens ?? null,
    totalTokens: m.totalTokens ?? null,
    cost: m.cost ?? null,
    requestJson: m.request ? JSON.stringify(m.request) : null,
    responseJson: m.response ? JSON.stringify(m.response) : null,
    errorMessage: m.errorMessage || null,
    errorCategory: m.errorCategory || null,
    conversationId: m.conversationId || null,
    sourceApp: m.sourceApp || "stream",
    metadata: m.metadata ? JSON.stringify(m.metadata) : null,
    fingerprint: fp,
  };
}
```

### 2. SSE Event Ingestion (Agent Push) — `src/app/api/messages/import/events/route.js`

**Purpose:** Accept SSE events (`message.started`/`chunk`/`completed`/`failed`) and assemble full messages.

```javascript
// src/app/api/messages/import/events/route.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { NextResponse } from "next/server";
import { insertImportedMessages } from "@/lib/db/repos/importedMessagesRepo.js";

const pending = new Map(); // conversationId -> partial message

export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    return NextResponse.json({ error: "Content-Type must be text/event-stream" }, { status: 400 });
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    for (const event of events) {
      if (!event.trim()) continue;
      const lines = event.split("\n");
      const dataLine = lines.find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const data = JSON.parse(dataLine.slice(5).trim());
      await handleEvent(data);
    }
  }
  return NextResponse.json({ ok: true });
}

async function handleEvent(event) {
  const { type, conversationId, ...payload } = event;
  if (!conversationId) return;

  if (type === "message.started") {
    pending.set(conversationId, { ...payload, chunks: [] });
  } else if (type === "message.chunk") {
    const partial = pending.get(conversationId);
    if (partial) partial.chunks.push(payload.chunk);
  } else if (type === "message.completed") {
    const partial = pending.get(conversationId);
    if (partial) {
      const fullMessage = assembleMessage(partial, payload);
      await insertImportedMessages([fullMessage]); // plan 01 repo
      pending.delete(conversationId);
    }
  } else if (type === "message.failed") {
    const partial = pending.get(conversationId);
    if (partial) {
      const fullMessage = { ...partial, ...payload, status: "error" };
      await insertImportedMessages([fullMessage]);
      pending.delete(conversationId);
    }
  }
}

function assembleMessage(partial, completion) {
  // Combine chunks into full request/response
  return {
    ...partial,
    response: partial.chunks.join(""),
    status: completion.status || "success",
    errorMessage: completion.error,
    latencyMs: completion.latencyMs,
    tokens: completion.tokens,
    cost: completion.cost,
  };
}
```

### 3. Dashboard SSE (Live Updates) — `src/app/api/messages/import/stream/route.js` (GET)

**Purpose:** Push new imports to the dashboard. **Use plan 01's `getRecentImports(sinceIso)` signature.**

**⚠️ GROUNDING FIX:** Original called `getRecentImports({ since: Date.now() - 5000 })` — plan 01 defines `getRecentImports(sinceIso)` taking an ISO string.

```javascript
// src/app/api/messages/import/stream/route.js (GET)
// SUGGESTION ONLY — review against actual codebase before implementing
export async function GET(request) {
  const encoder = new TextEncoder();
  let interval;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial snapshot
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));
      // Poll for new imports every 2s
      interval = setInterval(async () => {
        const { getRecentImports } = await import("@/lib/db/repos/importedMessagesRepo.js");
        const recent = await getRecentImports(new Date(Date.now() - 5000).toISOString()); // ISO string
        if (recent.length) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "new", messages: recent })}\n\n`));
        }
      }, 2000);
    },
    cancel() {
      clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
```

### 4. Backpressure — `src/lib/import/backpressure.js`

**Purpose:** Buffer with pause/resume for producers.

```javascript
// src/lib/import/backpressure.js
// SUGGESTION ONLY — review against actual codebase before implementing
export class BackpressureBuffer {
  constructor(maxSize = 10_000) {
    this.maxSize = maxSize;
    this.buffer = [];
    this.paused = false;
    this.drainPromise = null;
  }

  push(item) {
    if (this.buffer.length >= this.maxSize) {
      this.paused = true;
      this.drainPromise = new Promise((resolve) => { this.drainResolve = resolve; });
      return this.drainPromise; // caller awaits this
    }
    this.buffer.push(item);
    return Promise.resolve();
  }

  shift() {
    const item = this.buffer.shift();
    if (this.paused && this.buffer.length < this.maxSize * 0.5) {
      this.paused = false;
      if (this.drainResolve) this.drainResolve();
    }
    return item;
  }

  get length() { return this.buffer.length; }
}
```

## Steps (per-part instructions)

### Step 1 — `stream/route.js` POST — NDJSON streaming import
1. Create the route using `insertImportedMessages` (plan 01).
2. **Verify:** `curl -H 'content-type: application/x-ndjson' --data-binary @messages.ndjson` → `{ imported, duplicates, errors }`.

### Step 2 — `events/route.js` POST — SSE event ingestion
1. Create the route.
2. **Verify:** send `message.started` + chunks + `message.completed` → one assembled message imported.

### Step 3 — `stream/route.js` GET — Dashboard SSE live updates
1. Add the GET handler using `getRecentImports(sinceIso)`.
2. **Verify:** `curl -N` shows `data: {"type":"new",...}` within 2s of an import.

### Step 4 — `backpressure.js` — buffer with pause/resume
1. Create the file.
2. **Verify:** pushing past maxSize returns a drain promise; shift below 50% resolves it.

### Step 5 — UI: connect to SSE, show live counter
1. In the Messages page, connect to the SSE stream, show a live counter.
2. **Verify:** new imports appear without refresh.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| ReadableStream | Browser support | Polyfill if needed |
| SSE connections | Connection limits | Close idle after 5m |
| Partial messages | Memory leak | TTL on pending map |

## Verification (commands)

```bash
# NDJSON stream
printf '{"model":"gpt-4o","request":{"messages":[{"role":"user","content":"hi"}]}}\n{"model":"claude-3-5-sonnet-20241022","request":{"messages":[{"role":"user","content":"yo"}]}}\n' \
  | curl -X POST http://localhost:20128/api/messages/import/stream \
    -H 'content-type: application/x-ndjson' --data-binary @-
# Expect: { "imported": 2, "duplicates": 0, "errors": 0 }
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.