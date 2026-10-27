 "# Per-PR Security Review — v5-vscode-works (2026-10-26)

**Branch:** `v5-vscode-works` @ `2c3c5998` (27 commits on origin, 0/286 behind)
**Scope:** Upstream commits touching security-relevant paths (176 total identified).
**Method:** Per-commit diff read, cross-reference against our 26 hardening commits, integration verification.

---

## Commit 1: `92259214` — GHSA-pjm4-8fpg-f9p6 (CVE-level)

**Date:** 2026-08-14
**Author:** Nguyen Thanh Dat
**Subject:** fix(security): require proof that x-9r-real-ip came from the socket

### What upstream fixed
A remote caller could spoof `x-9r-real-ip` and the `Host` fallback header to
pose as localhost when `custom-server.js` was not in the request path (i.e.,
bare `npm run start` or `start:bun` before the fix). This let them bypass API
key auth and reach LOCAL_ONLY_PATHS (`/api/mcp/*`, `/api/tunnel/enable`,
`/api/auth/reset-password`).

**The fix:** `custom-server.js` now generates a per-process 48-hex-char secret
(`PEER_TOKEN = crypto.randomBytes(24).toString("hex")`) at boot and sets it as
`process.env.NINEROUTER_PEER_TOKEN`. It stamps the same value as
`x-9r-peer-token` on every request it sanitizes. `hasTrustedPeerHeaders()` in
`src/lib/auth/trustedPeer.js` gates trust in `x-9r-real-ip` on that secret.

**Also fixed:** IPv6 bug in `isLoopbackHostname` — old `split(":")[0]` reduced
`::ffff:127.0.0.1` to empty string.

### Files changed upstream (12 files)
- `cli/scripts/build-cli.js` — hard fail if custom-server.js missing
- `custom-server.js` — PEER_TOKEN generation + header stamping
- `package.json` — start/start:bun route through custom-server.js
- `scripts/copy-standalone-assets.mjs` — copy custom-server.js to standalone
- `src/dashboardGuard.js` — `hasTrustedPeerHeaders` import, `isLoopbackPeer`
- `src/lib/auth/loginLimiter.js` — gate getClientIp on trusted peer
- `src/lib/auth/trustedPeer.js` — NEW shared module
- `src/lib/db/repos/requestDetailsRepo.js` — export sanitizeHeaders for tests
- `tests/unit/custom-server-peer-headers.test.js` — NEW
- (2 more test files)

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `24f497b6` Finding #7 middleware promotion | Touches same `dashboardGuard.js` ALWAYS_PROTECTED array | ✅ CLEAN — our additions are below the peer-trust code, no conflict |
| `f7a641d3` timing-safe CLI token | Different auth primitive (CLI token vs peer token) | ✅ CLEAN — separate concerns |
| `1ab270ef` test regression fixes | Middleware test uses `PEER_TOKEN` fixture correctly | ✅ INTEGRATED |
| All 13 routes we gated | Rely on `isLocalRequest()` which uses `hasTrustedPeerHeaders` | ✅ INTEGRATED — our gates work correctly BECAUSE this upstream fix is in place |

### Integration verification (2026-10-26)
- ✅ `src/lib/auth/trustedPeer.js` exists with correct `hasTrustedPeerHeaders`
- ✅ `src/dashboardGuard.js:5` imports it, `:155` uses it in `isLoopbackPeer`
- ✅ `src/lib/auth/loginLimiter.js:2,52` uses it
- ✅ `custom-server.js:14` sets `NINEROUTER_PEER_TOKEN`
- ✅ IPv6 `::ffff:` handling in `isLoopbackHostname` (verified in current file)
- ✅ `tests/unit/custom-server-peer-headers.test.js` exists
- ✅ `tests/unit/local-request-peer-trust-3294.test.js` exists (regression test for peer trust)
- ✅ `tests/unit/middleware.test.js:75` sets PEER_TOKEN fixture

### Conclusion
**FULLY INTEGRATED.** No conflicts with our work. This upstream fix is a
foundational dependency — our Finding #7 route-level requireAuth gates work
correctly on deployed builds BECAUSE this peer-token mechanism is in place.
Without it, a remote attacker could spoof localhost and bypass every ALWAYS_PROTECTED
gate on `requireLogin=false` deployments.

---

## Commit 2: `98579f98` — protect root /responses rewrite

**Date:** 2026-09-03
**Author:** Sutarto Jordan Chrisfivo
**Subject:** fix(auth): protect root /responses rewrite

### What upstream fixed
Added `/responses` to `PUBLIC_PREFIXES` in `dashboardGuard.js` so pre-rewrite
remote requests require API key validation. Before this fix, a remote client
could hit `/responses` (the new OpenAI Responses API endpoint) without an API
key, because middleware runs BEFORE Next.js rewrites it to `/api/v1/responses`.

### Files changed upstream (2 files)
- `src/dashboardGuard.js` — add "/responses" to PUBLIC_PREFIXES
- `tests/unit/dashboard-guard.test.js` — 2 new test cases

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `24f497b6` Finding #7 middleware promotion | Both touch `dashboardGuard.js` | ✅ CLEAN — our additions are to ALWAYS_PROTECTED array, theirs is PUBLIC_PREFIXES |
| `f7a641d3` route-level requireAuth | None — this is about PUBLIC_PREFIXES (public LLM API), not ALWAYS_PROTECTED | ✅ CLEAN |

### Integration verification (2026-10-26)
- ✅ `src/dashboardGuard.js:49` has `"/responses"` in PUBLIC_PREFIXES (6 entries total: `/v1`, `/v1beta`, `/api/v1`, `/api/v1beta`, `/codex`, `/responses`)
- ✅ Test file `tests/unit/dashboard-guard.test.js` includes the 2 new tests

### Conclusion
**FULLY INTEGRATED.** Trivial additive fix, no conflict with our work.

---

## Running CSV of analyzed upstream commits

| Commit | Date | Subject | Intersection | Status | Notes |
|---|---|---|---|---|---|
| `92259214` | 2026-08-14 | GHSA-pjm4-8fpg-f9p6 peer-token | HIGH — foundational | INTEGRATED | Dependency for our Finding #7 gates |
| `98579f98` | 2026-09-03 | /responses rewrite | LOW | INTEGRATED | Trivial additive |

## Upstream commits still to review (priority queue)

| Commit | Date | Subject | Priority |
|---|---|---|---|
| `38a0c449` | 2026-10-22 | web-cookie: browser pool + login capture | HIGH — new credential capture surface |
| `65197ad1` | 2026-08-13 | SAML 2.0 SSO | HIGH — new auth protocol |
| `f172c3c4` | 2026-10-23 | antigravity hub UA + Gemini 4 Argon | LOW — model registry |
| `a9d0ad26` | 2026-10-08 | AWS Bedrock + SSO credentials | MEDIUM — credential handling |
| `ef181752` | 2026-09-17 | Zed OAuth lifecycle hardening | HIGH — OAuth |
| `628ff1ea` | 2026-09-09 | 24h maxAge for dashboard cookie | MEDIUM — session |
| `6af26a9e` | 2026-09-23 | Lossless header forwarding for relay pools | MEDIUM — header leakage |
| `2aa9307f` | 2026-10-15 | Per-key token quotas + pattern access | MEDIUM — auth/authz |
| `6ed88685` | 2026-10-15 | Revert per-key quotas | MEDIUM — what broke? |
| `d8c585fb` | 2026-10-07 | Per-API-key access control (combos/models) | MEDIUM — authz |

---

## Commit 3: `38a0c449` — web-cookie browser pool + login capture (HIGH)

**Date:** 2026-10-22
**Author:** decolua (co-authored with Claude Code)
**Subject:** feat(web-cookie): add web provider executors, browser pool and login capture

### What upstream added
A new credential primitive: **real browser cookies captured via an embedded Playwright session and stored as provider connection credentials**. Six new "web" providers (deepseek-web, gemini-web, muse-web, chatgpt-web, uc-web, veoaifree-web), plus grok-web gaining Imagine image/video via a TLS-impersonating client (wreq-js) because grok.com rejects Node's TLS fingerprint.

**Shared infrastructure introduced:**
- `open-sse/services/browserPool.js` — warm Chromium context per isolation key, Obscura → cloakbrowser → Chromium engine preference, idle/TTL eviction, lifecycle metrics
- `open-sse/executors/browserExecutableCheck.js` — system Chrome discovery, launch-with-fallback (avoids ~360MB playwright-core chromium download)
- `open-sse/services/webLogin.js` — start/poll/cancel login flow that captures cookies
- `open-sse/services/webLoginConfig.js` — per-provider token requirements
- `open-sse/utils/webCookieAuth.js` — cookie-input normalization
- `open-sse/services/browserProfileCache.js` — per-profile cache pruning
- `src/app/api/providers/web-login/route.js` — API for dashboard to trigger capture
- `src/app/(dashboard)/.../WebLoginButton.js` — UI button

### Files changed (60+ files)
Key security-surface files:
- `open-sse/services/webLogin.js` (244 lines NEW)
- `open-sse/services/browserPool.js` (~500 lines NEW)
- `open-sse/services/webLoginConfig.js` (86 lines NEW)
- `open-sse/utils/webCookieAuth.js` (185 lines NEW)
- `open-sse/services/browserProfileCache.js` (86 lines NEW)
- `src/app/api/providers/web-login/route.js` (API route)
- 6 new executor files (chatgpt-web, gemini-web, muse-web, deepseek-web, uc-web, veoaifree-web)

### Integration verification (2026-10-26)
- ✅ `browserPool.js` exists in `open-sse/services/` (grep: 34 matches in 9 files)
- ✅ `webLogin.js` exists with `startWebLogin`, `getWebLoginStatus`, `cancelWebLogin`, `listWebLoginProfiles`
- ✅ `webLoginConfig.js` exists with `getWebLoginConfig`, `listWebLoginProviders`
- ✅ `webCookieAuth.js` exists with `toPlaywrightCookies`, `extractCookieValue`, `normalizeSessionCookieHeader`, `buildGrokCookieHeader`
- ✅ `src/app/api/providers/web-login/route.js` imports from `open-sse/services/webLogin.js` and `webLoginConfig.js`
- ✅ Dashboard UI button exists at `src/app/(dashboard)/dashboard/providers/components/WebLoginButton.js`

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `1ebed4fc`/`f7a641d3` requireAuth on `/api/providers/[id]/*` | Web-login creates provider connections via the same `/api/providers` POST route; our gate protects it | ✅ INTEGRATED — web-login API goes through our new requireAuth |
| `27ff0cfa` requireAuth on `/api/messages/[id]/actions` | No intersection — actions route doesn't call web executors | ✅ CLEAN |
| `16cd790d` IDOR on `/api/keys/[id]` | No intersection — web-login stores cookies in provider-specific data, not API keys | ✅ CLEAN |
| `b1f9f1b6` clickjacking headers | Web-login iframe/redirect patterns may need CSP review | ⚠️ REVIEW — see findings below |

### Security concerns (need follow-up)

**CONCERN 1 (MEDIUM): Cookie storage location**
Where exactly does `webLogin.js` persist captured cookies? The commit message mentions "per-profile cache pruning" but the storage backend needs verification:
- If stored in SQLite `providerSpecificData`: covered by our existing requireAuth gates on `/api/providers/[id]` PUT/DELETE
- If stored on filesystem (e.g., `~/.9router/web-login-profiles/`): needs file permission audit (0600?)
- Need to check: is there a route to bulk-export these captured cookies?

**CONCERN 2 (MEDIUM): Browser pool isolation**
`browserPool.js:41` shows `createBrowserPoolMetrics()` — the pool uses "isolation keys" per provider. Questions:
- Can one web-login session's cookies leak into another provider's executor?
- Does the pool respect `DATA_DIR` for profile storage?
- Is there a cleanup path when a connection is deleted (does `DELETE /api/providers/[id]` remove the browser profile too)?

**CONCERN 3 (LOW): TLS impersonation (wreq-js)**
grok-web uses `wreq-js` to impersonate a browser TLS fingerprint. This is a cat-and-mouse pattern that can break silently. Not a security bug, but a reliability/maintenance concern.

**CONCERN 4 (LOW): Claude Code co-authorship**
Commit message includes `Co-Authored-By: Claude Code <noreply@anthropic.com>`. This is one of the commits your directive specifically flags for "is this code original" scrutiny in the auto-rewrite pass. The bulk of the file content looks like real integration work (60+ files, coherent architecture), but the co-author tag should be in the CSV for the later auto-rewrite audit stage.

### Conclusion
**FULLY INTEGRATED but needs follow-up scrutiny.** The new credential primitive (captured browser cookies) is now a real part of the deployed system. Three medium-priority review items:
1. Verify cookie storage location + file permissions
2. Verify cross-provider isolation in browserPool
3. Verify cleanup on connection delete

These belong in the follow-up work list, not as blocking issues for the v5 hardened baseline.

---

## Running CSV of analyzed upstream commits

| Commit | Date | Subject | Intersection | Status | Notes |
|---|---|---|---|---|---|
| `92259214` | 2026-08-14 | GHSA-pjm4-8fpg-f9p6 peer-token | HIGH — foundational | INTEGRATED | Dependency for our Finding #7 gates |
| `98579f98` | 2026-09-03 | /responses rewrite | LOW | INTEGRATED | Trivial additive |
| `38a0c449` | 2026-10-22 | web-cookie browser pool | HIGH — new credential primitive | INTEGRATED + 3 follow-ups | Cookie storage, pool isolation, cleanup |

**Total security-relevant upstream commits identified: 176 + 17 new = 193**
**Reviewed so far: 3**
**Remaining: 190 (prioritized above for security surface)**

---

## Resync event — 2026-10-26 (merge `e652b20f`)

While the audit was in progress, origin/master advanced by 17 commits. Resynced via merge (not rebase) to preserve the 29 deployed hardening commit SHAs and the BUILD_ID (`nR20fJizbrymthVDzwCLU`) both mini4 and mini2 are currently running.

### Merge result
- **Zero conflicts** — our 29 hardening commits touched auth/middleware/route-gate layers; upstream's 17 commits touched translator/executor/provider-registry layers.
- **Post-merge test suite:** 4209 pass / 54 fail (baseline 56) — **no regression**.
- **Both hosts live and healthy** (`mini2=200 mini4=200`) throughout.
- **Branch state after merge:** 30 commits ahead of origin (29 hardening + 1 merge), 0/290 behind.

### Triage of the 17 new upstream commits

| Commit | Subject | Security relevance | Intersection with v5 hardening |
|---|---|---|---|
| `3a978a63` | v0.5.111 release notes | LOW | None |
| `483c10f5` | opencode fingerprint tool normalization | LOW | Translator layer |
| `95009651` | translator: image_url → Claude images | MEDIUM (content sanitization) | Translator, not auth |
| `10cd6c08` | Ollama embeddings adapter | LOW | None |
| `50dcaa0c`, `72cb589e` | cli-tools Pi model caps | LOW | None |
| `5cd4a756`, `a3bdaf6d` | Kimi K3.1 Pro catalog | LOW | None |
| `b9c27225` | Runcrate provider (OpenAI-compat) | LOW | Registry only |
| `31a9d262`, `fbac1220` | Ollama TTS + codex-image | LOW | None |
| `2924e055`, `1da5b0d7` | deepseek-v4.1-flash fixes | LOW | None |
| `763fb687`, `0ad0a722` | thinking-effort fixes | LOW | None |
| `86adae35` | headroom Claude PDFs + tool history | MEDIUM (round-trip via translators) | Translator layer |
| `ce060c79` | opencode free tier TLS client Hello | LOW | None |

**Zero conflicts with any of our 29 hardening commits.** None touched `dashboardGuard.js`, `requireAuth.js`, or any route we gated.

### New finding: OAuth callback proxy port binding — AUDITED ✅

During this session a port scan was run against mini2 ports 20131–20140 looking for OAuth callback proxies that start on demand. This triggered a code-level audit of `src/lib/oauth/utils/server.js` (the single file that owns all OAuth callback listeners).

**Result: ALL OAuth callback servers bind explicitly to `127.0.0.1`** — the LAN-intercept vector is **NOT present**.

Every `server.listen()` call in the file uses the loopback address:
- Line 80: `server.listen(portToUse, "127.0.0.1", ...)`  (generic OAuth)
- Line 268: `server.listen(CODEX_PORT, "127.0.0.1", ...)`  (Codex fixed port)
- Line 410: `server.listen(XAI_PROXY_PORT, "127.0.0.1", ...)`  (xAI fixed port)
- Line 525: `server.listen(0, "127.0.0.1", ...)`  (Trae dynamic)
- Line 624: `server.listen(0, "127.0.0.1", ...)`  (Windsurf dynamic)
- Line 763: `server.listen(0, "127.0.0.1", ...)`  (Zed dynamic)

Plus `XAI_REDIRECT_URI` at `src/lib/oauth/constants/xai.js:27` hardcodes `127.0.0.1:56121`, and every other provider's `redirectUri` is built as `http://localhost:<port>/callback` (which resolves to 127.0.0.1 in all modern OS DNS stacks).

**A LAN peer on the same subnet CANNOT intercept OAuth callbacks** — the TCP bind is loopback-only. No fix needed. Closing this audit item as resolved.

---

## Follow-up work queue (from per-PR findings)

| Item | Source commit | Priority | Effort |
|---|---|---|---|
| Audit webLogin cookie storage location + file permissions | `38a0c449` | MEDIUM | 30 min |
| Verify browserPool cross-provider isolation | `38a0c449` | MEDIUM | 30 min |
| Verify cookie cleanup on `DELETE /api/providers/[id]` | `38a0c449` | MEDIUM | 20 min |
| ~~Audit OAuth callback proxy port binding~~ | live scan 2026-10-26 | ✅ **RESOLVED** | — (all bind 127.0.0.1) |
| Flag `38a0c449` for auto-rewrite audit (Claude Code co-author) | `38a0c449` | LOW | 5 min |

---

## Commit 4: `65197ad1` — SAML 2.0 SSO integration (HIGH)

**Date:** 2026-08-13
**Author:** Duc Nguyen (Ekino)
**Subject:** feat(auth): add native SAML 2.0 SSO integration

### What upstream added
SAML 2.0 as a **second SSO protocol alongside OIDC** under a unified `authMode`/`ssoType` model. SP flows via `@node-saml/node-saml`: AuthnRequest generation, ACS POST assertion handling, SP metadata export, and admin config test endpoint.

**Security properties:**
- Replay-protected via `saml_state` cookie (httpOnly, SameSite=Lax) matched against `InResponseTo`
- `wantAssertionsSigned` enforced at the SAML library level
- Uses `loginLimiter` (checkLock / recordFail / recordSuccess / getClientIp) on the ACS route
- Settings keys added: `ssoType`, `samlEntryPoint`, `samlIssuer`, `samlCert`

### Files changed (17 files, 1386 insertions)
- `src/lib/auth/saml.js` (268 lines NEW) — SAML instance builder, X.509 cert formatter, claim pickers
- 4 new routes: `src/app/api/auth/saml/{start,acs,metadata,test}/route.js`
- `src/lib/db/repos/settingsRepo.js` — ssoType + saml* defaults
- `src/app/api/auth/login/route.js` — dispatch by type
- `src/app/api/auth/status/route.js` — SAML badge data
- `src/app/login/page.js` — dynamic SAML sign-in button
- `src/app/(dashboard)/dashboard/profile/page.js` — SSO protocol switcher, IdP metadata XML + cert uploaders
- `src/shared/components/Header.js` — SAML user badge
- `tests/auth/saml.test.js`, `tests/unit/saml.test.js` — test coverage
- `src/dashboardGuard.js:42` — added `/api/auth/saml` to `PUBLIC_API_PATHS` (SAML routes need unauthenticated access for the IdP redirect flow)

### Integration verification (2026-10-26)
- ✅ `src/lib/auth/saml.js` exists with `formatX509Certificate`, `isSamlConfigured`, `getSamlRuntimeConfig`, `createSamlInstance`, `getSamlBaseUrl`, `buildSamlAuthorizeUrl`, `validateSamlResponse`, `pickSamlEmail`, `pickSamlDisplayName`, `generateSamlMetadata`
- ✅ 4 routes exist under `src/app/api/auth/saml/`
- ✅ `src/dashboardGuard.js:42` has `"/api/auth/saml"` in `PUBLIC_API_PATHS`
- ✅ 126 matches across 10 files for SAML-related symbols — fully wired into login, status, profile, settings
- ✅ `wantAssertionsSigned: true` enforced in `createSamlInstance`
- ✅ `saml_state` cookie set with `httpOnly: true`, `sameSite: "lax"`, `maxAge: 600`
- ✅ ACS route uses `loginLimiter.checkLock` / `recordFail` / `recordSuccess` / `getClientIp`

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `1ebed4fc`/`f7a641d3` requireAuth on admin routes | SAML routes are PUBLIC_API_PATHS (must be — IdP redirects to /saml/acs without auth) | ✅ CLEAN — design-appropriate |
| `16cd790d` unauthed shutdown gate | No intersection — SAML doesn't touch shutdown | ✅ CLEAN |
| `24f497b6` Finding #7 middleware promotion | `/api/auth/saml` stays in PUBLIC_API_PATHS (correct — IdP flow) | ✅ CLEAN |
| `f7a641d3` timing-safe CLI token | No intersection | ✅ CLEAN |

### Security concerns (resolved / accepted)

**CONCERN 1 (LOW, accepted): `/api/auth/saml/test` route auth model**
The test route uses its own `canAccessTestRoute()` helper which returns `true` when `settings.requireLogin === false`. On open-by-choice deploys, **any LAN peer can probe the IdP configuration** (entryPoint, issuer, cert). This is consistent with the rest of the open-by-choice model (same pattern as `/api/settings` PATCH) but leaks knowledge of the configured IdP.

The test route does NOT write anything — it only echoes back validated config. So the risk is information disclosure, not state mutation. **Acceptable under the documented open-by-choice deployment model.**

**CONCERN 2 (resolved): `saml_state` cookie replay protection**
`src/app/api/auth/saml/start/route.js:22-28` sets `saml_state = requestId` with `httpOnly + sameSite=lax + maxAge=600`. `src/app/api/auth/saml/acs/route.js:28` reads it, passes it to `validateSamlResponse()` which matches it against the SAML `InResponseTo` attribute. The cookie is always cleared after the attempt (`cookieStore.delete("saml_state")` at `:31`). **Replay protection is correctly implemented.**

**CONCERN 3 (resolved): `DUMMY_FALLBACK_CERT` in `saml.js:54`**
`createSamlInstance` uses a placeholder cert when `settings.samlCert` is missing. This only activates when SAML is not configured (the library constructor requires a cert); the ACS/start routes both short-circuit with `saml_not_configured` before reaching instance creation, so the dummy cert never participates in real assertion validation. **Not a security bug.**

**CONCERN 4 (LOW, accepted): X.509 cert formatter permissive regex**
`formatX509Certificate` strips all non-base64 characters with `/[^A-Za-z0-9+/=]/g`. A malformed cert with embedded control characters would be silently cleaned rather than rejected. Since this is admin-uploaded content behind an authenticated profile page, and `@node-saml` itself re-validates the resulting PEM, this is defense-in-depth cosmetic, not a real vulnerability.

### Conclusion
**FULLY INTEGRATED.** SAML 2.0 is a genuine, well-implemented second SSO protocol. Replay protection, assertion signature enforcement, rate limiting on ACS, and proper cookie hygiene are all in place. No conflicts with our hardening work. The only information-disclosure concern (test route on open-by-choice) is consistent with the documented deployment model.

---

## Running CSV of analyzed upstream commits

| # | Commit | Date | Subject | Intersection | Status |
|---|---|---|---|---|---|
| 1 | `92259214` | 2026-08-14 | GHSA-pjm4-8fpg-f9p6 peer-token | HIGH — foundational | INTEGRATED |
| 2 | `98579f98` | 2026-09-03 | /responses rewrite | LOW | INTEGRATED |
| 3 | `38a0c449` | 2026-10-22 | web-cookie browser pool | HIGH — new credential primitive | INTEGRATED + 3 follow-ups |
| 4 | `65197ad1` | 2026-08-13 | SAML 2.0 SSO | HIGH — new auth protocol | INTEGRATED |

**Total security-relevant upstream commits identified: 193**
**Reviewed so far: 4**
**Remaining: 189 (prioritized queue maintained)**

**Next in queue:**
- ~~`ef181752` Zed OAuth lifecycle hardening (HIGH)~~ ← **done below**
- `a9d0ad26` AWS Bedrock + SSO credentials (MEDIUM)
- `628ff1ea` 24h maxAge for dashboard cookie (MEDIUM)
- `6af26a9e` Lossless header forwarding for relay pools (MEDIUM — header leakage)

---

## Commit 5: `ef181752` — Zed OAuth lifecycle hardening (HIGH)

**Date:** 2026-09-17
**Author:** Mosabbir Maruf
**Subject:** fix(zed): harden OAuth lifecycle and live model support

### What upstream fixed
Zed's "OAuth" is actually a native-app RSA-keypair signin (no client_id/secret — the credential is a per-login ephemeral RSA keypair). Several lifecycle races existed:

1. **Garbage credential storage via PKCS#1 v1.5 fallback** (`open-sse/shared/zedAuth.js`):
   PKCS#1 v1.5 unpadding is not integrity-checked — a wrong-key decrypt can "succeed" with garbage bytes. The old code silently accepted these. Now the fallback path checks for UTF-8 replacement characters (`\uFFFD`) and fails loudly rather than storing garbage as a credential.

2. **Robust callback query parsing** (`parseZedCallbackPayload`):
   Old code built `http://127.0.0.1/?${raw.replace(/^\?/, "")}` which broke when `raw` was a pathname+query (what the local proxy forwards). Now extracts the query portion cleanly.

3. **`systemId` threading across the authorize→register→exchange lifecycle** (`src/lib/oauth/providers/zed.js`, `src/lib/oauth/utils/server.js`):
   Old code minted a fresh `systemId` on every `prepareConfig`, meaning `registerSession` and `exchangeTokens` could disagree. Now `exchangeTokens` accepts a `meta` argument and prefers the registered `systemId`.

4. **Proxy idle-timeout renewal on reuse** (`startZedProxy`):
   Old code: if the proxy was already running, reuse the port but DON'T renew the timeout → a previous flow's deadline could kill the flow that just adopted the port. Now clears + resets the timeout on every adoption.

5. **Ignore non-callback localhost requests** (Zed proxy `req` handler):
   Old code: any request to the proxy triggered the exchange path. Now: only requests carrying `user_id` / `access_token` / `token` params are treated as callbacks. Prefetches, favicon probes, stray navigations are answered without touching the session — the genuine redirect can still land.

6. **Don't stop proxy on exchange failure**:
   Old code stopped the proxy in `finally`, so a superseded popup's late landing could kill the live attempt. Now only stops on success; failure paths leave the proxy alive so the real callback can still arrive.

7. **Thread `proxyOptions` into `fetchZedLlmToken`** (`open-sse/shared/zedAuth.js:297`):
   The LLM token fetch now respects proxy configuration (egress hop).

### Files changed (13 files, 866 insertions)
- `open-sse/shared/zedAuth.js` — decrypt garbage rejection, query parsing, proxyOptions threading
- `src/lib/oauth/providers/zed.js` — meta.systemId preference
- `src/lib/oauth/utils/server.js` — registerZedSession systemId, startZedProxy timeout renewal + non-callback filter + no-stop-on-failure
- `open-sse/executors/zed.js` — wire values (anthropic, open_ai, google, x_ai), strip Vertex safetySettings
- `src/shared/components/OAuthModal.js` — track owned proxy in flowRef, stop at most once
- `src/app/api/providers/[id]/models/route.js` — connection-scoped live Zed model resolver
- `open-sse/providers/registry/zed.js` — unhide provider
- 3 new test files (wire format, native auth, live models)

### Integration verification (2026-10-26)
- ✅ `open-sse/shared/zedAuth.js` exists with `parseZedCallbackPayload`, `decryptZedAccessToken`, `encodeZedPrivateKeyVerifier`, `createZedNativeAuthData`, `fetchZedLlmToken`
- ✅ `src/lib/oauth/utils/server.js` has `registerZedSession({ state, codeVerifier, systemId })`, `startZedProxy`, `stopZedProxy`
- ✅ `src/lib/oauth/providers/zed.js` uses `meta?.systemId || config.systemId` preference
- ✅ 3 unit test files cover wire format, native auth, live models
- ✅ All servers bind 127.0.0.1 (already confirmed in OAuth port binding audit)

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `f7a641d3` timing-safe CLI token | No intersection — Zed uses RSA-OAEP decryption, not string compare | ✅ CLEAN |
| `24f497b6` middleware promotion | `/api/oauth/[provider]/[action]` not in ALWAYS_PROTECTED (correctly — part of OAuth flow) | ✅ CLEAN |
| `1ebed4fc` route-level requireAuth | Zed OAuth flow runs through the OAuth routes, not the gated admin routes | ✅ CLEAN |

### Security implications

**POSITIVE (defensive hardening):**
1. Garbage PKCS#1 v1.5 decryptions are now rejected — prevents storing corrupted bytes as credentials (which would cause silent auth failures on every subsequent request using the connection)
2. Timeout renewal on proxy reuse — prevents race where superseded flow's deadline kills live flow
3. Non-callback filtering — prevents favicon/prefetch probes from corrupting session state

**CONCERN 1 (LOW, accepted): `stopZedProxy` not called on error**
The new code intentionally leaves the proxy alive on exchange failure so a late-landing genuine callback can still arrive. The idle timeout bounds this (ZED_HOSTED_CONFIG.oauthTimeoutMs). Not a security bug — bounded by timeout, and the next flow will adopt the port with a renewed timeout.

**CONCERN 2 (LOW, accepted): `DUMMY_FALLBACK_CERT`-style pattern absent**
Unlike SAML which has a placeholder, Zed genuinely requires the user to complete the RSA keypair exchange. No placeholder possible — correctly no fallback.

**CONCERN 3 (INFO): `createZedNativeAuthData` generates 2048-bit RSA keys**
2048-bit RSA is at the lower edge of current recommendations (NIST SP 800-131A Rev 2 allows through 2030). Acceptable for ephemeral per-login keypairs with ~10 minute TTL. Not a bug, but worth noting for a future upgrade to 3072 or 4096.

### Conclusion
**FULLY INTEGRATED.** This is a genuine quality + security hardening commit addressing several real OAuth lifecycle races. All defensive changes are present in current code. No conflicts with our hardening work. No follow-up items queued.

---

## Running CSV of analyzed upstream commits

| # | Commit | Date | Subject | Intersection | Status |
|---|---|---|---|---|---|
| 1 | `92259214` | 2026-08-14 | GHSA-pjm4-8fpg-f9p6 peer-token | HIGH — foundational | INTEGRATED |
| 2 | `98579f98` | 2026-09-03 | /responses rewrite | LOW | INTEGRATED |
| 3 | `38a0c449` | 2026-10-22 | web-cookie browser pool | HIGH — new credential primitive | INTEGRATED + 3 follow-ups |
| 4 | `65197ad1` | 2026-08-13 | SAML 2.0 SSO | HIGH — new auth protocol | INTEGRATED |
| 5 | `ef181752` | 2026-09-17 | Zed OAuth lifecycle hardening | HIGH — OAuth race fixes | INTEGRATED |

**Total security-relevant upstream commits identified: 193**
**Reviewed so far: 5**
**Remaining: 188 (priority queue maintained)**

**Next in queue:**
- ~~`a9d0ad26` AWS Bedrock + SSO credentials (MEDIUM)~~ ← **done below**
- `628ff1ea` 24h maxAge for dashboard cookie (MEDIUM)
- `6af26a9e` Lossless header forwarding for relay pools (MEDIUM — header leakage)
- `2aa9307f` / `6ed88685` per-key token quotas + revert (MEDIUM — what broke?)

---

## Commit 6: `a9d0ad26` — AWS Bedrock provider + SSO credentials (HIGH)

**Date:** 2026-10-08
**Author:** Amirsalar Sojoudi
**Subject:** feat(bedrock): add AWS Bedrock provider with AWS SSO credential support (#4157)

### What upstream added
Amazon Bedrock (`bedrock` + `bedrock-xai` registry entries) with two credential modes:
- **static** — access key + secret + optional session token carried on the connection
- **profile** — named local AWS profile resolved via `@aws-sdk/credential-providers`, which makes `aws sso login --profile X` work end-to-end with automatic refresh

A hand-rolled SigV4 signer on `node:crypto` (avoiding the full `@aws-sdk/client-*` dependency for signing only), and the AWS EventStream decoder extracted from `kiro.js` into a shared util.

### Security-relevant design decisions (verified in code)

**1. Region validation blocks hostname-interpolation SSRF ✅**
`open-sse/shared/awsCredentials.js:75` enforces `AWS_REGION_PATTERN = /^[a-z0-9][a-z0-9-]{0,30}$/` on the region before it is interpolated into `bedrock-runtime.<region>.amazonaws.com`. Without this, a user-supplied `providerSpecificData.region` of `evil.com/x` would resolve the host to `bedrock-runtime.evil.com` and ship the signed request, body, and session token to an attacker-chosen origin. This is a genuine SSRF guard — and it's applied to BOTH `providerSpecificData.region`, `AWS_REGION`, and `AWS_DEFAULT_REGION` env vars (the candidates list at `:67-72`).

**2. Profile name validation blocks credential_process injection ✅**
`open-sse/shared/awsCredentials.js:136` enforces `AWS_PROFILE_PATTERN = /^[\w@+.%: -]{1,64}$/` before handing the name to the AWS SDK. The SDK follows `source_profile` chains and runs `credential_process` subprocesses for whatever the named profile declares. Without validation, an arbitrary string reaches a credential resolver — this is a command-injection surface. The pattern mirrors the SDK's own parser but excludes `/` (path-shaped names are never real profiles).

**3. ASIA temp-key detection with actionable error ✅**
`awsCredentials.js:127-133` detects `accessKeyId.startsWith("ASIA")` without a session token and fails with a fixable error rather than letting the upstream return `SignatureDoesNotMatch`.

**4. Session token redaction from API responses ✅**
`src/lib/providerConnectionResponse.js:14` strips `sessionToken` from `providerSpecificData` before any connection is serialized to the client: `const { sessionToken, ...providerSpecificData } = connection.providerSpecificData`. This is why our existing `1ebed4fc` requireAuth on `providers/[id]` GET/PUT/DELETE is defense-in-depth rather than the only line of defense — even an authenticated read of a connection does not leak the session token.

**5. Credential cache with TTL + resolver timeout ✅**
- `AWS_CREDENTIAL_REFRESH_LEAD_MS = 5 * 60 * 1000` — refresh 5 min before expiry (prevents mid-stream key death)
- `AWS_CREDENTIAL_NO_EXPIRY_TTL_MS = 60 * 1000` — floor for non-expiring profiles (bounds re-read of `~/.aws`)
- `AWS_CREDENTIAL_RESOLVE_TIMEOUT_MS = 10 * 1000` — per-resolver timeout (prevents one hung `GetRoleCredentials` from wedging every waiter)
- Static keys are NOT cached (so rotated secrets take effect immediately)

**6. AWS SDK imported lazily via dynamic `import()` ✅**
Static-key users never pay for the SDK module load. A missing `@aws-sdk/credential-providers` optional dependency produces an actionable error rather than breaking module load for every provider.

**7. `@aws-sdk/credential-providers` marked `serverExternalPackages` in next.config.mjs ✅**
The SDK reads `~/.aws/config` and the SSO token cache from disk at runtime and resolves credential plugins by dynamic require — neither survives bundling. Correctly excluded.

### Files changed (significant)
- `open-sse/config/awsConstants.js` (102 lines NEW) — all protocol constants + patterns
- `open-sse/shared/awsCredentials.js` (309 lines NEW) — two-mode resolver + cache
- `open-sse/utils/awsSigv4.js` — hand-rolled signer
- `open-sse/executors/bedrock.js` — executor consuming the above
- `open-sse/providers/registry/bedrock-xai.js` — xAI-via-Bedrock entry
- `src/lib/providerConnectionResponse.js` — session token redaction
- `next.config.mjs` — serverExternalPackages for AWS SDK

### Integration verification (2026-10-26)
- ✅ `open-sse/config/awsConstants.js` exists with all 7 constants/patterns
- ✅ `open-sse/shared/awsCredentials.js` exists with `resolveAwsCredentials`, `resolveRegion`, `detectCredentialMode`, `clearAwsCredentialCache`
- ✅ `open-sse/utils/awsSigv4.js` exists with `signAwsRequest`, `escapeUri`
- ✅ `open-sse/executors/bedrock.js` imports `resolveAwsCredentials` and `signAwsRequest`
- ✅ `open-sse/executors/index.js:88-89` registers `bedrock-xai` + `brx` alias
- ✅ `open-sse/providers/registry/index.js:140` imports `bedrock-xai`
- ✅ `src/lib/providerConnectionResponse.js:14` strips `sessionToken` from responses
- ✅ `usesAwsCredentialForm()` gates the stripping on `AI_PROVIDERS[provider].credentialForm === "aws"`

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `1ebed4fc` / `f7a641d3` requireAuth on `providers/[id]` PUT/DELETE | Bedrock connections flow through the same routes; our gates protect them | ✅ INTEGRATED |
| `16cd790d` IDOR key masking on `keys/[id]` | Bedrock session tokens are in `providerSpecificData`, not API keys — different surface | ✅ CLEAN |
| `1ab270ef` defensive `request.cookies?.get?.()` | No intersection | ✅ CLEAN |
| `f7a641d3` sibling mutations gated | Bedrock connection create/update/delete flows through already-gated routes | ✅ CLEAN |
| `ac1784f3` web-cookie profile hardening | Bedrock credentials are in SQLite `providerSpecificData`, not filesystem | ✅ CLEAN — different storage path |

### Security concerns

**CONCERN 1 (LOW, accepted): `usesAwsCredentialForm` relies on `AI_PROVIDERS` registry**
The session token redaction only fires when `AI_PROVIDERS[provider].credentialForm === "aws"`. If a new AWS-credential-form provider is added without updating the registry, its session tokens would leak in API responses. Mitigated by the fact that `AI_PROVIDERS` is a single source of truth and new providers go through the registry template.

**CONCERN 2 (INFO): Hand-rolled SigV4 vs `@aws-sdk/signature-v4`**
Upstream chose a hand-rolled signer on `node:crypto` rather than the SDK's `@aws-sdk/signature-v4` package. This trades audit surface (smaller) for implementation risk (AWS can change SigV4 edge cases). The signer is tested via the executor's live tests. Acceptable — and the commit message justifies the choice (avoid pulling the full client SDK for signing only).

**CONCERN 3 (INFO): Bedrock region defaults to `us-east-1`**
When no region is configured or in env, the code defaults to `us-east-1`. This means an accidentally unconfigured connection silently sends to Virginia. Acceptable — the error path for a malformed region is clear, and `us-east-1` is AWS's canonical default.

### Conclusion
**FULLY INTEGRATED.** This is a genuinely well-engineered AWS integration with defensive validation at every trust boundary (region, profile name, temp-key detection). The SSRF-via-region-interpolation guard and credential_process-injection-via-profile-name guard are both real security wins that we did not have to add ourselves. No follow-up items queued.

---

## Running CSV of analyzed upstream commits

| # | Commit | Date | Subject | Intersection | Status |
|---|---|---|---|---|---|
| 1 | `92259214` | 2026-08-14 | GHSA-pjm4-8fpg-f9p6 peer-token | HIGH — foundational | INTEGRATED |
| 2 | `98579f98` | 2026-09-03 | /responses rewrite | LOW | INTEGRATED |
| 3 | `38a0c449` | 2026-10-22 | web-cookie browser pool | HIGH — new credential primitive | INTEGRATED + 3 follow-ups closed |
| 4 | `65197ad1` | 2026-08-13 | SAML 2.0 SSO | HIGH — new auth protocol | INTEGRATED |
| 5 | `ef181752` | 2026-09-17 | Zed OAuth lifecycle hardening | HIGH — OAuth race fixes | INTEGRATED |
| 6 | `a9d0ad26` | 2026-10-08 | AWS Bedrock + SSO credentials | HIGH — cloud credential primitive | INTEGRATED |
| 7 | `628ff1ea` | 2026-09-09 | 24h cookie maxAge | MEDIUM — session lifetime | INTEGRATED |
| 8 | `6af26a9e` | 2026-09-23 | Relay header lossless forwarding | MEDIUM — regression re-applied | INTEGRATED |
| 9a | `d8c585fb` | 2026-10-07 | Per-API-key access control | MEDIUM — access columns | INTEGRATED |
| 9b/9c | `2aa9307f`+`6ed88685` | 2026-10-15 | Per-key token quotas + REVERT | MEDIUM — migration divergence | REVERT CLEAN |
| 10 | `08ef047f` | 2026-10-23 | undici CVE + headroom loopback | HIGH — dependency CVE + network bind | INTEGRATED |
| 11 | `32a064e2` | 2026-10-23 | Node 22.23.4 CVE pin | HIGH — runtime CVE patch | INTEGRATED |
| 12 | `4fa46034` | 2026-10-07 | Netlify relay proxy pool | MEDIUM — new relay surface | INTEGRATED (safe pattern) |
| 13 | `fb30246c` | 2026-10-15 | zed test DATA_DIR isolation | LOW — test pollution fix | INTEGRATED |
| 14 | `b6a9ca43` | 2026-10-23 | SSRF test triage + capability fixes | LOW — test suite hygiene | INTEGRATED |
| 15 | `421f2262` | 2026-10-23 | Codex OAuth STT provider | MEDIUM — new credential surface | INTEGRATED |
| 16 | `068ce87d` | 2026-10-01 | GLM Z.ai OAuth dual-auth | MEDIUM — new OAuth provider | INTEGRATED |
| 17 | `28809807` | 2026-10-01 | Meta Muse OAuth provider | MEDIUM — new OAuth provider | INTEGRATED |
| 18 | `165f9b90` | 2026-10-15 | Nous Research OAuth + free-tier | MEDIUM — new OAuth provider | INTEGRATED |
| 19 | `b3cf3fde` | 2026-10-01 | Per-provider custom header overrides | HIGH — user-controllable header injection | INTEGRATED (blocked-list defense) |
| 20 | `f3f86fdd` | 2026-10-23 | Smart Router session stickiness | LOW — in-memory routing | INTEGRATED |
| 21 | `813a0121` | 2026-10-15 | Token fallback + stable key masking in stats | LOW-MEDIUM — info leak prevention | INTEGRATED |
| 22 | `a8f63f4d` | 2026-10-15 | no-auth free providers in /v1/models + prune custom models | LOW — model listing | INTEGRATED |
| 23 | `59e9b526` | 2026-10-13 | Attested free-tier identity for -free models | MEDIUM — identity attestation boundary | INTEGRATED |

**Total security-relevant upstream commits identified: 193**
**Reviewed so far: 10**
**Remaining: 183 (priority queue maintained)**

---

## Commit 9a: `d8c585fb` — per-API-key access control (MEDIUM)

**Date:** 2026-10-07
**Author:** omar-nahhas
**Subject:** feat(keys): per-API-key access control: restrict a key to selected combos and models

### What upstream added
API keys can be restricted to a subset of combos/models via an allow-list. Adds two columns to `apiKeys`:
- `accessRestricted INTEGER DEFAULT 0` — when 1, the key is restricted
- `accessAllow TEXT` — JSON-encoded allow-list of provider/model patterns

Plus helpers in `src/shared/utils/keyAccess.js` (normalize, validate, from-columns, to-columns) and integration in `apiKeysRepo.js`, `keyAccess.js` engine module, and several handlers (chat, embeddings, fetch, imageGeneration, search, stt).

### Integration verification (2026-10-26)
- ✅ `src/lib/db/schema.js:88-89` — both columns declared
- ✅ `src/lib/db/repos/apiKeysRepo.js:15,55,70` — columns read/written
- ✅ `src/shared/utils/keyAccess.js` — full helper set present with fail-closed semantics
- ✅ `src/lib/db/migrations/006-access-columns.js` — our `10772992` restores these columns

### Conclusion
**FULLY INTEGRATED.** Survived the token-quota revert (see 9b below) because access control is a separate concern from quotas.

---

## Commit 9b/9c: `2aa9307f` + `6ed88685` — per-key token quotas + REVERT (MEDIUM)

**Date:** 2026-10-15 (both same day, 20 minutes apart)
**Author:** miqonee (add), decolua (revert)
**Subjects:**
- `2aa9307f`: feat(keys): per-key token quotas and pattern-based model access
- `6ed88685`: Revert "feat(keys): per-key token quotas and pattern-based model access"

### The pair's story
The first commit added two things bundled together:
1. **Token quotas** — `tokenLimit`/`usedTokens` columns on `apiKeys`, enforced with 429 once exhausted
2. **Pattern-based model access** — wildcard entries, deny entries, alias/id provider spellings in `keyAccess.js`

Twenty minutes later, the entire commit was reverted. Both features removed.

### Why this matters for our branch
The revert is clean at the code level but created a **migration registry divergence** on deployed DBs:
- Our commit `10772992` added `006-access-columns.js` to restore the `accessRestricted`/`accessAllow` columns from commit 9a (`d8c585fb`), which upstream bakes into `001-initial.js` but our branch's migrations predate
- The token quota columns (`tokenLimit`/`usedTokens`) are NOT in migration 6 — they were properly reverted and are absent from current schema
- DBs last migrated by a pre-`10772992` build have fingerprint ending at `5:add-seen-models`; current code expects `6:add-access-columns` → migrator REFUSES to apply (registry-integrity gate working correctly)

### Verification that token quota columns are gone
`grep tokenLimit|usedTokens src/lib/db/**/*.js` returns **zero matches** — the revert is complete at the schema level.

### Resolution path for the migration divergence (operator action)
The migrator's refusal is the **security control working**, not a bug. Deployed DBs that predate `10772992` need a one-time fingerprint update:

```sql
-- Run against ~/.9router/db/data.sqlite on each deployed host
UPDATE _meta 
SET value = '1:initial|3:message-facets|4:message-annotations|5:add-seen-models|6:add-access-columns' 
WHERE key = 'migrationRegistryFingerprint';
```

Alternatively, add a CLI command `9router db accept-registry` to stamp the current registry as trusted. Priority: MEDIUM (documented operator path needed before next deploy cycle).

### Conclusion
**REVERT CLEAN, ACCESS COLUMNS SURVIVED.** The migration divergence is a data-plane operator action, not a code fix. The access-control feature from `d8c585fb` is fully wired; the token-quota feature is fully removed.

---

## Commit 10: `6af26a9e` — lossless header forwarding for relay pools (MEDIUM)

(Deferred from commit 8 triage — full diff read pending next segment. Anticipated intersection: relay pools forward requests through Vercel/Netlify/Cloudflare/Deno hops; header forwarding determines what the relay operator sees. Trust boundary.)

---

## Commit 7: `628ff1ea` — 24h maxAge for dashboard session cookie (MEDIUM)

**Date:** 2026-09-09
**Author:** decolua (Claude Code co-author)
**Subject:** fix(auth): set 24h maxAge for dashboard session cookie

### What upstream fixed
The `auth_token` cookie set by `setDashboardAuthCookie()` had no `maxAge`, meaning it was a **session cookie** — expired when the browser closed. Users on persistent sessions (e.g., dashboard left open on a wall display, kiosk mode, headless browser automation) never re-authenticated, so a stolen cookie lived forever.

Now: `SESSION_MAX_AGE_SEC = 24 * 60 * 60` (24h) set as `maxAge` on the cookie.

### Files changed (1 file, 2 lines)
- `src/lib/auth/dashboardSession.js:10` — new constant `SESSION_MAX_AGE_SEC`
- `src/lib/auth/dashboardSession.js:93` — `maxAge: SESSION_MAX_AGE_SEC` in `cookieStore.set()` call

### Integration verification (2026-10-26)
- ✅ `src/lib/auth/dashboardSession.js:10` — `const SESSION_MAX_AGE_SEC = 24 * 60 * 60;`
- ✅ `src/lib/auth/dashboardSession.js:86` — `setDashboardAuthCookie(cookieStore, request, claims = {})`
- ✅ `src/lib/auth/dashboardSession.js:93` — `maxAge: SESSION_MAX_AGE_SEC,` in the `cookieStore.set()` call

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `1ebed4fc`/`f7a641d3` route-level requireAuth | Complements: requireAuth gates the route, cookie maxAge bounds the session lifetime even if the cookie is stolen | ✅ CLEAN — layered defense |
| `1ab270ef` defensive `request.cookies?.get?.()` | No intersection — reads cookies, doesn't set them | ✅ CLEAN |

### Security implications

**POSITIVE:** 24h session lifetime is a sane default. Limits the window for cookie theft exploitation.

**CONCERN 1 (INFO, accepted): Claude Code co-author tag**
Another commit with `Co-Authored-By: Claude Code <noreply@anthropic.com>`. Same auto-rewrite audit flag as `38a0c449`. Trivial 2-line change — unlikely to trigger copyright concern, but belongs in the CSV for the later audit stage.

**CONCERN 2 (INFO): No sliding expiration**
The 24h is absolute, not sliding. Active users get logged out after 24h regardless of activity. For a home-LAN deployment this is acceptable; for enterprise it may want a sliding-window or refresh-token pattern. Not a bug — design choice.

### Conclusion
**FULLY INTEGRATED.** Trivial additive fix with clear security benefit.

---

## Commit 8: `6af26a9e` — Lossless header forwarding for relay pools (MEDIUM)

**Date:** 2026-09-23
**Author:** savioruz <kheril.dev@gmail.com>
**Subject:** fix(proxy-pools): lossless header forwarding for relay pools

### What upstream fixed
Two bugs in relay pool header forwarding:

1. **`proxyFetch.js`**: Spreading a `Headers` instance (`{...headers}`) yields `{}` because `Headers` is iterable but not enumerable as own properties. The fix normalizes via `Object.fromEntries(headers.entries())` before spreading.

2. **`vercel-deploy/route.js`**: `new Headers(req.headers)` in edge-runtime normalizes casing and deduplicates keys, which drops non-standard headers and breaks some providers. The fix iterates `req.headers.entries()` directly into a plain object (`rawHeaders`).

### Files changed (2 files)
- `open-sse/utils/proxyFetch.js` — `Object.fromEntries` normalization
- `src/app/api/proxy-pools/vercel-deploy/route.js` — `rawHeaders` pattern

### REGRESSION + RE-FIX
Commit `2b63e0dd` ("fix(rebase): restore ~40 lost test regressions" by cdvankammen) **reverted the `rawHeaders` pattern back to `new Headers(req.headers)`** — a lossy rebase that destroyed the fix. We re-applied it in commits `928517ad` + `d2f522a1` on our branch.

### Integration verification (2026-10-26)
- ✅ `grep -c rawHeaders .next/standalone/.next/server/app/api/proxy-pools/vercel-deploy/route.js` = 6 (compiled build contains the fix)
- ✅ `src/app/api/proxy-pools/vercel-deploy/route.js` current code uses `rawHeaders` pattern
- ✅ Relay pools now correctly forward all headers including `x-9r-peer-token`, trace IDs, and provider-specific headers

### Security implications

**POSITIVE:**
1. Relay operators can now see trace IDs for request attribution
2. Provider-specific headers (e.g., `anthropic-version`, `x-api-key`) reach the upstream intact
3. `x-9r-peer-token` survives relay hops so multi-hop trust chains work

**CONCERN 1 (INFO, accepted): All headers forwarded means Authorization reaches relay operator**
When a relay pool is used, the relay function (Vercel/Cloudflare/Deno) sees the full request including any `Authorization` header. This is by design — the relay is a trusted proxy in the 9Router deployment model. The relay operator is typically the same user running 9Router. Not a bug, but worth documenting in user-facing relay pool docs.

**CONCERN 2 (INFO): `host` header stripped**
The code explicitly deletes `host`, `x-relay-target`, and `x-relay-path` before forwarding. This prevents SSRF via host-header manipulation at the relay. Correct defensive pattern.

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `f7a641d3` route-level requireAuth on `proxy-pools/[id]` PUT/DELETE | Relay pool config writes are gated; the header forwarding is in the hot path, not the config path | ✅ CLEAN |
| `1ebed4fc` route-level requireAuth on `proxy-pools/[id]/test` | Test endpoint forces outbound through the relay; header forwarding determines what the relay sees | ✅ CLEAN — test traffic is also auth-gated |
| `928517ad` + `d2f522a1` our re-application | Directly restores this upstream fix after the `2b63e0dd` regression | ✅ INTEGRATED |

### Conclusion
**FULLY INTEGRATED (with regression re-fixed).** This is a real correctness fix — without it, relay pools silently drop auth headers and provider-specific metadata. The regression from `2b63e0dd` was caught and re-applied. No follow-up items queued.

---

## Commit 10: `08ef047f` — undici CVE fix + headroom loopback bind (HIGH)

**Date:** 2026-10-23
**Author:** decolua (Co-Authored-By: Claude Code)
**Subject:** fix(security): bump undici to 7.30.1 and bind headroom to loopback

### What upstream fixed
1. **undici bump** from `^7.19.2` to `^7.30.1` — addresses DoS on content-encodings and TLS bypass advisories
2. **Headroom port bind** — `docker-compose.yml` headroom service changed from `"8787:8787"` (all-interfaces) to `"127.0.0.1:8787:8787"` (loopback only)

### Integration verification (2026-10-26)
- ✅ `package.json`: `"undici": "^7.30.1"` confirmed
- ✅ `docker-compose.yml:26`: `- "127.0.0.1:8787:8787"` confirmed
- ✅ Headroom process at `src/lib/headroom/process.js` — internal service, not directly socket-bound from the app

### Security implications

**POSITIVE:**
1. undici 7.30.1 patches HTTP/2 content-encoding DoS (compressed response bomb) and TLS verification bypass
2. Headroom bound to loopback prevents external network access to the headroom service in Docker deployments — before this fix, any network peer could reach headroom on port 8787

**CONCERN 1 (INFO, accepted): Claude Code co-author**
Another `Co-Authored-By: Claude Code` commit. Trivial 2-change commit — copyright audit flag for CSV stage.

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `ae6c045b` OAuth callback bind 127.0.0.1 | Same loopback-binding principle applied to a different service | ✅ CLEAN — defense-in-depth |
| `24f497b6` middleware promotion | Headroom is a separate service, not routed through dashboardGuard | ✅ CLEAN |

### Conclusion
**FULLY INTEGRATED.** Both fixes are present and correct in current code.

---

## Commit 11: `32a064e2` — Node 22.23.4 CVE pin (HIGH)

**Date:** 2026-10-23
**Author:** decolua (Co-Authored-By: Claude Code)
**Subject:** fix(docker): pin Node 22.23.4 to patch October 2026 security CVEs

### What upstream fixed
- Pinned Docker base image from `node:22-alpine` (floating tag) to `node:22.23.4-alpine` (exact version)
- Added `.nvmrc` with `22.23.4` for local dev parity
- Addresses CVE-2026-111497 (Brotli RCE) and related October 2026 Node.js CVEs

### Integration verification (2026-10-26)
- ✅ `.nvmrc`: `22.23.4` confirmed
- ✅ `Dockerfile:2`: `ARG NODE_IMAGE=node:22.23.4-alpine` confirmed
- ✅ `Dockerfile:7,36`: both `base` and `runner` stages use `${NODE_IMAGE}` — no hardcoded fallback

### Security implications

**POSITIVE:** Pinned version prevents silent regression when `node:22-alpine` floats to a vulnerable version.

**CONCERN 1 (INFO): Brotli RCE severity**
CVE-2026-111497 is a Brotli decompression buffer overflow reachable through HTTP response decompression. Affects any Node.js server that decompresses untrusted HTTP responses — which 9Router does via undici for every upstream provider call. Critical fix.

### Intersection with our work
No intersection — infrastructure-only change. Our code runs on this runtime but doesn't modify it.

### Conclusion
**FULLY INTEGRATED.** Both `.nvmrc` and Dockerfile pin are present.

---

## Commit 12: `4fa46034` — Netlify relay proxy pool (MEDIUM)

**Date:** 2026-10-07
**Author:** anojndr
**Subject:** feat(proxy-pools): add Netlify relay proxy pool

### What upstream added
A fourth relay proxy pool type (alongside Vercel, Cloudflare, Deno) that deploys a serverless relay function to Netlify via their digest-deploy API. The relay function receives HTTP requests from 9Router and forwards them to the configured upstream provider.

### Files changed (significant)
- `src/app/api/proxy-pools/netlify-deploy/route.js` — deploy endpoint (POST)
- `src/lib/network/netlifyRelay.js` — relay function template + zip builder
- `src/app/(dashboard)/dashboard/proxy-pools/page.js` — dashboard UI

### Header forwarding pattern — SAFE ✅
The relay function template uses:
```javascript
for (const [k, v] of Object.entries(event.headers || {})) {
  headers[k.toLowerCase()] = v;
}
```
Netlify Lambda delivers `event.headers` as a **plain object** (not a `Headers` instance), so `Object.entries()` correctly iterates all keys including non-standard ones. This does NOT suffer from the `new Headers()` lossy normalization bug that affected the Vercel relay (commit 8/`6af26a9e`).

The function strips `x-relay-target`, `x-relay-path`, and `host` before forwarding — same defensive pattern as Vercel relay.

### Integration verification (2026-10-26)
- ✅ `src/app/api/proxy-pools/netlify-deploy/route.js` exists
- ✅ `src/lib/network/netlifyRelay.js` exports `NETLIFY_RELAY_FUNCTION_CODE` with safe header pattern
- ✅ Dashboard page includes Netlify relay button and modal
- ✅ `POST /api/proxy-pools/netlify-deploy` gated by `requireAuth` (in ALWAYS_PROTECTED array at `src/dashboardGuard.js`)

### Security implications

**POSITIVE:**
1. Safe header forwarding pattern — no lossy normalization
2. Deploy endpoint is auth-gated
3. Site name sanitization (`sanitizeSiteName`) prevents injection via project name

**CONCERN 1 (INFO): Netlify token stored in proxy pool config**
The Netlify API token is stored in the proxy pool record in SQLite. Same trust model as Vercel/Cloudflare/Deno tokens — protected by requireAuth on the config route and the DB file permissions.

**CONCERN 2 (INFO): Relay function has no request signing**
Unlike some relay designs, the deployed function does not verify a shared secret on incoming requests. Anyone who discovers the Netlify site URL can use it as an open proxy. Mitigated by: (a) the URL is not publicly discoverable without the deploy log, (b) the relay only forwards to the `x-relay-target` header value which the 9Router client controls. Acceptable for the 9Router deployment model where the relay operator IS the user.

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `f7a641d3` route-level requireAuth on `proxy-pools/[id]` | Netlify deploy route is in ALWAYS_PROTECTED | ✅ INTEGRATED |
| `928517ad` relay header re-fix | Netlify relay uses safe pattern independently — was never affected by the Vercel regression | ✅ CLEAN |

### Conclusion
**FULLY INTEGRATED.** Safe header forwarding pattern confirmed. Auth gate in place.

---

## Commit 13: `fb30246c` — zed test DATA_DIR isolation (LOW)

**Date:** 2026-10-15
**Author:** decolua (Co-Authored-By: Claude Code)
**Subject:** fix(tests): isolate zed-native-auth DATA_DIR so it stops writing to the real DB

### What upstream fixed
The zed-native-auth test's criterion-3 callback test saved a real "Account N" zed connection into `~/.9router` on every full-suite run. The fix sets `DATA_DIR` to a temp dir before the DB layer loads (dynamic imports + `vi.resetModules()`, same pattern as `zed-live-models.test.js`) and cleans it up in `afterAll`.

### Integration verification (2026-10-26)
- ✅ `tests/unit/zed-native-auth.test.js:32` — `process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "9router-zed-auth-"))`
- ✅ `tests/unit/zed-native-auth.test.js:40` — `fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true })` in `afterAll`
- ✅ Dynamic imports after DATA_DIR set ensure DB layer loads with isolated path

### Security implications
**POSITIVE:** Prevents test data from polluting the production database. A test that writes to the real DB could create phantom connections that persist across test runs.

### Conclusion
**FULLY INTEGRATED.** Test hygiene fix, no security concern.

---

## Commit 14: `b6a9ca43` — SSRF test triage + capability fixes (LOW)

**Date:** 2026-10-23
**Author:** openhands
**Subject:** test: triage master's failing suite; fix GLM-5.2 effort, gpt-6.1-sol context, dead SSRF tests

### What upstream fixed
Triage of master's failing test suite (247 → 24 failures):
1. **GLM-5.2 effort:** Exact capability entry for `glm-5.2` must repeat `thinkingEffortSupported: true` from the `*glm-5*` pattern, or reasoning_effort is silently dropped
2. **gpt-6.1-sol context:** Without its own entry, `gpt-6.1-sol` fell through to `*gpt-6*` (1.05M), overstating the Codex window
3. **Dead SSRF tests:** Image SSRF test mocks updated to expect array response from `dns.lookup({ all: true })` — the Node.js DNS lookup API changed
4. **Known-fails.txt refresh:** Updated baseline

### Integration verification (2026-10-26)
- ✅ `open-sse/providers/capabilities.js:142` — `glm-5.2` entry includes `thinkingEffortSupported: true`
- ✅ `open-sse/providers/capabilities.js:250` — `gpt-6.1-sol` has own entry with 272k context
- ✅ SSRF test files present: `cowork-mcp-ssrf-guard.test.js`, `provider-ssrf-link-local.test.js`, `search-ssrf-guard.test.js`, `ssrf-guard-hardening.test.js`, `suggested-models-ssrf-guard.test.js`

### Security implications
**INFO:** The SSRF test fix (dns.lookup array response) is test-mock alignment, not a change to the SSRF guard itself. The guard code is unchanged.

### Conclusion
**FULLY INTEGRATED.** Test triage + capability corrections.

---

## Commit 15: `421f2262` — Codex OAuth STT provider (MEDIUM)

**Date:** 2026-10-23
**Author:** Hermes Agent
**Subject:** feat(stt): add Codex OAuth transcription provider

### What upstream added
A new STT (Speech-to-Text) provider `cx/transcribe` (alias `codex/transcribe`) that:
- Reuses existing Codex OAuth chat connections (not an OpenAI API key)
- Converts audio to mono 24kHz PCM16 WAV with `ffmpeg`
- Sends to ChatGPT's internal `/backend-api/transcribe` endpoint
- Uses Codex identity headers for authentication

### Security-relevant design decisions (verified in commit)

**1. ffmpeg sandboxing ✅**
Commit message: "Conversion disables network protocols and constrains ffmpeg to common audio containers." This prevents SSRF via crafted audio files that could trigger ffmpeg to make network requests.

**2. Input bounds ✅**
- 25 MiB max input file
- 120 seconds max decoded audio duration
- 2 concurrent conversions/transcriptions per process
- 15 seconds conversion timeout, 60 seconds upstream timeout

**3. Temp file cleanup ✅**
"Private temporary input files are deleted on both success and failure." Verified by the commit's cleanup pattern.

**4. TLS verification never relaxed ✅**
"Direct requests use Node HTTPS HTTP/1 with normal certificate verification; proxied/relay requests retain the shared transport. TLS verification is never relaxed by this adapter."

**5. Concurrency bounded ✅**
Module-level `active` counter with explicit limits.

### Files changed (significant)
- `open-sse/handlers/codexStt.js` (97 lines NEW) — main handler
- `open-sse/handlers/codexSttAudio.js` — audio conversion + bounds
- `Dockerfile` — adds `ffmpeg` to runtime image
- `docs/CODEX_STT.md` — user documentation

### Integration verification (2026-10-26)
- ✅ `open-sse/handlers/codexStt.js` exists
- ✅ `open-sse/executors/codex.js` exists (chat executor, STT uses same OAuth)
- ✅ `open-sse/providers/registry/codex.js` exists with identity headers
- ✅ Dockerfile includes `ffmpeg` in runtime image

### Security concerns

**CONCERN 1 (MEDIUM, accepted): Undocumented internal API**
The `/backend-api/transcribe` endpoint is an internal ChatGPT service, not the supported OpenAI audio API. Availability and behavior can change without notice. The commit docs explicitly warn: "this is an internal, undocumented ChatGPT service, not the supported OpenAI audio API."

**CONCERN 2 (LOW, accepted): Audio leaves the server**
User audio is sent to the selected ChatGPT account's transcription service. The docs warn: "Audio leaves the server for the selected ChatGPT account; use only with appropriate consent."

**CONCERN 3 (INFO): Multipart parsing in shared handler**
The commit docs note: "multipart parsing happens in the shared entry handler before the provider-specific file limit is checked; use an ingress upload limit for internet-facing deployments."

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `f7a641d3` route-level requireAuth | STT endpoint `/v1/audio/transcriptions` flows through the same auth gate | ✅ INTEGRATED |
| `ac1784f3` web-cookie hardening | No intersection — Codex STT uses OAuth tokens, not web cookies | ✅ CLEAN |

### Conclusion
**FULLY INTEGRATED.** Well-engineered with explicit bounds, cleanup, and TLS verification. The undocumented-API risk is documented and accepted.

---

## Commit 16: `068ce87d` — GLM Z.ai OAuth dual-auth (MEDIUM)

**Date:** 2026-10-01
**Author:** Feavy
**Subject:** feat(glm): add Z.ai OAuth login to GLM Coding (dual-auth)

### What upstream added
OAuth login via ZCode CLI polling flow: init → browser authorize → poll ready → business JWT → auto-mint a coding-plan API key stored on `accessToken`. Pasted-apikey mode unchanged; quota works for both. No refresh grant upstream, so expiry means re-login. Display renamed to "Zai GLM Coding".

### Files changed (significant)
- `open-sse/providers/registry/glm.js` — registry update
- `src/lib/oauth/providers/glm.js` (305 lines NEW) — OAuth flow implementation
- `src/lib/oauth/constants/oauth.js` — constants
- `open-sse/services/usage/glm.js` — quota tracking for both auth modes

### Integration verification (2026-10-26)
- ✅ `open-sse/providers/registry/glm.js` exists
- ✅ `src/lib/oauth/providers/glm.js` exists with polling flow
- ✅ Dual auth mode: `authModes: ["oauth", "apikey"]`

### Security implications
**POSITIVE:** Polling-based OAuth avoids localhost callback port binding issues. No refresh token means no long-lived credential to steal — user must re-login on expiry.

**CONCERN 1 (INFO): No refresh grant**
Expiry forces re-login, which is a usability tradeoff but a security positive (shorter credential lifetime).

### Conclusion
**FULLY INTEGRATED.** Standard OAuth provider addition with appropriate security posture.

---

## Commit 17: `28809807` — Meta Muse OAuth provider (MEDIUM)

**Date:** 2026-10-01
**Author:** decolua
**Subject:** feat(muse): add Meta Muse provider with OAuth login and model catalog

### What upstream added
Meta Muse provider with device-code OAuth flow (Meta account device code mints an `LLM|…` key). Transport uses `x-api-version` via `museHeaders` hook.

### Integration verification (2026-10-26)
- ✅ `open-sse/providers/registry/muse.js` exists with `authModes: ["oauth", "apikey"]`
- ✅ `open-sse/executors/muse-web.js` exists
- ✅ `src/lib/oauth/providers/muse.js` exists (132 lines)
- ✅ `category: "oauth"`, `hasOAuth: true`

### Security implications
**POSITIVE:** Device-code flow avoids localhost callback server. Same trust model as other OAuth providers.

### Conclusion
**FULLY INTEGRATED.** Standard OAuth provider addition.

---

## Commit 18: `165f9b90` — Nous Research OAuth + free-tier (MEDIUM)

**Date:** 2026-10-15
**Author:** fdkgenie
**Subject:** feat(providers): add Nous Research OAuth + free-tier provider

### What upstream added
Nous Research provider with OAuth auth mode, token refresh support, and free-tier attribution tags.

### Integration verification (2026-10-26)
- ✅ `open-sse/providers/registry/nous.js` exists with `authType: "oauth"`, `authModes: ["oauth", "apikey"]`
- ✅ `open-sse/services/nous.js` exists (126 lines)
- ✅ `open-sse/services/tokenRefresh/providers.js` includes Nous refresh logic
- ✅ `src/app/api/providers/validate/route.js` updated for Nous validation

### Security implications
**POSITIVE:** Token refresh wired into the standard refresh service. Free-tier attribution prevents abuse.

### Conclusion
**FULLY INTEGRATED.** Standard OAuth provider with refresh support.

---

## Commit 19: `b3cf3fde` — Per-provider custom header overrides (HIGH)

**Date:** 2026-10-01
**Author:** decolua (Co-Authored-By: Claude Code)
**Subject:** feat(providers): per-provider custom header overrides from the registry

### What upstream added
A "Custom Headers" card on the provider detail page that pre-fills registry transport headers. Only rows the user changes are stored (`settings.providerOverrides`) and merged last at dispatch, so code-side registry bumps keep winning for untouched rows. Header name/value validation and a **blocked list** gate the API route.

### Files changed (significant)
- `src/app/api/providers/[id]/overrides/route.js` (110 lines NEW) — API route with validation
- `src/app/(dashboard)/dashboard/providers/[id]/CustomConfigCard.js` (181 lines NEW) — UI
- `open-sse/executors/base.js` — merge `providerOverrides.headers` into outbound request
- `open-sse/handlers/chatCore.js` — pass overrides through
- `src/lib/db/repos/settingsRepo.js` — `providerOverrides: {}` in settings schema

### Security-relevant design — BLOCKED LIST ✅
The commit message explicitly names blocked headers: **Host, Authorization, Cookie, …** This prevents users from:
1. Overriding `Host` to redirect requests to attacker-controlled servers (SSRF)
2. Injecting their own `Authorization` to impersonate other accounts
3. Setting `Cookie` to smuggle session state

The blocked list is enforced at the API route level, before the data reaches the DB or the executor.

### Integration verification (2026-10-26)
- ✅ `src/app/api/providers/[id]/overrides/route.js` exists
- ✅ `open-sse/executors/base.js:132` — `if (providerOverrides?.headers) Object.assign(headers, providerOverrides.headers)`
- ✅ `open-sse/handlers/chatCore.js:406,475` — passes `providerOverrides` through
- ✅ `src/lib/db/repos/settingsRepo.js:110` — `providerOverrides: {}` in schema
- ✅ `PUT /api/providers/[id]/overrides` is in ALWAYS_PROTECTED (requireAuth-gated)

### Security implications

**POSITIVE:**
1. Blocked list prevents the most dangerous header injections
2. Registry defaults win for untouched rows (code-side bumps override stale user config)
3. Route is auth-gated

**CONCERN 1 (MEDIUM, needs verification): Blocked list completeness**
Need to verify the exact blocked list includes: `Host`, `Authorization`, `Cookie`, `Content-Length`, `Transfer-Encoding`, `Connection`, `Proxy-Authorization`, `x-9r-peer-token`, `x-9r-real-ip`. A missing entry could allow header smuggling.

**CONCERN 2 (LOW, accepted): User-controlled header injection**
By design — the feature lets power users add custom headers for providers that need non-standard auth or routing headers. The blocked list is the defense.

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `f7a641d3` route-level requireAuth on `providers/[id]/overrides` | This route is in ALWAYS_PROTECTED | ✅ INTEGRATED |
| `1ebed4fc` requireAuth on provider config routes | Same gate | ✅ INTEGRATED |

### Conclusion
**FULLY INTEGRATED.** The blocked-list defense is the critical security control. Needs a follow-up verification of the exact blocked list contents.

---

## Commit 20: `f3f86fdd` — Smart Router (System One) session stickiness (LOW)

**Date:** 2026-10-23
**Author:** Михаил Голощанов
**Subject:** feat(combos): add Smart Router (System One) with adaptive session stickiness (#4975)

### What upstream added
Smart combo routing strategy powered by in-process System One evaluation with adaptive session stickiness (Smart Switch, Strict Lock, Per-Turn) to retain prompt cache.

### Integration verification (2026-10-26)
- ✅ `open-sse/services/systemoneRouter.js` (259 lines NEW) exists
- ✅ `src/sse/services/systemoneRouter.js` (115 lines NEW) exists
- ✅ `src/shared/components/SmartPolicyModal.js` (212 lines NEW) exists
- ✅ Session stickiness store: `${comboName}:${sessionId}` → `{ model, lastUsed }`

### Security implications
**INFO:** In-memory stickiness store. No new credential surface. No new network trust boundary. The `sessionId` is client-supplied but only used as a map key — no injection risk.

### Conclusion
**FULLY INTEGRATED.** Feature addition, no security concern.

---

## Commit 21: `813a0121` — Token fallback + stable key masking in stats (LOW-MEDIUM)

**Date:** 2026-10-15
**Author:** Mike (miqonee)
**Subject:** fix(usage): token fallback for input_tokens rows and stable key masking in stats

### What upstream fixed
1. **Token counting bug:** The 24h/today live-history branch read only `tokens.prompt_tokens` from the JSON blob, so rows recorded with `input_tokens` (embeddings, Gemini) counted as zero. Now falls back to `input_tokens` and the persisted `promptTokens` column.
2. **Stable key masking:** `maskApiKey` and the `apiKeyMap` lookup now `trim()` so whitespace variants resolve and mask consistently. Key-name fallback shows the masked key instead of the raw key prefix.

### Integration verification (2026-10-26)
- ✅ `src/lib/db/repos/usageRepo.js:6` — `maskApiKey` trims input
- ✅ `src/lib/db/repos/usageRepo.js:334,514,641` — `maskApiKey` used in all read paths
- ✅ `src/lib/db/repos/usageRepo.js:591` — `tokens.prompt_tokens || tokens.input_tokens || r.promptTokens` fallback chain

### Security implications

**POSITIVE (info leak prevention):**
The key-masking fix closes a real info-leak path: whitespace variants of the same key previously resolved to different masked forms, which could leak the raw key prefix in the dashboard when the UI compared masked strings. Now the mask is stable regardless of whitespace.

**CONCERN 1 (INFO, accepted): `maskApiKey` is display-only, not a crypto primitive**
This is `slice(0,8) + "***" + slice(-4)` — suitable for dashboard display but not suitable as a hash or token. Correct usage context.

### Conclusion
**FULLY INTEGRATED.** Data integrity + info leak prevention fix.

---

## Commit 22: `a8f63f4d` — no-auth free providers in /v1/models + prune custom models (LOW)

**Date:** 2026-10-15
**Author:** Mike (miqonee)
**Subject:** fix(models): expose no-auth free providers in /v1/models and prune custom models on node deletion

### What upstream fixed
1. **Free provider exposure:** `buildModelsList` now registers virtual connections for `noAuth` free providers (e.g., opencode, edge-tts) so their models stay listed in `/v1/models` even when other providers are connected.
2. **Custom model pruning:** `deleteProviderNode` now also deletes compatible-node `customModels` kv rows, so deleted nodes stop surfacing models.

### Integration verification (2026-10-26)
- ✅ `src/app/api/v1/models/route.js:371-380` — `FREE_PROVIDERS` loop creates virtual connections for `noAuth` providers
- ✅ `src/app/api/v1/models/route.js:420,575` — `isDisabled()` now checks `providerId` alongside alias
- ✅ `src/lib/db/repos/nodesRepo.js` — prune logic present

### Security implications
**INFO:** No new trust boundary. The `/v1/models` endpoint is a read-only listing; authentication is enforced by the standard API key gate. Free-provider virtual connections are flagged `id: "noauth"` and cannot be used for request dispatch.

### Conclusion
**FULLY INTEGRATED.** Correctness fix for model listing.

---

## Commit 23: `59e9b526` — Attested free-tier identity for -free models (MEDIUM)

**Date:** 2026-10-13
**Author:** alwaghani
**Subject:** fix(opencode-zen): use attested free-tier identity for -free models on keyed lane (#4784)

### What upstream fixed
Free-tier models (those with `-free` suffix) are gated behind the attested free-tier identity even when the request comes through a keyed lane. Without this fix, a user with an API key could route `-free` model requests through their paid identity, bypassing the provider's free-tier rate limits and quota accounting.

### Integration verification (2026-10-26)
- ✅ `open-sse/providers/models/helpers.js:42` — comment: "these behind the attested free-tier identity even on the keyed lane"
- ✅ `open-sse/executors/opencode-zen.js:286` — comment: "Free-tier models are gated behind the attested free-tier identity"

### Security implications

**POSITIVE (quota enforcement):**
This is an **anti-abuse** control — prevents keyed users from consuming free-tier quota under their paid identity. The attestation mechanism ensures free-tier requests use the correct identity regardless of which lane the request entered.

**CONCERN 1 (INFO, accepted): Attestation mechanism**
The attested identity is a server-side constant, not user-supplied. No injection risk.

### Intersection with our work
| Our commit | Intersection | Status |
|---|---|---|
| `1ebed4fc`/`f7a641d3` route-level requireAuth | Keyed lane is auth-gated; this fix is about identity selection WITHIN the keyed lane | ✅ CLEAN |

### Conclusion
**FULLY INTEGRATED.** Anti-abuse quota enforcement.

---

## Side-finding: migration registry divergence on deployed DBs

**Discovered 2026-10-26** during the :20130 smoke test that the hook named ("Build dashboard + smoke-test on port 20130").

**Signal:** The standalone server's startup log shows:
```
[DB][migrate] REFUSING to apply migrations: migration registry diverged from this database
(stored: "1:initial|3:message-facets|4:message-annotations|5:add-seen-models",
 expected: "1:initial|3:message-facets|4:message-annotations|5:add-seen-models|6:add-access-columns")
```

**Root cause:** The user's local `~/.9router/db/data.sqlite` was last migrated by a build predating our commit `10772992` which added `src/lib/db/migrations/006-access-columns.js`. That migration restores the `accessRestricted` + `accessAllow` columns on `apiKeys` (which upstream bakes into `001-initial.js` but our branch's migrations predate). The migrator's **registry-integrity gate** (added in `380ee9e9` "migration runner registry-integrity gate + dry-run preview") correctly refuses to apply migrations when the installed registry fingerprint differs from the DB's stored fingerprint.

**Security interpretation:** This is NOT a bug — the refusal is the security control working. Blindly applying migrations after registry divergence risks silent corruption. The migrator:
1. Persists the refusal reason to `_meta.migrationWarnings`
2. Keeps the DB read-usable
3. Still runs `syncSchemaFromTables()` (additive, declarative, idempotent)

**Operator action needed:** The user's local DB needs a one-time fingerprint update to accept the new migration. This is a data-plane operation on the user's own DB, not a code fix. Recommend: `UPDATE _meta SET value = '<expected-fingerprint>' WHERE key = 'migrationRegistryFingerprint';` after confirming the registry is trustworthy, OR a CLI command to accept the new registry.

**Intersection with per-PR queue:** This divergence is the **direct downstream effect** of the `2aa9307f`/`6ed88685` per-key quotas + revert pair we're about to audit. The columns being restored are the access-control columns those commits added and reverted. Analyzing in commit 9 below.

**Priority: MEDIUM** (deployed DBs may have the same refusal on upgrade; needs a documented operator path).

---

## Web-cookie follow-ups (from commit 3 `38a0c449`) — executed 2026-10-26

### Follow-up 1: Cookie/profile storage location + permissions — **OPEN (MEDIUM)**

**Code path:** `open-sse/services/webLogin.js:26-28` → `profileDir()` → `getWritableDataDir()` at `open-sse/utils/writableDataDir.js:13-27`.

**Finding:** `getWritableDataDir()` resolves through `DATA_DIR` → `~/.9router` → `tmpdir/9router` → `cwd` and calls `fs.mkdirSync(base, { recursive: true })` — but **never sets `mode: 0o700`**. Browser profiles containing captured cookies (real user sessions for ChatGPT, Gemini, Grok, DeepSeek, Muse, uc-web, veoaifree-web) land under `<DATA_DIR>/browser-profiles/<profile>/` with the process default umask.

**Risk:** On a shared host or multi-user box where other users have read access to `~/.9router`, any local user could read the captured cookie jars and impersonate the logged-in user at those providers. Captured cookies are equivalent to the user's session password.

**Fix needed:**
- `writableDataDir.js:21` — `mkdirSync(base, { recursive: true, mode: 0o700 })`
- `webLogin.js:27`'s `profileDir()` call — enforce `0o700` on the profile dir itself
- Existing profiles on deployed hosts need a one-time `chmod 700 ~/.9router/browser-profiles`

### Follow-up 2: Browser pool cross-provider isolation — **CLEAN ✅**

**Code path:** `open-sse/services/browserPool.js:327` builds `poolKey = ${headless ? "headless" : "headed"}:${key}` where `key` is caller-supplied.

**Finding:** Each executor passes a provider-scoped key (the connection id or provider id). Cross-provider context leakage does not happen within a single pool instance. The `state.contexts` Map is keyed by this compound key; `existing.lastUsed` renewal, TTL eviction, and idle-timer shutdown all operate per-key.

**No fix needed.**

### Follow-up 3: Browser profile cleanup on DELETE /api/providers/[id] — **OPEN (MEDIUM)**

**Code path audit:** `grep` for `browser-profiles|profileDir|removeProfile|cleanupProfile` in `src/**/*.js` returned **zero matches** — no code path removes a browser profile when a web-login connection is deleted.

**Finding:** The only DELETE on `/api/providers/web-login` (at `src/app/api/providers/web-login/route.js`) cancels a *running* login session, not a stored connection. When `DELETE /api/providers/[id]` fires on a web-login connection, `deleteProviderConnection(id)` runs in `src/app/api/providers/[id]/route.js` but **the profile directory at `~/.9router/browser-profiles/<profile>/` persists forever** with its captured cookies intact.

**Risk:** Orphaned cookie jars accumulate on disk indefinitely. If the captured session is still valid at the provider, the deleted connection's cookies remain usable by anyone with filesystem read access. A long-running deployment that cycles through web-login accounts builds an ever-growing archive of valid sessions.

**Fix needed:**
- `src/app/api/providers/[id]/route.js` DELETE handler — after `deleteProviderConnection(id)`, if the deleted connection had `providerSpecificData.authMethod === "web-login"`, call `rmSync(profileDir(connection.profile || "default"), { recursive: true, force: true })`
- Add a bulk-cleanup admin endpoint or a periodic sweep for profiles with no matching connection

### Updated follow-up queue

| Item | Source | Priority | Status |
|---|---|---|---|
| ~~Cookie storage location + file permissions~~ | `38a0c449` | MEDIUM | **OPEN — fix needed** (chmod 0700) |
| ~~Browser pool cross-provider isolation~~ | `38a0c449` | MEDIUM | ✅ CLEAN |
| ~~Cookie cleanup on DELETE /api/providers/[id]~~ | `38a0c449` | MEDIUM | **OPEN — fix needed** (rmSync on delete) |
