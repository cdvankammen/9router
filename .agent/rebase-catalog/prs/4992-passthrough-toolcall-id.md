# Issue #4992 — Passthrough forwards delta.tool_calls fragment that opens new index without id
- **Status:** Open (issue), fixed via commit 95c9d03 in v0.5.109 "fix(stream): fill missing tool-call ids and restore renamed tool names (#4992, #4986)"
- Symptom: passthrough (openai→openai) parses + re-emits SSE but never normalizes delta.tool_calls[].index/[].id. Strict OpenAI-compatible SDK clients (@ai-sdk/openai-compatible) abort with AI_InvalidResponseDataError: Expected 'id' to be a string.
- Root cause: createPassthroughStreamWithLogger only fixes top-level chunk id (fixInvalidId). Never touches delta.tool_calls. hasValuableContent keeps any chunk with tool_calls.length > 0, so malformed frames forward as-is.
- Fix: ensureStreamToolCallIds() remembers id per tool-call index, mints one when fragment opens new index unseen by client. Later fragments with same index reuse it (id stable for rest of call). Also restores caller tool names on openai→openai passthrough when renamed by OpenCode fingerprint.
- Reproduced rarely (2x in ~250-message tool-heavy session with 34 tools + THINK:max).
- Relevance: **HIGH** — stream.js + passthrough logic is in our 53-file overlap territory. Our branch had streamingHandler changes. Must verify ensureStreamToolCallIds is present.
