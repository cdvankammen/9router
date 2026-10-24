# Branch J: Testing & Verification Strategy — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, testing, verification, binary-tree, branch-j

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch J: TESTING & VERIFICATION STRATEGY

Comprehensive testing approach to ensure imported messages are correctly normalized, matched, costed, and displayed.

### L2 J1: UNIT TESTS

#### L3 J1a: Provider Matching Tests
- **L4 J1a1: Exact Match Tests**
  - L5: Test `claude-3.5-sonnet` → anthropic, `gpt-4o` → openai, `gemini-2.5-pro` → google
  - L6: Verify confidence = 1.0, provider correctly identified
- **L4 J1a2: Prefix Match Tests**
  - L5: Test `claude-` → anthropic, `gpt-` → openai, `gemini-` → google
  - L6: Verify confidence = 0.9, provider correctly identified
- **L4 J1a3: Fuzzy Match Tests**
  - L5: Test `sonnet` → claude-3-sonnet family, `turbo` → gpt-3.5-turbo
  - L6: Verify confidence = 0.7, provider correctly identified
- **L4 J1a4: Unknown Model Tests**
  - L5: Test `unknown-model-xyz` → provider='unknown', confidence=0.0
  - L6: Verify model stored in unknown_models table

#### L3 J1b: Cost Calculation Tests
- **L4 J1b1: Standard Formula Tests**
  - L5: Test `cost = (1000/1000 * 0.003) + (500/1000 * 0.015) = 0.0105`
  - L6: Verify rounding to 6 decimal places
- **L4 J1b2: Cached Input Tests**
  - L5: Test Anthropic cache: `cachedCost = 1000/1000 * 0.0003 = 0.0003`
  - L6: Verify 10% discount applied correctly
- **L4 J1b3: Missing Pricing Tests**
  - L5: Test model with no pricing → cost = null, flagged as "cost unknown"
  - L6: Verify UI displays "cost unknown" not $0.00

#### L3 J1c: Error Reconstruction Tests
- **L4 J1c1: HTTP Status Tests**
  - L5: Test 429 → RATE_LIMITED, 529 → OVERLOADED, 401 → AUTH_ERROR
  - L6: Verify errorCategory correctly assigned
- **L4 J1c2: Error Body Parsing Tests**
  - L5: Test OpenAI format: `{"error": {"message": "Rate limit exceeded"}}` → RATE_LIMITED
  - L6: Test Anthropic format: `{"error": {"type": "overloaded_error"}}` → OVERLOADED
- **L4 J1c3: Timeout Detection Tests**
  - L5: Test latencyMs > threshold + status=null → TIMEOUT
  - L6: Verify provider-specific thresholds (Anthropic 180s, OpenAI 600s)

### L2 J2: INTEGRATION TESTS

#### L3 J2a: Import API Tests
- **L4 J2a1: Single Message Import**
  - L5: POST `/api/messages/import` with single message → verify stored in DB
  - L6: Verify all fields normalized, provider matched, cost calculated
- **L4 J2a2: Batch Import**
  - L5: POST `/api/messages/import` with 100 messages → verify all stored
  - L6: Verify partial success: 98 imported, 2 rejected with errors
- **L4 J2a3: Duplicate Detection**
  - L5: Import same message twice → verify second import skipped (idempotent)
  - L6: Verify dedupe by request hash

#### L3 J2b: Unified Query Tests
- **L4 J2b1: Messages Page Query**
  - L5: GET `/api/messages?source=imported` → verify only imported messages returned
  - L6: Verify source badge displayed correctly
- **L4 J2b2: Error Inbox Query**
  - L5: GET `/api/messages?view=errors` → verify imported errors included
  - L6: Verify fingerprint deduplication works across native + imported
- **L4 J2b3: Conversation Grouping**
  - L5: Import 5 messages with same conversationId → verify grouped in conversation view
  - L6: Verify message ordering by timestamp

#### L3 J2c: Dashboard Integration Tests
- **L4 J2c1: Quota Page**
  - L5: Import messages with cost → verify quota page shows native + imported costs
  - L6: Verify pie chart breakdown: Native $45 / Imported $12
- **L4 J2c2: Usage Reports**
  - L5: Generate daily usage report → verify imported traffic included
  - L6: Verify filter by source works

### L2 J3: END-TO-END TESTS

#### L3 J3a: Hermes Hook E2E
- **L4 J3a1: Real Hermes Agent**
  - L5: Configure Hermes to POST to `/api/messages/import`, send test request
  - L6: Verify message appears in Messages page with correct provider/cost
- **L4 J3a2: Error Scenario**
  - L5: Hermes sends request that fails (e.g., rate limit) → verify error reconstructed
  - L6: Verify error appears in error inbox with correct category

#### L3 J3b: Log File Import E2E
- **L4 J3b1: Parse Real Log File**
  - L5: Import real `~/.9router/usage.json` file → verify all messages imported
  - L6: Verify provider matching accuracy on real data
- **L4 J3b2: Incremental Sync**
  - L5: Import log file, add new entries, run sync again → verify only new entries imported
  - L6: Verify no duplicates

#### L3 J3c: Proxy Mode E2E
- **L4 J3c1: HTTP Proxy**
  - L5: Configure agent to use `HTTP_PROXY=http://localhost:20128`, send request
  - L6: Verify request logged, forwarded to provider, response returned
- **L4 J3c2: HTTPS MITM**
  - L5: Install 9Router CA cert, send HTTPS request through proxy
  - L6: Verify full request/response logged (decrypted)

### L2 J4: PERFORMANCE TESTS

#### L3 J4a: Import Throughput
- **L4 J4a1: Batch Import Speed**
  - L5: Import 10,000 messages → verify completes in <30 seconds
  - L6: Measure DB write throughput, identify bottlenecks
- **L4 J4a2: Concurrent Imports**
  - L5: 10 concurrent import requests → verify no data loss or corruption
  - L6: Verify SQLite WAL mode handles concurrent writes

#### L3 J4b: Query Performance
- **L4 J4b1: Filtered Query Speed**
  - L5: Query 100k imported messages with filters → verify <100ms response
  - L6: Verify indexes effective (EXPLAIN QUERY PLAN)
- **L4 J4b2: Aggregation Speed**
  - L5: Aggregate cost by provider across 100k messages → verify <500ms
  - L6: Optimize GROUP BY queries

### L2 J5: VERIFICATION CHECKLIST

#### L3 J5a: Data Integrity
- **L4 J5a1: No Data Loss**
  - L5: Verify all imported messages stored, none silently dropped
  - L6: Count check: imported count = DB row count
- **L4 J5a2: No Duplicates**
  - L5: Verify no duplicate messages (idempotent import)
  - L6: Unique constraint on request hash

#### L3 J5b: Accuracy
- **L4 J5b1: Provider Matching Accuracy**
  - L5: Test on 1000 real model names → verify >95% accuracy
  - L6: Measure false positives (wrong provider) and false negatives (unknown)
- **L4 J5b2: Cost Calculation Accuracy**
  - L5: Compare calculated costs vs provider billing → verify <1% error
  - L6: Account for pricing staleness

#### L3 J5c: Security
- **L4 J5c1: Sanitization Verification**
  - L5: Import request with auth headers → verify headers stripped in DB
  - L6: SQL query: `SELECT request_json FROM imported_messages WHERE id='...'` → no auth headers
- **L4 J5c2: PII Redaction Verification**
  - L5: Import message with email/phone → verify PII redacted (if enabled)
  - L6: SQL query: `SELECT request_json FROM imported_messages WHERE id='...'` → no PII

## Implementation Priority

1. **Unit Tests for Provider Matching + Cost Calculation** — 2 days
2. **Integration Tests for Import API + Unified Queries** — 2 days
3. **E2E Tests for Hermes Hook + Log File Import** — 2 days
4. **Performance Tests + Verification Checklist** — 1 day

## Open Questions

- Should tests run on every PR (CI) or only before release?
- How to handle test data (real provider API keys vs mock data)?
- Should the system generate test data automatically (synthetic messages)?

## Related Implementation Plans

- `9router/impl-plan-import-20-quality-rollout.md` — fixture harness, matcher/normalized-schema tests, roundtrip + fuzz, schema guards via `db.all("PRAGMA table_info(...)")`, staged rollout checklist
- `9router/impl-plan-import-13-deduplication-idempotency.md` — idempotency tests (same key twice → single row)
- `9router/impl-plan-import-09-observability-export.md` — export roundtrip test (export → import → no duplicates)
- `9router/impl-plan-import-14-format-adapters.md` — parser tests using real `cursorProtobuf.js` exports
