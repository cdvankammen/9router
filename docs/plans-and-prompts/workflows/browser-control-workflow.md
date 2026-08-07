# Browser Control Workflow — How the Agent Drives the UI (No Vision Needed)

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #workflow #browser #playwright #integrated-browser #accessibility-tree #no-vision

> This document answers: *"Where are you working? Which browser? Headless? How do
> you control it and know things work without seeing the screen?"* — and is the
> canonical reference for future sessions doing browser-based verification.

## The short answer

- **Where I work:** inside this VS Code session, on the repo at
  `/Users/chris/Documents/GitHub/9router`. The app under test runs locally:
  production standalone build on **port 20130** (data in `/tmp/9r-e2e2`), mock
  upstream on **port 24000**.
- **Which browser:** the **VS Code integrated browser** (Simple Browser /
  built-in browser preview) — a REAL Chromium instance, **not headless**. It is
  visible in the editor; the user can watch every click and drag.
- **How I control it:** the **browser tools** (open_browser_page, navigate_page,
  read_page, click_element, type_in_page, run_playwright_code, screenshot_page).
  Under the hood these drive the integrated browser through **Playwright** —
  `run_playwright_code` gives me a real `page` object (locators, mouse, keyboard,
  evaluate, CDP session).
- **How I know things work without vision:** I never rely on pixels. I read
  **state back from the app**:
  1. **Accessibility/DOM snapshot** (`read_page`) — a text tree with element refs
     (e.g. `button "Save Rule" [ref=e491]`). This is my "eyes".
  2. **`page.evaluate()`** — run real JS in the page: read textContent, count
     elements, `getBoundingClientRect()`, `elementFromPoint()`, read the app's
     own status elements (`[role="status"]` from dnd-kit), even `fetch()` the
     app's own APIs to assert persisted state.
  3. **App-level assertions** — e.g. after a drag: `GET /api/settings` must show
     the new order AND the DOM order must match. If the app's own data says it
     worked, it worked.
- **Tools used:** Playwright (via the browser tools), plus terminal `curl` for
  API-level checks, and `npx vitest` for unit/regression suites.

## Tool-by-tool cheat sheet

| Tool | Use for | Example |
|------|---------|---------|
| `open_browser_page` | Open/reuse a page | `open_browser_page(url)` → returns pageId + snapshot |
| `navigate_page` | goto / reload / back | `navigate_page(pageId, type:"url", url)` |
| `read_page` | Accessibility snapshot (the "eyes") | after any action, re-snapshot |
| `run_playwright_code` | Anything Playwright: locators, mouse, evaluate, CDP | drag, fill, fetch inside page |
| `click_element` / `type_in_page` | Simple clicks/typing via refs | click a button by ref from snapshot |
| `screenshot_page` | Optional; NOT used for decisions (no vision pipeline) | evidence only |
| `run_in_terminal` | curl the API, run vitest, rebuild, restart server | verify persistence, regression |

## The no-vision loop (how every feature gets verified)

1. **Navigate** — `page.goto(url)` (append `?bust=<ts>` after rebuilds; the
   browser caches old chunks and will otherwise run STALE code).
2. **Snapshot** — `read_page` → find target elements by ref/text.
3. **Act** — click/type/drag via refs or Playwright.
4. **Probe** — `page.evaluate` to read the app's real state:
   - DOM order: `[...document.querySelectorAll('[data-chain-node]')].map(n => n.getAttribute('data-model'))`
   - Geometry: `getBoundingClientRect()` for drag targets, drop-indicator bars
   - Hit-testing: `document.elementFromPoint(x, y)` (validates the point is
     actually clickable — catches off-viewport elements)
   - App status: `document.querySelector('[role="status"]').textContent`
   - Console errors: `page.on('console')` / `page.on('pageerror')`
5. **Persist-check** — `fetch('/api/settings')` (or the relevant API) inside the
   page → assert the change survived (PATCH→GET round trip).
6. **Regression** — `cd tests && npx vitest run` (baseline: 1718 pass / 88
   documented failures in `tests/__baseline__/known-fails.txt`).
7. **Cleanup** — restore test data (the E2E env `/tmp/9r-e2e2` is scratch; keep
   the test rule `mockreal/gpt-4o-mini` intact so future sessions can rely on it).

## Critical gotchas (learned the hard way — all E2E-verified)

1. **Stale chunks after rebuild** — production standalone does not hot-reload.
   Always `?bust=<timestamp>`, then confirm via
   `performance.getEntriesByType('resource')` that the fresh `page-*.js` chunk
   loaded (compare the hash against `ls .next/standalone/.next/static/chunks/...`).
2. **Off-viewport elements receive NO mouse events** — `boundingBox()` lies about
   visibility. Always `scrollIntoView({block:'center'})` + `elementFromPoint()`
   check before dragging/clicking.
3. **`page.mouse.down()` flakiness** — the embedded browser intermittently stops
   emitting pointer events after a few interactions. Reliable fallback:
   **synthetic `PointerEvent` dispatch** (isPrimary, button 0) via evaluate —
   dnd-kit's PointerSensor accepts them and they exercise the REAL handlers.
4. **Coordinate spaces** — dnd-kit's `active.rect.current.translated` is
   content-relative inside scrolled containers. For viewport math use
   `initial rect + event.delta`. Full story:
   `learnings/2026-08-07-drop-indicator-dnd-kit-coordinates.md`.
5. **`page.evaluate` + Playwright-only selectors** — `:has-text()` is Playwright
   syntax; it throws inside `page.evaluate` (plain JS context). Use
   `Array.from(...).filter(el => el.textContent.includes(...))`.
6. **Snapshots are cheap — re-read often.** Element refs change on every render;
   never reuse refs across state changes.
7. **Page identity** — the integrated browser can lose/recreate pages (pageId
   "not found"). Re-open with `open_browser_page(forceNew)` and re-login
   (session cookie may persist).

## Synthetic drag recipe (the workhorse)

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
for (let i = 1; i <= 12; i++) { fire('pointermove', lerp(sx, ex, i/12), sy); await sleep(100); }
fire('pointerup', ex, ey);
```

Assert AFTER: DOM order + `GET /api/settings` both match where you dropped.

## FAQ

**Q: Are you using the internal browser?** Yes — the VS Code integrated browser
(visible in the editor). Page IDs in tool calls (`1e9f1c43-...`) are tabs of that
browser.

**Q: Headless?** No. It is a real, visible Chromium instance. Headless would be
slower to debug and can't be watched by the user.

**Q: How do you "see" without vision?** Accessibility snapshots (text trees with
element refs) + DOM/JS probes + reading the app's own API responses. Verification
is state-based, not pixel-based.

**Q: Why is it consistent?** Because every step ends in an assertion against the
application's real persisted state, and the recipe (navigate → snapshot → act →
probe → persist-check → regression → cleanup) is identical every time.

## Troubleshooting: the browser tool dies (2026-08-07 incident)

### Symptoms (all at once)
- `open_browser_page(forceNew: true)` → `browserContext.newPage: Cannot read
  properties of undefined (reading '_page')`
- Existing page IDs → `Page "..." not found` / `Protocol error (Page.navigate):
  Session not found`
- `read_page` on a listed page → `Snapshot: <unavailable>`
- The tool's page list still shows tabs (e.g. `about:blank`) but every session
  behind them is dead

### Root cause
The extension-host Playwright context behind the browser tools lost its browser
instance reference (typically after the embedded browser view was closed,
reopened, or the editor state refreshed). The tool registry keeps stale tab
entries; `forceNew` fails because the underlying `browserContext` object is
`undefined` on the tool side.

### What does NOT fix it
- Retrying `open_browser_page` / `navigate_page` / `run_playwright_code` on the
  listed page IDs (sessions are dead, retries just re-error)
- `open_browser_page` with no URL (user-share prompt) — the shared page comes
  from the same dead context
- Restarting the app server or mock upstream (they were never the problem —
  `curl` shows 200 the whole time)

### The fix (one user action, no VS Code quit)
1. **Close the broken browser preview tabs** in the editor (the `about:blank`
   ones), OR
2. Run the command palette → **Developer: Reload Window**
   (`Cmd+Shift+P` → `Developer: Reload Window`). This restarts the extension
   host and rebuilds the browser tool's context. It does NOT quit VS Code and
   does not touch the app server.

After reload, `open_browser_page` works again — re-login if the session cookie
didn't survive.

### How to verify the tool recovered
```text
open_browser_page(http://localhost:20130/dashboard/combos)
→ returns a pageId + a real Snapshot (not "unavailable")
```
