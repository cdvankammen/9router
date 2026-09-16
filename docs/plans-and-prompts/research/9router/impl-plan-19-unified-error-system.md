---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, unified-error-system, error-codes, error-responses
---

# Implementation Plan 19 — Unified Error System v2

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md` — `29-unified-error-system-v2.md`).
> This plan covers the "unified error system v2" option: a complete, consistent error system across the entire gateway.

## 1. Goal

Implement the unified error system v2: consistent error codes, structured error responses, error documentation, and error handling across all API surfaces — so every error is predictable and actionable.

## 2. Background (from research)

- **9Router unified error system v2** (doc 29): unified error design; error codes; error responses.
- **9Router current state**: error categorization in categorizeError(); programmatic error registry; per-executor error handling.
- **Research findings**: errors must be consistent across providers; error codes must be documented; error responses must be structured (code, message, details, retryable).

## 3. Design

### 3.1 Error Code System

- **Error code format**: `CATEGORY.SUBCATEGORY` (e.g., `RATE_LIMIT.UPSTREAM_429`).
- **Error code registry**: programmatic registry with metadata (category, retryable, user message, docs).
- **Error code documentation**: auto-generated error docs.

### 3.2 Structured Error Responses

- **Error envelope**: `{error: {code, message, details, retryable, request_id}}`.
- **Consistent HTTP mapping**: category → HTTP status.
- **Provider error mapping**: upstream errors → internal codes.

### 3.3 Error Handling

- **Centralized handler**: unified error handling in chatCore.
- **Retry semantics**: retryable flag drives retry logic.
- **Error recovery**: recovery actions per error code.
- **Error logging**: structured error logs.

### 3.4 Error UX

- **Error inbox**: dashboard view of errors.
- **Error docs**: browsable error documentation.
- **Error alerts**: threshold alerts.

## 4. Implementation Steps

1. Define error code taxonomy + registry.
2. Build structured error envelope.
3. Map provider errors to internal codes.
4. Centralize error handling.
5. Build error docs + inbox.
6. Tests: error codes, mapping, envelope.

## 5. Files Touched

- `open-sse/config/errorCodes.js` (new: registry)
- `open-sse/handlers/chatCore.js` (centralized handling)
- `open-sse/executors/*` (error mapping)
- `src/app/api/v1/errors/route.js` (new)
- Dashboard error-inbox page (new)
- `tests/unit/error-codes.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Migration churn | Registry-driven; incremental |
| Code proliferation | Taxonomy discipline; review |
| Mapping gaps | Fallback codes; monitoring |
| Docs staleness | Auto-generated docs |

## 7. Success Criteria

- All errors use structured envelope.
- Error codes documented.
- Provider errors mapped consistently.
- Error inbox functional.

## 8. Related Plans
- Plan 9 (Error System & Failover) — supersedes/merges.
- Plan 16 (Divergence & Malformed) — validation errors.
- Plan 8 (Observability) — error telemetry.