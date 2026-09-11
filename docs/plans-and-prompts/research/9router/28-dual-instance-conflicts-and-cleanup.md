# Research: Dual 9Router Instance Conflicts & Cleanup Log

**Date:** 2026-09-08
**Status:** ACTIVE — root causes identified, cleanup executed on mini + mini3
**Tags:** #research #failover #dual-instance #cleanup #mini #mini2 #mini3

---

## 1. Problem Statement

Running 9router on multiple fleet hosts (mini, mini2, mini3) caused model loading failures and VS Code Copilot errors (`Ldialtop` model). The goal was to identify why dual instances conflict, fix the broken failover architecture, and clean up unnecessary installations while preserving data.

---

## 2. Architecture Discovery (per host)

### 2.1 mini (Cleaned Up)
- **Was running:** `com.9router.app` (port 20130), `com.9router.api-bridge` (port 9200), `com.9router.failover` (port 20142).
- **Install method:** Homebrew's npm (`/opt/homebrew/lib/node_modules/9router`).
- **Peer config:** Pointed at itself (`http://100.77.55.46:20130`) — stale/wrong.
- **Status:** Uninstalled via `npm uninstall -g 9router`. Plists removed. Data preserved.

### 2.2 mini2 (Active Gateway)
- **Running:** `com.9router.app` (port 20128, v0.5.50).
- **Failover proxy:** BROKEN. Plist pointed to `/Users/chris/.local/lib/node_modules/9router/cli/app/failover-proxy.cjs` which doesn't exist in the npm package. Crash-looping silently.
- **Peer config:** Points at mini (`http://100.77.55.46:20130`) — now dead.
- **Hermes config:** Points at `http://mini2:20128/v1`.

### 2.3 mini3 (Cleaned Up)
- **Was running:** `com.9router.app` (port 20128, v0.5.50).
- **Install method:** Local npm (`~/.local/lib/node_modules/9router`). NOT homebrew.
- **Failover plist:** Existed but not loaded. Pointed at `~/9router-app/failover-proxy.cjs` (nonexistent).
- **Status:** Unloaded launchd agents. Removed module dir + bin symlink. Data preserved.

---

## 3. Root Causes of Model Loading Failures

### 3.1 Shared API Key Collision
Both instances used the same Dialagram API key (`dgr_live_NZ1M...`).
- **Impact:** Upstream rate limits (429s) applied to the combined request rate. If mini triggered a cooldown, mini2's requests also failed.
- **Evidence:** Simultaneous errors in VS Code Copilot and Discord thread when both were active.

### 3.2 Divergent SQLite State
Each instance had its own `~/.9router/db/data.sqlite`.
- **Impact:** Model locks, backoff levels, circuit breaker state, and round-robin rotation indexes diverged immediately. One instance might think a model was healthy while the other had it backed off.

### 3.3 Broken Failover Proxies
- **mini2:** Plist referenced a path that never existed in the npm package (`cli/app/failover-proxy.cjs`).
- **mini3:** Plist referenced `~/9router-app/failover-proxy.cjs` (source repo path, not installed).
- **Result:** No actual failover was happening. The proxies were crash-looping or not loaded, providing zero HA benefit while consuming resources.

### 3.4 Stale Peer Configurations
- mini2's `peerNodes` pointed at mini:20130 (now dead).
- mini's `peerNodes` pointed at itself.
- No valid peer-to-peer routing was possible.

---

## 4. Cleanup Actions Executed

### 4.1 mini
```bash
# Uninstall from homebrew npm
ssh chris@mini.local 'export PATH=/opt/homebrew/bin:$PATH; npm uninstall -g 9router'

# Remove plists
ssh chris@mini.local 'rm ~/Library/LaunchAgents/com.9router.{app,api-bridge,failover}.plist'

# Verify
ssh chris@mini.local 'launchctl list | grep 9router || echo "cleared"'
```

### 4.2 mini3
```bash
# Unload launchd agents
ssh chris@mini3.local 'launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.9router.app.plist'
ssh chris@mini3.local 'launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.9router.failover.plist'

# Kill processes
ssh chris@mini3.local 'pkill -9 -f "9router/cli.js"'

# Remove plists
ssh chris@mini3.local 'rm ~/Library/LaunchAgents/com.9router.{app,failover}.plist'

# Remove npm install (NOT data)
ssh chris@mini3.local 'rm -rf ~/.local/lib/node_modules/9router && rm -f ~/.local/bin/9router'

# Verify
ssh chris@mini3.local 'ps aux | grep 9router | grep -v grep || echo "none"'
```

### 4.3 Preserved Data
- `~/.9router/` on all hosts (DB, auth, logs, machine-id) — untouched.
- `~/Documents/GitHub/9router/` source repo — untouched.

---

## 5. Current State

- **Active 9router:** Only mini2 (port 20128).
- **Hermes:** Points at mini2:20128.
- **Failover:** Disabled everywhere (broken paths, no valid peers).
- **Model Loading:** Should stabilize now that only one instance is using the upstream key.

---

## 6. Recommendations

1. **Keep single instance:** Run 9router only on mini2 for now.
2. **Fix failover later:** If HA is needed, fix the npm package to include `failover-proxy.cjs` and use correct paths.
3. **Monitor mini2 logs:** Watch for 429s or stream interruptions.
4. **Update peer config:** Remove dead peer references from mini2's settings.

---

## 7. References

- `~/Documents/GitHub/9router/cli/failover-proxy.cjs` (source)
- `~/Documents/GitHub/9router/docs/plans-and-prompts/research/9router/25-node-failover-implementation.md`
- Session commands and outputs logged in this doc.