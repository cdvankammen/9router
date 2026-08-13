# ADR-006: Drop Indicator Approach for Chain Flow Drag-and-Drop

**Date:** 2026-08-07
**Author:** GitHub Copilot agent (with user request)
**Status:** active
**Tags:** #decision #adr #dnd-kit #drag-drop #fallback-rules
**Replaces/supersedes:** none (new decision)

## Context

Chain Flow lets users reorder fallback-model chips by click-and-hold dragging.
Users reported it was hard to tell where the chip would land. The user asked for
a vertical bar indicator that moves around while dragging, showing the landing
slot.

## Decision

Implement a **live drop indicator bar** in `SortableChain`:

1. On every `onDragMove`, compute the insertion slot: dragged chip's live
   viewport rect (`initial rect + event.delta`) vs sibling chips' live
   `getBoundingClientRect()`, compared in reading order (row-aware, so wrapped
   rows work).
2. Render a 3px vertical accent bar (primary color, glow, 70ms slide transition)
   at the gap between the chips around that slot.
3. On drop, use the computed insert index (not the dnd-kit `over` index) so the
   final order matches where the bar was.
4. `rectSortingStrategy` replaces `verticalListSortingStrategy` for correct
   wrap-aware layout math.

Commit: `b520c9d6`.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| **DragOverlay (lift the chip + shadow)** | Nice polish but heavier; risk of the stale-text-node class of glitch; bar alone already answers the question. Could add later as polish. |
| **Transform-only (status quo)** | Chip follows cursor but no landing slot → the exact problem the user reported. |
| **`over`-based index on drop only** | Drop position is a guess (dnd-kit's `over` is the nearest droppable, not the precise slot). Fails the "matches where the bar was" requirement. |
| **window.scrollY normalization for coordinates** | Tested first; FAILED because the dashboard uses an inner scroll container, not the window. See ../learnings/2026-08-07-drop-indicator-dnd-kit-coordinates.md. |

## Consequences

- **Positive**: predictable drags; the release position is explicit; works across wrapped rows; small contained change (~1 file).
- **Negative**: one extra rect-measure + setState per pointer move (negligible for ≤10 chips); indicator is visual-only (no unit-testable logic — verified via E2E synthetic pointer events).
- **Reversible**: yes — the bar element and computeInsertion can be removed without touching the drop logic fallback (`over`-based).

## Pending decision (recorded for later)

**Per-model retry override placement** in the Add Fallback Rule modal: research
(see ../../research/9router/16-ux-research-*) recommends moving per-model retries INTO
each model's chain box (Gestalt proximity/common region, NN/g progressive
disclosure) and removing the separate bottom list; universal retries stays
separate. Implementation awaits user approval (TASK-LOG #49).
