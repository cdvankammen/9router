# Deployment Runbook — mini-2 + mini2 (2026-08-08)

**Date:** 2026-08-08
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #workflow #deployment #mini #mini2 #runbook

## Machine map

| Machine | Hostname | Role | 9Router | Ollama |
|---------|----------|------|---------|--------|
| **mini-2** (this Mac) | `mini-2.local` | dev + primary app — **control plane, NEVER runs inference** | `cli/app` bundle → port **20130**, data `~/.9router` | ❌ none |
| **mini2** | `mini2-9.local` (SSH host `mini2`) | backup node + **model server** | `cli/app` bundle → port **20128**, data `~/.9router` | ✅ **:11434** — `qwen2.5:3b` via launchd `com.9router.ollama` |

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

---

## STATUS 2026-08-09 — Both nodes on HEAD (`e582859a`)

| Node | Host | Port | Data | Status |
|------|------|------|------|--------|
| **mini-2 (this machine)** | mini-2.local | 20130 | `~/.9router` | ✅ rebuilt cli/app from HEAD, login 200, health 200 (real provider states: cursor/xai expired, github needs-reauth, openrouter guardrail — surfaced by health endpoint) |
| **mini2** | mini2-9.local | 20128 | `/tmp/9r-deploy-new` (deployed) | ✅ fresh install: Node 22 at `~/.local/bin/node`, login 200, health 200 |

### Deployment procedure (verified today)
```bash
# 1. Rebuild bundles (root + cli/app)
cd /Users/chris/Documents/GitHub/9router
npm run build && node scripts/copy-standalone-assets.mjs
node cli/scripts/build-cli.js   # → cli/app (62M)

# 2. Deploy to mini2
rsync -az --delete cli/app/ mini2:/tmp/9r-deploy-new/
ssh mini2 "pkill -f custom-server.js; sleep 1; cd /tmp/9r-deploy-new && \
  nohup /Users/chris/.local/bin/node custom-server.js > /tmp/9r-mini2.log 2>&1 & \
  sleep 5; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:20128/login"

# 3. Restart local (this machine)
lsof -ti :20130 | xargs kill; sleep 1
cd cli/app && PORT=20130 HOSTNAME=0.0.0.0 nohup ~/.local/bin/node custom-server.js \
  > /tmp/9r-local.log 2>&1 & sleep 6
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:20130/login
```

### Gotchas learned
- **Node path**: `~/.local/bin/node` (NOT /usr/local/bin — `exit 127`).
- **PORT env required** on `custom-server.js` (Next.js default 3000 otherwise).
- **Startup warmup**: first curl after restart may return 404/000 — wait 5–6s.
- **`mini` host (mini.local)**: SSH key-auth blocked — user must add `~/.ssh/config` entry / keys. Ping answers but no SSH.
- **FTS5 backup gotcha**: `requestDetails_fts` shadow tables must be excluded from DB backups (fixed `e582859a`).

## Failover proxy — launchd-managed (2026-08-10)

Both machines run the app + failover proxy as **launchd user agents**
(KeepAlive, auto-start on boot, auto-restart on crash):

| Machine | App agent | Proxy agent | Local | Peer (Tailscale) |
|---|---|---|---|---|
| mini-2 (this Mac) | `com.9router.app` (:20130) | `com.9router.failover` (:20142) | `http://localhost:20130` | `http://100.96.109.61:20128` (mini2) |
| mini2 | `com.9router.app` (:20128) | `com.9router.failover` (:20142) | `http://localhost:20128` | `http://100.77.55.46:20130` (mini-2) |

Plists: `~/Library/LaunchAgents/com.9router.{app,failover}.plist` on each box.

**Proxy ships INSIDE the bundle** (`cli/app/failover-proxy.cjs`, copied by the
build step) — launchd points at the bundle path, so `rsync --delete` cannot
orphan the proxy:
- this Mac: `/Users/chris/Documents/GitHub/9router/cli/app/failover-proxy.cjs`
- mini2: `/tmp/9r-deploy-new/failover-proxy.cjs`
- Deploy step includes it automatically (rsync of `cli/app/`); no manual scp.
  If you ever change the proxy, rebuild the bundle (`node cli/scripts/build-cli.js`)
  or re-copy the file before rsync.

**CRITICAL: peers MUST be Tailscale IPs (100.x), not hostnames or LAN IPs.**
- `mini2-9.local` (mDNS) resolves to link-local `fe80::` → EHOSTUNREACH.
- LAN IPs (10.2.0.x) are blocked for launchd jobs by macOS 15 Local-Network
  privacy (TCC) → EHOSTUNREACH in 1ms. Tailscale (100.x) is exempt.
- Shell runs (manual) work with hostnames/LAN — launchd does NOT. When in
  doubt: `launchctl print gui/$(id -u)/com.9router.failover` and check the
  startup line in `/tmp/9r-launchd-failover.log`.

Ops:
- Restart: `launchctl kickstart -k gui/$(id -u)/com.9router.app` (or `.failover`)
- Logs: `/tmp/9r-launchd-app.log`, `/tmp/9r-launchd-failover.log`
- Verify failover: kill the app process (`lsof -tiTCP:20130 -sTCP:LISTEN | xargs kill`)
  → within 2s `curl localhost:20142/api/settings/require-login` must flip to the
  peer's identity (mini2=`requireLogin:true`, mini-2=`false`).
- Automated test: `cd tests && npx vitest run unit/failover-proxy.test.js`

---

## Model serving (Ollama) — 2026-08-10 (`fdf82774`)

**Policy: this Mac (mini-2) is the control plane and NEVER runs local model
inference. Models are served on mini2 (Ollama) and ideally a Linux box,
reachable over Tailscale (100.x).**

Node table (updated):

| Node | Ollama | Model |
|------|--------|-------|
| **mini-2** (this Mac) | ❌ none — control plane | — |
| **mini2** | ✅ `http://100.96.109.61:11434` (launchd `com.9router.ollama`, `OLLAMA_HOST=0.0.0.0:11434`) | `qwen2.5:3b` (pulled) |

### How the app finds Ollama

- `open-sse/config/providers.js`: `resolveOllamaLocalHost()` precedence =
  per-credential `providerSpecificData.baseUrl` → env
  `OLLAMA_LOCAL_DEFAULT_HOST` → default `http://localhost:11434`.
- This Mac's launchd app plist (`~/Library/LaunchAgents/com.9router.app.plist`)
  sets `OLLAMA_LOCAL_DEFAULT_HOST = http://100.96.109.61:11434` (mini2's
  Tailscale IP — launchd-safe; LAN IPs are TCC-blocked). After editing the
  plist: `launchctl kickstart -k gui/$(id -u)/com.9router.app`.
- Bare model names `qwen2.5*` / `llama3*` → provider `ollama-local` (keyless,
  `noAuth`). Streaming uses OpenAI-compatible `/v1/chat/completions` (real
  SSE); non-stream uses native `/api/chat`.

### Verification commands

```bash
# Ollama reachable + model list (from this Mac, via Tailscale)
curl -s http://100.96.109.61:11434/api/tags

# Chat via 9Router (bare model name → ollama-local), non-stream
curl -s http://127.0.0.1:20130/v1/chat/completions \
  -H "Authorization: Bearer <same-key-as-mini2>" \
  -d '{"model":"qwen2.5:3b","messages":[{"role":"user","content":"hi"}],"stream":false}'

# Same via the failover proxy
curl -s http://127.0.0.1:20142/v1/chat/completions \
  -H "Authorization: Bearer <key>" -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5:3b","messages":[{"role":"user","content":"hi"}],"stream":true}'

# On mini2: ollama service state
ssh mini2 '~/.local/bin/ollama --version && launchctl print gui/$(id -u)/com.9router.ollama | head -5'
# Logs: /tmp/9r-ollama.log (+ .err.log) on mini2
```

Note: the same dashboard API key is synced to both nodes' DBs, so one Bearer
key authenticates the whole chain (local app → proxy → peer app → peer Ollama).

### Joining a Linux box (deferred — SSH access required)

SSH key access is currently denied on `exo` (`100.80.99.11`) and `hass`
(`100.127.34.40`). Once SSH works (user action), on the Linux box:

```bash
curl -fsSL https://ollama.com/download/ollama-linux-arm64.tgz -o ollama-linux.tgz
sudo tar -C /usr/local -xzf ollama-linux.tgz     # flat layout: ollama + llama-server + libggml*.so
nohup env OLLAMA_HOST=0.0.0.0:11434 ollama serve > /tmp/ollama.log 2>&1 &
ollama pull qwen2.5:3b
curl -s http://localhost:11434/api/tags
```

Preferred: systemd unit (`ExecStart=/usr/local/bin/ollama serve`,
`Environment=OLLAMA_HOST=0.0.0.0:11434`, `Restart=always`) then
`systemctl enable --now ollama`. Point 9Router at it via
`OLLAMA_LOCAL_DEFAULT_HOST=http://<linux-tailscale-ip>:11434` in this Mac's
app plist (or a credential's `baseUrl`). Full recipe +
NDJSON-vs-SSE rationale: `research/9router/27-model-serving-policy.md`.

---

## STATUS 2026-08-11 — PROPER PACKAGED INSTALL on mini2 (full test matrix PASSED)

Per user directive: install 9Router from this codebase onto mini2 as a proper
**application install** (packaged CLI, not just a raw bundle rsync), then fully
test every setting + functionality. All phases verified.

### Install (the correct "application folder" flow)

```bash
# 1. Build + pack the CLI on this machine
cd /Users/chris/Documents/GitHub/9router
rm -rf .next && npm run build && node scripts/copy-standalone-assets.mjs
cd cli && npm run build && npm run pack:cli    # → 9router-0.5.50.tgz (14MB)

# 2. Install the package on mini2 (user-local global)
scp ../9router-0.5.50.tgz chris@mini2:/tmp/
ssh chris@mini2 'npm install -g /tmp/9router-0.5.50.tgz'
# → ~/.local/lib/node_modules/9router/ (cli.js + app/ bundle) + ~/.local/bin/9router
#   postinstall self-heals sqlite deps into ~/.9router/runtime/node_modules

# 3. launchd app plist → /Users/chris/.local/lib/node_modules/9router/app/custom-server.js
#    (WorkingDirectory = that app dir; env: PORT=20128, HOSTNAME=0.0.0.0,
#     INITIAL_PASSWORD, API_KEY_SECRET, MACHINE_ID_SALT, JWT_SECRET=~/.9router/jwt-secret)
```

NOTE: `failover-proxy.cjs` is NOT bundled by build-cli — copy it separately to
`~/9router-app/` (the rsync'd bundle dir) which the failover launchd agent uses.

### Full test matrix — ALL PASSED on mini2 (2026-08-11)

| Area | Result |
|---|---|
| Auth: login / key / bad-key 401 / requireApiKey | ✅ |
| /v1 chat non-stream + stream (qwen2.5:3b ollama-LOCAL on mini2) | ✅ SSE chunks flow |
| /v1 api/chat, responses, count_tokens, models | ✅ 200 |
| /v1 models/info (needs ?id), embeddings (no embedding model) | ✅ correct 400s |
| Dashboard pages (providers/combos/usage/quota/token-saver/messages/console-log/cli-tools/skills/proxy-pools/profile/endpoint/basic-chat/media/translator) | ✅ all 200 |
| Messages 6 views (list/conversations/timeline/errors/search) | ✅ real data |
| Settings surface (smartRouter/rtk/comboStrategy/obsMaxRecords/peerNodes) | ✅ PATCH→GET reflects |
| Observability (enabled, records captured) | ✅ currentCount 3+ |
| **L2 failover**: kill mini2 app → proxy flips to peer (this Mac), chat via proxy serves from peer, restore → failback | ✅ identity-verified |
| Loop protection (x-9r-failover → 502) | ✅ |
| Models CRUD (custom add), cli-tools settings, proxy-pools, export, headroom | ✅ |
| KeepAlive respawn (kill → 200 in <12s) | ✅ |
| Launchd runs app from installed package path (persists reboot) | ✅ |

### Key learnings (this install)
- **The packaged CLI install** (`npm install -g 9router` tarball) is the proper
  "application folder" flow — the app runs from
  `~/.local/lib/node_modules/9router/app` (cwd verified).
- **Ollama models live on mini2** (qwen2.5:3b) — this Mac (mini-2) is the
  control plane and NEVER runs inference.
- **peerNodes L1**: `["http://100.77.55.46:20130"]` set + code present in the
  running app; local requests still serve locally (correct).
- `/tmp/9r-deploy-new` (old install) removed after backup — macOS purges /tmp.
