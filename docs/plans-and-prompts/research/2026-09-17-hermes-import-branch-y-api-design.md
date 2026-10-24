# Branch Y: API Design & Contracts — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, api-design, contracts, binary-tree, branch-y

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch Y: API DESIGN & CONTRACTS

Define the complete API surface for import: endpoints, payload schemas, error codes, versioning, and client SDKs.

### L2 Y1: ENDPOINT SURFACE

#### L3 Y1a: Import Endpoints
- **L4 Y1a1: POST /api/messages/import**
  - L5: Batch import (JSON array or NDJSON stream)
  - L6: Returns `{ imported, duplicates, skipped, errors[] }`
- **L4 Y1a2: POST /api/messages/import/upload**
  - L5: Multipart file upload → parse → import
  - L6: Returns job id for async processing
- **L4 Y1a3: POST /api/messages/import/events**
  - L5: Real-time event ingestion (SSE-style)
  - L6: For live agent push

#### L3 Y1b: Config Endpoints
- **L4 Y1b1: GET /api/messages/import/config**
  - L5: Returns hook config snippet, API key hint, watched files
  - L6: Used by the Import Modal UI
- **L4 Y1b2: PUT /api/messages/import/config**
  - L5: Update import settings (enabled, sources, retention)
  - L6: Validated against settings schema

#### L3 Y1c: Job Endpoints
- **L4 Y1c1: GET /api/messages/import/jobs**
  - L5: List import jobs with status/progress
  - L6: Paginated
- **L4 Y1c2: POST /api/messages/import/jobs/:id/cancel**
  - L5: Cancel a running job
  - L6: Sets cancel flag

#### L3 Y1d: Unknown Model Endpoints
- **L4 Y1d1: GET /api/messages/import/unknown-models**
  - L5: List unknown models with counts
  - L6: For the resolution UI
- **L4 Y1d2: POST /api/messages/import/unknown-models/:model/map**
  - L5: Map unknown model → provider + canonical
  - L6: Backfills existing rows

### L2 Y2: PAYLOAD SCHEMA

#### L3 Y2a: Message Object
- **L4 Y2a1: Required Fields**
  - L5: `model` (string), `status` (success|error), `timestamp` (ISO)
  - L6: Everything else optional
- **L4 Y2a2: Optional Fields**
  - L5: `provider`, `request`, `response`, `latencyMs`, `tokens`, `cost`, `error`, `conversationId`, `sourceSessionId`, `metadata`
  - L6: Server fills gaps via matcher/costCalculator

#### L3 Y2b: Batch Object
- **L4 Y2b1: Envelope**
  - L5: `{ source, batchId?, idempotencyKey?, messages: [...] }`
  - L6: Max 1000 messages per batch

### L2 Y3: ERROR CONTRACTS

#### L3 Y3a: HTTP Status Codes
- **L4 Y3a1: 200/207/400/401/403/409/413/429/500**
  - L5: 207 = partial success (some messages failed)
  - L6: 409 = duplicate when onDuplicate=error
- **L4 Y3a2: Error Body**
  - L5: `{ error: { code, message, details[] } }`
  - L6: Consistent with existing API error shape

#### L3 Y3b: Error Codes
- **L4 Y3b1: Enumerated Codes**
  - L5: `INVALID_PAYLOAD`, `UNAUTHORIZED`, `BATCH_TOO_LARGE`, `DUPLICATE`, `RATE_LIMITED`, `INTERNAL`
  - L6: Stable strings for client handling

### L2 Y4: VERSIONING

#### L3 Y4a: API Version
- **L4 Y4a1: Path Versioning**
  - L5: `/api/messages/import` (v1 implicit); future `/api/v2/...`
  - L6: Matches existing app conventions
- **L4 Y4a2: Payload Version**
  - L5: Optional `schemaVersion` field in payload
  - L6: Server adapts older shapes

### L2 Y5: CLIENT SDKs

#### L3 Y5a: Node SDK
- **L4 Y5a1: `importClient.js`**
  - L5: Thin wrapper: `importMessages(messages, opts)`
  - L6: Handles batching, retry, idempotency keys

#### L3 Y5b: Shell/curl
- **L4 Y5b1: curl Examples**
  - L5: Documented curl one-liners for each endpoint
  - L6: In skill + docs

#### L3 Y5c: Python SDK
- **L4 Y5c1: Python Client**
  - L5: For non-Node agents
  - L6: Simple requests-based client

### L2 Y6: RATE LIMITING

#### L3 Y6a: Import Rate Limits
- **L4 Y6a1: Per-Key Limits**
  - L5: e.g., 100 requests/min, 10k messages/min per key
  - L6: 429 with Retry-After
- **L4 Y6a2: Burst Allowance**
  - L5: Token bucket for bursts (backfill scenarios)
  - L6: Configurable

## Open Questions

1. Should import API be under `/api/messages/import` or `/api/import`?
2. Is 1000 messages/batch the right cap?
3. Do we need a Python SDK or is curl enough?

## Related Implementation Plans

- `9router/impl-plan-import-19-api-contracts.md` — full OpenAPI-style spec, error codes, SDK sketches with code