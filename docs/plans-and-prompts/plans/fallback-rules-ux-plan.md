# Fallback Rules UX — Plan & Roadmap

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #plan #fallback-rules #ux #dashboard

## Scope

The Per-Model / Per-Provider Fallbacks UI on `/dashboard/combos`. All views edit
the same underlying setting: `settings.modelFallbacks` — a map of
`{ target: { models: [...], retries: N, perModelRetries: {...} } }` where
`target` is a model string (`provider/model`) or a bare provider id.

## Current state (5 views, all shipped)

| View | What it is | Committed |
|------|-----------|-----------|
| Table | Form modal (FallbackRuleModal) + rules table | `d1cc1faa` / `6449b58b` / `b1e2a061` / `d7bf0e35` |
| Chain Flow | Drag-and-drop node chains + **live drop indicator** | `6449b58b` / `b520c9d6` |
| Simple + Advanced | Collapsible cards (progressive disclosure) | `6449b58b` |
| Guided Wizard | 3-step: target → chain → retries | `b1e2a061` |
| Expert Text | `target:model1,model2` DSL editor with preview | `b1e2a061` |

Shared pieces: `ProviderSelectModal` (visual provider picker),
`src/lib/fallbackTextFormat.js` (both storage shapes safe),
`settings.modelFallbacks` normalization in `src/sse/handlers/chat.js`,
retry engine in `open-sse/services/combo.js`.

## Done

- Provider picker with search + badges (no memorizing provider ids).
- Smart toggle switching model↔provider (strip on → provider, clear → model).
- Drag-to-reorder in BOTH Chain Flow and the modal; drop indicator in Chain Flow.
- Expert Text preserves advanced-shape retries on re-parse (round-trip safe).
- E2E-verified every view; suite 1718 pass / 88 baseline fail.

## In progress / pending

| Item | Notes | Blocked by |
|------|-------|-----------|
| Choose ONE of the 5 views | User: "we will eventually choose one of them" | User decision (TASK-LOG #48) |
| Inline per-model retries in modal chain boxes | UX research recommends it (proximity/common region; see research/9router/16-ux-research-*). Remove the separate bottom list; keep universal retries separate | User approval (TASK-LOG #49) |
| Drop indicator in the modal chain | Same technique as Chain Flow; trivial once #2 lands (input inside draggable row needs pointerdown stopPropagation) | #49 |
| DragOverlay lift polish | Optional visual polish on top of the indicator | User request |

## Out of scope (deliberately)

- Changing the storage shape (backward compatible already).
- Cloud sync of fallback rules (not requested).
- Backend retry-policy changes (already shipped in combo.js).

## Verification approach

Every visual change is verified with the production standalone E2E rig (port
20130, mock upstream 24000): synthetic pointer-event drags, settings PATCH
assertions, full vitest regression (baseline 88 failures documented in
`tests/__baseline__/known-fails.txt`).
