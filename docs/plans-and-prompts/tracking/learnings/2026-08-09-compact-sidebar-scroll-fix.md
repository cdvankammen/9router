# Learning — Compact-Mode Sidebar Scroll Fix (Mobile Drawer)

**Date:** 2026-08-09
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #learning #layout #sidebar #scroll #responsive #css

## Problem

User report: when the dashboard is in a more compact mode (short viewport
height), the sidebar is **not scrollable** — content goes off the page and
cannot be reached.

## Reproduction (browser-verified)

Tested on `http://127.0.0.1:20131/dashboard` at multiple viewports:

| Viewport | Sidebar variant | Behavior |
|----------|----------------|----------|
| 1280×600 | Desktop (`hidden lg:flex`) | ✅ nav scrolls (scrollHeight 566 > clientHeight 364) |
| 1024×320 | Desktop | ✅ nav scrolls (maxScroll 362) |
| 800×500 | **Mobile drawer** (`fixed inset-y-0`) | ❌ **drawer content overflows viewport, unreachable** |

### Root cause (mobile drawer)

The mobile drawer wrapper in `DashboardLayout.js`:

```jsx
<div className={`fixed inset-y-0 left-0 z-50 transform lg:hidden ...`}>
  <Sidebar onClose={...} />
</div>
```

- `fixed inset-y-0` gives the drawer **viewport height** (e.g. 400px) but
  **`overflow: visible`** (default).
- The `Sidebar`'s `<aside>` has `min-h-full` (`min-height: 100%`) — which
  resolves against the drawer's height, but **does not cap it**. The aside
  grows with its content: measured **682px** inside a **400px** drawer.
- The `<nav>` inside has `overflow-y-auto`, but since the aside is *taller*
  than the viewport, the nav never needs to scroll — the **drawer itself**
  overflows the screen and, having `overflow: visible`, cannot scroll.

Measured before fix (800×500):
```
drawer: h=400  sh=682  overflow=visible   ← content spills out
aside:  h=682  sh=682  overflow=visible   ← grew past viewport
nav:    h=566  sh=566  overflow=auto      ← never triggers (aside too tall)
```

## Fix

Two changes:

1. **`DashboardLayout.js`** — mobile drawer wrapper gets
   `overflow-y-auto custom-scrollbar` so the drawer scrolls when the aside
   exceeds the viewport:

   ```jsx
   <div className={`fixed inset-y-0 left-0 z-50 transform lg:hidden
     transition-transform duration-300 ease-in-out overflow-y-auto custom-scrollbar ...`}>
   ```

2. **`Sidebar.js`** — `<aside>` gets `h-full` (in addition to `min-h-full`) so
   it is constrained to the drawer/viewport height and the **nav scrolls
   internally** (traffic lights + logo stay fixed, only nav scrolls):

   ```jsx
   <aside className="flex h-full w-72 flex-col ... min-h-full">
   ```

## Verification (browser, after fix)

800×500 mobile drawer:
```
drawer: h=400  sh=400  overflow=auto   ← constrained to viewport
aside:  h=400  sh=400  overflow=visible
nav:    h=284  sh=566  overflow=auto   ← internal scroll works (maxScroll 282)
```

- `nav.scrollTop = 150` → works (maxScroll 282).
- Desktop sidebar at 1024×320 still scrolls (maxScroll 362) — no regression.

## Why the desktop sidebar never had the bug

The desktop variant is wrapped in `<div className="hidden lg:flex">` — a flex
row inside the `h-screen overflow-hidden` root. Flex children are constrained
to the container height by default (`align-items: stretch`), so the aside
never grew past the viewport and the nav's `overflow-y-auto` engaged normally.

The mobile drawer is `position: fixed`, which **removes it from flex layout** —
no parent constraint, so `min-h-full` alone was insufficient.

## General pattern (for future drawers/panels)

- `position: fixed` elements escape flex/grid constraints — always pair
  `inset-y-0` (or `h-full`) with an explicit `overflow-y-auto` on the scroll
  container.
- `min-height: 100%` sets a *floor*, not a *cap*. If content is taller, the
  element grows. Use `h-full` + `overflow` on the wrapper to cap.
- The scrollable region should be the **innermost** element that can scroll
  (the nav), with the chrome (logo, traffic lights) fixed — better UX than
  scrolling the whole drawer.

## Related

- Files: `src/shared/components/layouts/DashboardLayout.js`,
  `src/shared/components/Sidebar.js`
- Committed in `7ec60ad8` (swept in with FTS5 work by parallel agent)
- Prior drawer fix: `src/shared/components/Drawer.js` width presets
  `w-[min(Npx,100vw)]` (compact-width overflow fix, commit `79c457e6`)