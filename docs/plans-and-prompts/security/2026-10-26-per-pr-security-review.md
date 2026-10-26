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

**Total security-relevant upstream commits identified: 176**
**Reviewed so far: 2**
**Remaining: 174 (prioritized above for security surface)**
