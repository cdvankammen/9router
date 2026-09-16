---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, divergence, malformed-response, validation, robustness
---

# Implementation Plan 16 — Divergence & Malformed Response Handling

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md` — `34-divergence-analysis.md`, `34-malformed-response-handling.md`).
> This plan covers the "divergence/malformed response" option: detect and handle divergent and malformed upstream responses.

## 1. Goal

Detect and handle divergent and malformed upstream responses: schema validation, divergence detection (provider-specific quirks), graceful degradation, and recovery — so a single bad upstream response never breaks the client.

## 2. Background (from research)

- **9Router divergence analysis** (doc 34a): provider response divergence; format differences; edge cases.
- **9Router malformed response handling** (doc 34b): malformed response patterns; handling strategies.
- **Research findings**: providers diverge from OpenAI schema in subtle ways; malformed responses must be caught early; graceful degradation beats hard failure.

## 3. Design

### 3.1 Response Validation

- **Schema validation**: validate upstream responses against expected schema (per-format).
- **Field validation**: required fields, types, ranges.
- **Stream validation**: validate SSE chunks; detect malformed chunks.
- **Validation errors**: categorized (missing field, wrong type, malformed JSON).

### 3.2 Divergence Detection

- **Divergence registry**: known provider divergences (per-provider quirks).
- **Divergence detection**: detect divergence patterns (e.g., non-standard fields, unusual encodings).
- **Divergence handling**: normalize divergent responses; log divergence.

### 3.3 Graceful Degradation

- **Partial responses**: salvage usable parts of malformed responses.
- **Fallback on malformed**: trigger fallback on unrecoverable malformed responses.
- **Client-safe errors**: never propagate malformed upstream errors raw.

### 3.4 Recovery

- **Retry on malformed**: retry with backoff for transient malformation.
- **Provider quarantine**: quarantine providers with high malformation rates.
- **Recovery logging**: malformation events with context.

## 4. Implementation Steps

1. Build response validation layer.
2. Build divergence registry + detection.
3. Implement graceful degradation.
4. Add recovery (retry, quarantine).
5. Tests: validation, divergence, degradation.

## 5. Files Touched

- `open-sse/validation/` (new: schema validation)
- `open-sse/translator/` (divergence normalization)
- `open-sse/handlers/chatCore.js` (degradation)
- `open-sse/config/divergenceRegistry.js` (new)
- `tests/unit/response-validation.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Over-validation | Validate only critical fields |
| Divergence registry staleness | Provider updates; monitoring |
| Degradation complexity | Salvage-only; fallback on doubt |
| Performance | Lightweight validation; caching |

## 7. Success Criteria

- Malformed responses caught early.
- Known divergences normalized.
- Graceful degradation operational.
- Quarantine prevents repeated failures.

## 8. Related Plans
- Plan 9 (Error System) — error categorization.
- Plan 2 (Cascade Enhancements) — fallback on malformed.
- Plan 8 (Observability) — malformation telemetry.