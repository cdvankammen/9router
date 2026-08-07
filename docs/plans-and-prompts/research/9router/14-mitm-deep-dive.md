# 9Router MITM System Deep Dive

## System Overview

The MITM system is a **local HTTPS proxy** that intercepts AI IDE traffic (Cursor, Kiro, Copilot, Antigravity) by acting as a trusted TLS endpoint on `127.0.0.1:443`. It combines three mechanisms:

1. **DNS hijacking** — writes `127.0.0.1 <host>` entries into `/etc/hosts` per tool
2. **Dynamic TLS interception** — a self-signed Root CA (installed in OS trust store) signs per-domain leaf certs generated on-the-fly via SNI
3. **Protocol translation** — per-IDE handlers rewrite request/response formats into 9Router's OpenAI-compatible gateway at `localhost:20128/v1/*`


IDE Tool → DNS redirect → 127.0.0.1:443 → TLS (SNI leaf cert)
  → server.js dispatch → handler.intercept()
  → base.fetchRouter() → 9Router gateway → upstream provider
  → SSE/EventStream back through handler → IDE


---

## File Inventory & Exports

| # | File | Exports | Lines |
|---|------|---------|-------|
| 1 | `server.js` | *(standalone process, no exports)* | ~310 |
| 2 | `manager.js` | `initDbHooks`, `getMitmStatus`, `killLeftoverMitm`, `pollMitmHealth`, `checkPort443Free`, `getPort443Owner`, `hasDnsPrivilege`, `saveMitmSettings`, `loadEncryptedPassword`, `clearEncryptedPassword`, `saveDnsToolState`, `loadDnsToolState`, `restoreToolDNS` | ~340 |
| 3 | `config.js` | `IS_DEV`, `LSOF_BIN`, `TARGET_HOSTS`, `URL_PATTERNS`, `MODEL_SYNONYMS`, `MODEL_PATTERNS`, `MODEL_NO_MAP`, `LOG_BLACKLIST_URL_PARTS`, `getToolForHost()`, `extractModel()` | ~120 |
| 4 | `paths.js` | `DATA_DIR`, `MITM_DIR` | ~35 |
| 5 | `logger.js` | `log`, `err`, `dumpRequest`, `createResponseDumper`, `clearDumpDir` | ~95 |
| 6 | `dbReader.js` | `getMitmAlias(toolName)` | ~25 |
| 7 | `antigravityIdeVersion.js` | `ANTIGRAVITY_IDE_VERSION`, `applyAntigravityIdeVersionOverride()`, `rewriteAntigravityUserAgent()` | ~55 |
| 8 | `winElevated.js` | `isAdmin()`, `runElevatedPowerShell()`, `quotePs()` | ~85 |
| 9 | `cert/rootCA.js` | `generateRootCA`, `loadRootCA`, `generateLeafCert`, `isCertExpired`, `ROOT_CA_CERT_PATH`, `ROOT_CA_KEY_PATH` | ~140 |
| 10 | `cert/generate.js` | `generateCert()`, `getCertForDomain(domain)` | ~30 |
| 11 | `cert/install.js` | `installCert`, `uninstallCert`, `checkCertInstalled` | ~230 |
| 12 | `dns/dnsConfig.js` | `TOOL_HOSTS`, `addDNSEntry`, `removeDNSEntry`, `removeAllDNSEntries`, `removeAllDNSEntriesSync`, `execWithPassword`, `isSudoAvailable`, `canRunSudoWithoutPassword`, `isSudoPasswordRequired`, `checkDNSEntry`, `checkAllDNSStatus` | ~250 |
| 13 | `handlers/base.js` | `fetchRouter`, `pipeSSE`, `pipeTransformedSSE`, `pipeTransformedEventStream` | ~200 |
| 14 | `handlers/cursor.js` | `intercept` *(stub: returns 501)* | ~15 |
| 15 | `handlers/kiro.js` | `intercept` | ~450 |
| 16 | `handlers/copilot.js` | `intercept` | ~40 |
| 17 | `handlers/antigravity.js` | `intercept` | ~40 |

**Shared constant** (outside `mitm/`): `src/shared/constants/mitmToolHosts.js` — `TOOL_HOSTS` map used by both `dnsConfig.js` and the dashboard UI.

---

## Certificate Chain

### Generation (`cert/rootCA.js` + `cert/generate.js`)

All crypto uses **`node-forge`** (pure JS, no native deps).


Root CA:  "9Router MITM Root CA"
├── RSA 2048-bit, self-signed, 10-year validity
├── Extensions: basicConstraints(cA=true), keyUsage(keyCertSign+cRLSign)
├── Stored: $MITM_DIR/rootCA.key + rootCA.crt
├── Auto-regenerated when expired or <30 days remaining

└── Leaf Certs (per-domain, on-demand via SNI)
    ├── RSA 2048-bit, signed by Root CA, 1-year validity
    ├── SAN: [domain, *.domain]
    ├── Extensions: serverAuth, clientAuth, digitalSignature, keyEncipherment
    └── Cached in-memory Map<servername, SecureContext>


**`generateRootCA()`** — creates key pair, self-signs with SHA-256, writes PEM to disk.
**`generateLeafCert(domain, rootCA)`** — creates per-domain key pair, signs with Root CA, includes wildcard SAN.
**`getCertForDomain(domain)`** — called from SNI callback; loads Root CA → generates leaf → returns `{key, cert}` PEM strings.

### Installation (`cert/install.js`)

The Root CA must be trusted by the OS for IDE tools to accept the MITM leaf certs.

| Platform | Install Method | Uninstall Method |
|----------|---------------|-----------------|
| **macOS** | `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain` via `sudo -S` | `security delete-certificate -Z <fingerprint>` |
| **Windows** | `certutil -addstore Root` via `runElevatedPowerShell` (UAC popup) | `certutil -delstore Root` |
| **Linux** | Copy to distro CA dir + `update-ca-certificates`/`update-ca-trust` | `rm` + update command |

**Stale cert detection:** SHA-1 fingerprint of DER bytes is computed and matched against installed certs. Same CN with different fingerprint = stale cert → delete first, then reinstall.

**Linux NSS databases** also updated (for browser-based tools): `~/.pki/nssdb`, `~/snap/chromium/...`, `~/.mozilla/firefox/*/cert9.db`, `~/snap/firefox/...`.

---

## DNS Hijacking (`dns/dnsConfig.js`)

### Per-tool host lists (from `mitmToolHosts.js`)

| Tool | Hosts redirected to 127.0.0.1 |
|------|------|
| **antigravity** | `daily-cloudcode-pa.googleapis.com`, `cloudcode-pa.googleapis.com` |
| **copilot** | `api.individual.githubcopilot.com` |
| **kiro** | `runtime.us-east-1.kiro.dev`, `q.us-east-1.amazonaws.com`, `codewhisperer.us-east-1.amazonaws.com` |
| **cursor** | `api2.cursor.sh` |

### Mechanism

- **macOS/Linux:** Reads `/etc/hosts`, appends `127.0.0.1 <host>` lines, writes back via `printf | sudo tee /etc/hosts`. Flushes with `dscacheutil -flushcache && killall -HUP mDNSResponder` (macOS) or `resolvectl flush-caches` (Linux).
- **Windows:** Atomic write pattern (`.9router.new` → rename `.bak` → rename to target) on `System32\drivers\etc\hosts`. Flushes via `ipconfig /flushdns` through elevated PowerShell.
- **Shutdown safety:** `removeAllDNSEntriesSync()` is synchronous — called during SIGTERM handler to ensure `/etc/hosts` is cleaned even if async ops can't complete.

### Privilege model

- `isSudoAvailable()` — checks if `sudo` binary exists
- `canRunSudoWithoutPassword()` — `sudo -n true`
- `isSudoPasswordRequired()` — true when sudo exists but needs a password
- `execWithPassword(cmd, pwdassword ` — spawns `sudo -S sh -c <cmd>`, pipes password via stdin
- Password is AES-256-GCM encrypted (key from `node-machine-id` + salt `"9router-mitm-pwd"`) and stored in settings DB

---

## Request Lifecycle (`server.js`)

### Startup sequence

1. `clearDumpDir()` — wipe stale debug logs
2. Check for `rootCA.key`/`rootCA.crt` → generate if missing
3. Load Root CA into `sslOptions` with `SNICallback`
4. `killPort(443)` — kill any existing listener on port 443 (via `lsof` or PowerShell)
5. `server.listen(443)` — start HTTPS server
6. Register shutdown handler → `removeAllDNSEntriesSync()` on SIGTERM/SIGINT

### SNI callback (TLS handshake)


Client HELLO (SNI: api2.cursor.sh)
  → sniCallback("api2.cursor.sh")
  → cache hit? return cached SecureContext
  → cache miss: getCertForDomain("api2.cursor.sh")
    → loadRootCA() → generateLeafCert(domain, rootCA)
    → tls.createSecureContext({ key, cert: leaf+root })
  → cache and return


### Request dispatch flow


1. /_mitm_health → {ok: true, pid}
2. Anti-loop: x-request-source=local → passthrough (9Router's own requests)
3. getToolForHost(host) → null? → passthrough
4. URL_PATTERNS[tool] match? → no → passthrough
5. Cursor? → handler directly (binary protobuf, model extracted inside handler)
6. extractModel(url, body) → MODEL_NO_MAP match? → passthrough (tab-autocomplete → passthrough  
7. getMappedModel(tool, model):
   a. Read aliases from dbReader (aliases.json)
   b. MODEL_SYNONYMS exact match
   c. Prefix match fallback
   d. MODEL_PATTERNS regex fallback
   → null? → passthrough
8. handlers[tool].intercept(req, res, bodyBuffer, mappedModel, passthrough)


### Upstream passthrough

When a request doesn't match interception criteria, it's forwarded to the real upstream:

1. **ALPN negotiation** (cached per-host): tries HTTP/2 first, falls back to HTTP/1.1
2. **DNS bypass:** Resolves target IP via `8.8.8.8` (avoids `/etc/hosts` loop back to self)
3. **Host rewrite:** `cloudcode-pa.googleapis.com` → `daily-cloudcode-pa.googleapis.com` (chat endpoints only, avoids 429 rate limits)
4. **Antigravity version override:** Forces `metadata.ideVersion` and `User-Agent` to `"1.23.2"` before forwarding
5. **Response tee:** Optionally collects response for debug dump files

---

## Handler Architecture

### `handlers/base.js` — Shared Infrastructure

**`fetchRouter(body, path, headers)`** — POSTs to `ROUTER_BASE + path` (default `http://localhost:20128`). Strips hop-by-hop headers (`host`, `content-length`, `connection`, `transfer-encoding`, `content-type`, `authorization`). Adds `Bearer $ROUTER_API_KEY` if configured.

**`pipeSSE(routerRes, res, dumper)`** — Direct SSE pass-through. Reads from `routerRes.body` (Web Streams API `ReadableStream`), writes to Node `res`. Optional dumper tees to debug file.

**`pipeTransformedSSE(routerRes, res, transformFn, state)`** — Parses SSE `data:` lines, calls `transformFn(parsedJSON, state)` per chunk, writes returned strings to client. Calls `transformFn(null, state)` at end for flush.

**`pipeTransformedEventStream(routerRes, res, transformFn, state)`** — Same as above but writes **binary `Uint8Array` frames** with `Content-Type: application/vnd.amazon.eventstream`. Used exclusively by Kiro.

### Handler Comparison

| Handler | Input Format | Output to 9Router | Response Format | Complexity |
|---------|-------------|-------------------|-----------------|------------|
| **Antigravity** | Gemini native (`body.request.contents`) | As-is to `/v1/chat/completions` (router auto-detects) | SSE pass-through | Low — relies on router's `antigravity↔openai` translators |
| **Copilot** | OpenAI-compatible (`/chat/completions`, `/v1/messages`, `/responses`) | Model replaced → matching path | SSE pass-through | Minimal — just model swap |
| **Kiro** | AWS CodeWhisperer JSON (`conversationState`) | Full conversion to OpenAI `messages[]` + `tools[]` | **Binary AWS EventStream** frames | High — CRC32, binary frame encoding, thinking extraction |
| **Cursor** | Binary protobuf | *(not implemented)* | *(not implemented)* | Stub — returns 501 |

---

## Kiro Handler — Deep Dive (Most Complex)

### Request path: CodeWhisperer → OpenAI


conversationState.history[] → messages[]
  userInputMessage:
    content → {role:"user", content}
    userInputMessageContext.toolResults[] → {role:"tool", tool_call_id, content}
  assistantResponseMessage:
    content → {role:"assistant", content}
    toolUses[] → tool_calls[] on assistant message

conversationState.currentMessage.userInputMessage.userInputMessageContext.tools[]
  toolSpecification.{name,description,inputSchema.json}
  → {type:"function",function:{name,description,parameters}


### Response path: OpenAI SSE → AWS EventStream binary

Each SSE `data:` chunk is parsed and converted via `convertOpenAIToKiro(chunk, state)`:

| OpenAI SSE field | EventStream frame type | Notes |
|-----------------|----------------------|-------|
| `delta.reasoning_content` | `reasoningContentEvent` | Direct thinking channel |
| `delta.content` with `