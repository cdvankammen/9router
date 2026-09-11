# Research: Programmatic Error Capture + Custom Error Registry — "Response contained no choices" and Beyond

**Date:** 2026-09-03
**Status:** ACTIVE — gap identified, design proposed, not yet implemented
**Tags:** #research #errors #retry #fallback #custom-errors #resilience

---

## 1. Problem Statement

Users (via VS Code Copilot, Claude Code, and other clients) frequently hit:

```
Sorry, your request failed. Please try again.
Client Request Id: fdc371ba-...
Reason: Response contained no choices.
```

and:

```
{"message":"DialagramRouter upstream stream interrupted. Please retry.","type":"server_error","code":"router_upstream_stream_interrupted"}
```

The client stops, shows an error, and requires a manual "Try Again" click. 9Router should:

1. **Catch these errors programmatically** — detect "empty/no-choices" and "stream interrupted" responses as retryable conditions.
2. **Auto-retry via existing mechanisms** — reuse the round-robin/combo fallback/failover machinery as if the request came from the original client.
3. **Expose a user-extensible custom error registry** — let Chris add patterns for his own providers (dialagram, custom endpoints) with per-pattern retry policy, all config-driven, no code changes.

---

## 2. Current State (verified in code)

### 2.1 Where errors are handled today

| Layer | File | What it catches |
|-------|------|-----------------|
| HTTP status | `open-sse/handlers/chatCore.js:417` | `!providerResponse.ok` → `parseUpstreamError` → `createErrorResult` |
| Rate limit | `open-sse/executors/base.js:83` | `shouldRetry(status)` only on 429/`RATE_LIMITED` |
| Network errors | `open-sse/executors/base.js` catch | Maps fetch exceptions to 502 retry config |
| Combo fallback | `open-sse/services/combo.js:250` | `handleComboChat` — rotates models on `!result.ok`, respects `retriesPerModel`, `perModelRetries`, circuit breaker via `failedProviders` |
| Account fallback | `open-sse/services/accountFallback.js:23` | `checkFallbackError(status, errorText)` — config-driven `ERROR_RULES` text+status matching |
| Fusion | `open-sse/services/combo.js:602` | `handleFusionChat` — panel, judge, degrades to direct answer when panel thin |
| Forced-SSE-to-JSON | `open-sse/handlers/chatCore/sseToJsonHandler.js:123` | Catches `chunk?.error` mid-stream |
| Test ping | `src/app/api/models/test/ping.js:182` | `hasChoices` check — TEST ONLY, not in main path |

### 2.2 The gap

- **`result.ok` only checks HTTP status.** A 200 with `choices: []` (or empty `content: ""`, or `null` content) is treated as **success** and passed to the client.
- **Stream interruption mid-response** — after first token committed, `streamingHandler.js` has no "zero content received" detection; the stream "completes" empty.
- **No semantic validation hook** on the parsed body (`choices.length`, `content.length`, `message.content == null`, `output[0].content` empty for Responses API).
- **No extensible user-defined error patterns** — `ERROR_RULES` in `open-sse/config/errorConfig.js` is hardcoded.

### 2.3 Existing ERROR_RULES (hardcoded)

```js
export const ERROR_RULES = [
  { text: "no credentials",           cooldownMs: COOLDOWN.long },
  { text: "request not allowed",      cooldownMs: COOLDOWN.short },
  { text: "improperly formed request", cooldownMs: COOLDOWN.long },
  { text: "rate limit",               backoff: true },
  { text: "too many requests",        backoff: true },
  { text: "quota exceeded",           backoff: true },
  { text: "capacity",                 backoff: true },
  { text: "overloaded",               backoff: true },
  { status: 401, cooldownMs: COOLDOWN.long },
  { status: 402, cooldownMs: COOLDOWN.long },
  { status: 403, cooldownMs: COOLDOWN.long },
  { status: 404, cooldownMs: COOLDOWN.long },
  { status: 429, backoff: true },
];
```

---

## 3. External Patterns Researched

### 3.1 OpenRouter (typed error vocabulary)
- Normalizes every upstream error into a **stable `error_type`** string: `authentication`, `permission_denied`, `payment_required`, `rate_limit_exceeded`, `provider_overloaded`, `provider_unavailable`, `server`, `timeout`, `unmapped`.
- Same `error_type` regardless of API skin (Chat Completions / Anthropic Messages / Responses).
- **Mid-stream errors** arrive in-band as SSE events (error chunk / `response.failed` / Anthropic `error` event).
- Failover is only possible **before first token committed**; after that, error must be in-band.
- 429/503 carry `Retry-After` header — SDKs honor it.
- Lesson for 9Router: **adopt a canonical `error_type` vocabulary** (we already have `categorizeError()` — extend it with typed codes + metadata).

### 3.2 LiteLLM (exception mapping + ContextWindowExceededError)
- Maps all provider exceptions to OpenAI-compatible types: `BadRequestError`, `ContextWindowExceededError`, `ContentPolicyViolationError`, `RateLimitError`, `APIConnectionError`, etc.
- Special error subclasses enable **semantic fallbacks**: e.g. catching `ContextWindowExceededError` triggers fallback to a larger-context model.
- `litellm._should_retry(status_code)` helper decides whether an exception is retryable.
- Lesson: **typed error classes enable semantic routing decisions** — exactly what we want for "no choices" → retry/fallback.

### 3.3 llm_gateway (mazori-ai) — closest match to our need
- Explicitly handles **HTTP-200-but-empty responses** as a failover trigger ("Gemini Flash bug, Claude safety refusals").
- Per-provider circuit breaker: closed → open → half-open state machine.
- Retry with exponential backoff (3 attempts default) on transient errors.
- Multi-key pools per provider.
- Lesson: **empty-response validation must be a first-class failover condition**, alongside rate limits and 5xx.

### 3.4 Backend engineer's empty-response guide (dev.to)
- Empty responses trace to: rate-limit edge cases, context overflow (silent truncation), streaming truncation (consumer closed early).
- Fix: `if content and content.strip()` check — a single line that fixed 70% of empty-response incidents.
- **Content validation is the fix** — treat `""`/`null`/whitespace as invalid, not valid completions.

### 3.5 OpenRouter Python SDK retry PR (speakeasy)
- 400 responses can wrap transient upstream errors — retry classifier must inspect **inner structured error code**, not just HTTP status.
- Lesson: **error code inside the body matters**, not just the HTTP status. This is exactly the "custom error registry" idea — match on inner `code`/`type`/`message` patterns.

---

## 4. Design: 9Router Custom Error Registry

### 4.1 Concept

A config-driven, user-extensible registry of error patterns, each defining:

```js
// open-sse/config/customErrorRegistry.js (or settings blob in DB)
{
  "patterns": [
    {
      "id": "no-choices-empty",             // unique id
      "match": {
        "body": { "choices": [] },          // OR: structural match on parsed body
        "text": "response contained no choices",  // OR: substring in error message
        "code": ["router_upstream_stream_interrupted"],  // OR: error.code list
        "type": ["server_error"],           // OR: error.type list
        "status": [200],                    // OR: HTTP status (note: 200 with empty body!)
      },
      "action": {
        "retry": true,                       // auto-retry
        "retries": 2,                        // attempts
        "delayMs": 500,                      // initial delay
        "backoff": true,                     // exponential
        "fallback": true,                    // trigger combo fallback
        "circuitBreak": false,               // mark provider failed for this request
        "cooldownMs": 30000                  // cooldown before next attempt on same provider
      },
      "log": "EMPTY_RESPONSE",               // log tag
      "enabled": true,
      "source": "builtin" | "user"
    }
  ]
}
```

### 4.2 Built-in patterns (shipped default)

| id | match | action |
|----|-------|--------|
| `no-choices` | body has `choices: []` | retry 2, fallback, circuitBreak false |
| `empty-content` | `message.content` is `""`/`null` and no tool_calls | retry 1, fallback |
| `stream-interrupted` | error code `router_upstream_stream_interrupted` or text "stream interrupted" | retry 2, fallback |
| `upstream-stream-interrupted` | OpenRouter-style `provider_unavailable` | retry with backoff, fallback |
| `no-content-completion` | `finish_reason: "length"` with 0 content | retry 1 |
| `claude-no-choices` | Anthropic-style empty `content` blocks | retry 1 |

### 4.3 Where to hook in

1. **Non-streaming:** `chatCore.js` after `parseUpstreamError` / before `createErrorResult` — run semantic validation on response body when status is 2xx but body is unusable.
2. **Streaming (before first token):** `streamingHandler.js` — track first-chunk arrival; if stream ends with zero content chunks → treat as error, trigger same registry path.
3. **Streaming (mid-stream):** `sseToJsonHandler.js` already catches `chunk?.error` — classify via registry and emit retryable error event (client handles retry UI) — cannot transparently failover after commit, but can return a typed error that clients auto-retry.
4. **Combo layer:** `combo.js` `isProviderLevelError` + `checkFallbackError` — extend with registry-driven classification so combo knows whether to fallback.

### 4.4 Wiring into existing mechanisms (user requirement)

The user's key ask: **retry should flow through existing combo/round-robin/failover machinery "as if the request came from the original location."**

Implementation: in `chatCore.js`/`chat.js`, when an error matches a registry pattern with `fallback: true`, instead of returning `createErrorResult` directly, **re-enter the combo/fallback loop** with the same body and model list (minus the failed provider/model). This is:

- What `handleComboChat` already does on non-OK results — we just need to make empty-body responses non-OK.
- What `handleSingleModelChat` + `accountFallback` does on 429/5xx — we make semantic failures flow through the same path.

**Concretely:** wrap the executor response in a "response adviser" that checks registry patterns and returns `{ ok: false, status: 502, error: { code, message } }` for matches — then every existing fallback layer works unchanged.

### 4.5 User-facing configuration

- **Dashboard settings page** (or `/api/settings` PATCH): "Custom Error Patterns" editor — JSON textarea + form for adding patterns. This mirrors existing `comboStrategies` settings-blob pattern (no DB migration needed — same `settings` JSON blob approach used for `modelCapOverrides`).
- **CLI:** `9router errors add --pattern ...`, `9router errors list`.
- **Validation:** pattern schema validation on save (like `normalizeComboStrategyEntry`).

---

## 5. Additional Gaps Found (same research pass)

### 5.1 `finish_reason: "length"` with 0 content — silent truncation
When a provider returns `finish_reason: "length"` (max_tokens hit) with no content, clients see an empty completion. Should be retryable with `max_tokens` bumped or fallback to larger-context model (LiteLLM pattern).

### 5.2 Streaming truncation — consumer closed / interrupted
If the client (VS Code Copilot) closes the stream early, the server sees "stream interrupted" but may not log it. The registry pattern `stream-interrupted` covers this.

### 5.3 No `Retry-After` propagation
`unavailableResponse()` in `error.js:116` sets `Retry-After` header — but only for 429/503 paths. The registry actions should set `Retry-After` on synthesized 502 retryable errors so OpenAI-compatible clients auto-backoff.

### 5.4 `categorizeError()` lacks typed codes
`categorizeError(statusCode, message)` isn't visible in the codebase — likely in error.js or a helper. The registry should produce a canonical `error_type` for observability (OpenRouter-style).

---

## 6. Files Touched (proposed)

- `open-sse/config/customErrorRegistry.js` — NEW, built-in patterns + loader
- `open-sse/config/errorConfig.js` — extend ERROR_RULES or keep separate registry
- `open-sse/handlers/chatCore.js` — semantic validation hook after line 417
- `open-sse/handlers/chatCore/streamingHandler.js` — zero-content detection
- `open-sse/handlers/chatCore/sseToJsonHandler.js` — mid-stream error classification
- `open-sse/services/combo.js` — registry-driven fallback decisions
- `open-sse/services/accountFallback.js` — registry-aware `checkFallbackError`
- `src/lib/db/repos/settingsRepo.js` — `customErrorPatterns` in DEFAULT_SETTINGS
- `src/app/api/settings/route.js` — validation for new settings key
- `src/app/(dashboard)/dashboard/settings/*` — UI (or providers page tab)
- `src/sse/handlers/chat.js` — re-entry point for fallback loop
- `tests/unit/custom-error-registry.test.js` — NEW tests

---

## 7. Priorities

1. **P0:** Semantic validation for non-streaming empty choices (chatCore.js) — fixes the reported #3692/#3682 class
2. **P0:** Streaming zero-content detection
3. **P1:** Custom Error Registry (config + validation + dashboard UI)
4. **P1:** Re-enter combo fallback on registry match
5. **P2:** Retry-After propagation on synthesized errors
6. **P2:** Typed error codes in observability (canonical `error_type`)

---

## 8. References

- OpenRouter docs: https://openrouter.ai/docs/api/reference/errors-and-debugging
- LiteLLM exception mapping: https://docs.litellm.ai/docs/exception_mapping
- LiteLLM reliability: https://docs.litellm.ai/docs/completion/reliable_completions
- mazori-ai/llm_gateway: https://github.com/mazori-ai/llm_gateway
- Empty AI responses guide: https://dev.to/loyaldash/how-i-finally-killed-empty-ai-responses-a-backend-engineers-notes-1pbg
- OpenRouter SDK retry PR: https://github.com/OpenRouterTeam/python-sdk/pull/381