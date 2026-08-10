# Learning — Messages Page Audit & Refactor

**Date:** 2026-08-09
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #learning #messages #audit #refactor

## Summary

Full audit + bug-fix pass over the Messages page (`/dashboard/messages`,
`src/app/(dashboard)/dashboard/messages/`) and its API surface
(`src/app/api/messages/*`). Six real bugs were found and fixed, a shared
formatting module was extracted to stop client/server drift, and a set of
deferred findings and future refactors were recorded.

## Audit Method

1. A **code-audit subagent** did the first sweep over `page.js`, the three view
   components (`BoardView`, `TimelineView`, `TraceTreeView`), the list route
   (`/api/messages`), and the detail/export routes (`/api/messages/[id]`,
   `/api/messages/[id]/export`), flagging every suspicious pattern with a
   reasoning tag (e.g. `R1` for the fetch race).
2. The **main session verified each finding** against the live code before any
   fix — no finding was accepted on the subagent's word alone. Fixes were then
   applied and re-checked against the same code.

This two-stage loop caught both false positives (dropped before fix) and real
bugs that a single pass tends to skim over (the BoardView state bug only
survives inspection when you trace both the render path and the filter-change
path).

## Bugs Found + Fixed

| # | Bug | Location | Root cause | Fix |
|---|-----|----------|-----------|-----|
| 1 | BoardView `setState`-during-render + stale columns | `components/BoardView.js` | Board kept the full column assignment in state and updated it during render; re-renders looped, and fingerprints from old pages/filters persisted on the board after the filter changed | State now holds **only user drag moves** (`moves: fp → column`); `grouped` and `columns` are derived with `useMemo`. New fingerprints land in "New", stale ones disappear with the filter/page |
| 2 | `conversation.tokens` null crash | `src/app/api/messages/route.js` | Conversation token/cost rollups assumed `tokens` was always present on every message; a record with `tokens: null` produced `NaN`/crash in rollup and in `ConversationView` rendering | Optional-chaining everywhere (`m.tokens?.prompt_tokens \|\| m.tokens?.input_tokens \|\| 0`) and rollups initialized to `{ prompt: 0, completion: 0 }` / `0` |
| 3 | Fetch race on filter change | `page.js` (`load`) | A slow response for an older filter could resolve after a newer request and overwrite newer results | One `AbortController` per `load()`; the previous request is aborted, `AbortError` is ignored, and `setLoading(false)` only runs if the controller is still current (`loadAbortRef.current === controller`) |
| 4 | cURL export: empty URL + truncated payloads | shared curl builder (old local copy in `page.js` / export route) | Capture never stores the upstream URL, so the old builder emitted `curl -X POST ""`; large bodies truncated at capture lost their truncation marker in export | `buildCurl` emits a `<provider-endpoint>/v1/chat/completions` placeholder and, when the body is truncated, prints `# NOTE: original payload was truncated at capture (N bytes)` + the `_preview` |
| 5 | TimelineView phantom body bar + ttft mislabeling | `components/TimelineView.js` | When `latency.ttft` was missing, `latencyMetrics` fell back to `0` ttft and the full total was rendered as a "body" bar — i.e. time-to-first-token mislabeled as streaming time | ttft defaults to `0` only when not a number; the body segment renders **only when real body latency exists** (`bodyMs = total && ttft < total ? total - ttft : 0`); the ttft segment only when `ttft > 0` |
| 6 | BoardView drop not working on column container | `components/BoardView.js` | Only cards had `onDrop`/`onDragOver`; dropping on the empty column container did nothing, and the container lacked `onDragOver` `preventDefault()` so the drop event never fired | The column container now has its own `onDragOver={e => e.preventDefault()}` + `onDrop` that reads `text/fp` + `text/from` from `dataTransfer` and calls `move()` |

## Other Findings (minor — deferred, not bugs at current scale)

| Finding | Notes |
|---------|-------|
| Facet queries are full-window scans | `getRequestFacets(filter)` GROUP BYs the entire filtered set on every request. Correct and fast at hundreds of rows; will need precomputed/rolled-up aggregates at scale |
| Provider dropdown options come from the current page's rows only | A provider with no message on this page is invisible in the filter dropdown; options should come from the full provider list or a facet |
| Drawer Escape listener registered while closed | The detail drawer's `keydown` listener is attached even when the drawer is closed; should be bound/unbound with the open state |
| body-scroll-lock multi-drawer race | Rapid open/close across multiple drawers can leave `body` scroll-locked |
| Pagination lacks a timestamp tiebreaker | `created_at`-only keyset ordering can skip/duplicate rows when two records share an identical timestamp; needs a `(created_at, id)` tiebreaker |
| Unknown export format silently returns JSON | `/api/messages/:id/export?format=bogus` falls through to the JSON default; should return a 400 instead |

## Refactor Done

Extracted **`src/shared/messageFormats.js`** — a single shared module exporting
`prettyJson`, `buildCurl`, `extractText`, and `buildMarkdown`. Both consumers
now import from it:

- `src/app/(dashboard)/dashboard/messages/page.js` (client) — imports
  `prettyJson`, `buildCurl`, `extractText` for the format tabs.
- `src/app/api/messages/[id]/export/route.js` (server) — imports `buildCurl`
  and `buildMarkdown` for `?format=curl|markdown`.

The functions are pure (no hooks, no browser APIs), so the `"use client"`
directive is safe for the page import and the route treats the module as a
normal server module. This kills the drift that previously let the page's curl
output and the export route's curl output disagree (empty URL, lost
truncation markers).

> Note: `buildMarkdown` on the page is intentionally kept **local** — the page
> renders a richer transcript (role-styled request messages + provider payload
> sections) than the export route's version. The shared module's `buildMarkdown`
> serves the export route. If the two ever converge, hoist the richer one.

## Recommended Future Refactors (from research)

1. **`useMessagesQuery` hook** — extract the `load()`/AbortController/filter
   state machine currently inlined in `MessagesPage` into a reusable hook.
2. **Component extraction** — pull `MessageRow`, `FilterBar`, and
   `FacetSidebar` out of the ~600-line `page.js` monolith.
3. **`StatusBadge` → shared components** — move to `src/shared/components/`
   so the usage page / error inbox reuse it (`STATUS_STYLES` map is the
   canonical one).
4. **`messages` table projection at scale** — when `requestDetails` passes
   ~10k rows, introduce the thin `messages` projection with FTS5 +
   `parent_message_id` trees per the feature spec — see
   `../decisions/ADR-007-messages-json-blob-vs-messages-table.md`.
5. **P2 Error Inbox** — next feature on the roadmap
   (`plans/messages-page-feature-spec.md` §6); the BoardView fingerprint
   grouping is its foundation.

## Related

- Spec: `../plans/messages-page-feature-spec.md`
- Research: `../research/message-viewer-design-philosophies.md`
- ADR: `../decisions/ADR-007-messages-json-blob-vs-messages-table.md`
- Files: `src/shared/messageFormats.js`, `src/app/(dashboard)/dashboard/messages/`
  (`page.js`, `components/BoardView.js`, `components/TimelineView.js`),
  `src/app/api/messages/route.js`, `src/app/api/messages/[id]/export/route.js`
