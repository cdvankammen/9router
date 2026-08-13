# Model-Serving Policy — Remote-Only Inference (Ollama on mini2, never on the control plane)

**Date:** 2026-08-10
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #research #models #ollama #infrastructure #policy #tailscale #failover

## 1. Objective

User requirement, restated: **this Mac (mini-2) is the control plane. It must
NEVER run local model inference.** Model serving happens on **mini2** (macOS,
now running Ollama) and, ideally, a **Linux box** — both reachable over
Tailscale (100.x).

This hardens the constraint already observed in earlier sessions
(SESSION-HISTORY 2026-08-10: "don't load models on this computer — use
mini2/linux"): vision QA used the remote `dialagram/qwen-3.5-omni-plus`
gateway, and now bare-name local models (`qwen2.5*`, `llama3*`) also resolve
to a remote Ollama host instead of a local fallback.

## 2. Implementation — commit `fdf82774` (2026-08-10)

### 2.1 Env override — `open-sse/config/providers.js`

```js
export const OLLAMA_LOCAL_DEFAULT_HOST = "http://localhost:11434";

// precedence: per-credential baseUrl > env > default; trailing "/" stripped
export function resolveOllamaLocalHost(credentials) {
  const raw = credentials?.providerSpecificData?.baseUrl?.trim();
  const env = process.env.OLLAMA_LOCAL_DEFAULT_HOST?.trim();
  return (raw || env || OLLAMA_LOCAL_DEFAULT_HOST).replace(/\/$/, "");
}
```

- **`OLLAMA_LOCAL_DEFAULT_HOST`** env override (default `http://localhost:11434`).
- Precedence: per-credential `providerSpecificData.baseUrl` **still wins** →
  env → compiled default. So a user can pin one credential to any Ollama host
  while the fleet default follows the env var.
- This Mac's launchd app plist (`~/Library/LaunchAgents/com.9router.app.plist`)
  sets `OLLAMA_LOCAL_DEFAULT_HOST = http://100.96.109.61:11434` (mini2's
  Tailscale IP). Tailscale IPs are **launchd-safe**; LAN IPs (10.2.0.x) are
  TCC-blocked for launchd jobs (see `26-node-failover-networking-options.md`).

### 2.2 Bare model-name inference — `open-sse/services/model.js`

`MODEL_PREFIX_PROVIDERS` now maps:
- `/^qwen2\.5/` → `ollama-local`
- `/^llama3\./` → `ollama-local`

Previously a bare `qwen2.5:3b` fell back to provider `openai`; now it resolves
to the keyless virtual `ollama-local` provider.

### 2.3 Keyless virtual provider — `open-sse/providers/registry/ollama-local.js`

```js
{
  id: "ollama-local",
  priority: 50,
  hasFree: true,
  noAuth: true,          // keyless — virtual connection injected by auth.js
  alias: "ollama-local",
  display: { name: "Ollama Local", icon: "cloud", textIcon: "OL", website: "https://ollama.com" },
  category: "free",      // "free" → FREE_PROVIDERS → noAuth virtual connection
  transport: { baseUrl: "http://localhost:11434/api/chat", format: "ollama" },
  serviceKinds: ["llm"],
}
```

- `category: "apikey"` → **`"free"`** + `noAuth: true` → auth.js injects a
  keyless virtual connection via `FREE_PROVIDERS` — mirrors the existing
  `9router` provider pattern. No credential entry needed.

### 2.4 Executor streaming — `open-sse/executors/ollama-local.js`

```js
buildUrl(model, stream, urlIndex = 0, credentials = null) {
  const host = resolveOllamaLocalHost(credentials);
  return stream ? `${host}/v1/chat/completions` : `${host}/api/chat`;
}
// execute(): when args.stream → result.responseFormat = "openai"
```

- **Streaming** → Ollama's OpenAI-compatible `POST {host}/v1/chat/completions`
  (emits real `text/event-stream` SSE) with `responseFormat: "openai"` so
  chatCore treats the stream as the openai pivot format (native SSE handling).
- **Non-streaming** → native `POST {host}/api/chat`.

### 2.5 Streaming endpoint rationale (NDJSON vs SSE)

Ollama's native `/api/chat` **streaming** returns `application/x-ndjson`,
which 9Router's SSE pipeline **blocks**. Switching streaming to
`/v1/chat/completions` gives real SSE that the existing pipeline handles
natively — no NDJSON parsing, no pipeline changes. Non-streaming can keep the
native endpoint because JSON responses round-trip fine.

### 2.6 Auth — one Bearer key on both nodes

The same dashboard API key was synced to mini2's DB so a single Bearer key
works on both nodes (mini-2's app and mini2's app) — required for the failover
chain (local app → proxy → peer app → peer Ollama) to authenticate end to end.

## 3. Ollama on macOS — install recipe (mini2, verified)

1. **Download the official tarball** (macOS):
   ```bash
   curl -fsSL https://ollama.com/download/ollama-darwin.tgz -o ollama-darwin.tgz
   ```
2. **Extract the WHOLE tarball into `~/.local/bin/`** — the archive has a
   **flat layout**: the `ollama` binary, `llama-server`, and the `libggml*`
   dylibs all land **beside each other** in the destination directory.
   ```bash
   mkdir -p ~/.local/bin && tar -xzf ollama-darwin.tgz -C ~/.local/bin
   ~/.local/bin/ollama --version   # → ollama version is 0.32.7
   ```
   > **GOTCHA (real, hit on mini2):** extracting only the `ollama` binary
   > (or using the brew-style layout) leaves the runtime files missing →
   > `"llama-server binary not found"` at serve time. The runtime
   > (`llama-server` + `libggml*.dylib`) must sit **in the same directory**
   > as the binary.

3. **launchd agent** `~/Library/LaunchAgents/com.9router.ollama.plist`
   (verified live on mini2):
   ```xml
   <key>Label</key><string>com.9router.ollama</string>
   <key>ProgramArguments</key>
   <array>
     <string>/Users/chris/.local/bin/ollama</string>
     <string>serve</string>
   </array>
   <key>EnvironmentVariables</key>
   <dict>
     <key>OLLAMA_HOST</key><string>0.0.0.0:11434</string>
     <key>OLLAMA_KEEP_ALIVE</key><string>30m</string>
   </dict>
   <key>RunAtLoad</key><true/>
   <key>KeepAlive</key><true/>
   <key>StandardOutPath</key><string>/tmp/9r-ollama.log</string>
   <key>StandardErrorPath</key><string>/tmp/9r-ollama.err.log</string>
   ```
   Load: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.9router.ollama.plist`

4. **Pull the model:**
   ```bash
   ~/.local/bin/ollama pull qwen2.5:3b
   ```
   Pulled model: `qwen2.5:3b` (1.93 GB, Q4_K_M, 3.1B params, context 32768,
   digest `357c53fb…`).

5. **Verify reachability from this Mac** (Tailscale):
   ```bash
   curl -s http://100.96.109.61:11434/api/tags   # → {"models":[{"name":"qwen2.5:3b",...}]}
   ```

## 4. E2E verification (2026-08-10)

All verified live with the built `cli/app` bundle:
- Non-stream + stream through **this Mac's app** (port 20130) using bare model
  `qwen2.5:3b` → routed to mini2's Ollama.
- Through the **failover proxy** (port 20142).
- On **mini2's app** (port 20128) directly.
- **Ultimate failover**: local app killed → proxy → mini2 app → mini2 Ollama
  → response OK.
- Targeted tests: **18/18** pass.

## 5. Joining a Linux box (deferred — SSH access required)

**Status:** SSH key access is currently **denied** on the candidate Linux
nodes: `exo` (`100.80.99.11`) and `hass` (`100.127.34.40`). Once SSH works,
run these on the Linux box:

```bash
# 1. Install Ollama (arm64 for Apple Silicon Minis; amd64 otherwise)
curl -fsSL https://ollama.com/download/ollama-linux-arm64.tgz -o ollama-linux.tgz
sudo tar -C /usr/local -xzf ollama-linux.tgz        # flat layout: ollama + llama-server + libggml*.so
ollama --version

# 2. Serve on all interfaces (Tailscale reachable)
nohup env OLLAMA_HOST=0.0.0.0:11434 ollama serve > /tmp/ollama.log 2>&1 &

# 3. Pull the model
ollama pull qwen2.5:3b

# 4. Verify
curl -s http://localhost:11434/api/tags
```

**systemd unit** (preferred over nohup for a real box):

```ini
# /etc/systemd/system/ollama.service
[Unit]
Description=Ollama LLM server
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
Environment=OLLAMA_HOST=0.0.0.0:11434
Environment=OLLAMA_KEEP_ALIVE=30m
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now ollama
```

**Point 9Router at it** — either:
- **Fleet-wide (env):** add to this Mac's `com.9router.app.plist`
  `EnvironmentVariables`:
  `OLLAMA_LOCAL_DEFAULT_HOST = http://<linux-tailscale-ip>:11434`
  then `launchctl kickstart -k gui/$(id -u)/com.9router.app`; or
- **Per-credential:** set `providerSpecificData.baseUrl` on an
  `ollama-local` credential to `http://<linux-tailscale-ip>:11434`
  (wins over env, per §2.1).

Use the box's **Tailscale IP (100.x)** — LAN IPs are TCC-blocked for launchd
jobs on macOS (see `26-node-failover-networking-options.md`).

## 6. Open questions / follow-ups

- **Linux box selection:** `exo` / `hass` SSH access needed (user action);
  decide which joins first.
- **More models:** `qwen2.5:3b` is the only model pulled so far; add
  `qwen2.5:7b` / `llama3.1:8b` etc. as needed (any `qwen2.5*` / `llama3*`
  bare name already routes to `ollama-local`).
- **GPU**: Linux box (if it has a GPU) would serve larger models than mini2.

## Related docs

- `24-ha-mini-backup-nodes.md`, `25-node-failover-implementation.md`,
  `26-node-failover-networking-options.md` — failover/networking context
- `../../operations/deployment-runbook.md` — "Model serving (Ollama)" ops section
- Commit: `fdf82774` (branch `v1`)
