# Branch I: Data Normalization & Sanitization — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, normalization, sanitization, binary-tree, branch-i

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch I: DATA NORMALIZATION & SANITIZATION

Transform imported messages into the same schema as native 9Router traffic, and sanitize sensitive data before storage.

### L2 I1: SCHEMA NORMALIZATION

#### L3 I1a: Field Mapping
- **L4 I1a1: Timestamp Normalization**
  - L5: Convert all timestamp formats (ISO 8601, Unix epoch, HTTP-date) to ISO 8601 UTC
  - L6: Handle timezone conversion, validate date ranges
- **L4 I1a2: Token Count Normalization**
  - L5: Map provider-specific token fields to standard: `promptTokens`, `completionTokens`, `totalTokens`
  - L6: OpenAI: `usage.prompt_tokens` → `promptTokens`; Anthropic: `usage.input_tokens` → `promptTokens`
- **L4 I1a3: Status Normalization**
  - L5: Map HTTP status codes to standard status: `success` (2xx), `error` (4xx/5xx), `timeout`
  - L6: Handle edge cases: 204 No Content, 304 Not Modified

#### L3 I1b: Request/Response Structure
- **L4 I1b1: Message Array Normalization**
  - L5: Ensure `request.messages` is an array of `{role, content}` objects
  - L6: Handle Anthropic's `system` parameter → convert to system message in array
- **L4 I1b2: Choice Array Normalization**
  - L5: Ensure `response.choices` is an array of `{index, message, finish_reason}` objects
  - L6: Handle Anthropic's `content` array → convert to single choice

### L2 I2: SENSITIVE DATA SANITIZATION

#### L3 I2a: Header Sanitization
- **L4 I2a1: Auth Header Removal**
  - L5: Strip `Authorization`, `X-API-Key`, `Cookie`, `Token` headers from request/response
  - L6: Case-insensitive matching, handle variations (`x-api-key`, `X-Api-Key`)
- **L4 I2a2: Custom Header Sanitization**
  - L5: Strip provider-specific auth headers: `x-api-key` (OpenAI), `anthropic-version` (Anthropic)
  - L6: Configurable list in settings

#### L3 I2b: Body Sanitization
- **L4 I2b1: API Key Detection**
  - L5: Regex scan for API key patterns: `sk-...`, `key-...`, `Bearer ...`
  - L6: Replace with `[REDACTED]`, log redaction count
- **L4 I2b2: PII Detection (Optional)**
  - L5: Regex scan for email, phone, SSN patterns in message content
  - L6: Configurable: "Enable PII redaction" toggle in settings

### L2 I3: FORMAT CONVERSION

#### L3 I3a: Provider-Specific Formats
- **L4 I3a1: OpenAI → Standard**
  - L5: `response.choices[0].message.content` → `response.content`
  - L6: Handle function_call/tool_calls → convert to standard tool_use format
- **L4 I3a2: Anthropic → Standard**
  - L5: `response.content[0].text` → `response.content`
  - L6: Handle `stop_reason` → `finish_reason` mapping

#### L3 I3b: Legacy Format Support
- **L4 I3b1: v1 API Format**
  - L5: Detect old OpenAI v1 format (pre-2023), convert to current format
  - L6: `response.choices[0].text` → `response.choices[0].message.content`
- **L4 I3b2: Streaming Format**
  - L5: Reconstruct streaming responses from chunks → single response
  - L6: Concatenate `delta.content` chunks, sum token counts

### L2 I4: VALIDATION & ERROR HANDLING

#### L3 I4a: Schema Validation
- **L4 I4a1: Zod Schema**
  - L5: Define Zod schema for normalized message, validate after normalization
  - L6: Reject malformed messages, return detailed validation errors
- **L4 I4a2: Required Fields Check**
  - L5: Ensure required fields present: `timestamp`, `model`, `status`
  - L6: Optional fields: `tokens`, `cost`, `conversationId`

#### L3 I4b: Partial Success Handling
- **L4 I4b1: Batch Import**
  - L5: If batch import has some valid + some invalid messages → import valid, reject invalid
  - L6: Return `{imported: 42, skipped: 3, errors: [...]}`
- **L4 I4b2: Error Reporting**
  - L5: For each rejected message, include: `index`, `reason`, `message` (first 100 chars)
  - L6: Help user debug import failures

### L2 I5: CONFIGURATION

#### L3 I5a: Sanitization Settings
- **L4 I5a1: Toggle Redaction**
  - L5: Settings: "Enable header sanitization" (default: true), "Enable PII redaction" (default: false)
  - L6: Stored in `settingsRepo.js`, applied during import
- **L4 I5a2: Custom Redaction Patterns**
  - L5: Settings: "Custom redaction patterns" (array of regex)
  - L6: User can add custom patterns for sensitive data

#### L3 I5b: Normalization Settings
- **L4 I5b1: Strict Mode**
  - L5: Settings: "Strict normalization" (default: true) → reject non-conforming messages
  - L6: If false → attempt best-effort normalization, log warnings
- **L4 I5b2: Format Detection**
  - L5: Settings: "Auto-detect provider format" (default: true)
  - L6: If false → user specifies format in import request

## Implementation Priority

1. **Header Sanitization + Basic Normalization** (core) — 2 days
2. **Provider-Specific Format Conversion** — 2 days
3. **PII Detection + Custom Redaction** — 1 day
4. **Validation + Error Handling** — 1 day

## Open Questions

- Should sanitization be configurable per source (e.g., sanitize Hermes but not manual imports)?
- How to handle encrypted request/response bodies?
- Should the system log redaction events for audit purposes?

## Related Implementation Plans

- `9router/impl-plan-import-03-import-api.md` — `normalizer.js` (schema normalization) + `sanitizer.js` (header/PII redaction) in the ingest pipeline
- `9router/impl-plan-import-14-format-adapters.md` — parsers normalize agent-specific shapes into the canonical schema before sanitization
- `9router/impl-plan-import-20-quality-rollout.md` — schema-guard + roundtrip tests proving sanitization is not bypassed
