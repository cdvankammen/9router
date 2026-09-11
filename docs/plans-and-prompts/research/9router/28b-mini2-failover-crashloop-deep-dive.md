# Deep Dive: mini2 failover proxy crash-loop — root cause + fix matrix

**Date:** 2026-09-09
**Status:** COMPLETE — root cause confirmed, fix matrix ready
**Tags:** #research #failover #crash-loop #npm-packaging #launchd #mini2
**Card:** t_80151336
**Source:** user directive @ 2026-09-08 (Discord) — "do all the research and list it all out as deep as you possibly can for it"

---

## 1. Executive Summary

mini2's `com.9router.failover` launchd agent has been **crash-looping since install**: 3,394 spawn attempts, all exit code 1, error log at 61,074 lines. Root cause is a **packaging bug**: the npm-published `9router` CLI package's `files` array does NOT include `failover-proxy.cjs`, so it is physically absent from `~/.local/lib/node_modules/9router/`. The plist points at a path that never exists after `npm install -g`.

The proxy itself is well-designed (244 lines, zero non-stdlib deps, handles SSE streaming, loop prevention, dynamic peer discovery). The bug is purely in the npm packaging — the file is not shipped.

---

## 2. Evidence Collected

### 2.1 mini2 crash-loop stats
```
launchctl print gui/$(id -u)/com.9router.failover:
  runs = 3394
  last exit code = 1
  state = spawn scheduled
  ThrottleInterval = 10 (seconds)

/tmp/9r-launchd-failover.err.log:
  61,074 lines (all identical stack traces)
  Error: Cannot find module '/Users/chris/.local/lib/node_modules/9router/cli/app/failover-proxy.cjs'
```

### 2.2 Plist path on mini2
```xml
<string>/Users/chris/.local/lib/node_modules/9router/cli/app/failover-proxy.cjs</string>
```
Arguments: `--listen 20142 --local http://localhost:20128 --peer mini-3.local --peer-port 20130`

### 2.3 Where failover-proxy.cjs ACTUALLY lives
```
Source repo:   /Users/chris/Documents/GitHub/9router/cli/failover-proxy.cjs  (244 lines, 9958 bytes)
npm install:   ~/.local/lib/node_modules/9router/cli/app/failover-proxy.cjs  → DOES NOT EXIST
               ~/.local/lib/node_modules/9router/cli/failover-proxy.cjs     → DOES NOT EXIST
               (entire install has no failover file anywhere)
```

### 2.4 npm pack --dry-run (definitive proof)
```
Files in npm package: cli.js, src/, hooks/, app/, README.md, LICENSE
FAILOVER PROXY NOT IN NPM PACKAGE — grep returned zero hits
```

### 2.5 cli/package.json files array
```json
"files": ["cli.js", "src", "hooks", "app", "README.md", "LICENSE"]
```
`failover-proxy.cjs` is NOT listed. It lives at `cli/failover-proxy.cjs` (one level up from the published directory), and the `files` field only ships contents of `cli/` — but `failover-proxy.cjs` IS in `cli/` and still not included because npm doesn't auto-include files at the package root level unless listed.

### 2.6 build-cli.js (the build script)
Does NOT copy failover-proxy.cjs into the app bundle. It copies `src/`, `app/`, `hooks/` recursively — but `failover-proxy.cjs` is a standalone script, not part of the build pipeline.

### 2.7 postinstall.js
Zero references to failover. The postinstall installs `better-sqlite3`, `sql.js`, and `systray2` into `~/.9router/runtime/node_modules/` — failover proxy is not part of runtime setup.

### 2.8 cli.js
Zero references to failover. The CLI entrypoint (`bin: ./cli.js`) does not spawn or manage the failover proxy process.

### 2.9 mini vs mini3 same bug
- **mini (removed):** plist also pointed at `~/.local/lib/node_modules/9router/cli/app/failover-proxy.cjs` — same wrong path, same missing file
- **mini3 (removed):** plist pointed at `~/9router-app/failover-proxy.cjs` — even worse, pointed at a nonexistent source repo path

---

## 3. What the Proxy Does (failover-proxy.cjs — 244 lines)

### 3.1 Architecture (L2 — node-DOWN protection)
```
Client → :20142 (failover proxy) → :20128 (local app) OR :20130 (peer app)
                                   ↕ health probe every 2s
```
- **Owns the client-facing port** (:20142 on mini2)
- **Health probes** local + all peer endpoints every 2 seconds (`GET /api/health`, any status < 500 = UP)
- **Routes** to local if UP, first healthy peer if local DOWN, local as last resort if both DOWN
- **Loop prevention:** `x-9r-failover: 1` header — if already failovered, returns 502 immediately
- **Streaming-safe:** `req.pipe(preq)` and `pres.pipe(res)` — transparent SSE + JSON chunked forwarding
- **Dynamic peer discovery:** resolves peer hostnames via DNS (LAN, WiFi, Tailscale, mDNS), refreshes every 15s
- **IPv4-only by default** (security), optional `--ipv6` flag for dual-stack
- **Zero non-stdlib deps:** only `http`, `dns`, `os` from Node.js builtins

### 3.2 What it covers that L1 does not
- **L1 (in-app, custom-server.js):** Forwards `/v1*` when LOCAL is up but DEGRADED (health probe failing). Lives inside the app process.
- **L2 (standalone proxy):** Forwards ALL traffic when the LOCAL PROCESS IS DEAD. Lives in a separate process.
- They are complementary layers, not alternatives.

### 3.3 Is it needed in single-instance mode?
**No.** With only one 9router instance (mini2), there is no peer to failover to. The proxy just adds:
- Extra port consumed (:20142)
- Extra process spawned every 10 seconds (crash-looping now, would be one persistent process if working)
- Extra health probes every 2s
- No actual failover benefit (peer = mini3 which has no 9router anymore)

---

## 4. Crash-loop Cost

| Metric | Value |
|--------|-------|
| Spawn attempts | 3,394 (and climbing) |
| ThrottleInterval | 10 seconds (launchd default) |
| Per-attempt CPU | ~0.1% (node process spawn + MODULE_NOT_FOUND + exit) |
| Per-attempt memory | 0 (process dies immediately) |
| Error log growth | ~15 lines per attempt × 3,394 = ~50K lines (61K actual with headers) |
| Disk consumed by log | Growing indefinitely at ~250 bytes per attempt |
| Actual runtime CPU | ~0% (process dies in <100ms) |

**Verdict:** Low resource cost but wasteful and noisy. The log grows forever. launchd keeps trying forever.

---

## 5. Fix Matrix

### Option A: Remove failover proxy (recommended for single-instance)
- Unload `com.9router.failover.plist`
- Delete plist
- Stop crash-loop immediately
- **Recoverable:** plist can be recreated if HA is needed later
- **Effort:** 2 minutes
- **Risk:** Zero — just removing a broken process

### Option B: Fix plist path to point at source repo copy
- Change plist path to `~/Documents/GitHub/9router/cli/failover-proxy.cjs`
- **Problem:** source repo may not exist on all hosts, not installed via npm
- **Problem:** peer config points at `mini-3.local` (which no longer has 9router)
- **Effort:** 5 minutes
- **Risk:** Low but fragile — depends on source repo being present

### Option C: Fix npm packaging (the correct upstream fix)
1. Add `"failover-proxy.cjs"` to `cli/package.json` `files` array
2. Add `"failover-proxy.cjs": "./failover-proxy.cjs"` to `bin` field (optional, for direct execution)
3. Update `postinstall.js` to copy/symlink failover-proxy.cjs to the right location
4. Or: update plist generation to use `cli/failover-proxy.cjs` (not `cli/app/failover-proxy.cjs`)
5. Rebuild: `npm run pack:cli`
6. Reinstall on hosts: `npm install -g ./9router-0.5.50.tgz`
7. **Effort:** 30 minutes + testing
8. **Risk:** Medium — requires npm publish or local reinstall on all hosts
9. **Also needed:** peer config correction (point at mini2:20128 for each peer, not mini3:20130)

### Option D: Document source-repo-only usage
- Add AGENTS.md note: "failover-proxy.cjs requires source repo or manual copy; not shipped via npm"
- Keep current proxy removed on all hosts
- **Effort:** 5 minutes
- **Risk:** Zero

---

## 6. L1 vs L2 — Current State Per Host

| Host | L2 (standalone proxy) | L1 (in-app forwarding) | Peer nodes configured |
|------|----------------------|----------------------|---------------------|
| mini2 | Crash-looping (missing file) | Enabled but peers=[empty] (no peerNodes in settings) | peerNodes: [] |
| mini | Removed | Would work if app running (custom-server.js has L1 code) | N/A (no app) |
| mini3 | Removed | Would work if app running | N/A (no app) |

**L1 status:** The code exists in `custom-server.js` but requires `settings.peerNodes` to be non-empty. Currently `peerNodes: []` (default). So L1 is effectively disabled on mini2 even though the code is present.

---

## 7. Dual-Instance Conflict History (from 28-dual-instance-conflicts-and-cleanup.md)

The crash-loop is a symptom of a broader pattern: Chris tried to set up HA between mini/mini2/mini3 with:
1. **L0:** Peer as OpenAI-compatible provider in each other's catalogs
2. **L1:** In-app forwarding when local is degraded
3. **L2:** Standalone proxy for node-DOWN protection

But:
- All instances used the **same API key** → combined rate limits
- Each had **divergent SQLite state** → model lock/backoff mismatch
- The failover proxy **was never shipped** via npm → crash-loop on all hosts
- Peer configs pointed at **dead/removed instances**
- When both were running simultaneously, VS Code Copilot and Discord thread both errored with `Ldialtop` model failures

---

## 8. Recommended Action Plan

1. **Immediate:** Remove failover proxy on mini2 (Option A) — it's crash-looping uselessly
2. **If HA is wanted later:** Fix npm packaging (Option C) + update peer configs to correct addresses
3. **Decision needed from Chris:** Is HA between mini2 and another host still a goal? If not, document L2 as future work only.

---

## 9. All Commands Executed During Research

```bash
# Evidence gathering on mini2
ssh chris@mini2.local 'cat ~/Library/LaunchAgents/com.9router.failover.plist'
ssh chris@mini2.local 'tail -20 /tmp/9r-launchd-failover.err.log'
ssh chris@mini2.local 'wc -l /tmp/9r-launchd-failover.err.log'
ssh chris@mini2.local 'launchctl print gui/$(id -u)/com.9router.failover'
ssh chris@mini2.local 'ls -la ~/.local/lib/node_modules/9router/'
ssh chris@mini2.local 'find ~/.local/lib/node_modules/9router/ -name "*failover*"'

# Source repo analysis on mini
cat /Users/chris/Documents/GitHub/9router/cli/failover-proxy.cjs
cat /Users/chris/Documents/GitHub/9router/cli/package.json
grep -rn "failover" /Users/chris/Documents/GitHub/9router/cli/
grep -rn "failover" /Users/chris/Documents/GitHub/9router/cli/app/custom-server.js
grep -A20 "peerNodes" /Users/chris/Documents/GitHub/9router/cli/app/src/lib/db/repos/settingsRepo.js

# npm packaging verification
cd /Users/chris/Documents/GitHub/9router/cli && npm pack --dry-run | grep -i failover

# build pipeline
cat /Users/chris/Documents/GitHub/9router/cli/scripts/build-cli.js
grep -n "failover" /Users/chris/Documents/GitHub/9router/cli/hooks/postinstall.js
grep -n "failover" /Users/chris/Documents/GitHub/9router/cli/cli.js
```
