# Drop Indicator: dnd-kit Coordinate-Space Bug (Chain Flow)

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #learnings #dnd-kit #drag-drop #coordinate-systems #e2e

## Situation & Symptoms

Building a live drop indicator (vertical accent bar showing where a dragged chip
will land) in the Chain Flow view. The bar rendered, but its position was
**frozen** — it never moved while dragging, even though the dragged chip clearly
moved. The computed insert index was pinned at the maximum value.

## Root Cause

dnd-kit's `active.rect.current.translated` (the dragged node's live rect) is
**content-relative** when the drag happens inside a *scrolled* container:

- The 9Router dashboard uses an **inner scroll container** (`overflow-y-auto` on
  the main content column) — not the window.
- `window.scrollY` was `0` (the window never scrolls), but the dragged chip's
  `translated.top` was `2228` (its position in *content* coordinates).
- Meanwhile `getBoundingClientRect()` on sibling chips returns **viewport**
  coordinates (e.g. `top: 960`).
- Comparing `pointerY = 2228` against chip `cy = 960` puts the pointer "below"
  every chip → every chip counts as "before the pointer" → insert index frozen
  at the end.

## The Failed First Fix (important!)

Attempted: normalize chip rects by adding `window.scrollY`/`window.scrollX`.
**FAILED** — the scroll container is NOT the window, so `window.scrollY` is 0
and the mismatch persisted. Do not assume window-scroll normalization works in
apps with inner scrollers.

## The Working Fix

Compute the dragged chip's live **viewport** rect directly:

```js
const initial = event.active?.rect?.current?.initial; // viewport-relative
const delta = event.delta || { x: 0, y: 0 };          // drag delta, viewport px
const pointerX = initial.left + delta.x + initial.width / 2;
const pointerY = initial.top + delta.y + initial.height / 2;
```

`initial + delta` stays in viewport space, apples-to-apples with
`getBoundingClientRect()`. No scroll math needed.

## How to Detect / Prevent Recurrence

1. When a drag-derived rect seems frozen/wrong, log BOTH the rect under test and
   a `getBoundingClientRect()` of the same node: if the coordinate spaces differ
   by the scroll offset of an ancestor, you've hit this bug.
2. Check whether the app scrolls via `window` or an inner container before any
   scroll-based normalization.
3. Prefer `initial + delta` over `translated` when you need viewport-space math
   inside scrolled containers.

## Related

- Commit: `b520c9d6` (feat(fallbacks): live drop indicator bar)
- Test technique note: embedded-browser `page.mouse.down()` can stop emitting
  pointer events mid-session — synthetic `PointerEvent` dispatch (isPrimary,
  button 0) drives dnd-kit's real handlers reliably. See
  `workflows/ui-testing-workflow.md`.
