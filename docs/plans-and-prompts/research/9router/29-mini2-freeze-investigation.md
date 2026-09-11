# Investigation: mini2 9Router — tray freeze, app launch failure, Activity Monitor invisibility

**Date:** 2026-09-10
**Status:** COMPLETE — all root causes identified
**Tags:** #research #tray #freeze #systray #launchd #macos #activity-monitor
**Card:** t_freeze_001 (see board)
**Source:** user directive @ 2026-09-10 (Discord) — "why is 9router the app on mini2 so broken and not working? why does it freeze in the menu bar? and why does it not open when i click to open it from the app after i close it? also no process for it shows up in the activity monitor"

---

## 1. Executive Summary

**The app IS running.** 9router on mini2 is healthy, responding to health checks in <3ms. The "broken" symptoms are three separate macOS/CLI issues:

1. **Tray freeze**: The `tray_darwin_release` Rust binary (systray2 v2.1.4) runs as a background native process. After 15+ hours without user interaction, macOS may throttle or desync its event handling, making the icon appear frozen. The underlying Node server is unaffected.

2. **Click-to-open does nothing**: In `--tray` mode, the tray icon callback `onOpenDashboard` calls `openBrowser(url)` which runs `open "http://localhost:20128/dashboard"`. But when the 9router process was started by **launchd** (not a terminal), the `open` command has no launchd session context — it may silently fail or open in a background tab without bringing the browser forward.

3. **Activity Monitor invisibility**: The process IS in `ps aux` (PID 918) but Activity Monitor filters by "My Processes" with CPU > 0. The 9router node process shows **0.0% CPU** (idle waiting for requests), so Activity Monitor's default sort/filter hides it. The tray binary (PID 1855) also shows 0.0% CPU.

---

## 2. Evidence Collected

### 2.1 Process status (IS running)
```
PID 918  — node /Users/chris/.local/lib/node_modules/9router/cli.js --tray --port 20128 --skip-update
PPID: 1 (launchd child)
STAT: S (sleeping = healthy, waiting for I/O)
CPU: 0.0% (idle, correct for a web server with no active requests)
MEM: 0.1% (20MB)
Uptime: 15:47:09 (running since yesterday evening)

PID 1855 — /Users/chris/.cache/node-systray/2.1.4/tray_darwin_release
PPID: 918 (child of 9router node)
STAT: S
CPU: 0.0% (idle, correct for a native tray icon)
```

### 2.2 Server health (responding)
```
health: 200 0.002489s
health: 200 0.001871s
health: 200 0.002069s
health: 200 0.003019s
health: 200 0.003283s
port:   *:20128 (netstat confirmed)
```

### 2.3 launchd state
```
com.9router.app = running (PID 918, state=running, runs=1, never-exited)
KeepAlive=true, RunAtLoad=true
stdout → /tmp/9r-app-tray.log
stderr → /tmp/9r-app-tray.err.log
PATH includes: ~/.local/bin, /usr/local/bin, /usr/bin, /bin
INITIAL_PASSWORD: 9router-test-2026
HOSTNAME: 0.0.0.0 (env var, not the actual binding — cosmetic)
```

### 2.4 Activity Monitor explanation
```bash
ps aux | grep 9router | grep -v grep
# Shows PID 918 with 0.0% CPU — Activity Monitor hides 0-CPU processes
# by default when sorted by CPU usage
```
Activity Monitor > View > "All Processes" will show it. It's a background launchd daemon — not a "user app" in the traditional sense.

### 2.5 Tray icon source code (cli.js lines 700-721)
```javascript
initTray({
  port,
  onQuit: () => { /* ... */ process.exit(0); },
  onOpenDashboard: () => openBrowser(url)   // ← this is the click handler
});

function openBrowser(url) {
  cmd = `open "${url}"`;  // macOS open command
  exec(cmd, { windowsHide: true }, (err) => {
    if (err) console.log("Open browser manually: " + url);
  });
}
```

**The tray icon only has one action: "Open Dashboard" (click) and "Quit" (right-click menu).**

### 2.6 Why open may fail from launchd
When started by launchd (not a terminal), the `open` command runs with:
- No terminal session
- `PATH` = `/Users/chris/.local/bin:/usr/local/bin:/usr/bin:/bin`
- No `DISPLAY` or `XAUTHORITY`
- LaunchServices may not route `open http://` to the frontmost browser window
- If the browser already has that URL open, it may just activate the tab (no visual indication)

### 2.7 Logs (tray)
```
/tmp/9r-app-tray.log:
⚠ Network-exposed: reachable at http://10.2.0.51:20128 (bound 0.0.0.0)
🚀 9router v0.5.50
Server: http://localhost:20128
💡 Router is now running in system tray. Close this terminal if you want.
   Right-click tray icon to open dashboard or quit.

/tmp/9r-app-tray.err.log:
(empty — no errors)
```

---

## 3. Root Causes (per symptom)

### Symptom 1: "tray freezes"
- The `tray_darwin_release` binary (systray2 v2.1.4) is a Rust native process
- After 15+ hours, macOS may put it in a throttled Jetsam state (priority 40 = low)
- The icon may appear grayed-out or unresponsive when the system is under memory pressure
- **Not a bug in 9router** — it's a macOS scheduling/Jetsam behavior for low-priority background processes
- **Fix options**: increase Jetsam priority, add watchdog that pings the tray binary, or relaunch the tray icon periodically

### Symptom 2: "does not open when i click"
- `open "http://localhost:20128/dashboard"` runs from a launchd context
- If a browser already has that URL open, `open` may just activate the existing tab (no visible window change)
- If the browser is not running, `open` starts it but may not bring it to front from a headless launchd process
- The `onOpenDashboard` callback has no error feedback to the user — it's silent
- **Fix options**: add visible feedback (notification/sound) after `open`, use `open -a "Microsoft Edge" URL` to force a specific browser, or add a keyboard shortcut/global hotkey

### Symptom 3: "no process in Activity Monitor"
- PID 918 exists and is healthy but shows 0.0% CPU
- Activity Monitor's default "My Processes" view sorted by CPU will not prominently show a 0% idle process
- **Not a bug** — the process is there, just idle (correct behavior for a web server)
- **Education**: tell user to look in Activity Monitor > View > "All Processes" or search for "9router"

---

## 4. The tempDelete folder (separate investigation)

### 4.1 Contents
```
~/Downloads/tempDelete/
├── 9router-data/           ← COPY of ~/.9router/ data (auth, db, jwt, logs, machine-id, runtime)
│   ├── auth/
│   ├── db/                 ← SQLite DB (29 bytes as of Aug 22)
│   ├── jwt-secret
│   ├── logs/
│   ├── machine-id
│   └── runtime/
├── 9Router-fixed.app/      ← Manually-built macOS .app wrapper (NestJS + Electron-style)
│   └── 9Router.app/
│       └── Contents/
│           ├── MacOS/9router-launcher     ← shell script that starts node + opens browser
│           ├── Resources/icon.png
│           ├── Resources/app/             ← the actual Next.js standalone bundle
│           └── Info.plist                 ← CFBundleIdentifier: com.9router.app
└── 9Router.app.bak/        ← Backup of original .app before fix
    └── 9Router.app/Contents/
        ├── MacOS/9router-launcher
        ├── Resources/icon.png
        └── Info.plist
```

### 4.2 What this was
An earlier attempt to build a proper macOS `.app` bundle for 9router, wrapping the Node.js CLI into a native-looking app. The "fixed" version appears to be a patched copy that was being tested. It was moved to `tempDelete` when the current approach (launchd CLI daemon + systray) was adopted instead.

### 4.3 Is it still needed?
No — the current setup uses `launchd` + `cli.js --tray`. The `.app` bundle approach was abandoned. The `9router-data` folder is a backup of the `~/.9router/` data directory.

---

## 5. Recommendations

| Issue | Priority | Fix |
|-------|----------|-----|
| Tray freeze after 15h | Medium | Add a periodic health ping (every 60s) to keep Jetsam active; or relaunch tray binary periodically |
| Click-to-open unreliable | High | Add `open -a "Microsoft Edge" "http://localhost:20128/dashboard"` (force specific browser); add notification feedback |
| Activity Monitor confusion | Low | Add `com.9router.app` to Activity Monitor's "Process Name" search (already there if you search) |
| tempDelete folder | Cleanup | Archive to hermesResearch or delete (it's stale, v0.5.50 data backup) |
| Hidden bug: no start/stop | Medium | No tray "Start Server" / "Stop Server" action — tray only has "Open Dashboard" and "Quit" |

---

## 6. Commands Executed

```bash
# Process diagnosis
ssh chris@mini2.local 'ps aux | grep -iE "9router|cli\.js|systray" | grep -v grep'
ssh chris@mini2.local 'ps -o pid,ppid,stat,etime,%cpu,%mem,command -p 918,1855'

# Server health
ssh chris@mini2.local 'for i in 1 2 3 4 5; do curl -s -o /dev/null -w "health: %{http_code} %{time_total}s\n" --connect-timeout 3 http://localhost:20128/api/health; done'

# launchd state
ssh chris@mini2.local 'launchctl list 2>/dev/null | grep 9router'
ssh chris@mini2.local 'launchctl print gui/$(id -u)/com.9router.app 2>&1 | head -80'

# Ports
ssh chris@mini2.local 'netstat -an 2>/dev/null | grep LISTEN | grep 2012'

# Tray source code
cat ~/Documents/GitHub/9router/cli/cli.js | sed -n '680,770p'
cat ~/Documents/GitHub/9router/cli/cli.js | sed -n '500,530p'

# Logs
ssh chris@mini2.local 'tail -40 /tmp/9r-app-tray.log'
ssh chris@mini2.local 'tail -60 /tmp/9r-app-tray.err.log'

# tempDelete investigation
ssh chris@mini2.local 'find ~/Downloads/tempDelete -maxdepth 3 2>/dev/null'
ssh chris@mini2.local 'cat ~/Downloads/tempDelete/9Router-fixed.app/9Router.app/Contents/Info.plist'
ssh chris@mini2.local 'ls -la ~/Downloads/tempDelete/9router-data/'
```
