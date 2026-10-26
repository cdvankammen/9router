# 08 — Security Findings (v5-vscode-works)

**Branch**: `v5-vscode-works`
**Date**: 2026-10-26
**Host probed**: mini4:20129 (PID 49092, commit 5a62a892)
**Finder**: code review triggered by operator's mini2 probe session + vision-subagent security flags

---

## Finding #1 — CRITICAL: Unauthenticated remote shutdown via `/api/version/shutdown`

### Severity
**CRITICAL** — any network peer can kill the server with a single unauthenticated POST.

### Root cause
`src/app/api/version/shutdown/route.js` has no authentication gate:

```js
export async function POST() {
  try { await killAppProcesses(); } catch { /* best effort */ }
  const response = NextResponse.json({ success: true, message: "Shutting down for manual update..." });
  setTimeout(() => process.exit(0), 500);
  return response;
}
```

### Contrast with sibling routes
| Route | Auth gate | Status |
|---|---|---|
| `/api/shutdown` | JWT `auth_token` OR `x-9r-cli-token` + optional `SHUTDOWN_SECRET` + dev-only guard | ✅ Properly gated |
| `/api/version/update` | JWT OR CLI token + optional `UPDATE_SECRET` + timing-safe compare | ✅ Properly gated |
| `/api/version/shutdown` | **NONE** | 🔴 Wide open |

### Attack chain
```
curl -X POST http://<host>:20129/api/version/shutdown
→ 200 {"success":true}
→ server process exits 500ms later
```

Any LAN peer, any unauthenticated internet client if exposed, can DoS the proxy. The `killAppProcesses()` call also tears down cloudflared tunnels and MITM sidecars before exit, so the blast radius extends beyond the Next.js process itself.

### Proof
Operator probed `GET /api/version/shutdown` (should be 405), OPTIONS, and unauthed POST on mini4:20129 and mini2:20128 on 2026-10-26. Code review of `src/app/api/version/shutdown/route.js` confirms the route accepts any POST with no auth, no method restriction, no CSRF, no rate-limit differentiation.

### Fix
Mirror the `/api/shutdown` auth pattern:
- Require `x-9r-cli-token` (timing-safe) OR `auth_token` JWT
- Optional `SHUTDOWN_SECRET` second factor when env var set
- Reject in production builds if we want dev-only behavior (match `/api/shutdown`'s stance)
- Add explicit method guard so GET returns 405

---

## Finding #2 — HIGH: IDOR on `/api/keys/[id]` leaks raw API keys + ownerless mutation

### Severity
**HIGH** — these keys are exactly what 9Router exists to protect. An authenticated peer (any LAN user when `requireLogin=false`, any SSO user in multi-tenant deployments) can steal any key on the system by UUID, and can toggle/rename/revoke any key.

### Root cause
`src/app/api/keys/route.js` (list) correctly masks the `key` field:

```js
function maskKey(fullKey) {
  if (!fullKey || fullKey.length <= 10) return fullKey || "";
  return fullKey.slice(0, 6) + "\u2022".repeat(fullKey.length - 10) + fullKey.slice(-4);
}
// GET /api/keys
const maskedKeys = keys.map(k => ({ ...k, key: maskKey(k.key) }));
```

But `src/app/api/keys/[id]/route.js` (single-key) returns the raw key:

```js
export async function GET(request, { params }) {
  const { id } = await params;
  const key = await getApiKeyById(id);
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });
  return NextResponse.json({ key });  // ← raw key, no masking
}
```

PUT and DELETE on the same route have no owner check — they accept any authenticated session and operate on whatever UUID was in the URL.

### Attack chain
1. `GET /api/keys` → response includes full UUIDs (`b0c998da-e0a4-498d-a266-c81284c62f7e`); only the `key` field is masked.
2. `GET /api/keys/b0c998da-e0a4-498d-a266-c81284c62f7e` → response includes `"key": "sk-cb9c2fba45e06923-d3yviq-12f51a0b"` (full, unmasked).
3. Attacker now has the credential 9Router was protecting.

UUID secrecy is not a security boundary here because step 1 hands them out freely.

### Proof (live on mini4:20129, PID 49092, 2026-10-26)
```
$ curl -b cookie http://127.0.0.1:20129/api/keys
{"keys":[{"id":"b0c998da-e0a4-498d-a266-c81284c62f7e","key":"sk-cb9••••••••••••••••••••••••1a0b", ...}]}

$ curl -b cookie http://127.0.0.1:20129/api/keys/b0c998da-e0a4-498d-a266-c81284c62f7e
{"key":{"id":"b0c998da-...","key":"sk-cb9c2fba45e06923-d3yviq-12f51a0b", ...}}
```

Full key material exposed to any authenticated caller.

### Fix (Option A — minimal, backward-compat)
- Apply the same `maskKey()` to `GET /api/keys/[id]`
- Add `requireAuth` gate at top of PUT/DELETE to reject non-browser/non-session requests
- Dashboard continues to work because it receives the full key from `POST /api/keys` on creation and holds it in memory for the reveal/copy flow

### Fix (Option B — proper, follow-up)
- All of Option A, plus
- Scope every key operation to the current session's keys (owner-based access control)
- Add `POST /api/keys/[id]/reveal` with one-time token for the dashboard's copy-to-clipboard flow
- Audit other `[id]` routes (`/api/providers/[id]`, `/api/combos/[id]`, `/api/hooks/[id]`, `/api/messages/[id]`, `/api/skills/[id]`, `/api/proxy-pools/[id]`) for the same pattern

---

## Finding #3 — INFORMATIONAL: `dns` icon for Providers sidebar nav

Flagged by vision subagent (pre-fix). Cosmetic, not security. Deferred to follow-up UI polish PR.

## Finding #4 — INFORMATIONAL: Marketing links in admin sidebar

`9Remote HOT` (https://9remote.cc) and `9English` (https://9english.net/) in the admin sidebar. External promo links mixed into a security-sensitive console. Operator decision needed: keep, gate on `isRemoteHost`, or remove.

## Finding #5 — INFORMATIONAL: Path disclosure on profile page

`~/.9router/db/data.sqlite` rendered in the UI. Harmless on a single-tenant personal install, small information-disclosure on shared deployments.

---

## Remediation status

| # | Severity | Status | Commit |
|---|---|---|---|
| 1 | CRITICAL | ✅ FIXED — auth gate mirroring `/api/shutdown` | `16cd790d` |
| 2 | HIGH | ✅ FIXED — mask single-GET + auth gate on PUT/DELETE | `16cd790d` |
| 3 | INFO | Deferred (UI polish PR) | — |
| 4 | INFO | Awaiting operator decision | — |
| 5 | INFO | Deferred (UI polish PR) | — |

## Post-fix live proof (mini4:20129, PID 49663, 2026-10-26 01:02 MDT)

Six sequential curl probes against the rebuilt server with commit `16cd790d`:

### Finding #1 — `/api/version/shutdown` now gated

```
PROOF 1: GET /api/version/shutdown
→ HTTP/1.1 401 Unauthorized
   (middleware ALWAYS_PROTECTED gate rejects before route handler runs;
    route's own GET handler would return 405 — defense in depth)

PROOF 2: POST /api/version/shutdown (unauthed, body {})
→ {"error":"Unauthorized"}  http=401
```

Before the fix, PROOF 2 returned `{"success":true}` and the server exited 500ms later. Now it rejects with 401.

### Finding #2 — `/api/keys/[id]` IDOR closed

```
PROOF 3: POST /api/auth/login (fresh session)
→ {"success":true,"mustChangePassword":false}

PROOF 4: GET /api/keys (list, with auth cookie)
→ {"keys":[{"id":"b0c998da-e0a4-498d-a266-c81284c62f7e",
            "key":"sk-cb9••••••••••••••••••••••••1a0b", ...}]}
   (UUID exposed, key masked — as before)

PROOF 5: GET /api/keys/b0c998da-e0a4-498d-a266-c81284c62f7e (single, with auth)
→ {"key":{"id":"b0c998da-...",
          "key":"sk-cb9••••••••••••••••••••••••1a0b", ...}}
   (NOW MASKED ✅ — before the fix this returned
    "sk-cb9c2fba45e06923-d3yviq-12f51a0b" raw)

PROOF 6: DELETE /api/keys/b0c998da-e0a4-498d-a266-c81284c62f7e (no auth)
→ {"error":"Unauthorized"}  http=401
   (before the fix this would have deleted the key)
```

All six probes behave as designed. The IDOR leak and the unauthenticated shutdown vector are both closed in production.

### Test suite verdict

```
verify-no-regression.mjs: "✅ No regression. (now fails=54, baseline known=56, all known)"
Full vitest: 4612 pass / 54 fail (same baseline as pre-fix)
```

Zero regressions from either fix.

## Evidence chain
- Code review of `src/app/api/version/shutdown/route.js` (15 lines, no auth)
- Code review of `src/app/api/keys/[id]/route.js` (raw key return, no owner check)
- Code review of `src/app/api/keys/route.js` (masked list confirms maskKey helper exists)
- Code review of `src/app/api/shutdown/route.js` and `src/app/api/version/update/route.js` (the proper pattern to mirror)
- Live curl probe on mini4:20129 PID 49092 confirming IDOR
- mini2 status check 2026-10-26 00:54 MDT: launchd watchdog `com.9router.app` respawned PID 14934 (next-server v16.3.5) on :20128 after the earlier transient outage

---


---

## Post-Deploy Live Proof — Commits 10-12 on mini4:20129 (CORRECTED)

**Date:** 2026-10-26
**Build:** v5-vscode-works @ 7c611d7c deployed to mini4
**Server:** PID 72594, port 20129, standalone/custom-server.js
**Note:** This section replaces the earlier inaccurate version (commit 4edcd7f8).

### Environment
- `requireLogin: false` on mini4 (open-by-choice deployment)
- Login sets `auth_token` cookie via `Set-Cookie` header (not in JSON body)
- All authenticated requests use cookie-based auth

### Finding #3 — peerNodes URL validation (commit 5a3ab75d)

| Test | Input | Expected | Actual |
|---|---|---|---|
| Legit mDNS peer | `http://mini2-9.local:20128` | Accepted | ✅ `peerNodes: ['http://mini2-9.local:20128', 'http://192.168.1.189:20129']` |
| Legit RFC1918 peer | `http://192.168.1.189:20129` | Accepted | ✅ |
| Cloud metadata | `http://169.254.169.254/latest/meta-data/` | Rejected 400 | ✅ `error: Invalid peerNodes entry`, reason: `link-local` |
| Embedded creds | `http://user:pass@evil.com/` | Rejected 400 | ✅ `error: Invalid peerNodes entry` |
| Cleanup (empty array) | `[]` | 200 | ✅ `cleanup=200` |

### Finding #4 — __proto__/constructor/prototype hardening (commit f71b0d80)

| Test | Input | Expected | Actual |
|---|---|---|---|
| Inject `__proto__` + `evil_key` | `{smartRouter:{__proto__:{polluted:true},enabled:true,evil_key:...}}` | 200 but `__proto__` not own key | ✅ `inject=200`, `__proto__ own key: False`, `polluted: ABSENT` |
| `evil_key` persists (no XSS sink) | same | Present but inert | ✅ `evil_key present: True` (no rendering sink in dashboard) |
| Cleanup | `{smartRouter:{}}` | 200 | ✅ `cleanup=200` |

### Finding #5 — Link-local / cloud-metadata SSRF guard (commit 7c611d7c)

| Test | Input | Expected | Actual |
|---|---|---|---|
| Guard in compiled validate bundle | grep `link-local / cloud-metadata` | Present | ✅ Found in `.next/standalone/.next/server/app/api/providers/validate/route.js` |
| Guard in compiled server chunks | grep `.next/server/chunks/` | Present | ✅ Found in shared chunks `618.js`, `8556.js`, `9489.js` — the `[id]/test` route imports the guard via a shared chunk, so the marker is not in its own `route.js`. Also present in compiled `v1/web/fetch`, `v1/search`, `settings`, `provider-nodes/validate`, `cli-tools/cowork-mcp-tools`, `headroom/proxy` routes |
| Live SSRF via provider-nodes/validate (REMOTE) | `baseUrl=http://169.254.169.254/latest/meta-data`, `X-Forwarded-For: 8.8.8.8` | Blocked | ✅ `{"error":"URL not allowed"}` — guard fires for remote requests |
| Live SSRF via provider-nodes/validate (LOCAL) | same body, no XFF | Allowed (design) | ⚠️ `{"valid":false,"error":"Connection refused…"}` — fetch attempted, guard skipped. `isLocalRequest` (`src/dashboardGuard.js:140`) trusts **loopback peers only** via `isLoopbackPeer` → `isLoopbackHostname` on the `x-9r-real-ip` header (stamped by `custom-server.js` from the unspoofable TCP socket when the proxy hop is loopback). The local test worked because curl from mini4 localhost → socket IP `127.0.0.1` stamped as `x-9r-real-ip` → loopback check passes. RFC1918/CGNAT/Tailscale clients that connect directly (no loopback proxy) are NOT exempt |

**Code-level proof (unit tests):** 27/27 tests in `tests/unit/provider-ssrf-link-local.test.js` all pass, covering:
- Acceptance of Ollama/RFC1918/Tailscale/mDNS/HTTPS
- Rejection of AWS/GCP/Azure/ECS metadata + IPv6 link-local + IPv4-mapped forms
- Scheme + credentials + malformed URL rejection
- Async DNS-rebinding path

### Re-verification of prior fixes (commit 16cd790d)

| Test | Expected | Actual |
|---|---|---|
| GET /api/version/shutdown | 401 (auth-gated) | ✅ `GET_shutdown=401` |
| POST /api/version/shutdown unauthed | 401 | ✅ `POST_shutdown_unauthed=401` |
| GET /api/keys with auth | Masked keys | ✅ `sk-cb9•••••••••••••••••••••••••1a0b` and `sk-cb9•••••••••••••••••••••••••c148` |
| GET /api/keys/{id} (IDOR masking) | Masked key | ✅ Single-key GET returns `{'id': 'b0c998da-…', 'key': 'sk-cb9•••••••••••••••••••••••••1a0b', 'name': 'Default Key', …}` — masked, no plaintext secret |
| Server alive after probes | 200 | ✅ `health=200` |

### 16-page visual sweep (HTTP status)

All 16 dashboard pages return **200** post-deploy:
dashboard, providers, combos, usage, quota, token-saver, messages, endpoint,
profile, proxy-pools, skills, cli-tools, memory, model-context, statistics, translator

### DOM check (proxy-pools page)

Accessibility snapshot confirms:
- Sidebar renders correctly with all nav links
- Proxy Pools page heading present
- L2 Failover Proxy card shows "offline" (expected — no failover proxy running on mini4)
- Deploy Relay, Batch Import, Add Proxy Pool buttons present
- No JS errors in page load

### Honest accounting — what is and is not proven live

**Live-proven on mini4:20129 (PID 72594):**
1. peerNodes validation — legit peers accepted (incl. normalization), `169.254.169.254` rejected with reason `link-local` + structured `peerNodesValidation` error, embedded creds rejected, cleanup 200.
2. `__proto__`/`constructor`/`prototype` hardening — inject=200, `__proto__` not an own key, `polluted` ABSENT, `evil_key` present-but-inert, cleanup 200.
3. Shutdown auth gating — GET=401, POST unauthed=401, health=200 after probes.
4. Key masking on BOTH the list GET and the single-key GET (`/api/keys/{id}` → `sk-cb9•••••••••••••••••••••••••1a0b`).
5. SSRF guard present in the compiled build — `providers/validate/route.js` + shared chunks `618.js`, `8556.js`, `9489.js` (and six other compiled routes).

**All five findings are now live-proven.** The SSRF guard was proven end-to-end at the HTTP layer via `/api/provider-nodes/validate` (a remote request with `X-Forwarded-For: 8.8.8.8` was blocked with `URL not allowed`; a local request was permitted by design and attempted the fetch). Unit tests: 27/27 in `tests/unit/provider-ssrf-link-local.test.js`.

**SSRF design finding (for operator awareness):**
`isLocalRequest` in `src/dashboardGuard.js:140` exempts **loopback peers only** from the public-URL guard. The exemption relies on `custom-server.js` stamping `x-9r-real-ip` from the unspoofable TCP socket when the proxy hop is loopback; the `x-9r-via-proxy` header (stamped whenever any forwarding header was present) causes `isLocalRequest` to return false immediately, closing the XFF-injection bypass. Clients that connect directly from RFC1918/CGNAT/Tailscale addresses without a loopback reverse proxy are NOT exempt and go through the guard. This is a deliberate trust decision: the local operator at the machine (or behind a loopback proxy) may configure LAN model hosts (Ollama at localhost:11434, vLLM behind a local nginx). The guard protects against remote/public attackers and attacker-controlled XFF injection. The `169.254.169.254` link-local range is separately blocked by `assertNotLinkLocal` in `src/shared/utils/ssrfGuard.js` for the provider-create path (commit 7c611d7c), providing defense-in-depth even if the public-URL guard were bypassed.

**Caveats:**
- mini4 runs with `requireLogin:false`, so PROTECTED_API_PATHS pass through unauthenticated; the 401s above come from the middleware's ALWAYS_PROTECTED gate, which applies regardless of that setting.
- Login sets `auth_token` via `Set-Cookie` only (no token in the JSON body) — scripts must use a cookie jar.

---

## Finding #6 — Clickjacking: no `X-Frame-Options` / CSP `frame-ancestors` on any response

**Date found:** 2026-10-26 (operator probe pages `W360-Clickjacking-Proof` + `w373_attacker_page.html`)
**Fixed:** commit `b1f9f1b6` (`fix(security): add clickjacking protection + security headers at socket layer`)

### Severity
**HIGH** — the dashboard (including the login page that prints "Default password is `123456`") renders inside an attacker-controlled cross-origin iframe, enabling UI-redress/clickjacking against any operator who visits a malicious page while the gateway is reachable.

### Root cause
No response emitted `X-Frame-Options` or `Content-Security-Policy: frame-ancestors`. The only framing-related code in the repo was `src/lib/mimoLoginSession.js:650`, which *deletes* an upstream `x-frame-options` header when proxying the MiMo login flow — the codebase actively stripped framing protection in one path and never added it anywhere else.

### Fix (commit `b1f9f1b6`)
`custom-server.js` now injects four security headers on every response at the socket layer (dashboard HTML, API JSON, static assets):
- `X-Frame-Options: SAMEORIGIN`
- `Content-Security-Policy: frame-ancestors 'self'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

The wrapper sets these defaults before the Next handler runs; a route that sets the same header name later replaces the value (standard `res.setHeader` last-write-wins semantics).

### Proof — CODE layer
- `grep -c X-Frame-Options` on the deployed `custom-server.js` shows the markers present on both mini4 instances.
- Regression suite re-run: **4212 pass / 54 fail** (baseline known=56) — no regressions. Note `custom-server.js` itself is not unit-tested; it is proven by the live header + iframe checks below.

### Proof — HTTP layer (SSH + localhost curl, authoritative — dev-side curl to these hosts was unreliable)
| Host:port | Path | Result |
|---|---|---|
| mini4 :20129 (standalone v5, PID 76011) | `/login` | ✅ 200 + `X-Frame-Options: SAMEORIGIN` + `CSP: frame-ancestors 'self'` |
| mini4 :20128 (tray v0.5.109, PID 75883) | `/login` | ✅ same headers |
| mini4 :20129 | `/api/health`, `/dashboard/settings`, `/favicon.ico` | ✅ all four headers |

### Proof — DOM/VISUAL layer (browser A/B, same attacker `data:`-origin page + identical iframe sandbox attrs)
- **Target mini4 (`192.168.1.189:20129`):** iframe **BLOCKED**. Console: `Framing 'http://192.168.1.189:20129/' violates the following Content Security Policy directive: "frame-ancestors 'self'". The request has been blocked.` + `net::ERR_BLOCKED_BY_RESPONSE`. Frame rendered empty (no login UI in the accessibility snapshot).
- **Target real mini2 (`mini2:20128`):** iframe **STILL RENDERS** the login UI (9Router heading, "Sign in with OIDC" button, password textbox, "Default password is `123456`") → **real mini2 remains vulnerable** (see topology correction below).

### ⚠️ Topology correction — an earlier "mini2 upgrade" hit the wrong machine
- `192.168.1.189` and `100.76.147.49` are **the same box (`Mac.lan`) = mini4**.
- The hostname `mini2` resolves via Tailscale DNS to `mini2.local` @ **100.96.109.61 — a different machine (the real mini2)**.
- The earlier rsync/`launchctl` "mini2 upgrade" therefore upgraded **mini4's own tray/npm-global instance** (:20128, PID 75883, now v0.5.109 with headers) — not the real mini2. The backup dir was renamed `/tmp/9r-mini2-app-backup-pre-v5` → `/tmp/9r-maclan-tray-app-backup-pre-v5` to reflect this.

### Real mini2 — FIXED (2026-10-26 deploy)
- Host: `mini2.local` @ `100.96.109.61` (Tailscale)
- Server: **PID 83773**, `next-server (v16.4.3)` (v5 build), cwd `/Applications/9Router.app/Contents/Resources/app/app`
- BUILD_ID: `y69i2xp4j4quIeXrUM35w` (matches staged v5 build)
- Launcher PID 80692 (`cli.js --tray --port 20128`) still alive; supplies `JWT_SECRET` (read from `~/.9router/jwt-secret`, 64 hex chars) and `NEXT_DIST_DIR` via `buildEnvWithRuntime(process.env)` in `cli.js:641`
- **All 4 clickjacking headers now emitting** on `/login`, `/dashboard/settings`, `/api/health`, `/favicon.ico`
- Backup of pre-fix v0.5.75 bundle at `/tmp/9r-real-mini2-app-backup-pre-v5`
- Shutdown gate regression check: `GET /api/version/shutdown` = 401, `POST unauthed` = 401 ✅

### Proof — mini2 iframe block (same attacker page, post-fix)
Browser A/B with identical `data:`-origin iframe + sandbox attrs targeting `http://mini2:20128/dashboard/endpoint`:
- Console: `Framing 'http://mini2:20128/' violates the following Content Security Policy directive: "frame-ancestors 'self'". The request has been blocked.` + `net::ERR_BLOCKED_BY_RESPONSE`
- Accessibility snapshot: iframe rendered **empty** (no 9Router login UI, no OIDC button, no password box, no "Default password is 123456" leak)
- **Clickjacking finding is now CLOSED on both mini4 and mini2**

### Deploy mechanics learned (for future bundle upgrades)
1. The packaged `cli.js` spawns the server via `spawnServer()` (cli.js:633) with `cwd: standaloneDir` (= `path.join(__dirname, "app")` per cli.js:551) and env from `buildEnvWithRuntime(process.env)` plus `PORT`/`HOSTNAME`.
2. The standalone `server.js` has `distDir: "./.next"` baked in at build time — so the build dir must be named `.next` regardless of what `NEXT_DIST_DIR` was during the build (the CLI build script uses `.next-cli-build` for its own builds, but our mini4-built standalone expects `.next`).
3. `JWT_SECRET` is supplied by the launcher from `~/.9router/jwt-secret`; a manual `nohup node custom-server.js` without that env var fails with `JWT_SECRET is required in production` at middleware load. To start manually: `export JWT_SECRET=$(cat ~/.9router/jwt-secret)`.
4. The launcher's self-heal (`cli.js:934, 949`) will respawn the server when the server PID dies — killing only the server (not the launcher) triggers a respawn with correct env.

---

## Finding #7 — IDOR / broken-access-control on `/api/[id]` routes (open deployments)

**Date found:** 2026-10-26 (subagent read-only audit)
**Severity:** CRITICAL (cascading delete) + HIGH (multiple admin mutations reachable unauthenticated)
**Status:** DOCUMENTED — fixes pending implementation

### Root cause
The middleware in `src/dashboardGuard.js` classifies routes as **ALWAYS_PROTECTED** (JWT required regardless of `requireLogin`) or **PROTECTED_API_PATHS** (auth required, but `isAuthenticated()` returns `true` for everyone when `settings.requireLogin === false` — `dashboardGuard.js:201-205`). Many mutating admin endpoints land in the latter class. Any deployment that runs with `requireLogin:false` (the documented default, confirmed active on mini4 during the prior proof round) exposes these routes to **every network peer**.

Only `/api/keys/[id]` (PUT/DELETE) and the `/api/messages/[id]/*` family have route-level `requireAuth()` as defence-in-depth. Every other `[id]` route relies solely on the middleware class.

### Findings (severity order)

| Route | Method | Middleware | Route-level auth | Risk (requireLogin=false) | File:line |
|---|---|---|---|---|---|
| `/api/provider-nodes/[id]` | DELETE | PROTECTED | none | **CRITICAL** — cascades `deleteProviderConnectionsByProvider(id)` then `deleteProviderNode(id)`: one unauthenticated request deletes **every connection bound to the node** | `provider-nodes/[id]/route.js:113-128` |
| `/api/provider-nodes/[id]` | PUT | PROTECTED | none | HIGH — mutates node and propagates to every connection using it (`Promise.all(connections.map(updateProviderConnection))`) | `provider-nodes/[id]/route.js:94-108` |
| `/api/providers/[id]` | DELETE | PROTECTED | none | HIGH — delete any connection by UUID | `providers/[id]/route.js:180-194` |
| `/api/providers/[id]` | PUT | PROTECTED | none | HIGH — rewrite any connection (name, baseUrl, proxyPool, isActive, providerSpecificData) | `providers/[id]/route.js:85-176` |
| `/api/providers/[id]/test` | POST | PROTECTED | none | HIGH — forces server outbound using stored credentials of any connection (credential use + SSRF-via-stored-config) | `providers/[id]/test/route.js:5-19` |
| `/api/providers/[id]/overrides` | PUT | PROTECTED | none | HIGH — writes to **global** `settings.providerOverrides` via `updateSettings`; any peer injects headers sent on every user's upstream requests | `providers/[id]/overrides/route.js:85-99` |
| `/api/combos/[id]` | PUT / DELETE | PROTECTED | none | HIGH — rewrite or delete any combo | `combos/[id]/route.js:24-74` |
| `/api/proxy-pools/[id]` | PUT / DELETE | PROTECTED | none | HIGH — rewrite or delete any proxy pool (traffic tunnel destination) | `proxy-pools/[id]/route.js:72-120` |
| `/api/proxy-pools/[id]/test` | POST | PROTECTED | none | HIGH — outbound GET to stored `proxyPool.proxyUrl` (SSRF-with-stored-config) | `proxy-pools/[id]/test/route.js:39-71` |
| `/api/hooks` | POST | PROTECTED | URL scheme only | HIGH — outbound POST to attacker-controlled URL with captured message content (SSRF + data exfiltration) | `hooks/route.js:48-66` |
| `/api/providers/[id]/models` | GET | PROTECTED | none | MED/HIGH — triggers outbound calls using stored OAuth/API-key credentials (`refreshGoogleToken`, `refreshCodexToken`) to enumerate models | `providers/[id]/models/route.js` |
| `/api/providers/[id]` | GET | PROTECTED | none | MED — leaks connection config (providerSpecificData, proxy settings, pool bindings) | `providers/[id]/route.js:71-81` |
| `/api/proxy-pools/[id]` | GET | PROTECTED | none | MED — leaks proxy URL (may embed creds) | `proxy-pools/[id]/route.js:58-69` |
| `/api/keys/[id]` | GET | PROTECTED | none (but response masked) | LOW-MED — UUID + metadata leak; `maskKey()` intact at `keys/[id]/route.js:54-62` ✓ | `keys/[id]/route.js:54-62` |
| `/api/keys/[id]` | PUT / DELETE | PROTECTED | **YES** `requireAuth()` | LOW — defence-in-depth from commit `16cd790d` intact at `:66-68` and `:92-94` ✓ | `keys/[id]/route.js:66-68, 92-94` |
| `/api/messages/[id]/*` | all | **ALWAYS_PROTECTED** ✓ | none | LOW — JWT enforced regardless of `requireLogin` | `dashboardGuard.js:58` |

### Verification of prior fix
Commit `16cd790d` (IDOR on `/api/keys/[id]`) is **intact and correctly implemented**: `maskKey()` applied on GET and PUT response; `requireAuth()` enforced on PUT and DELETE with timing-safe comparison. The remaining gap is that `/api/keys` is in PROTECTED_API_PATHS rather than ALWAYS_PROTECTED — route-level `requireAuth` is the only protection on open deployments.

### Fixes — IMPLEMENTED

1. ✅ **Middleware promotion** (commit `24f497b6`) — `/api/providers`, `/api/provider-nodes`, `/api/proxy-pools`, `/api/combos`, `/api/keys`, `/api/hooks` moved from `PROTECTED_API_PATHS` → `ALWAYS_PROTECTED` in `src/dashboardGuard.js`. JWT now required regardless of `requireLogin` setting.

2. ✅ **Route-level `requireAuth` defence-in-depth** (commit `1ebed4fc`):
   - NEW shared helper `src/lib/auth/requireAuth.js` — accepts JWT `auth_token` cookie OR `x-9r-cli-token` header, timing-safe comparison on CLI token.
   - `DELETE /api/provider-nodes/[id]` — CRITICAL cascading delete now auth-gated.
   - `PUT /api/provider-nodes/[id]` — propagates to all bound connections, now auth-gated.
   - `POST /api/providers/[id]/test` — SSRF-via-stored-credentials, now auth-gated.
   - `POST /api/providers/[id]/test-models` — fans out with stored OAuth/API-key, now auth-gated.
   - `PUT /api/providers/[id]/overrides` — writes GLOBAL settings, now auth-gated.
   - `POST /api/proxy-pools/[id]/test` — SSRF-with-stored-config, now auth-gated.
   - Refactored `keys/[id]/route.js` to import the shared helper (removed duplicated logic).

3. ✅ **Tests + lint** — 4209 pass / 50 fail (baseline known=56, no regression). Lint clean on all 7 edited files.

4. ✅ **Deployed to mini4 :20129** (PID 81439) and real mini2 :20128 — `Unauthorized` marker confirmed in compiled route bundles (`provider-nodes/[id]`, `providers/[id]/test`, `proxy-pools/[id]/test`).

### Remaining follow-ups (not yet implemented)

- **Confirmation token / soft-delete** on `DELETE /api/provider-nodes/[id]` — `requireAuth` blocks unauthed callers, but an authenticated admin could still trigger the cascading delete accidentally. A `X-Confirm-Cascade: true` header gate or soft-delete would add a second friction layer.
- **`POST /api/messages/[id]/actions`** — lives under ALWAYS_PROTECTED (good), but `replay` and `send-to-webhook` ride stored creds. Add explicit `requireAuth()` for defence-in-depth.
- **`POST /api/hooks`** — promoted to ALWAYS_PROTECTED but still an outbound POST with captured message content; consider a URL allow-list or scheme+host validation beyond `http(s)`.
- **`/api/keys` GET enumeration** — UUID+metadata leak on open deployments. Low severity; consider promoting to ALWAYS_PROTECTED.
