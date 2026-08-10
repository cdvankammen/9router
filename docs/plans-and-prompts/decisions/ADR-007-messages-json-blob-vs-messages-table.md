# ADR-007: Messages Page — JSON-Blob Store vs. Dedicated `messages` Table

**Date:** 2026-08-09
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #decision #messages #data-model #sqlite #observability

## Context

The Messages page (`/dashboard/messages`,
`src/app/(dashboard)/dashboard/messages/page.js` + `src/app/api/messages/*`)
reads traffic directly from **`requestDetails`** — the JSON-blob store
(`src/lib/db/schema.js`: `id TEXT PK, timestamp, provider, model,
connectionId, status, data JSON, conversationId`) — via
`getRequestDetails(filter)` and `getRequestFacets(filter)`.

The feature spec (`plans/messages-page-feature-spec.md` §3) proposes a
**hybrid relational pattern**: a thin searchable `messages` table
(`session_id`, `request_id`, `role`, `model`, `parent_message_id`, `status`,
`tokens`, `latency_ms`, `created_at` + indexes) as a *projection* of the fat
wire-faithful JSON bodies, with an **FTS5** virtual table for search and
cost columns for rollups. `requestDetails` stays the payload store.

This ADR settles which store the page queries **now**.

## Decision

**Keep the JSON-blob store (`requestDetails`) as the Messages page's query
store.** Do **not** create the `messages` projection table yet. Add it later,
gated on scale — revisit when `requestDetails` exceeds ~10k rows or when an
FTS5/cost-rollup feature is actually shipped.

## Why

- **Current scale is sound.** At the observed 200–1,000 record range every
  query the page issues is an indexed-column lookup or a small scan of an
  indexed table: `getRequestDetails(filter)` filters on `provider`, `model`,
  `status`, `conversationId`, and timestamp; `errorCategory`/`sourceApp` are
  filtered **in SQL via JSON1** so pagination math stays correct with no
  client-side post-filtering.
- **The "facets in SQL" requirement is already met.** `getRequestFacets`
  computes facet counts with `GROUP BY` over the full filtered set — no row
  payloads shipped, counts correct across pages. A relational table would not
  change this code path.
- **JSON-blob is the wire-fidelity source of truth (P1).** It preserves exact
  translated payloads, thinking blocks, and fallback attempts. A projection
  necessarily duplicates that and adds a second thing that can drift.
- **Dual-write drift risk outweighs the benefit at this scale.** The spec's
  population path (write from the buffered-writer flush) introduces
  dual-write drift — stream retries, dedupe by message `id`, partial writes —
  with **zero user-visible benefit** while the page is fast on the blob.
  Migration risk alone is low; dual-write risk is the real cost.

## Consequences

**Positive:**
- No new table, no migration, no dual-write path to keep in sync.
- JSON1 blob queries remain the single source of truth; page stays fast at
  current scale.
- Schema churn deferred until a real problem exists, not speculative.

**Negative (accepted):**
- No FTS5 full-text search — search is substring/regex-level for now.
- Conversation trees are assembled in JS from `conversationId` grouping, not
  from `parent_message_id` (no forking trees yet).
- Cost rollups are computed per-query in JS from `tokens`/`cost` fields.
- Facet queries scan the full filtered window (fine today; revisit at scale).

**Operational:**
- `requestDetails` retention janitor (`observabilityMaxRecords`, LIMIT-based
  sweep) remains the only cleanup path; keep the same exclusion in backups
  (`src/lib/db/backup.js`).

## When to Revisit

Introduce the `messages` projection table when **any** of these hit:

1. **Scale:** `requestDetails` grows past ~10k rows — pagination latency and
   facet scans degrade; keyset pagination on a thin table becomes the fix.
2. **Search:** FTS5 in-conversation search becomes a shipped requirement
   (spec §4 "Search").
3. **Cost rollups:** dashboard-level cost aggregates needed at scale — add
   precomputed/aggregate columns or a rollup table.
4. **Error Inbox (P2):** before building it, revisit — the inbox needs
   `status`/`errorCategory` aggregates and fingerprint queries that a thin
   table with `idx_msg_status` serves far better.

## Alternatives Rejected

- **Immediate migration to the spec's `messages` table** — dual-write drift
  risk (stream retries, dedupe, partial flush writes) with no user-visible
  benefit at 200–1,000 records; also FTS5/parent-tree features it would serve
  are not yet shipped.
- **Replace the blob store with fully normalized tables** — breaks wire
  fidelity (P1), the entire reason the blob exists.
- **Read-only projection rebuilt on demand** (derived table, not dual-write)
  — same drift/maintenance burden as the dual-write path with no scale driver
  today.

## Related

- Spec: `../plans/messages-page-feature-spec.md`
- Research: `../research/message-viewer-design-philosophies.md`
- Learning: `../learnings/2026-08-09-messages-page-audit-and-refactor.md`
