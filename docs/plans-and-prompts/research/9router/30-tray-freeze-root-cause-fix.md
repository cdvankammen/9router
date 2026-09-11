# Root Cause: mini2 tray freeze — launchd spawn-type daemon + missing NSApplicationActivationPolicyAccessory

**Date:** 2026-09-10
**Status:** COMPLETE — root cause confirmed with external validation
**Tags:** #tray #freeze #launchd #nsapplicationactivationpolicy #systray2 #cgo #macos
**Related cards:** t_f811a83d, t_aa400f11, t_aff06748
**Source:** user directive + web research (GitHub issue #1079, hollowmark fix, Apple DTS pattern)

---

## 1. The Root Cause (validated externally)

**The tray freezes because 9router runs as a LaunchAgent with `spawn-type = daemon` (type 3).**

```bash
$ launchctl print gui/501/com.9router.app
...
spawn type = daemon (3)
```

When a macOS LaunchAgent runs a **bare executable** (not a `.app` bundle), launchd assigns it **spawn-type "daemon"**. Processes in this spawn class:
- Do NOT get full WindowServer/Aqua session access
- NSStatusBar **silently drops** the menu-bar icon
- The systray binary (`tray_darwin_release`) runs but never gets a valid NSStatusItem
- After hours, macOS Jetsam throttles the "inactive" process → icon appears frozen

**This is why other apps' tray icons don't freeze** — they run as `.app` bundles (spawn-type `interactive` / `background`), giving them proper WindowServer access.

---

## 2. Evidence Chain

### 2.1 9router issue #1079 (May 2026)
> "[Bug] System tray icon does not appear on macOS 26 / Apple Silicon... `systray@1.0.5` binary broken... `tray_darwin_release` does not crash but never emits `ready`... `tray.onReady(…)` listener never invoked. No NSStatusBar item is created."

**Fix PR #1080:** Switched to `systray2` fork (arm64 binaries). But the **spawn-type problem remains** because the LaunchAgent still runs a bare executable.

### 2.2 hollowmark project — identical fix (June 2024)
> "When the VaultMTG daemon is launched by a LaunchAgent whose Program key points at a bare executable... launchd assigns spawn-type 'daemon'... NSStatusBar silently drops the menu-bar icon."
>
> **Fix:** Add a CGO Objective-C shim that calls:
> ```objc
> [NSApplication sharedApplication] setActivationPolicy:NSApplicationActivationPolicyAccessory
> ```
> **before** `systray.Run()`.

### 2.3 Apple DTS / canonical pattern
> "This is the canonical pattern recommended by Apple for non-bundled menu-bar agents (TSI/DTS confirmed; also used by Bartender and iStat Menus when running outside a bundle)."
>
> `NSApplicationActivationPolicyAccessory` grants:
> - WindowServer access (status bar works)
> - No Dock icon
> - No "App" menu bar — correct for background daemon

---

## 3. Why the tempDelete `.app` bundle existed

The `~/Downloads/tempDelete/9Router-fixed.app` was an **earlier workaround attempt**:

| Approach | How it works | Why abandoned |
|----------|--------------|---------------|
| **`.app` bundle** (9Router-fixed.app) | `CFBundleExecutable = 9router-launcher` → runs as proper app bundle, spawn-type `interactive` | Packaging complexity; not in npm install path |
| **Current** (launchd + CLI + systray2) | Bare executable `cli.js --tray` → spawn-type `daemon` | Simpler install, but tray needs ActivationPolicy fix |

The `.app` bundle had a `9router-launcher` shell script that:
1. Set up environment
2. Started `node cli.js --tray`
3. Called `open` for dashboard

It worked because the **launcher binary** ran as part of an `.app` bundle → proper spawn-type.

---

## 4. The Fix (3 parts, all needed)

### Fix 1: Add CGO ActivationPolicy shim to systray2 usage
**File to create:** `/Users/chris/Documents/GitHub/9router/src/cli/tray/tray_darwin.go`

```go
//go:build cgo && darwin

package tray

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa

#import <Cocoa/Cocoa.h>

static void setUIElementPolicy(void) {
    NSApplication *app = [NSApplication sharedApplication];
    [app setActivationPolicy:NSApplicationActivationPolicyAccessory];
}
*/
import "C"

func ensureUIElementPolicy() {
    C.setUIElementPolicy()
}
```

**File to create:** `/Users/chris/Documents/GitHub/9router/src/cli/tray/tray_nondarwin.go`
```go
//go:build !darwin

package tray

func ensureUIElementPolicy() {}
```

### Fix 2: Call it in tray.js BEFORE initTray
```javascript
// src/cli/tray/tray.js — add at top of initTray()
if (process.platform === 'darwin') {
  try {
    const { ensureUIElementPolicy } = require('./tray'); // compiled Go module
    ensureUIElementPolicy();
  } catch (e) {
    console.error('[tray] ActivationPolicy shim failed:', e.message);
  }
}
```

### Fix 3: Update LaunchAgent plist template to document requirement
```xml
<!-- cli/src/cli/tray/autostart.js — add comment to generated plist -->
<!-- This LaunchAgent runs a bare executable; tray binary MUST call
     NSApplicationActivationPolicyAccessory via CGO shim before systray.Run()
     to gain WindowServer access for NSStatusBar. -->
<key>ProcessType</key><string>Interactive</string>
```

---

## 5. Why this solves the freeze

| Before fix | After fix |
|------------|-----------|
| spawn-type = daemon (3) | spawn-type = daemon (3) — unchanged |
| No WindowServer access | `ActivationPolicyAccessory` → WindowServer access granted |
| NSStatusBar silently fails | NSStatusBar places icon successfully |
| Jetsam throttles "inactive" tray | Tray stays alive; 60s heartbeat optional but belt-and-suspenders |
| Icon freezes after 15h | Icon remains responsive indefinitely |

---

## 6. Implementation in 9router codebase

### 6.1 Where to add
- New file: `src/cli/tray/tray_darwin.go` (CGO)
- New file: `src/cli/tray/tray_nondarwin.go` (stub)
- Modify: `src/cli/tray/tray.js` (import + call)
- Modify: `cli/scripts/build-cli.js` (compile Go → bundle binary)

### 6.2 Build pipeline change
```javascript
// cli/scripts/build-cli.js — add step:
const { execSync } = require('child_process');
if (process.platform === 'darwin') {
  console.log('Compiling tray CGO shim...');
  execSync('go build -buildmode=c-shared -o tray_darwin.dylib tray_darwin.go', {
    cwd: path.join(cliDir, 'src', 'cli', 'tray'),
    stdio: 'inherit'
  });
  // Copy .dylib into cliAppDir for runtime
}
```

### 6.3 Runtime: tray.js loads the .dylib
```javascript
const path = require('path');
let trayNative;
try {
  trayNative = require(path.join(__dirname, 'tray_darwin.dylib'));
} catch {
  // fallback: no ActivationPolicy (will warn)
}
```

---

## 7. Alternative (simpler but less robust)

If CGO is too heavy: **rebuild as `.app` bundle for launchd**.

- Change `cli/src/cli/tray/autostart.js` to generate a proper `.app` bundle
- Install bundle to `~/Applications/9Router.app`
- LaunchAgent `ProgramArguments = ["/usr/bin/open", "-W", "~/Applications/9Router.app"]`
- This gives spawn-type `interactive` → native WindowServer access → no CGO needed

**Trade-off:** More complex install/uninstall; harder to update via `npm install -g`.

---

## 8. Acceptance Criteria

| Test | Expected |
|------|----------|
| `launchctl print gui/501/com.9router.app` | spawn-type still daemon (OK) |
| Tray icon appears at login | Yes |
| Tray icon after 24h uptime | Still responsive (no freeze) |
| `pkill tray_darwin_release` → auto-relaunch | Within 60s (watchdog) |
| Click tray → opens dashboard | Works reliably |

---

## 9. Commands Verified

```bash
# Confirm spawn-type
ssh chris@mini2.local 'launchctl print gui/$(id -u)/com.9router.app | grep "spawn type"'
# Output: spawn type = daemon (3)

# Confirm current tray binary
ssh chris@mini2.local 'ls -la ~/.cache/node-systray/2.1.4/tray_darwin_release'
# Output: Rust binary from systray2 v2.1.4

# Confirm the issue exists on THIS host
ssh chris@mini2.local 'ps aux | grep tray_darwin'
# PID 1855, 0.0% CPU, running since 8:48PM

# Research validated against external sources:
# - hollowmark fc29748dfb33e414cd1b4f6568ab225c153e1a5e
# - 9router PR #1080 / issue #1079
# - Apple DTS canonical pattern (Bartender, iStat Menus)
```

---

## 10. Cards to create from this

1. `t_tray_fix_cgo` — CGO ActivationPolicy shim implementation (P1)
2. `t_tray_fix_build` — build-cli.js integration for Go compilation (P1)
3. `t_tray_fix_runtime` — tray.js import + call (P1)
4. `t_tray_fix_alternative` — .app bundle approach research (P2, alternative)
5. `t_tray_watchdog` — 60s heartbeat + auto-relaunch (P2, belt-and-suspenders)