# Verdict: af09eecf (chatCore conversationId signature merge)

**Row**: Stage 3 queue — KEEP+MERGE
**Date**: 2026-10-24
**Method**: MiMo 2.6 (dial/xiaomi-mimo-2.6) — APPROVE

## Decision

**APPROVE** — merge plan accepted with 6-step procedure.

## Context

- **OUR af09eecf** (9 files, 8 overlap): Adds `conversationId` parameter to `chatCore.js` signature + 5 sub-modules (nonStreamingHandler, requestDetail, sseToJsonHandler, streamingHandler), persists to usageRepo.js + schema.js, reads in chat.js.
- **UPSTREAM** (commit 8a842043): Adds `customPrompt` parameter to `chatCore.js` + claude-compat layer.
- **Both modify chatCore.js function signature** — our `conversationId` is orthogonal to upstream `customPrompt`.

## MiMo-approved merge plan

1. Rebase on upstream `8a842043` (take customPrompt first).
2. Add `conversationId` to `chatCore.js` alongside `customPrompt` (separate parameter).
3. Thread both parameters through the 5 sub-modules independently.
4. **Audit the 8 overlapping files**: ensure upstream `claude-compat` doesn't intercept or strip `conversationId`.
5. Confirm `usageRepo`/`schema` persist the ID without DB schema conflicts.
6. Run integration tests.

## Overlap files (from /tmp/overlap-af09eecf.txt)

- open-sse/handlers/chatCore.js
- open-sse/handlers/chatCore/nonStreamingHandler.js
- open-sse/handlers/chatCore/requestDetail.js
- open-sse/handlers/chatCore/sseToJsonHandler.js
- open-sse/handlers/chatCore/streamingHandler.js
- src/lib/db/repos/usageRepo.js
- src/lib/db/schema.js
- src/sse/handlers/chat.js

## OUR-only (1 file)

- src/lib/db/repos/conversationRepo.js (or similar — verify at replay time)

## Stage 4 action

Replay af09eecf after upstream 8a842043 lands. Merge chatCore.js signature to include BOTH `customPrompt` (upstream) and `conversationId` (ours). Verify claude-compat layer doesn't strip conversationId on its way through.

## Gateway verdict

```
model: xiaomi-mimo-2.6
status: 200
time: 31.7s
VERDICT: APPROVE.
```
