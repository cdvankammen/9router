# UX Research: Drop Indicator + Per-Model Override Placement

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #research #ux #gestalt #drag-drop #fallback-rules

## Question 1: Drop indicator for the Chain Flow drag-and-drop

User: "its hard to know where it will land is there a way that we can have like a vertical bar that will move around in the list showing us where it goes?"

### What the pattern is
A **drop indicator** (insertion guide): while holding an item, a thin bar slides
between the other items showing the exact slot where the item lands on release.
Used by Trello, Notion, VS Code lists, most sortable-list libraries.

### Sources
- Gestalt **Common Region** (Interaction Design Foundation — https://www.interaction-design.org/literature/topics/gestalt-principles): elements in a closed region are perceived as a group. The bar visually marks the boundary between two groups, making the drop slot legible.
- Gestalt **Proximity** (same source): the bar sits physically between the two neighboring chips, so the user perceives the exact gap.
- dnd-kit docs/ecosystem: the standard "insertion indicator" implementation measures sibling rects and positions an absolutely-placed bar; the drop index is computed from pointer vs rect midpoints (our implementation).

### Decision
Implemented: 3px accent bar, recomputed every pointer move from live sibling rects (reading-order comparison for wrapped rows); drop reuses the computed index. ADR-006 records the trade-offs (bar + computed index vs DragOverlay lift vs transform-only).

## Question 2: Where should per-model retry overrides live in the Add Fallback Rule modal?

User: "would ux rules say that we should keep the per model overrides where they are at or would it be better to have that per model override option as part of the same box the model is in for fallback chain (research this for now and report back)"

### Current state (what the research evaluated)
The modal lists the fallback chain (ordered model boxes) and has a SEPARATE
"Per-model overrides (optional)" section below that duplicates the model names
with retry inputs. Universal retries live in their own field.

### UX principles applied
1. **Gestalt Law of Proximity** (IxDF — same source): "We group closer-together elements, separating them from those farther apart." The override for `openai/gpt-4o` belongs next to `openai/gpt-4o`, not in a second list inches away. Two parallel lists force the user to visually map model names — recognition vs recall failure.
2. **Gestalt Common Region**: putting the override inside the same box as the model makes ownership obvious; if the box is dragged, the override travels with it — the correct mental model (override belongs to the MODEL, not to position #2).
3. **Progressive Disclosure** (Nielsen Norman Group — https://www.nngroup.com/articles/progressive-disclosure/): core features up front, advanced features deferrable *in place* (e.g., an "auto"/inherit placeholder input). A separate section that users must discover is worse than a compact inline input.
4. **Spatial contiguity / direct manipulation** (standard HCI): people edit attributes fastest where the object lives.
5. **Consistency**: the Chain Flow view ALREADY renders per-model retries inline under the chain (`combos/page.js:1107`). The modal is the inconsistent one.

### Recommendation
- **Move per-model overrides INTO each model's chain box** (second line: `retries: [5] (auto = inherit)`), remove the bottom duplicate list.
- **Keep universal retries separate** — it is a rule-level setting ("try every model N times"), different scope.
- **Don't keep both** (inline + separate section) — two editors for one value = sync bugs and confusion.
- **One implementation caveat**: the row is drag-grabbable, so the inline input must stop propagation on pointerdown (our drags already use a 4px activation constraint).

### Status
Researched and reported to the user (they asked to research "for now"). Implementation PENDING user approval — tracked in TASK-LOG #49 and ADR-006 (pending).
