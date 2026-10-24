# Branch C: Error Reconstruction — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, error-reconstruction, binary-tree, branch-c

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch C: ERROR RECONSTRUCTION

Reconstruct error records from imported messages so they appear in the error inbox exactly like native 9Router errors.

### L2 C1: HTTP STATUS CLASSIFICATION

#### L3 C1a: Status Code Categories
- **L4 C1a1: 4xx Client Errors**
  - L5: 400 → `BAD_REQUEST`, 401 → `AUTH_ERROR`, 403 → `FORBIDDEN`, 404 → `NOT_FOUND`, 429 → `RATE_LIMITED`
  - L6: Map to `errorCategory` enum in `open-sse/utils/errorCategorizer.js`
- **L4 C1a2: 5xx Server Errors**
  - L5: 500 → `INTERNAL_ERROR`, 502 → `BAD_GATEWAY`, 503 → `SERVICE_UNAVAILABLE`, 504 → `TIMEOUT`
  - L6: Provider-specific 5xx patterns (Anthropic 529 = overloaded)

#### L3 C1b: Timeout Detection
- **L4 C1b1: Latency-Based**
  - L5: If `latencyMs > threshold` AND `status=null` → classify as `TIMEOUT`
  - L6: Threshold per provider (Anthropic 180s, OpenAI 600s for o1)
- **L4 C1b2: Error Message Pattern**
  - L5: Match `"timeout"`, `"timed out"`, `"ETIMEDOUT"`, `"ECONNRESET"` in error body
  - L6: Case-insensitive regex, confidence scoring

### L2 C2: ERROR BODY PARSING

#### L3 C2a: Provider-Specific Error Formats
- **L4 C2a1: OpenAI Format**
  - L5: `{"error": {"message": "...", "type": "...", "code": "..."}}`
  - L6: Extract `message`, `type`, `code` → map to `errorCategory`
- **L4 C2a2: Anthropic Format**
  - L5: `{"type": "error", "error": {"type": "...", "message": "..."}}`
  - L6: Extract `error.type` → `overloaded_error`, `rate_limit_error`, `invalid_request_error`
- **L4 C2a3: Google/Gemini Format**
  - L5: `{"error": {"code": 400, "message": "...", "status": "..."}}`
  - L6: Extract `code`, `message`, `status`

#### L3 C2b: Generic Error Parsing
- **L4 C2b1: JSON Error Detection**
  - L5: Try `JSON.parse(errorBody)`, extract common fields (`message`, `error`, `detail`)
  - L6: Fallback to plain text extraction
- **L4 C2b2: Plain Text Patterns**
  - L5: Regex patterns for common errors: `rate limit`, `quota exceeded`, `invalid API key`, `model not found`
  - L6: Ordered by specificity, first match wins

### L2 C3: ERROR CATEGORIZATION

#### L3 C3a: Reuse Existing Categorizer
- **L4 C3a1: errorCategorizer.js Integration**
  - L5: Import `categorizeError` from `open-sse/utils/errorCategorizer.js`
  - L6: Pass `{provider, model, statusCode, errorMessage}` → get `errorCategory`
- **L4 C3a2: Category Mapping**
  - L5: `AUTH_ERROR`, `RATE_LIMITED`, `CONTEXT_LENGTH`, `MODEL_NOT_FOUND`, `OVERLOADED`, `NETWORK`, `TIMEOUT`, `UNKNOWN`
  - L6: Stored in `imported_messages.error_category`

#### L3 C3b: Provider-Specific Overrides
- **L4 C3b1: Anthropic Overloaded**
  - L5: Status 529 OR error.type=`overloaded_error` → `OVERLOADED`
  - L6: Suggest fallback combo in error detail
- **L4 C3b2: OpenAI Rate Limit**
  - L5: Status 429 OR error.code=`rate_limit_exceeded` → `RATE_LIMITED`
  - L6: Include retry-after header value if present

### L2 C4: ERROR RECOVERY SUGGESTIONS

#### L3 C4a: Fallback Combo Suggestions
- **L4 C4a1: Same-Model Different-Provider**
  - L5: If Anthropic overloaded → suggest OpenAI `gpt-4o` as fallback
  - L6: Use `open-sse/config/comboRules.js` to find equivalent models
- **L4 C4a2: Same-Provider Different-Model**
  - L5: If `claude-3.5-sonnet` rate-limited → suggest `claude-3-haiku`
  - L6: Use pricing data to suggest cheaper alternative

#### L3 C4b: Retry Guidance
- **L4 C4b1: Retry-After Extraction**
  - L5: Parse `Retry-After` header (seconds or HTTP-date)
  - L6: Display in error detail: "Retry after 30s"
- **L4 C4b2: Exponential Backoff Suggestion**
  - L5: If no Retry-After → suggest `2^n` seconds (1, 2, 4, 8, 16...)
  - L6: Max 5 retries, then give up

### L2 C5: ERROR AGGREGATION

#### L3 C5a: Fingerprint Deduplication
- **L4 C5a1: Fingerprint Algorithm**
  - L5: `hash(provider + model + errorCategory + errorMessage.substring(0, 100))`
  - L6: Same fingerprint = same error group (like Sentry/Errbit)
- **L4 C5a2: Group Display**
  - L5: Error inbox shows fingerprint groups with count, first/last seen
  - L6: Click group → see all instances

#### L3 C5b: Trend Detection
- **L4 C5b1: Spike Detection**
  - L5: If error count for fingerprint > 2x baseline in 1h → flag as spike
  - L6: Alert via webhook (Apprise URL)
- **L4 C5b2: Provider Outage Correlation**
  - L5: If >10 errors from same provider in 5min → suggest provider outage
  - L6: Link to provider status page in error detail

## Implementation Priority

1. **HTTP Status Classification + Error Body Parsing** (core) — 2 days
2. **errorCategorizer.js Integration** — 1 day
3. **Fallback Combo Suggestions** — 1 day
4. **Fingerprint Deduplication + Aggregation** — 2 days

## Open Questions

- Should error reconstruction run on import or on-demand?
- How to handle errors that don't match any known pattern?
- Should the system learn from user corrections (e.g., user marks error as "not really a rate limit")?

## Related Implementation Plans

- `9router/impl-plan-import-06-error-reconstruction.md` — `errorReconstructor.js` reusing `categorizeError(status, text)`, SHA-256 fingerprints, `fallbackSuggestions.js` via `getComboModelsFromData`
- `9router/impl-plan-import-13-deduplication-idempotency.md` — fingerprint column + unique index for error aggregation (C5)
- `9router/impl-plan-import-16-analytics-insights.md` — error analytics dashboard over the categorized/fingerprinted rows
