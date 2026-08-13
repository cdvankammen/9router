# ADR-005: SSE [DONE] Sentinel Tracking in Passthrough Mode

**Date:** 2026-08-06
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #decision #streaming #sse #passthrough #bug-fix

## Context

During E2E testing of streaming responses through 9Router, both single-model and combo streaming paths sent `data: [DONE]` **twice** to the client. The OpenAI SSE protocol specifies `[DONE]` as a terminal sentinel — receiving it twice can confuse downstream clients.

The `streamDoneSent` flag already existed in `open-sse/utils/stream.js` to prevent duplicate emission, but it was only wired into **translate mode** (where `[DONE]` is detected via `parsed.done`). **Passthrough mode** forwards raw lines without parsing, so the flag was never set.

## Decision

Add explicit `[DONE]` tracking in the passthrough `transform()` path:

```javascript
if (trimmed === "data: [DONE]") {
  streamDoneSent = true;
}
```

This is placed after the passthrough forwarder enqueues the output, ensuring the flag is set before `flush()` runs.

## Why

- Minimal change (4 lines) — no restructuring needed
- Mirrors the existing translate-mode tracking pattern
- Preserves the Gemini-family exception (Gemini rejects `[DONE]` sentinels)
- No performance impact (string comparison on one line per stream)

## Alternatives Rejected

- **Strip `[DONE]` in passthrough and always re-emit in flush** — would break providers that don't send `[DONE]` (some close the stream silently)
- **Parse `[DONE]` in passthrough like translate mode** — unnecessary overhead; passthrough intentionally avoids JSON parsing for performance
- **Remove flush `[DONE]` emission entirely** — would break clients that require the sentinel (OpenClaw, some SDKs)

## Consequences

- All passthrough streaming now sends exactly one `[DONE]`
- Translate mode behavior unchanged
- Gemini-family exception preserved
- No breaking changes to any client

## Verification

| Test Case | Before | After |
|-----------|--------|-------|
| Single-model streaming | 2× `[DONE]` | 1× `[DONE]` ✅ |
| Combo streaming | 2× `[DONE]` | 1× `[DONE]` ✅ |
| Non-streaming combo | Clean JSON | Clean JSON ✅ |
| Direct mock upstream | 1× `[DONE]` | 1× `[DONE]` ✅ |

## Related

- Learning: `../learnings/2026-08-06-sse-done-duplicate-leak.md`
- File: `open-sse/utils/stream.js` (+6 lines)
- No external PRs — internal implementation gap
