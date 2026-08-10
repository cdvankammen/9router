# Deployment Runbook — mini-2 + mini2 (2026-08-08)

**Date:** 2026-08-08
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #workflow #deployment #mini #mini2 #runbook

## Machine map

| Machine | Hostname | Role | 9Router |
|---------|----------|------|---------|
| **mini-2** (this Mac) | `mini-2.local` | dev + primary app | `cli/app` bundle → port **20130**, data `~/.9router` |
| **mini2** | `mini2-9.local` (SSH host `mini2`) | backup node | `cli/app` bundle → port **20128**, data `~/.9router` |

## Build pipeline (run from this Mac, repo root)

```bash
# 1. Root production build (fresh .next)
rm -rf .next && npm run build          # → .next/standalone

# 2. Assemble the application folder (cli/app)
cd cli && npm run build                # → cli/app (62M bundle, all routes inlined)
```

The `cli/app` folder is the **single deployable artifact** (the "application
folder"): it contains server.js + custom-server.js + .next-cli-build + inlined
node_modules (better-sqlite3 prebuilt for arm64) + MITM server bundle.

## Verify the bundle is current

```bash
grep -l "getRequestFacets" cli/app/.next-cli-build/static/chunks/app/\(dashboard\)/dashboard/messages/page-*.js
ls cli/app/.next-cli-build/server/app/api/health/providers/route.js
ls cli/app/.next-cli-build/server/app/api/observability/status/route.js
```

## Deploy to mini2 (SSH key auth works)

```bash
# Node 22 (installed once, user-local):
ssh mini2 'cd ~ && curl -sSLo n.txz https://nodejs.org/dist/v22.14.0/node-v22.14.0-darwin-arm64.tar.xz \
  && tar -xJf n.txz && rm n.txz && mv node-v22.14.0-darwin-arm64 .node'

# Ship the bundle:
cd cli && rsync -az --delete ./app/ mini2:~/9router-app/

# Start (background):
ssh mini2 'export PATH="$HOME/.node/bin:$PATH" && cd ~/9router-app \
  && nohup env PORT=20128 HOSTNAME=0.0.0.0 JWT_SECRET=CHANGE-ME node server.js \
  > ~/9router-app/server.log 2>&1 &'
```

## Restart the app on mini-2 (this machine)

```bash
cd cli/app && nohup env PORT=20130 HOSTNAME=0.0.0.0 node server.js > /tmp/9r-macosapp.log 2>&1 &
```

## Verify

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:20130/login   # mini-2
curl -s -o /dev/null -w "%{http_code}\n" http://mini2:20128/login       # mini2
curl -s http://127.0.0.1:20130/api/health/providers                     # health API
```

## Notes / gotchas

- The **macOS app / tray** runs the same `cli/app` bundle — rebuilding `cli/app`
  + restarting the server process is what updates the running app. The tray
  itself does not need a rebuild for server-code changes.
- mini2 uses `node:sqlite` driver (Node 22 native) — better-sqlite3's binary
  also ships in the bundle; the adapter chain picks whichever works.
- `mini` SSH key auth is NOT set up from this machine (only `mini2` hosts exist
  in `~/.ssh/config`). To add it: `ssh-copy-id mini` (needs the password once).
- Ports: this machine 20130, mini2 20128 (avoid clashing with the local dev
  server on 20130 when both run).
- HA/failover between the two is researched separately — see
  `research/9router/24-ha-mini-backup-nodes.md`.
