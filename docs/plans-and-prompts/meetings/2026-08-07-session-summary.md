# Meeting / Session Summary — 2026-08-07

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #meeting #session-summary #fallback-rules

## Attendees
- User (directing)
- GitHub Copilot agent (main session)

## User asks this session → what shipped

| # | User ask (paraphrased) | Shipped | Commit |
|---|------------------------|---------|--------|
| 1 | Optional cleanup for sr-* combos, OFF by default, with real tests | `srComboCleanup` scheduler + setting + UI toggle + 13 tests; E2E: planted stale/fresh/user combos → only stale sr-* deleted | `64c57811` |
| 2 | "did we finish multiple per-model/provider fallback options?" | Verified COMPLETE (settings.modelFallbacks + chat.js interception + combo.js retries + 3-view UI); 7/7 tests | — (verification) |
| 3 | More approaches for fallback rules ("different theories") | 2 new views → 5 total (Guided Wizard, Expert Text) | `b1e2a061` |
| 4 | Pick a provider visually (don't memorize ids) | `ProviderSelectModal` (icons, badges, search) + "Pick provider…" in modal + wizard | `b1e2a061` |
| 5 | Toggle switching must swap the box (no stale model) | model→provider strips to provider; provider→model clears — deliberately simple | `b1e2a061` |
| 6 | Drag-and-drop reorder inside the Add Fallback Rule modal | Sortable chain rows + arrows kept | `d7bf0e35` |
| 7 | Vertical bar showing where a dragged chip will land (Chain Flow) | Live drop indicator; E2E: bar tracked 378px→181px, drop honored it | `b520c9d6` |
| 8 | Research: where should per-model overrides live? | Research done + reported (move into the model box); implementation pending | — (research) |
| 9 | Sweep ALL tracking docs, include errors, add files/folders as needed | Full plans-and-prompts sweep + 6 new docs (see below) | docs commits |

## Errors & problems recorded this session (see learnings/ for detail)
1. `toDraftText` crash on advanced-shape rules (`(t||[]).join is not a function`) — E2E caught, fixed in extracted lib.
2. Stale number badges after modal drag reorder — React text-node reuse; `key={idx}` fix.
3. Drop-indicator insert index frozen — dnd-kit `translated` rect is content-relative in inner-scrolled containers; `window.scrollY` fix failed; `initial + delta` fix works.
4. Embedded-browser mouse flakiness — synthetic PointerEvent dispatch for drag E2E.
5. Off-viewport drag targets eat no events — scrollIntoView + elementFromPoint check.
6. Docs gitignore quirk — `docs/plans-and-prompts` needs `git add -f` (already tracked).

## Docs created/updated this session
- Updated: CHANGELOG.md, SESSION-HISTORY.md, SESSION-NARRATIVE.md, TASK-LOG.md, workflows/ui-testing-workflow.md
- New: learnings/2026-08-07-drop-indicator-dnd-kit-coordinates.md, research/9router/16-ux-research-drop-indicator-and-override-placement.md, decisions/ADR-006-drop-indicator-approach.md, plans/fallback-rules-ux-plan.md, meetings/2026-08-07-session-summary.md (this file)

## Open items (user decision)
- Pick ONE fallback-rule UI view (5 currently).
- Approve inline per-model retries in modal chain boxes.
- Optionally add DragOverlay lift polish.
