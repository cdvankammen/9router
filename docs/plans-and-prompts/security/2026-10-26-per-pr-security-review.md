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
- `ef181752` Zed OAuth lifecycle hardening (HIGH)
- `a9d0ad26` AWS Bedrock + SSO credentials (MEDIUM)
- `628ff1ea` 24h maxAge for dashboard cookie (MEDIUM)
- `6af26a9e` Lossless header forwarding for relay pools (MEDIUM — header leakage)
