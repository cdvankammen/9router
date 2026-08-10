# Research: Messages Page Audit — Bugs, Refactors, Design Decisions

**Date:** 2026-08-08
**Author:** GitHub Copilot agent (main session) + Explore subagent
**Status:** active
**Tags:** #research #messages #audit #refactor #design-decisions

> Method: subagent code audit (20+ findings) → main-session verification of
> top findings → fixes → refactor subagent report → shared-module extraction.
> Subagent claims were verified against actual code before any fix.

---

## 1. Code Audit Findings (verified + fixed)

### Fixed (commit `330d7230`)

| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| B1/B2/B3 | BoardView setState-during-render + stale columns + stale closure in move | Major | Moved to `moves`-map + derived-columns pattern; functional updates |
| D1 | `conversation.tokens` undefined → crash | Major | `tokens?.prompt ?? 0` in ConversationView + TraceTreeView |
| R1 | Fetch race on filter change (slow response overwrites newer) | Major | AbortController per request; aborts swallowed; loading only clears for latest |
| A3 | curl export empty URL + `_truncated` marker dump | Major | Placeholder endpoint + truncated detection w/ note + preview |
| U1/U2 | TimelineView phantom 2% body bar; ttft mislabeled as total | Minor | Body segment only when `total > ttft`; ttft fallback removed |
| U3 | BoardView drop doesn't work on empty column | Minor | onDragOver/onDrop on column container |
| B6 | extractText infinite recursion risk | Minor | Depth cap (in refactor commit) |

### Verified non-issues (audit flagged, checked clean)
- B5 (conditional hook in MessageDetailDrawer) — `useCopyToClipboard` is before the return; safe
- B5 fmtTokens null handling — `n == null` short-circuits; correct
- A2 (params await in Next 15) — correct as written

### Deferred (minor, documented for P2/P3)
- B7 Drawer Escape listener always attached (harmless today)
- B7 Drawer body-scroll-lock race with multiple drawers (latent)
- P1 facet queries full-window scan at 10k+ rows (needs SQL bucketing)
- A5 pagination tiebreaker (`ORDER BY timestamp DESC, id DESC`)
- A6 empty-state text misleading when filters active
- D3 conversation grouping is page-window-scoped (needs SQL GROUP BY or labeling)

---

## 2. Refactor Decisions (subagent report, verified)

### R1. JSON-blob vs messages table — **don't migrate now**
At 200–1,000 records the JSON-blob store is fine (indexed columns, SQL facets).
Migrate to the spec's `messages` table (FTS5, parent_message_id trees, cost
columns) only when rows exceed ~10k. Wins when we do: FTS5 search, cross-page
conversation trees, SQL cost/token rollups. Migration risk is low (additive
table, same flush path) but dual-write drift needs a backfill-on-read guard.

### R2. State management — **extract `useMessagesQuery` hook**
page.js has 10+ useState + an effect-driven fetch (React lint flags it). A
custom hook owning filter state / page / loading / abort guard is the fix.
**Do NOT convert to server components** — this is a live-filterable dashboard.

### R3. Component structure — **extract from 644-line page.js**
- `MessageRow` + `MessagesTable`
- `FilterBar` (props-in/props-out)
- `FacetSidebar` (feeds the existing `facets` payload)
- `StatusBadge` + `STATUS_STYLES` → shared/components (duplicated across views)
- Formatters → shared `messageFormats.js` (**DONE**, commit `c6988820`)

### R4. Design decisions (rooted in research docs)
- **Roadmap: P2 (Error Inbox) next** — highest-demand gap, reuses `/api/analyze-error`
- **Tabs layout: keep** — universal expectation (Bruno/mitmweb), views-not-modes (Linear)
- **FTS5 vs LIKE:** LIKE suffices <1k rows; FTS5 at 10k+ with snippets
- **sourceApp approach: keep regex rules** — UA-parser libs misclassify AI SDKs; privacy already correct (capped, never stored)

### R5. Real-world patterns to adopt
| Tool | Pattern | Adopt? |
|------|---------|--------|
| Sentry | fingerprint-grouped issues + triage + frequency chart | ✅ Board/Inbox |
| Langfuse | trace tree + session replay + denormalized attrs | ✅ Trace view |
| Helicone | gateway+viewer product shape | Copy ideas; maintenance mode |
| Datadog/OpenObserve | facets-left + histogram-as-navigation | ✅ FacetSidebar |
| Arize Phoenix | — | ❌ ELv2 license |

---

## 3. Bugs Found Outside the Audit (main-session verification)

1. **providers/page.js missing `useCallback` import** — build-blocker from parallel work; fixed
2. **providers/[id]/models/route.js duplicate `url`** — build-blocker; fixed
3. **sourceApp/userAgent never persisted** — two drops (sub-handlers + repo record); fixed
4. **Stale server process serves old build → ChunkLoadError** — kill+restart after every rebuild

---

## 4. Open Decisions (for the user)

- [ ] P2 (Error Inbox) next vs P3 (enrichment) first
- [ ] messages-table migration trigger: at what row count?
- [ ] FacetSidebar UI: always-on left rail vs collapsible?
