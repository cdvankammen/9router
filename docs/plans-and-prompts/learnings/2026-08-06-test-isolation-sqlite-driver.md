# Learning: Test Isolation with Shared SQLite Driver

**Date:** 2026-08-06
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #learning #testing #sqlite

## Situation

`unit/error-category-detail.test.js` passed in isolation but failed in the full suite: `expected 4 to be 1` — the conversationId filter matched rows from OTHER test files.

## Root Cause

The DB driver (`better-sqlite3` adapter) is **module-cached and shared across test files** in the same vitest process. `process.env.DATA_DIR` in `beforeAll` doesn't re-instantiate the adapter once it's already loaded. Rows from other files' writes appear in queries.

## Fix

Don't assert on total row counts for a fixed key. Use a **unique per-run id** (`conv-${Date.now()}-${random}`) and assert on the exact record found, not `details.length`.

## Prevention

When testing DB-backed code, always:
1. Use unique identifiers per test run (timestamp + random suffix)
2. Assert on the specific record, not collection sizes
3. Be aware the driver may already be initialized from a previous test file

## Related

- Commit `3f678deb`
