# Plan — Install 9Router on mini2 + Full Test Matrix

**Date:** 2026-08-10
**Author:** GitHub Copilot agent (main session, from Explore-subagent research)
**Status:** completed
**Tags:** #plan #deploy #mini2 #testing #failover

## Objective

Install 9Router from this codebase (HEAD, newer than v0.5.50) onto **mini2**
(macOS 26.6 arm64, Tailscale `100.96.109.61`, `ssh chris@mini2`) and fully
test every setting + functionality. Do not stop until verified.

## Verified mini2 facts (recon 2026-08-10)

- macOS 26.6 arm64, disk 228Gi (80% used, 3.1Gi free)
- Node at `/Users/chris/.local/bin/node` (NOT on SSH/launchd PATH — use full path)
- git at `/usr/bin/git`
- **Existing install**: `/tmp/9r-deploy-new/` (v0.5.50) via launchd:
  `com.9router.app` (app :20128), `com.9router.failover` (proxy :20142 → peer
  `100.77.55.46:20130` = this machine), `com.9router.ollama`
- **Ollama + llama-server RUNNING on mini2** (models live on mini2 — per user:
  models on mini2, NOT this Mac)
- `~/.9router/` exists (db + jwt-secret from prior install) — preserve

## Key decisions

- **Target dir: `~/9router-app`** (NOT `/tmp` — macOS purges /tmp on reboot;
  the current `/tmp/9r-deploy-new` would vanish). This is the single most
  important change.
- **Deploy artifact: `cli/app/`** (62M standalone bundle, includes
  custom-server.js + failover-proxy.cjs + .next-cli-build)
- **Peers must be Tailscale `100.x` IPs** in launchd plists (mDNS → fe80::
  EHOSTUNREACH; LAN IPs TCC-blocked for launchd)
- **Node full path** `/Users/chris/.local/bin/node` in plists + PATH env

## Phases

### Phase 0 — Pre-flight
- SSH + node sanity, backup existing install + `~/.9router`, snapshot launchd,
  confirm ports, confirm ollama healthy.

### Phase 1 — Build artifact (this machine)
```bash
cd /Users/chris/Documents/GitHub/9router
rm -rf .next
npm run build && node scripts/copy-standalone-assets.mjs
node cli/scripts/build-cli.js
du -sh cli/app   # ~62M
```

### Phase 2 — Deploy to mini2 (`~/9router-app`)
```bash
rsync -az --delete ./app/ mini2:~/9router-app/
# stop old app + proxy, remove /tmp/9r-deploy-new after backup
```

### Phase 3 — Start + verify
- Manual smoke with env (PORT=20128, HOSTNAME=0.0.0.0, JWT_SECRET reuse,
  INITIAL_PASSWORD, API_KEY_SECRET, MACHINE_ID_SALT)
- Update launchd plists → `~/9router-app` paths; reload; kill→respawn test

### Phase 4 — Full test matrix
- 4.1 Auth & gateway (login, bad/good key, health/providers, dashboard)
- 4.2 /v1 model API (chat non-stream + stream, api/chat, responses, messages,
  count_tokens, embeddings, media best-effort, models variants) — direct AND
  via proxy :20142; bare model → ollama-local
- 4.3 Dashboard pages (all render, no console errors)
- 4.4 Messages 6 views (list/conversations/timeline/trace/board/errors) +
  search/FTS5 + filters + pagination + export
- 4.5 Settings surface (each group PATCH → GET reflect): auth, combo/fallback,
  smart router, observability, token saver, network/proxy-pools, tunnels,
  headroom/caveman/ponytail/pxpipe, dns, quota, markdown, cloud
- 4.6 Failover L1/L2 (kill app → proxy serves from peer; L1 peerNodes in-app;
  loop protection; both-down; client-abort)
- 4.7 CLI/extra (cli-tools, custom/disabled/alias models, quota, console-log)

### Phase 5 — Documentation + tracking
- Update deployment-runbook.md (`/tmp` → `~/9router-app`, results, timestamps)
- Update CHANGELOG/SESSION-HISTORY/TASKS

## Risk register

| Risk | Sev | Mitigation |
|---|---|---|
| /tmp purge wipes install on reboot | HIGH | Install to `~/9router-app` |
| Disk 3.1Gi free | MED | Monitor; remove .bak after verify |
| Node not on PATH | HIGH | Full path in plists + PATH env |
| launchd TCC blocks LAN / mDNS fe80:: | HIGH | Tailscale 100.x IPs only |
| Missing PORT → :3000 | MED | Always env PORT=20128 |
| Old DB schema vs new migrations | MED | Backup ~/.9router; verify FTS5 table |
| Startup warmup 404s | LOW | Wait 6-7s before asserting |
| rsync --delete over parent | MED | Target exactly `~/9router-app/` |

## Related
- `../operations/deployment-runbook.md`, `../research/9router/25-node-failover-implementation.md`
