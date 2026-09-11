# Session Command Log: mini2 failover deep-dive + fix (2026-09-09)

**Date:** 2026-09-09
**Session:** 9router Discord thread (1544031399110119588)
**Cards:** t_80151336 (research), t_0646f399 (fix), t_81b1f8de (upstream packaging), t_00fbeff3 (doc)
**This file:** records EVERY command executed during this research+fix session, verbatim, for auditability.

---

## 1. Card creation (kanban-always-record rule)

```bash
# Research card t_80151336
env -u HERMES_DELEGATED_CHILD_CONTEXT hermes kanban --board 9router create "RESEARCH: mini2 failover crash-loop — deep dive npm packaging gap + broken path" --priority 1 --assignee default --body "$BODY"
env -u HERMES_DELEGATED_CHILD_CONTEXT hermes kanban --board 9router notify-subscribe t_80151336 --platform discord --chat-id 1544031399110119588

# Fix card t_0646f399 (remove broken proxy on mini2)
env -u HERMES_DELEGATED_CHILD_CONTEXT hermes kanban --board 9router create "FIX: Remove broken failover proxy on mini2 (npm packaging gap)" --priority 1 --assignee default --body "..."
env -u HERMES_DELEGATED_CHILD_CONTEXT hermes kanban --board 9router notify-subscribe t_0646f399 --platform discord --chat-id 1544031399110119588

# Upstream packaging card t_81b1f8de
env -u HERMES_DELEGATED_CHILD_CONTEXT hermes kanban --board 9router create "FIX: Add failover-proxy.cjs to npm package files array (upstream fix)" --priority 2 --assignee default --body "..."
env -u HERMES_DELEGATED_CHILD_CONTEXT hermes kanban --board 9router notify-subscribe t_81b1f8de --platform discord --chat-id 1544031399110119588

# Doc card t_00fbeff3
env -u HERMES_DELEGATED_CHILD_CONTEXT hermes kanban --board 9router create "DOC: 28b-mini2-failover-crashloop-deep-dive.md written + deployed" --priority 2 --assignee default --body "..."
env -u HERMES_DELEGATED_CHILD_CONTEXT hermes kanban --board 9router notify-subscribe t_00fbeff3 --platform discord --chat-id 1544031399110119588
```

---

## 2. Evidence gathering — mini2 (crash-loop)

```bash
ssh -o ConnectTimeout=8 chris@mini2.local 'cat ~/Library/LaunchAgents/com.9router.failover.plist'
# Output: ProgramArguments = /Users/chris/.local/bin/node
#   /Users/chris/.local/lib/node_modules/9router/cli/app/failover-proxy.cjs
#   --listen 20142 --local http://localhost:20128 --peer mini-3.local --peer-port 20130
# RunAtLoad=true KeepAlive=true

ssh -o ConnectTimeout=8 chris@mini2.local 'tail -5 /tmp/9r-launchd-failover.err.log'
# Output: Error: Cannot find module '/Users/chris/.local/lib/node_modules/9router/cli/app/failover-proxy.cjs'
#   code: MODULE_NOT_FOUND, Node.js v26.7.0

ssh -o ConnectTimeout=8 chris@mini2.local 'wc -l /tmp/9r-launchd-failover.err.log'
# Output: 61074 (lines)

ssh -o ConnectTimeout=8 chris@mini2.local 'launchctl print gui/$(id -u)/com.9router.failover'
# Output: runs = 3394, last exit code = 1, state = spawn scheduled

ssh -o ConnectTimeout=8 chris@mini2.local 'ls -la ~/.local/lib/node_modules/9router/'
# Output: LICENSE, README.md, app/, app.bak-1786475503, cli.js, hooks/, node_modules/, package.json, src/
# NOTE: NO failover-proxy.cjs anywhere

ssh -o ConnectTimeout=8 chris@mini2.local 'find ~/.local/lib/node_modules/9router/ -name "*failover*"'
# Output: (empty — zero failover files in npm install)
```

---

## 3. Source repo analysis — mini (root cause)

```bash
cat /Users/chris/Documents/GitHub/9router/cli/failover-proxy.cjs
# 244 lines. L2 node-DOWN protection proxy. Zero non-stdlib deps (http, dns, os).
# Health probe /api/health every 2s; local preferred, peer backup; x-9r-failover:1 loop guard.
# --listen 20142 --local http://localhost:20130 --peer mini2-9.local

cat /Users/chris/Documents/GitHub/9router/cli/package.json
# files: ["cli.js","src","hooks","app","README.md","LICENSE"]  ← failover-proxy.cjs MISSING

cd /Users/chris/Documents/GitHub/9router/cli && npm pack --dry-run | grep -i failover
# Output: (empty)  ← PROOF: failover-proxy.cjs NOT shipped in npm package

cat /Users/chris/Documents/GitHub/9router/cli/scripts/build-cli.js
# Copies src/, app/, hooks/ recursively. Does NOT copy failover-proxy.cjs into bundle.

grep -n "failover" /Users/chris/Documents/GitHub/9router/cli/hooks/postinstall.js
# Output: (empty) — postinstall installs sql.js/systray2, not failover proxy

grep -n "failover" /Users/chris/Documents/GitHub/9router/cli/cli.js
# Output: (empty) — CLI entrypoint does not spawn/manage the proxy

grep -rn "failover" /Users/chris/Documents/GitHub/9router/cli/app/custom-server.js
# Lines 10,13,87,122: L1 in-app peer forwarding (complementary to L2)
```

---

## 4. Design doc review

```bash
cat /Users/chris/Documents/GitHub/9router/docs/plans-and-prompts/research/9router/25-node-failover-implementation.md
# L0 = peer as OpenAI-compatible provider (zero code)
# L1 = in-app peer forwarding when local DEGRADED (custom-server.js)
# L2 = standalone proxy for node-DOWN (failover-proxy.cjs) ← the real ask
# Test plan in doc §6: local harness :20130 + fake peer :20131 + proxy :20140
```

---

## 5. FIX EXECUTION — mini2 (approved by Chris: "we can do the fixes")

```bash
ssh -o ConnectTimeout=10 chris@mini2.local 'set +e
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.9router.failover.plist
# Success (empty output)

pgrep -fl "failover-proxy" && pkill -9 -f "failover-proxy" || echo "no stray failover processes"
# Output: no stray failover processes

rm -f ~/Library/LaunchAgents/com.9router.failover.plist
# Success

mv /tmp/9r-launchd-failover.err.log /tmp/9r-launchd-failover.err.log.archived-20260909-005738
mv /tmp/9r-launchd-failover.log /tmp/9r-launchd-failover.log.archived-20260909-005738
# Logs archived (not deleted — user hard rule)

launchctl list 2>/dev/null | grep 9router
# Output: 78415 0 com.9router.app   ← ONLY app remains, no failover

curl -s --connect-timeout 5 http://localhost:20128/api/health
# Output: {"ok":true}   ← app still healthy
'
```

---

## 6. Verification

| Check | Before | After |
|-------|--------|-------|
| launchctl 9router entries | failover (exit 1) + app | app only (PID 78415, exit 0) |
| Failover crash-loop | 3,394 runs | 0 (bootout) |
| /tmp/9r-launchd-failover.err.log | 61,074 lines, growing | archived |
| mini2 :20128 health | healthy | healthy `{"ok":true}` |
| npm install failover files | 0 | 0 (unchanged — packaging card P2 pending) |

---

## 7. Root cause (one line)

`cli/package.json` files array omits `failover-proxy.cjs`, so the npm-published CLI never contains it; the launchd plist pointed at a path that cannot exist post-install → MODULE_NOT_FOUND → crash-loop. Same bug pattern on mini + mini3 (both already cleaned).

## 8. Remaining (P2, awaiting Chris decision on HA goal)

- Card t_81b1f8de: add failover-proxy.cjs to npm files array + rebuild + reinstall (only if HA between hosts is wanted again)
- Card t_00fbeff3: completed (doc)
- Card t_0646f399: completed (fix)
- Card t_80151336: completed (research)
