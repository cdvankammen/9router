# Postmortem: errorCategory Dropped Before Storage

**Date:** 2026-08-06
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #learning #postmortem #observability #errorcategorization

## Situation

The error categorization engine (`categorizeError`) was called at all chatCore error paths, unit tests passed, build passed. But an E2E test with a real 429 from a mock upstream showed captured request details had NO `errorCategory` field.

## Root Cause

Two layers dropped the field between computation and storage:
1. `buildRequestDetail()` (open-sse/handlers/chatCore/requestDetail.js) built its output object with an explicit field list — `errorCategory` wasn't in it
2. The repo flush record (`src/lib/db/repos/requestDetailsRepo.js`) built its persisted object with its own field list — also missing `errorCategory`

The categorizer ran; the value vanished before the INSERT.

## Why Unit Tests Missed It

The pure-function tests only tested `categorizeError` in isolation — never the full `buildRequestDetail → saveRequestDetail → getRequestDetails` round trip. The integration test added (`error-category-detail.test.js`) would have caught it immediately.

## Fix

Forward `errorCategory` through both `buildRequestDetail` and the repo flush record. Integration test asserts the full round trip.

## Prevention

For any new field added to observability records, add an integration test that exercises the ENTIRE pipeline (build → save → read), not just the pure function.

## Related

- Commit `40168739` (fix)
- Commit `3e7d1c7c` (engine)
