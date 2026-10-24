# Branch S: Deduplication & Idempotency — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, deduplication, idempotency, binary-tree, branch-s

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch S: DEDUPLICATION & IDEMPOTENCY

The same message can arrive via multiple channels (hook + log tail + proxy). Deduplicate by content fingerprint and make imports idempotent so re-imports never double-count.

### L2 S1: DEDUPLICATION STRATEGIES

#### L3 S1a: Content Fingerprint
- **L4 S1a1: SHA-256 Fingerprint**
  - L5: `fingerprint = sha256(canonical(request_json) + canonical(response_json) + model + timestamp_window)`
  - L6: Canonical = stable JSON stringify (sorted keys)
- **L4 S1a2: Fingerprint Column**
  - L5: Add `fingerprint TEXT UNIQUE` column to `imported_messages`
  - L6: `INSERT OR IGNORE` on conflict → idempotent

#### L3 S1b: Source+Session+Index Key
- **L4 S1b1: Natural Key**
  - L5: `UNIQUE(source, source_session_id, message_index)`
  - L6: Works when the source provides stable per-session message indices

#### L3 S1c: Time-Window Fuzzy Dedupe
- **L4 S1c1: Near-Duplicate Detection**
  - L5: Same model + same prompt hash within 60s window → likely duplicate
  - L6: Mark `duplicate_of` instead of inserting

### L2 S2: IDEMPOTENCY

#### L3 S2a: Idempotency Keys
- **L4 S2a1: Client-Supplied Key**
  - L5: Import API accepts `idempotency_key` per message or per batch
  - L6: Server stores key; duplicate key → 200 with `duplicate: true`
- **L4 S2a2: Batch Idempotency**
  - L5: `batch_id` on the payload; re-sending same batch_id is a no-op
  - L6: `import_batches` table tracks processed batch_ids

#### L3 S2b: Re-Import Semantics
- **L4 S2b1: Skip vs Replace**
  - L5: Config: `onDuplicate: "skip" | "replace" | "error"`
  - L6: skip=default; replace=update row; error=409 response

### L2 S3: DEDUPE PIPELINE

#### L3 S3a: Pre-Insert Dedupe
- **L4 S3a1: In-Memory Set**
  - L5: Batch import checks fingerprints against in-memory set first
  - L6: Avoids DB round-trips for large batches
- **L4 S3a2: DB Unique Index**
  - L5: Final guard: UNIQUE index on fingerprint
  - L6: Race-safe

#### L3 S3b: Post-Insert Dedupe
- **L4 S3b1: Periodic Cleanup**
  - L5: Nightly job finds duplicate fingerprints and merges
  - L6: Keeps `duplicate_of` pointers

### L2 S4: DUPLICATE REPORTING

#### L3 S4a: Duplicate Stats
- **L4 S4a1: Import Response**
  - L5: Import API response includes `{ imported: n, duplicates: m, skipped: k }`
  - L6: UI shows counts

#### L3 S4b: Duplicate Viewer
- **L4 S4b1: Duplicate Group UI**
  - L5: Messages page filter `?duplicates=true` shows groups
  - L6: Each group expandable to see all copies

### L2 S5: EDGE CASES

#### L3 S5a: Streaming Retries
- **L4 S5a1: Partial Stream Duplicates**
  - L5: A retried stream may contain the same first N chunks
  - L6: Fingerprint on final assembled message, not chunks

#### L3 S5b: Timestamp Drift
- **L4 S5b1: Clock Skew**
  - L5: Sources may have skewed clocks; fingerprint should not include raw timestamp
  - L6: Use rounded time window (e.g., 5-minute bucket)

## Open Questions

1. Should dedupe be strict (fingerprint) or fuzzy (time-window)?
2. What's the expected overlap between channels (hook vs log tail)?
3. Should duplicates be visible in UI or silently merged?

## Related Implementation Plans

- `9router/impl-plan-import-13-deduplication-idempotency.md` — fingerprinting, idempotency keys, dedupe pipeline with code