# UI / UX Guide

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #ui #ux #dashboard #components

Conventions for the dashboard (`src/app/(dashboard)/`), a Next.js App Router client-heavy area. Plain JavaScript, no TypeScript — see root `CLAUDE.md`.

## Shared components, don't duplicate

- `src/shared/components/ModelSelectModal.js` — the single model picker used across combos, provider pages, and manual model add flows. New model-selection UI should reuse this, not build a new picker.
- `src/shared/hooks/useModelCaps.js` — caches `/api/models` **at module level**. Any change that alters model capabilities server-side needs `refresh()`/`invalidateModelCaps()` or pickers silently show stale caps (see `../tracking/learnings/2026-08-12-provider-observability-and-usage-fixes.md` §5 for the incident this caused).

## Drag-and-drop

Combo/fallback-chain building uses `dnd-kit`. The drop-indicator placement decision and its coordinate gotchas are documented rather than re-derived:
- `../tracking/decisions/ADR-006-drop-indicator-approach.md`
- `../tracking/learnings/2026-08-07-drop-indicator-dnd-kit-coordinates.md`
- `../research/9router/16-ux-research-drop-indicator-and-override-placement.md`

## Long-running / bulk UI actions

If a button triggers a bulk operation over N items (e.g. importing 400+ models), don't show a static "Loading..." label — surface real progress (`Importing 123/410...`). A slow-but-working bulk operation with no progress feedback is indistinguishable from a hang to the user. See `../tracking/learnings/2026-08-13-openrouter-refresh-models-serial-import-hang.md` for the incident this guidance comes from, and prefer a bounded-concurrency worker pool (e.g. 8-way) over either fully-serial or fully-parallel loops when the operation POSTs per item.

## Error visibility

There are two error-reporting systems on provider pages — see `../tracking/decisions/ADR-008-provider-page-observability-reuse.md`:
- **System A** — a per-account `lastError` string (drives the red chip). No history.
- **System B** — the `requestDetails` table grouped into fingerprints, exposed via `/api/messages?view=errors&provider=<id>` (count, first/last seen, category, sample). Prefer System B for any new error-history UI.

## Testing UI changes

Before reporting a UI change complete, start the dev server and exercise it in a browser (golden path + edge cases), per root `CLAUDE.md`. `../operations/ui-testing-workflow.md` is the living test plan — update it in the same commit if you touch a page it covers.

## Related

- `../tracking/decisions/` (ADR-006, ADR-008)
- `../tracking/learnings/` (drop-indicator, provider-observability, openrouter-import-hang)
- `../operations/ui-testing-workflow.md`
