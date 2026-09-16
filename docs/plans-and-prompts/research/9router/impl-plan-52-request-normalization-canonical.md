---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, request-normalization, canonical, schema, validation
---

# Implementation Plan 52 — Request Normalization & Canonical Schema

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "request normalization" option: canonical request schema and normalization.

## 1. Goal

Add request normalization to 9Router: canonical request schema, normalization pipeline, and validation — so all requests are handled consistently regardless of client quirks.

## 2. Background (from research)

- **9Router current state**: translator-request-normalization is a known-fail in tests; requests parsed per-format.
- **Research findings**: canonical schema (OpenAI intermediate) reduces translator complexity; normalization (field aliases, defaults, type coercion) handles client quirks; validation catches bad requests early.

## 3. Design

### 3.1 Canonical Schema

- **Canonical model**: unified request schema (messages, tools, params).
- **Schema mapping**: per-format → canonical.
- **Schema versioning**: versioned canonical schema.

### 3.2 Normalization Pipeline

- **Field aliases**: accept aliases (e.g., max_tokens vs max_completion_tokens).
- **Defaults**: apply defaults consistently.
- **Type coercion**: coerce types safely.
- **Normalization order**: parse → normalize → validate.

### 3.3 Validation

- **Required fields**: validate presence.
- **Type checks**: validate types.
- **Range checks**: validate ranges.
- **Validation errors**: structured.

### 3.4 Integration

- **Translator integration**: translators work on canonical schema.
- **Executor integration**: executors receive normalized requests.
- **Observability**: normalization telemetry.

## 4. Implementation Steps

1. Define canonical schema.
2. Build normalization pipeline.
3. Add validation.
4. Integrate with translators/executors.
5. Fix translator-request-normalization known-fail.
6. Tests: normalization, validation.

## 5. Files Touched

- `open-sse/schema/` (canonical schema)
- `open-sse/translator/` (normalization integration)
- `open-sse/handlers/chatCore.js` (pipeline)
- `tests/unit/request-normalization.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Schema churn | Versioning |
| Coercion bugs | Safe coercion; tests |
| Translator breakage | Incremental migration |
| Validation friction | Clear errors |

## 7. Success Criteria

- Canonical schema defined.
- Normalization pipeline works.
- Validation catches bad requests.
- Known-fail fixed.

## 8. Related Plans
- Plan 40 (API Compatibility) — schema compatibility.
- Plan 16 (Divergence) — response schema.
- Plan 32 (CI) — known-fail tracking.