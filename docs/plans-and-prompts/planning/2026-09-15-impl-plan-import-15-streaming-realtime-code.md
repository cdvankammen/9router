# Implementation Plan Import-15 — Streaming & Real-Time Import — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #streaming #real-time #sse #ndjson #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (adapter API `db.run/get/all/exec` positional params — **no `.prepare()`, no named `@param` objects**; `getRecentImports(sinceIso)` — takes an **ISO string**, NOT `{ since: Date.now() }`; `insertImportedMessages` — batch insert with `INSERT OR IGNORE`, returns `{ imported, duplicates }` — **reuse it instead of raw inserts**; `crypto` must import `node:crypto`; SSE precedent from `src/sse/` — the app already has SSE infrastructure for chat streaming).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — NDJSON; SSE; backpressure.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-15-streaming-realtime.md`, `../research/9router/impl-plan-import-01-db-schema.md`, `../research/9router/impl-plan-import-13-deduplication-idempotency.md`.

## Scope

**In scope:** NDJSON streaming POST; SSE event ingestion endpoint; live dashboard SSE updates; backpressure handling.
**Out of scope:** deduplication (import-13); log watcher (import-04).

## Milestones

### M1 — NDJSON streaming import

**Reference code (`src/app/api/messages/import/stream/route.js`):**

```js
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
          const r = await insertImportedMessages(batch); // plan import-01 repo
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
  const match = matchBatch([msg]); // sync (plan import-02)
  const m = match[0];
  const fp = computeFingerprint(m);
  return {
    id: `import-${crypto.randomUUID()}`,
    source: "stream",
    sourceSessionId: m.sourceSessionId || null,
    provider: m.provider,
    model: m.model,
    status: m.status ?? "success",
    latencyMs: m.latencyMs ?? null,
    promptTokens: m.promptTokens ?? null,
    completionTokens: m.completionTokens ?? null,
    totalTokens: m.totalTokens ?? null,
    cost: m.cost ?? null,
    request: m.request ?? null,
    response: m.response ?? null,
    errorMessage: m.errorMessage ?? null,
    errorCategory: m.errorCategory ?? null,
    conversationId: m.conversationId ?? null,
    sourceApp: m.sourceApp ?? "stream",
    metadata: { fingerprint: fp },
  };
}
```

**Acceptance criteria:** NDJSON stream; batch flush; counts.

### M2 — SSE ingestion endpoint

**Reference code (`src/app/api/messages/import/sse/route.js`):**

```js
import { NextResponse } from "next/server";
import { insertImportedMessages } from "@/lib/db/repos/importedMessagesRepo.js";

// SSE event ingestion: agents POST events; dashboard receives live updates.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.messages) return NextResponse.json({ error: "messages required" }, { status: 400 });
  const r = await insertImportedMessages(body.messages);
  return NextResponse.json({ ok: true, ...r });
}

// Live dashboard SSE stream.
export async function GET(request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      // Subscribe to import events (in-memory bus).
      globalThis.__importBus?.subscribe(send);
      send({ type: "connected" });
    },
    cancel() {
      globalThis.__importBus?.unsubscribe?.();
    },
  });
  return new NextResponse(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" },
  });
}
```

**Acceptance criteria:** POST ingest; GET SSE stream.

### M3 — Backpressure

**Reference code (`src/lib/import/backpressure.js`):**

```js
// Simple token-bucket backpressure for streaming imports.
export function makeBackpressure({ maxTokens = 1000, refillPerSec = 100 } = {}) {
  let tokens = maxTokens;
  let last = Date.now();
  return {
    // take: true if a token is available.
    take() {
      const now = Date.now();
      tokens = Math.min(maxTokens, tokens + ((now - last) / 1000) * refillPerSec);
      last = now;
      if (tokens < 1) return false;
      tokens -= 1;
      return true;
    },
    available() { return tokens; },
  };
}
```

**Acceptance criteria:** token bucket; refill.

### M4 — Tests

**Reference code (`tests/unit/import-stream.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { makeBackpressure } from "@/lib/import/backpressure.js";

describe("makeBackpressure", () => {
  it("allows up to maxTokens", () => {
    const bp = makeBackpressure({ maxTokens: 3, refillPerSec: 0 });
    expect(bp.take()).toBe(true);
    expect(bp.take()).toBe(true);
    expect(bp.take()).toBe(true);
    expect(bp.take()).toBe(false);
  });
});
```

**Files touched:** `src/app/api/messages/import/stream/route.js` (new), `src/app/api/messages/import/sse/route.js` (new), `src/lib/import/backpressure.js` (new), `tests/unit/import-stream.test.js` (new).

**Acceptance criteria:** tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Stream errors | Partial imports | Per-line try/catch |
| Memory growth | Large streams | Batch flush |
| SSE leaks | Open connections | cancel cleanup |
| Backpressure | Dropped events | Token bucket |

## Verification

- Unit: POST stream, makeBackpressure
- Manual: stream NDJSON → verify counts; SSE → live updates
- Regression: `tests/__baseline__/verify-no-regression.mjs`