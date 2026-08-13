# UI Testing Workflow — Dashboard Feature Verification

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #workflow #testing #ui #dashboard #browser

> ⚠️ SYNC NOTE: This workflow MUST be updated whenever dashboard components
> change. If you modify files under `src/app/(dashboard)/` or
> `src/shared/components/`, re-run the relevant sections below and update
> expected element refs/labels.

## Prerequisites

- Server running on port 20130 (see `e2e-testing-workflow.md`)
- Browser open at `http://127.0.0.1:20130/login`
- Password: `123456`

## Page-by-Page Walkthrough

### P1: Login Page
**URL:** `/login`
**Verify:**
- [ ] Heading "9Router" visible
- [ ] Password input accepts text
- [ ] Login button submits → redirects to `/dashboard`
- [ ] Default password hint shown
- [ ] Security risk warning shown when no password set

### P2: Combos Page
**URL:** `/dashboard/combos`
**Verify:**

#### Combo Cards
- [ ] Each combo shows: name, model list with capability badges (Vision/Reasoning), strategy dropdown
- [ ] Strategy dropdown has: Fallback, Round Robin, Fusion
- [ ] Copy/Edit/Delete buttons present per combo
- [ ] Smart router combos (`sr-*`) show dynamically-created model lists

#### Vision Adapter Section
- [ ] Vision toggle (on/off) with "Add Model" button
- [ ] Audio toggle (on/off) with "Add Model" button
- [ ] Round-robin sub-toggle per adapter

#### Smart Router Config Card
- [ ] Enabled toggle
- [ ] Trigger names input (default: `modelRouter`)
- [ ] Allowed providers input
- [ ] Allowed models input (supports wildcards like `dialagram/*`)
- [ ] Cost/Quality slider (0-10)
- [ ] Fallback chain size spinner
- [ ] Auto-cleanup toggle (off by default)

#### Markdown Log Card
- [ ] Enabled toggle
- [ ] Flush interval spinner (minutes)
- [ ] Explanation text mentions "overwrites" (not append)
- [ ] Location shown: `~/.9router/logs/YYYY-MM-DD.md`

#### Per-Model Fallbacks Section
- [ ] Three view tabs: Table | Chain Flow | Simple + Advanced
- [ ] **Table view:** Target | Fallback Chain | Retries | Actions columns
- [ ] **Chain Flow view:** Drag-and-drop reorder chips with → arrows
- [ ] **Cards view:** Expandable cards with per-model retry overrides
- [ ] "Add Fallback Rule" button opens modal
- [ ] Modal has: target picker, chain builder, retries input, save/cancel

### P3: Providers Page
**URL:** `/dashboard/providers`
**Verify:**
- [ ] Custom Providers section shows OpenAI/Anthropic compatible nodes
- [ ] Each node card shows: name, connection count, API type, active toggle
- [ ] Dialagram Router node visible with connection indicator
- [ ] MockReal node visible with "1 Connected"
- [ ] OAuth Providers section lists built-in providers
- [ ] Search box filters providers

### P4: Endpoint Page
**URL:** `/dashboard/endpoint`
**Verify:**
- [ ] Local endpoint URL shown with copy button
- [ ] Tunnel enable button
- [ ] Tailscale enable button
- [ ] API Keys section: list of keys with toggle/delete
- [ ] "Create Key" button works
- [ ] "Require API key" toggle

### P5: Usage Page
**URL:** `/dashboard/usage`
**Verify:**
- [ ] Request history table loads
- [ ] Filters work (provider, model, status, date range)
- [ ] Conversation ID filter + column present
- [ ] Detail drawer opens on row click
- [ ] AI Error Analyst button on failed requests

### P6: Settings Page
**URL:** `/dashboard/profile`
**Verify:**
- [ ] Password change form
- [ ] Observability toggles
- [ ] Theme/language preferences

## Browser Automation Notes

- Use `forceNew: true` when opening browser pages to avoid conflicts with user's tabs
- Navigate via URL (`navigate_page` type=url) rather than clicking nav links (more reliable)
- Login via Playwright `fill` + `click({ force: true })` if normal click times out
- Google Analytics errors in console are expected and harmless (no GA configured locally)

## When to Re-Run

- After ANY change to `src/app/(dashboard)/` components
- After adding new dashboard pages or sections
- After modifying shared components (`ModelSelectModal`, `Card`, etc.)
- After CSS/theme changes
- Before every release

## Drag-and-Drop Testing (dnd-kit) — 2026-08-07 additions

### Technique: synthetic pointer events (reliable)
The embedded browser's `page.mouse.down()` can STOP emitting pointer events
mid-session (worked once after page load, then dead). When that happens, drive
the drag with synthetic events — dnd-kit's PointerSensor accepts them and they
exercise the REAL handler pipeline:

```js
const fire = (type, x, y) => {
  const ev = new PointerEvent(type, {
    bubbles: true, cancelable: true, clientX: x, clientY: y,
    pointerId: 1, pointerType: 'mouse', isPrimary: true,
    button: 0, buttons: type === 'pointerup' ? 0 : 1,
  });
  (type === 'pointerdown' ? chip : document).dispatchEvent(ev);
};
fire('pointerdown', sx, sy);
for (let i = 1; i <= 12; i++) { fire('pointermove', interpolatedX, sy); await sleep(100); }
fire('pointerup', ex, ey);
```

### Gotchas learned (2026-08-07)
1. **Off-viewport targets**: chips below the inner scroller's visible area
   receive NO events; `boundingBox()` reports coordinates regardless of
   visibility. Always `scrollIntoView({block:'center'})` first and sanity-check
   with `document.elementFromPoint()`.
2. **Coordinate spaces**: dnd-kit's `active.rect.current.translated` is
   content-relative inside scrolled containers (dashboard uses an inner
   `overflow-y-auto` scroller). For viewport-space math use
   `initial rect + event.delta`. Full story:
   `../tracking/learnings/2026-08-07-drop-indicator-dnd-kit-coordinates.md`.
3. **Verify the drop landed**: after `pointerup`, assert the settings via
   `GET /api/settings` (PATCH persistence) AND the DOM order — both must match
   where the indicator bar was.
4. **Page cache**: after rebuilding, load the page with `?bust=<timestamp>` and
   confirm the fresh chunk via `performance.getEntriesByType('resource')`.

### Drop indicator checklist (Chain Flow)
- [ ] While dragging, a 3px accent bar appears at the insertion slot
- [ ] Bar slides (left/right, across wrapped rows) as the chip moves
- [ ] Release lands the chip exactly where the bar was (order + settings match)
- [ ] No bar when not dragging; no bar with <2 chips
