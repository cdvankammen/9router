# STREAMING-FIXES Cluster — Deep Research

**Date:** 2026-08-13
**Cluster PRs:** #3051, #3081, #3069
**Base:** decolua/9router `master`

---

## Executive Summary

| PR | Title | Author | Files | Risk | Tier | Verdict |
|----|-------|--------|-------|------|------|---------|
| **#3051** | fix(stream): empty stream returns HTTP 200 with empty body | omar-nahhas | 2 | LOW | T1 | ✅ **Merge now.** Production-verified fix for silent failures. |
| **#3081** | fix(stream): inject stream_options.include_usage | thatssoheil | 2 | LOW | T1 | ✅ **Merge now.** Fixes 0-token streaming usage. (Also in translator-compat cluster — analyzed in 06.) |
| **#3069** | fix(open-sse): ESM interop for plain-Node consumers | vianhanif | 4 | LOW | T1 | ✅ **Merge now.** Enables standalone Node usage of open-sse. |

### Key Findings
1. **All 3 are independent, low-risk, merge-ready.** No file conflicts between them.
2. **#3051 fixes a real production incident**: expired Claude OAuth → empty stream → HTTP 200 with 0-byte body → everything recorded as success. Exactly the class of silent failure that hides auth problems.
3. **#3081 overlaps with translator-compat cluster** — it was analyzed there as `stream_options.include_usage` injection in `default.js`. Cross-reference 06-translator-compat-research.md.
4. **#3069 is foundational** — enables `open-sse/` to be consumed by plain Node (not just Next.js bundler). Important for the standalone-server / CLI use cases this repo supports.

---

## Per-PR Detailed Analysis

### PR #3051 — fix(stream): an empty stream returns HTTP 200 with an empty body
**Tier: T1 — Merge now**

| Field | Value |
|-------|-------|
| Author | omar-nahhas |
| Files | 2 |
| Commits | 1 |
| Risk | LOW |
| Production | Running in production since incident |

**Problem:** A request producing nothing reaches the caller as `HTTP 200` with zero-byte body. Found in production when a Claude account's OAuth expired while the connection was still marked active:

```
$ curl -w '%{http_code} %{size_download}' … -d '{"model":"cc/claude-opus-5", …}'
200 0
```

…while `requestDetails` recorded `status: success` with `[Empty streaming response]`. Every layer agreed nothing was wrong.

**Two failures, two fixes:**
1. **Recorded as success:** `status: "success"` hardcoded in `onStreamComplete` → now `status: "error"` + `EMPTY STREAM` log line.
2. **Caller got silence:** headers already committed when empty stream is known → inject in-band error frame:
```
data: {"error":{"message":"Upstream returned an empty stream — no content was produced. The provider connection may be unauthenticated or unavailable.","type":"upstream_empty_response","code":"empty_stream"}}
data: [DONE]
```

**Proposed patch (streaming handler):**
```javascript
// After transformStream, count output bytes:
let outBytes = 0;
// ... in the pipe loop:
outBytes += chunk.length;
// On complete:
if (outBytes === 0) {
  // Fix 1: truthful status
  onStreamComplete({ status: "error", error: "EMPTY STREAM" });
  // Fix 2: in-band error frame (headers already sent)
  controller.enqueue(encodeSSE({
    error: {
      message: "Upstream returned an empty stream — no content was produced. The provider connection may be unauthenticated or unavailable.",
      type: "upstream_empty_response",
      code: "empty_stream",
    },
  }));
  controller.enqueue(encodeSSE("[DONE]"));
} else {
  onStreamComplete({ status: "success" });
}
```

**Safety:** Guard sits after `transformStream`; fires only on literally zero bytes. A legitimate completion always emits role delta + finish_reason + `[DONE]`. Byte-identical passthrough verified (111 vs 224 bytes with error frame).

**Assessment:** LOW risk, high value. Fixes silent failure class.
**Verdict: MERGE NOW.**

---

### PR #3081 — fix(stream): inject stream_options.include_usage
**Tier: T1 — Merge now**

| Field | Value |
|-------|-------|
| Author | thatssoheil |
| Files | 2 (`open-sse/executors/default.js`, test) |
| Closes | #3017 |
| Risk | LOW |

**Problem:** Streaming usage showed 0 tokens because many providers (OpenAI, DeepSeek) require explicit opt-in via `stream_options: { include_usage: true }`.

**Proposed patch:**
```javascript
// default.js:
transformRequest(model, body, stream) {
  // ...existing transforms...
  if (stream && transformed.messages && !transformed.stream_options) {
    transformed.stream_options = { include_usage: true };
  }
}
```

**Full analysis in 06-translator-compat-research.md** (same PR was categorized in both clusters).
**Verdict: MERGE NOW.** Merge before #3116 (both touch default.js, different locations).

---

### PR #3069 — fix(open-sse): ESM interop fixes for plain-Node consumers
**Tier: T1 — Merge now**

| Field | Value |
|-------|-------|
| Author | vianhanif |
| Files | 4 |
| Commits | 2 |
| Risk | LOW |

**Problem:** `open-sse` is written as ES modules but `9router/package.json` has no `"type"` field, so plain-Node consumers (standalone server, test runner, scripts) default to CJS and hit three failures:

**Fix 1 — Top-level await in `cursor.js`:**
```javascript
// BEFORE: esbuild: "Top-level await not supported with cjs output format"
await import('http2');
// AFTER: synchronous, works in CJS + ESM:
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const http2 = require("http2");
```

**Fix 2 — Named import from `node-machine-id` in `machineId.js`:**
```javascript
// BEFORE: Node ESM rejects UMD bundle without named-export map
import { machineIdSync } from 'node-machine-id';
// AFTER: load via CJS require path where destructuring works
const { machineIdSync } = require("node-machine-id");
```

**Fix 3 — No `package.json` in `open-sse/`:**
```json
// open-sse/package.json (NEW):
{
  "type": "module"
}
```
Scopes ESM declaration to `open-sse` only; leaves CLI, tests, scripts unaffected.

**Assessment:** No behavior change for Next.js app (bundler already handled interop). Only affects direct Node consumers. Verified: plain `tsx server.ts` and `node --import tsx server.ts` boot without errors.

**Note:** A second commit is unrelated scope creep (`chore: ignore .serena and apps/ local dev artifacts` — gitignore additions). Can merge both or cherry-pick fix only.

**Verdict: MERGE NOW.** Foundational for standalone/CLI use.

---

## Conflict Matrix

| File | PRs |
|------|-----|
| `open-sse/executors/default.js` | #3081 (also #3116 in translator cluster) |
| `open-sse/executors/cursor.js` | #3069 |
| `open-sse/utils/machineId.js` | #3069 |
| `open-sse/package.json` (new) | #3069 |
| streaming handlers | #3051 |

No intra-cluster conflicts. #3081's `default.js` change interacts with #3116 (translator cluster) — merge #3081 first.

## Recommended Merge Order

```
1. #3069  (ESM interop — foundational, enables other consumers)
2. #3051  (empty stream guard — production incident fix)
3. #3081  (stream_options — usage accuracy)
```

All three can merge in parallel safely (no shared files).
