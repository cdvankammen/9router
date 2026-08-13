# Research — Error Inbox P2 Design (from B3/B4/Error-Inbox subagent)

**Date:** 2026-08-09
**Author:** GitHub Copilot agent (main session, from Explore-subagent research)
**Status:** draft
**Tags:** #research #messages #error-inbox #p2 #design

## Summary

The Messages page's remaining open items were researched via subagent: B3
(conversation grouping), B4 (cURL URL capture), and the P2 Error Inbox. B3 is
**already done** (DB-level conversation aggregation + keyset pagination,
committed). B4 is **implemented** (commit `a6ffda90`). The Error Inbox P2
remains — this doc captures the design decision needed before building it.

## Findings

### B3 — conversation grouping (DONE, no action)

Fixed by parallel agent: `getConversationSummary(filter)` in
`requestDetailsRepo.js` does `GROUP BY COALESCE(conversationId, '(none)')` over
the full filtered set; pagination refers to the conversation list; a selected
`conversationId` always fetches its full thread via `getConversationMessages`
(500 cap). Tested in `tests/unit/conversation-keyset.test.js` (12 tests).
Close TASK-LOG item.

### B4 — cURL URL capture (IMPLEMENTED, commit a6ffda90)

The upstream URL is available at capture time as `providerUrl` in
`chatCore.js` scope (the executor returns `{ response, url, headers,
transformedBody }`). The minimal fix threaded `providerUrl` into all 8
`buildRequestDetail` call sites (2 in chatCore, 3 in streamingHandler, 1 in
nonStreamingHandler, 2 in sseToJsonHandler), added `url` to the detail record +
repo whitelist (no schema change — data is a JSON blob), and `buildCurl` now
uses `detail.url` with the placeholder fallback for legacy rows.

**Gotcha found during verification:** the parallel agent's first pass used
`providerResponse?.url` (the fetch Response's `.url`). That is **empty for
synthetic `new Response()`** executors (codex, commandcode, cursor) — so the
main session switched all sites to `providerUrl || providerResponse?.url`.
Tests: `tests/unit/b4-curl-url-capture.test.js` (5 tests).

### Error Inbox P2 — design decision needed

Current state:
- `errorCategory` is set at capture via `categorizeError(status, text)`
  (`open-sse/utils/errorCategorizer.js`) — 8 stable categories: rate_limit,
  auth, billing, timeout, overloaded, content_filter, invalid_request, network,
  unknown. Filtered via JSON1 (`json_extract(data,'$.errorCategory')`) + facet.
- **Do NOT build the inbox on `open-sse/config/errorConfig.js`** — that is the
  retry/cooldown config (`ERROR_TYPES`/`ERROR_RULES`/`COOLDOWN_MS`), not the
  category taxonomy. The category strings come from `errorCategorizer.js`.
- BoardView groups by client-side fingerprint
  `provider|model|errorCategory|normalizedError.slice(0,120)` over the **page
  window only** — same page-scoping bug B3 fixed for conversations. The Error
  Inbox must aggregate **server-side** (SQL GROUP BY) or it undercounts.
- `/api/analyze-error` (POST `{detailId}`) already exists — the per-issue
  "analyze" hook the inbox can reuse.

Two sub-pieces:
- **A. Aggregation API**: add a fingerprint-grouping query to
  `requestDetailsRepo.js` mirroring `getConversationSummary` — `status=error`
  filter (indexed column) + optional `errorCategory` (JSON1); aggregate
  `COUNT(*)`, `MIN/MAX(timestamp)`, `SUM(cost)`, `MIN(error)`. Either a
  `view=errors` mode on `/api/messages` or a new `/api/messages/errors` route.
- **B. Triage persistence**: BoardView drag assignments are local-only.
  Options: (1) settings KV map (`boardColumns: { [fp]: columnKey }` via
  `settingsRepo` — smallest viable, survives reload); (2) proper
  `inboxIssues` table (fingerprint rows with status/assignee/notes/snooze —
  more work, arguably P3).

**Fingerprint stability decision (needed):** current BoardView fingerprint
includes raw error text (sliced 120) — tiny message variations fragment
fingerprints. For aggregation across records, use the **coarser**
`provider|model|errorCategory` key (Sentry-style) with error text as *display*,
not part of the key. Persist triage with the coarse key from day one to avoid
drift if a `messages`/`inboxIssues` table lands later.

## Recommendation

- Implement **P2 Error Inbox** with: server-side `view=errors` aggregation
  (SQL GROUP BY `provider|model|errorCategory`), coarse fingerprint key,
  reuse `/api/analyze-error` for per-issue analysis, and settings-KV triage
  persistence (option 1) as the first slice. Defer the full `inboxIssues`
  table until the messages-table migration (ADR-007) is warranted.
- Keep BoardView's rich client-side fingerprint for its card grouping, but
  note the Error Inbox uses the coarse key for aggregation.

## Related

- ADR-007 (`../../tracking/decisions/ADR-007-messages-json-blob-vs-messages-table.md`) — the
  10k-row threshold that gates the real inbox schema
- `open-sse/utils/errorCategorizer.js` — the category taxonomy
- `src/app/api/analyze-error/route.js` — the per-issue analyze hook
- `src/app/(dashboard)/dashboard/messages/components/BoardView.js` — current
  client-side fingerprint grouping