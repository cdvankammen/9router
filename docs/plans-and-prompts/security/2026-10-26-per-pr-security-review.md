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

**Total security-relevant upstream commits identified: 176**
**Reviewed so far: 3**
**Remaining: 173 (prioritized above for security surface)**

## Follow-up work queue (from per-PR findings)

| Item | Source commit | Priority | Effort |
|---|---|---|---|
| Audit webLogin cookie storage location + file permissions | `38a0c449` | MEDIUM | 30 min |
| Verify browserPool cross-provider isolation | `38a0c449` | MEDIUM | 30 min |
| Verify cookie cleanup on `DELETE /api/providers/[id]` | `38a0c449` | MEDIUM | 20 min |
| Flag `38a0c449` for auto-rewrite audit (Claude Code co-author) | `38a0c449` | LOW | 5 min |
