# Exhaustive Bug Audit — No-More-Bugs Pass (2026-08-08)

**Date:** 2026-08-08
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #audit #bugs #no-more-bugs #hardening

## Method

Systematic read-through of every file changed on `v1` this session (hardening
phases 1–4, messages page, observability threading) plus targeted runtime
verification (unit tests written per bug, full regression 1731 pass / 88
baseline). Each bug: symptoms → root cause → fix → test.

## Bugs found & FIXED (6)

### BUG-A (High, silent data loss) — sequential partial PATCHes clobber
- **Where:** `src/lib/db/repos/settingsRepo.js` `updateSettings`
- **Symptom:** PATCH `{smartRouter:{enabled:true}}` then PATCH
  `{smartRouter:{allowedModels:[...]}}` → `enabled` reset to default false.
- **Root cause:** nested keys merged against **defaults**, not the **stored**
  value; a second partial PATCH rebuilt the object from defaults + the new key,
  discarding the first PATCH's keys. UI safe (sends full objects); external API
  callers silently lost data.
- **Fix:** split nested keys into `CONFIG_MERGE_KEYS` (accumulate against
  stored: smartRouter, capacityAdapter, srComboCleanup) and `MAP_REPLACE_KEYS`
  (replace semantics: modelFallbacks, *Strategies, quotaVisibility,
  dnsToolEnabled — merging would resurrect UI deletes).
- **Tests:** +2 (sequential smartRouter + capacityAdapter accumulation); 8/8.
- **Commit:** `f7c1bf8e`

### BUG-B (Low, misclassification) — sourceApp `/droid/i` caught Android browsers
- **Where:** `src/lib/sourceApps.js`
- **Symptom:** a mobile-browser UA ("Linux; Android 13…") classified as
  "Codex CLI".
- **Root cause:** bare `/droid/i` regex matched "Android" in any UA.
- **Fix:** require codex adjacency: `/codex[ _-]?droid|droid[ _-]?codex/i`.
- **Commit:** `0a65a631`

### BUG-C (Low, inaccurate health) — health endpoint missed per-model locks
- **Where:** `src/app/api/health/providers/route.js`
- **Symptom:** a connection locked for a specific model reported `locked: 0`.
- **Root cause:** `isModelLockActive(conn)` with no model only checks the
  account-level `modelLock___all` key.
- **Fix:** use `getEarliestModelLockUntil(conn)` (iterates every `modelLock_*`).
- **Commit:** `0a65a631`

### BUG-D (High, wrong results) — messages errorCategory/sourceApp filters broke pagination
- **Where:** `src/app/api/messages/route.js` + `requestDetailsRepo`
- **Symptom:** filtering by errorCategory/sourceApp produced wrong totals and
  empty pages even when matching rows existed on later pages.
- **Root cause:** filters applied client-side AFTER SQL pagination (fields live
  in the `data` JSON column).
- **Fix:** SQL `json_extract(data, '$.errorCategory'/'$.sourceApp')` conditions
  in `getRequestDetails` (all bundled SQLite adapters ship JSON1) — COUNT +
  OFFSET math now correct. Messages route passes filters through.
- **Tests:** +5 (JSON1 filter, sourceApp filter, combined pagination, facets
  counts, filtered facets, histogram totals).
- **Commit:** `0a65a631`, `378cd321`

### BUG-E (High, perf + correctness) — facets fetched 10k full records per load
- **Where:** `src/app/api/messages/route.js` (facets block)
- **Symptom:** every messages page load fetched up to 10,000 full records
  (each with request/response JSON, ~5KB+) = tens of MB parsed per request;
  counts silently truncated past 10k.
- **Root cause:** facet counting done in JS over fetched rows.
- **Fix:** `getRequestFacets()` — `COUNT(*) GROUP BY` per dimension + a light
  timestamp/status query for the 24h histogram. Shared `buildWhere()` with
  `getRequestDetails`. This is the textbook faceted-search approach (see
  refactor-decisions doc).
- **Commit:** `378cd321`

### BUG-F (Medium, wrong UI) — histogram dropped the current hour
- **Where:** `getRequestFacets` histogram (found by the BUG-E tests)
- **Symptom:** rows that arrived in the current partial hour never appeared in
  the histogram.
- **Root cause:** bucket window `[now-24h, now)` keyed by hour-start — the
  current hour's key fell past the last bucket.
- **Fix:** anchor buckets at `hourStart(now) - 23h` (23 full hours + current).
- **Commit:** `378cd321`

### BUG-G (Medium, user-visible) — messages status filter vocabulary
- **Where:** `src/app/(dashboard)/dashboard/messages/page.js`
- **Symptom:** selecting "done" in the status filter returned an empty list.
- **Root cause:** rows stored as `status:"success"`/`"streaming"` but the
  filter offered `done/partial/cancelled` (review doc 20, bug B1).
- **Fix:** filter vocabulary now matches stored values
  (`success/error/streaming/partial/cancelled`).
- **Commit:** `ba7378db`

## Verified-clean areas (no bugs found)

- `combo.js` retry loop (per-model retries, fallback chain observability,
  non-retryable short-circuit, exception→next-model) — correct.
- `chat.js` fallback interception (model>provider precedence, chain
  construction, adapter augmentation) — correct.
- `markdownLog.js` atomic temp+rename write — correct.
- `smartRouter.js` sticky TTL plumbing (`getStickySession`/`setStickySession`
  accept TTL; scores shape `{model, score}`; `scores: null` safe for UI) —
  correct.
- `tokenRefresh.js` failure tracking round-trips through the JSON column;
  reset-on-success clears count + reauth reason — correct.
- Messages views (TraceTree/Board/Timeline): no XSS (no innerHTML/eval), keys
  present, HTML5 dnd via dataTransfer — correct.
- Drawer `w-[min(800px,100vw)]` — compact-mode overflow (spec §12.1) already
  fixed in the shared component; messages FormatTabs has a Wrap toggle (§12.2).

## Remaining (documented, deferred by design)

| Item | Why deferred |
|------|--------------|
| B3: conversation grouping is page-window-scoped (multi-page convs show partial chains) | Needs a dedicated conversation-grouped query + UI paging work (P3-level) |
| B4: cURL tab shows `<provider-endpoint>` placeholder | `providerUrl` not captured; capture-side enhancement (P3 enrichment) |
| 4.3/4.4: TokenRouter pricing re-validation, mimo startup health check | User-owned (YOURS) — see hardening roadmap |
| Error Inbox (P2 spec) | Feature not built yet (messages page spec phases) |
