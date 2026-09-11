# Plan: Tray Reliability — click-to-open + freeze prevention

**Date:** 2026-09-10
**Status:** draft
**Tags:** #planning #tray #reliability #macos #systray
**Epic:** t_1bcad34f
**Cards:** t_aa400f11 (click fix), t_f811a83d (freeze watchdog)
**Source:** research 29-mini2-freeze-investigation.md @ 2026-09-10
**Owner:** any agent (autonomously consumable)

---

## 1. Context

9router on mini2 runs as `launchd` daemon `com.9router.app` with PID 918 (`cli.js --tray --port 20128`). Two reliability problems were observed:

1. **Click-to-open does nothing**: `onOpenDashboard: () => openBrowser(url)` calls `open "http://localhost:20128/dashboard"` from a launchd context (no terminal, no LaunchServices session) — may just activate an existing tab or fail silently.
2. **Tray icon freeze after 15h**: `tray_darwin_release` (systray2 v2.1.4 Rust binary, PID 1855, Jetsam priority 40) stops handling clicks.

Both are P2; fixes can land independently.

---

## 2. Options

### 2A — Click-to-open: fix options

#### Option A1 — Force a browser, add feedback (recommended)
```javascript
// cli/cli.js — openBrowser(url)
function openBrowser(url) {
  const cmd = process.platform === 'darwin'
    ? `open -a "Microsoft Edge" "${url}"`   // force a specific installed browser
    : process.platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`
  exec(cmd, (err) => {
    try { require('node-notifier').notify({ title: '9Router', message: 'Opening dashboard...' }) } catch {}
    if (err) console.log(`Open browser manually: ${url}`)
  })
}
```
Pros: most reliable from launchd; notification tells user it worked. Cons: hardcodes Edge; fallback to default browser on non-Edge machines.

#### Option A2 — Try open, fall back to notification with URL
```javascript
function openBrowser(url) {
  exec(`open "${url}"`, (err) => {
    if (err) exec(`open "${url}"`, (err2) => {
      if (err2) console.log(`Open this in a browser: ${url}`)
    })
  })
}
```
Simpler; works with any default browser. No notification but at least logs the URL visibly.

#### Option A3 — Add a global shortcut / background tray menu
```javascript
// tray/tray.js — add a second action that spawns a tiny HTTP shortcut page
// and a "Copy dashboard URL" menu item so the user can paste it manually
```
Best for power users; additional tray menu complexity.

**Recommendation:** A1 with configurable browser (env `NINEROUTER_BROWSER` defaulting to no `-a` flag so it respects system default; add notifier as optional dep).

---

### 2B — Freeze watchdog: fix options

#### Option B1 — Heartbeat ping from node process (recommended)
```javascript
// cli/cli.js — inside tray setup
let trayHealthy = true
const timer = setInterval(() => {
  try {
    // tray module exports a ping/handle if available; otherwise check child alive
    if (!trayModule.isAlive()) throw new Error('tray not alive')
    trayHealthy = true
  } catch {
    trayHealthy = false
    trayModule.restartTray()  // re-require + initTray with same callbacks
  }
}, 60_000)
// clearInterval(timer) on cleanup()/SIGTERM
```
Keeps the tray process busy (prevents Jetsam throttling); auto-recovers on first failure.

#### Option B2 — Raise launchd Jetsam priority
```xml
<!-- com.9router.app.plist — add: -->
<key>JetsamPriority</key><integer>10</integer>
// (lower = more important on Darwin 24+; 10 = foreground-ish vs 40 daemon)
// Also consider:
<key>ProcessType</key><string>Interactive</string>
```
Simple one-line change; unclear if systray child inherits it (tray binary is exec'd by node, not launchd).

#### Option B3 — Detect frozen click and auto-relaunch
```javascript
let lastClickMs = Date.now()
onOpenDashboard: () => {
  const since = Date.now() - lastClickMs
  lastClickMs = Date.now()
  if (since > 30 * 60 * 1000) { /* tray was throttled, relaunch icon */ }
  openBrowser(url)
}
```
Heuristic recovery; no persistent timer.

**Recommendation:** B1 (heartbeat) with B2 (plist tweak) as complementary. B3 is too brittle.

---

## 3. Recommendation

Implement **A1 + B1 + B2** together:
- A1 (configurable browser + notification)
- B1 (60s heartbeat watchdog with auto-restart)
- B2 (ProcessType Interactive in plist template)

---

## 4. Implementation steps

| # | Step | Owner card | Acceptance |
|---|------|------------|------------|
| 1 | Add env `NINEROUTER_BROWSER` support to `cli/cli.js` openBrowser | t_aa400f11 | `NINEROUTER_BROWSER="Microsoft Edge" npm start -- --tray` forces Edge; blank = default browser |
| 2 | Add 60s tray heartbeat + auto-restart in `cli/cli.js` | t_f811a83d | tray remains live after 24h; `grep heartbeat /tmp/9r-app-tray.log` shows periodic pings |
| 3 | Update launchd plist template (`cli/src/cli/tray/autostart.js`) | t_f811a83d | `cat ~/Library/LaunchAgents/com.9router.app.plist` shows `ProcessType` Interactive |
| 4 | Manual QA on mini2: kill tray child, verify it auto-relaunches | t_f811a83d | `pkill tray_darwin_release` then tray reappears within 90s |

---

## 5. Acceptance criteria

- `click tray icon` → new browser tab at localhost:20128/dashboard with visible notification, within 2s
- After `pkill tray_darwin_release`, tray icon auto-reappears within 90s
- `/tmp/9r-app-tray.log` contains periodic heartbeat entries (not just startup)

---

## 6. Review checklist for other agents

- [ ] Does the heartbeat introduce a new timer leak on shutdown? (verify `clearInterval` in `cleanup()` and SIGTERM handler)
- [ ] Is `NINEROUTER_BROWSER` documented in README and .env.example?
- [ ] Does `open -a "Microsoft Edge"` fail if Edge isn't installed? Check fallback path
- [ ] Is ProcessType `Interactive` appropriate for a daemon? (may increase Jetsam impact — monitor memory)
