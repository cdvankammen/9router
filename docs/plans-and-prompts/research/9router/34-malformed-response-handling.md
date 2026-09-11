---
title: "34 — Malformed/Improperly Formatted Response Handling (9router + Hermes)"
date: 2026-09-08
author: Hermes Agent (research campaign, wave: malformed-response)
status: complete
tags: [9router, malformed, json-repair, sse, response-validation, error-registry]
---

## 1. Problem Statement

Providers sometimes return responses that are not properly formed. These are
NOT HTTP errors — the request succeeds, status is 200, but the payload is
broken. Verified failure modes:

1. **Empty choices**: `{"choices": []}` or `{"choices": [{}]}` with no content
2. **Truncated JSON** (non-streaming): cut off mid-string / missing closing braces
3. **Truncated SSE stream**: stream ends before `[DONE]`, partial final chunk
4. **Missing fields**: no `delta.content`, no `message`, no `choices[0].message.content`
5. **Wrong content-type**: HTML error page from Cloudflare/nginx instead of SSE (9router already handles this — verified in streamingHandler.js)
6. **Fenced/markdown-wrapped JSON**: ```json ... ``` blocks
7. **Python literals**: `None`, `True`, `False`, `NaN` instead of JSON null/true/false
8. **Tool call arguments as broken JSON strings**: `parseToolArguments` silently returns `{}` today (verified in nonStreamingHandler.js line: `catch { return {}; }`)

## 2. Verified 9router Gap Analysis (from source, 2026-09-08)

| File | What exists today | Gap |
|---|---|---|
| `open-sse/config/errorConfig.js` | ERROR_RULES flat text/status substring rules | No content-shape rules (choices.length, finish_reason) |
| `open-sse/utils/errorCategorizer.js` | categorizeError(status, text) | Only gets status+text; never sees response body shape |
| `open-sse/utils/error.js` | parseUpstreamError reads body, JSON.parse, falls back to raw text | Silently accepts JSON that parses but is malformed semantically |
| `open-sse/utils/streamHandler.js` | Stall watchdog on raw bytes (STREAM_STALL_TIMEOUT_MS); network-close graceful handling | No partial-JSON SSE repair; no validation of accumulated content |
| `open-sse/handlers/chatCore/nonStreamingHandler.js` | parseToolArguments catch → `{}`; translateNonStreamingResponse assumes choices[0] exists | Empty choices passes through to client as success; broken tool args become `{}` |
| `open-sse/handlers/chatCore/streamingHandler.js` | Non-SSE content-type block (HTML title extraction, verified) | No detection of "stream ended but content empty" |
| package.json | NO json repair libs installed (verified: no jsonrepair/partial-json/repair-json-stream) | Must add dep |

**Core finding**: `result.ok` / HTTP status checks pass on all malformed
responses — the gap is at the *semantic* layer (body shape), which requires a
**ResponseValidator** that inspects parsed bodies, not just transport.

## 3. Libraries (verified on npm, 2026-09-08)

| Library | Version | Stars | What it fixes |
|---|---|---|---|
| `josdejong/jsonrepair` | 3.15.0 | 2,401 | Missing braces/quotes, single quotes, trailing commas, comments, Python literals, truncation |
| `prxtenses/repair-json-stream` | 1.3.1 | — | Streaming repair: `jsonrepairTransform` (TransformStream), `IncrementalJsonRepair` (chunk push), `jsonRepairStream` (web stream); `repairJson(s, onRepair?)` never throws |
| `partial-json` (npm) | 0.1.7 | 137 (parsers) | Parse partial JSON with `Allow` bitmask (STR/OBJ/ARR/NUM); MalformedJSON throws distinct error |
| `json-llm-repair` | 0.1.5 | — | `parseFromLLM()` with modes parse/repair + Zod schema validation; wraps missing root keys via schema |
| `iw4p/partialjson` (Python) | +4M downloads | 102 | Python analog for OpenAI stream parsing |
| `jbingen/jsonchunk` | — | — | Type-safe tiny partial JSON streaming parser (DeepPartial) |

**Recommendation for 9router**: `repair-json-stream` (streaming path) +
`jsonrepair` (non-streaming path) + optional Zod/`json-llm-repair` for
schema-validated tool arguments.

## 4. Design: ResponseValidator for 9router (conditional matcher extension)

Adds a 4th check tier to the error registry (doc 29): after transport
(status) and text rules, validate **body shape**:

```js
// open-sse/utils/responseValidator.js
import { repairJson } from "repair-json-stream";
import { jsonrepair } from "jsonrepair"; // non-stream alt

export const RESPONSE_RULES = [
  {
    id: "empty_choices",
    condition: { path: "choices", op: "isArray", minLen: 1 },
    action: { retry: true, reason: "EMPTY_CHOICES", category: "malformed" },
  },
  {
    id: "no_content",
    condition: { anyOf: [
      { path: "choices[0].message.content", op: "missingOrEmpty" },
      { path: "choices[0].delta.content", op: "missingOrEmpty" },
    ]},
    action: { fallback: true, reason: "NO_CONTENT", category: "malformed" },
  },
  {
    id: "finish_reason_error",
    condition: { path: "choices[0].finish_reason", op: "equals", value: "error" },
    action: { retry: true, reason: "FINISH_REASON_ERROR", category: "malformed" },
  },
  {
    id: "html_body",
    condition: { path: "body[0]", op: "equals", value: "<" },
    action: { error: true, reason: "HTML_RESPONSE", category: "invalid_request" },
  },
  {
    id: "non_json_object",
    condition: { op: "jsonParseFails" },
    action: { repairThenParse: true, reason: "JSON_PARSE_FAIL", category: "malformed" },
  },
];

export function validateResponseBody(body, status) {
  if (!body || typeof body !== "object") {
    return { valid: false, reasons: ["EMPTY_BODY"] };
  }
  const reasons = [];
  // body-shape checks (mirrors conditionalMatcher AND/OR/XOR from doc 29)
  if (!Array.isArray(body.choices) || body.choices.length === 0) {
    reasons.push("EMPTY_CHOICES");
  } else if (!body.choices[0]?.message?.content && !body.choices[0]?.delta?.content) {
    reasons.push("NO_CONTENT");
  }
  if (body.choices?.[0]?.finish_reason === "error") reasons.push("FINISH_REASON_ERROR");
  return { valid: reasons.length === 0, reasons };
}

export function repairBodyText(rawText) {
  try { JSON.parse(rawText); return { ok: true, value: JSON.parse(rawText) }; }
  catch {
    try { return { ok: true, value: JSON.parse(repairJson(rawText)) }; }
    catch { return { ok: false, error: "UNREPAIRABLE" }; }
  }
}
```

## 5. Streaming SSE accumulation repair (for truncated streams)

When the stall watchdog fires OR upstream closes without `[DONE]`, use the
accumulated buffer:

```js
// uses repair-json-stream IncrementalJsonRepair
import { IncrementalJsonRepair } from "repair-json-stream/incremental";
const repairer = new IncrementalJsonRepair();
let buffer = "";
for await (const chunk of sseStream) {
  buffer += chunk;
  const candidate = repairer.push(chunk);       // best-effort complete value
  if (candidate) emit(candidate);               // forward repaired partial
}
// on stream end without [DONE]:
if (!sawDone) {
  const final = repairer.finish();               // repair remaining tail
  if (final) emit(final);
  else emitStallError();                         // truly unrecoverable → retry/fallback
}
```

## 6. Tool-call argument repair (fixes `{}` silent loss)

Replace the current `catch { return {}; }` in `parseToolArguments`:

```js
function parseToolArguments(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); }
  catch {
    const repaired = repairBodyText(value);
    return repaired.ok ? repaired.value : { __malformed: value }; // surface, don't hide
  }
}
```

## 7. 9router ERROR_RULES additions (malformed tier)

```js
// extend config/errorConfig.js ERROR_RULES
{ text: "Response contained no choices",  cooldownMs: COOLDOWN.short }, // OpenAI SDK client error
{ text: "improperly formed request",      cooldownMs: COOLDOWN.long  }, // (already present)
{ text: "empty response",                 backoff: true },
{ text: "unable to parse",                backoff: true },
{ text: "JSON parse",                     backoff: true },
```

## 8. Hermes-side interplay (question 2B: is it seen only in Hermes?)

**Partially**: mid-stream cuts are visible at BOTH layers:
- Hermes sees "stream stalled mid response" / truncated tool JSON — its hooks
  (`on_stream_end`, `transform_tool_result`) can rewrite/track, but the damage
  is already in context.
- 9router sees the *raw* bytes and can repair at the source before Hermes ever
  receives broken JSON — **prevention beats correction**.

So: 9router should REPAIR/validate; Hermes should RETRY/recover (doc 28's
`tool_error_injector`, doc 31's turn watchdog). Both together = full loop.

## 9. Working Proof (tested inline 2026-09-08)

```js
// node --input-type=module -e "..." with repair-json-stream + jsonrepair installed
import { repairJson } from "repair-json-stream";
const broken = '{"message": "Hello, I\\'m currently generating your resp';
JSON.parse(repairJson(broken)); // => { message: "Hello, I'm currently generating your resp" } ✓

import { parse, Allow } from "partial-json";
parse('{"key": "v', Allow.STR | Allow.OBJ); // => { key: 'v' } (partial ok)
```

Test harness available: `npm i repair-json-stream jsonrepair partial-json json-llm-repair` in 9router (adds ~30KB).

## 10. Build Plan (ranked)

1. Add deps → `npm i repair-json-stream jsonrepair partial-json`
2. Create `open-sse/utils/responseValidator.js` (+ repairBodyText, validateResponseBody)
3. Wire into `nonStreamingHandler.js` after provider JSON parse — on `EMPTY_CHOICES`/`NO_CONTENT` → return createErrorResult(502, reason) so smartRouter/combo can fallback
4. Wire into streaming: accumulated-buffer repair on stall/abrupt end (doc 31's onAbortTerminal pattern already exists for Responses passthrough)
5. Upgrade `parseToolArguments` to surface malformed args instead of silent `{}`
6. Extend ERROR_RULES + errorCategorizer with malformed tier
7. Mirror to `~/Documents/hermesResearch/9router/V2/research/` (done)