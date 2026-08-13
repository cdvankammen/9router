# Postmortem: Duplicate `[DONE]` SSE Sentinel in Passthrough Streaming

**Date:** 2026-08-06
**Author:** GitHub Copilot agent (main session)
**Status:** resolved
**Tags:** #learning #postmortem #streaming #sse #passthrough #done-leak

## Situation

During E2E testing of combo streaming with mock upstream (port 24000) through 9Router (port 20130), the SSE stream sent `data: [DONE]` **twice** to the client. This violates the OpenAI SSE protocol where `[DONE]` is a terminal sentinel — clients that parse it as "stream complete" may hang, error, or misbehave when receiving a second one.

**First observed:** When testing `model: "mockreal/gpt-4o-mini,mockreal/gpt-4o"` with `stream: true`. The curl output showed two consecutive `data: [DONE]` lines at the end of the stream.

## Investigation Timeline

### Step 1: Verify mock upstream sends exactly one `[DONE]`
```bash
curl -s -X POST http://127.0.0.1:24000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-4o-mini","stream":true,"messages":[{"role":"user","content":"hello"}]}' \
  | tail -5
```
Result: Exactly one `data: [DONE]` — mock is correct.

### Step 2: Test through 9Router (single model + combo)
- Single model streaming (`mockreal/gpt-4o-mini`): **2× `[DONE]`** ❌
- Combo streaming (`mockreal/gpt-4o-mini,mockreal/gpt-4o`): **2× `[DONE]`** ❌
- Non-streaming combo: Clean JSON ✅

This proved the bug is **passthrough-wide**, not combo-specific.

### Step 3: Search codebase for `[DONE]` emission
- Searched all `open-sse/**/*.js` and `src/sse/**/*.js` for literal `[DONE]` strings
- Found `streamDoneSent` flag in `open-sse/utils/stream.js` line ~80 — tracks duplicate prevention
- Found flush logic at line ~390: `if (!streamDoneSent && !isGeminiFamily)` adds `[DONE]`
- But NO code in passthrough `transform()` ever sets `streamDoneSent = true`

### Step 4: Trace the passthrough transform path
In `STREAM_MODE.PASSTHROUGH` transform (lines 105-210):
1. When upstream sends `data: [DONE]`, the condition `trimmed.slice(5).trim() !== "[DONE]"` **skips** the JSON parse block
2. Falls through to the generic forwarder (`if (!injectedUsage)`) which emits the line as-is
3. **`streamDoneSent` is never set to `true`**
4. In `flush()`, the guard `!streamDoneSent` passes → second `[DONE]` emitted

## Root Cause

The `streamDoneSent` tracking was implemented for **translate mode** (where `[DONE]` is detected via `parsed.done`) but was **never wired into passthrough mode**. Passthrough forwards raw lines without parsing them, so the flag never gets set.

This is an **original implementation gap** — not from any PR or external contribution. The passthrough mode was added later and the `[DONE]` tracking wasn't extended to cover it.

## Fix Applied

**File:** `open-sse/utils/stream.js`
**Location:** After line ~200, inside the passthrough `transform()` block, after output is enqueued

```javascript
// Track [DONE] sentinel to prevent duplicate emission in flush().
// Upstream already sent the terminator — don't re-emit on stream end.
if (trimmed === "data: [DONE]") {
  streamDoneSent = true;
}
```

**Why this works:** When the upstream's `[DONE]` line passes through the passthrough forwarder, we now mark it as sent. When `flush()` runs at stream end, the guard `!streamDoneSent` prevents the duplicate.

## Verification Results

| Test Case | Before Fix | After Fix |
|-----------|-----------|----------|
| Single-model streaming | 2× `[DONE]` | 1× `[DONE]` ✅ |
| Combo streaming | 2× `[DONE]` | 1× `[DONE]` ✅ |
| Non-streaming combo | Clean JSON | Clean JSON ✅ |
| Direct mock upstream | 1× `[DONE]` | 1× `[DONE]` (unchanged) |

All verified via curl against production standalone build on port 20130 with mock upstream on port 24000.

## Prevention

1. When adding new streaming modes or paths, always verify `[DONE]` sentinel handling
2. Add E2E tests that count `[DONE]` occurrences in streaming responses
3. Test both single-model AND combo paths — they share the same transform stream but have different entry points

## Related

- Commit: UNCOMMITTED (will be `fix(streaming): prevent duplicate [DONE] in passthrough mode`)
- Files changed: `open-sse/utils/stream.js` (+6 lines)
- No external PRs referenced — internal implementation gap
