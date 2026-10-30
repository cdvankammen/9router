# Security Audit Remediation Status

Cross-reference between `.agent/SECURITY_AUDIT_WAVE_674.md` (the audit doc) and the actual codebase state on branch `v5-vscode-works`.

**Last updated:** 2026-10-30 (session 26, commit ee8b106c — GAP-P1-25 + GAP-P3-30 + GAP-P2-20 + iflow mock fix; all SHAs are post-filter-repo)
**Branch:** v5-vscode-works @ ee8b106c, pushed to `fork` (cdvankammen/9router)
**mini4 production:** BUILD_ID `cFuvmbIblzDToqSFDDLMI`, PID 41624, port 20128, health=ok, encryption 4/4 intact

## How to read this document

- **FIXED** — code change landed on this branch with `SECURITY (Finding #NNN)` annotation or fix commit
- **DEFENDED** — existing code already provides the defense (finding was a false positive or pre-addressed)
- **WONTFIX** — by design (the product IS the thing being flagged)
- **OPEN** — genuinely unfixed, agent-fixable with operator input
- **ARCHITECTURAL** — requires operator design decision before an agent can implement

## CRITICAL findings

| # | Status | Evidence |
|---|--------|----------|
| #233 shutdown JWT-only | FIXED | `SHUTDOWN_SECRET` second factor added (shutdown/route.js:51) |
| #235 JWT revocation | ARCHITECTURAL | Needs server-side blacklist design |
| #236/#278 importDb bypass | FIXED | PROTECTED_SETTING_KEYS stripped (db/index.js:129) |
| #239/#252 provider-nodes SSRF | FIXED | `assertPublicUrlResolved` (provider-nodes/route.js:25) |
| #241 hooks SSRF | FIXED | `assertPublicUrlResolved` (hooks/route.js:78) |
| #244/#245/#267 lockout DoS | DEFENDED | Fixed upstream; live server not accessible for re-verification |
| #250 model alias injection | DEFENDED | `RESERVED_PROVIDER_PREFIXES` set in `src/sse/services/model.js:12-18` is built from registry id/alias/aliases and blocks user-defined node prefixes from overriding built-in providers. |
| #265 ChangelogModal XSS | FIXED | `sanitizeChangelogHtml` + SHA pin (ChangelogModal.js:19, config.js:16) |
| #266 auto-JWT on requireLogin:false | DEFENDED | `createDashboardAuthToken` only called from login/OIDC/SAML callbacks — not auto-minted |
| #219/#220 OIDC origin poisoning | DEFENDED | `custom-server.js` strips x-forwarded-host at edge |
| #287 GitLab OAuth SSRF | FIXED | `assertGitLabHostSafe` (oauth/providers/gitlab.js:13) |
| #289 rate-limit gap | FIXED | `custom-server.rate-limiter.js` wired into root custom-server.js |
| sec-3673 WAL checkpoint stall | FIXED | `TRUNCATE` → `PASSIVE` in all 3 adapters (26a1d80f) |
| #295 API keys plaintext SQLite | FIXED + DEPLOYED + PROVEN (mini4 2026-10-30) | Code: Phase 1 (5b165dc7) `apiKeys.key`+`keyHash`. Phase 2 (4ee331ab) `usageHistory.apiKey`+`apiKeyHash`. `providerConnections.data` already encrypted (#296). `requestDetails` headers DEFENDED by `sanitizeHeaders()`. **Live production proof (both tables)**: mini4 v0.5.112 standalone deploy (BUILD_ID x4d-vSns4TaW_Arl9f7AY), schema=8. apiKeys: 4/4 rows `enc:v1:`, decrypt-on-read verified via `/api/keys` returning masked plaintext. usageHistory: LIVE DB proof — `encryptToken()` → `enc:v1:90b9e432d0c90655bfc05f76:2a1933ae...` inserted into production `data.sqlite`, `hashApiKey()` → SHA-256 `965361e75056929b...` verified, `decryptToken()` round-trip returned exact plaintext, test row cleaned up. Unit tests: 4/4 pass (encrypt-at-rest, hash-for-dedup, NULL handling, decrypt-then-mask). 0 regressions vs baseline. |
| #300 TLS rejectUnauthorized | WONTFIX | Product IS a MITM proxy |

## HIGH findings

| # | Status | Evidence |
|---|--------|----------|
| #251 console log stack traces | FIXED | `maskSensitiveHeaders` re-enabled (open-sse/utils/requestLogger.js:74) |
| #253 GitLab PAT SSRF | FIXED | `assertHostNotLinkLocalResolved` (oauth/gitlab/pat/route.js) |
| #254 OAuth bulk-import unvalidated | FIXED | `requireAuth` added to 13 OAuth routes |
| #256 pxpipe @latest | ARCHITECTURAL | Operator must pick version pin |
| #257 contextWindow override | FIXED | `sanitizeContextWindow` now caps at 10,000,000 tokens (10x largest shipping model in 2026). Overrides above ceiling are silently clamped (model-context/route.js:20). |
| #264 CSRF settings PATCH/DELETE | DEFENDED | SameSite=lax + middleware JWT gate; no CSRF token needed for cookie-auth APIs |
| #275 requestLogger mask disabled | FIXED | Re-enabled (open-sse/utils/requestLogger.js — Finding #275 annotation) |
| #281 webhook SSRF | DEFENDED | Transitive — hooks route has assertPublicUrlResolved (#241 fix) |
| #286 Kiro PKCE | ARCHITECTURAL | OAuth flow refactor needed |
| #291 Gemini STT token-in-URL | FIXED | `x-goog-api-key` header (sttCore.js:124) |
| #292 urlToBase64 SSRF | FIXED | `assertPublicUrlResolved` + 16MB cap (imageProviders/_base.js) |
| #293 default password hint | FIXED | Gated on `hasPassword:false && initialPasswordSet:false` (login/page.js) |
| #294 claudeEnv deny-list | FIXED | `DENY_ENV_KEYS_EXACT` (claudeEnv.js:61) |
| #296 token encryption wiring | FIXED | `encryptConnectionTokens` wired (connectionsRepo.js:70) |
| #297 CLI show cleartext | DEFENDED | `show.js` uses `maskKey()` on all API keys (cli/src/cli/commands/show.js:51) |
| #298 markdownReport redaction | FIXED | `redactSecrets` walker (markdownReport.js) |
| #299 MITM sudo password cache | FIXED | TTL + module-private state (mitm/manager.js:130) |

## MEDIUM findings (selected)

| # | Status | Evidence |
|---|--------|----------|
| #303 x-9r-* header spoofing | FIXED | Stripped at edge (custom-server.js) |
| #304 native passthrough sanitization | FIXED | Sanitizers applied (commit c18b820b) |
| #305/#306 rawHeaders allowlist | FIXED | mergeAnthropicBeta whitelist (commit cf526504) |
| #308 MITM bind 0.0.0.0 | FIXED | Bound to 127.0.0.1 (commit cf763139) |
| #309 collectBodyRaw DoS | FIXED | 16MB cap (MITM_MAX_BODY_BYTES) |
| #310 certCache unbounded | FIXED | 64-entry FIFO (MITM_CERT_CACHE_MAX) |
| #312 MITM cert mode 0644 | FIXED | mode 0o600 (rootCA.key) |
| #316 outboundProxyUrl SSRF | FIXED | `assertHostNotLinkLocalResolved` (outboundProxy.js) |
| #317 importDb PROTECTED bypass | FIXED | Strip in importDb() (db/index.js:129) |
| #318 health/providers topology | FIXED | `requireAuth` added (health/providers/route.js:21) |
| #319 cookie Secure flag | FIXED | AUTH_COOKIE_SECURE documented (commit dc2bf2f6) |
| #320 MIMO proxyUrl SSRF | FIXED | Loopback allowlist (commit e1f2cabc) |
| #321 IDOR pattern | FIXED | Route-level requireAuth added to multiple endpoints |
| #322/#323 MCP/xiaomi timing side-channel | FIXED | `crypto.timingSafeEqual` (commit 84b663a2 + 30ce9e56) |
| #324/#340 login error oracle | FIXED | Uniform error message (login/route.js:108) |
| #325 sw.js 500 in production | DEFENDED | `copy-standalone-assets.mjs` copies `public/` to standalone AND probe on live mini4 (BUILD_ID x4d-vSns4TaW_Arl9f7AY) returns 200 for `/sw.js`. Icons (`/icons/icon-192.png`) return 404 — separate PWA asset issue, not the sw.js finding. |
| #326 Google OAuth secrets | FIXED | Env-overridable (shared.js + .env.example, commit 232fc0cf) |
| #327 tunnel shortId Math.random | FIXED | `crypto.randomBytes` (tunnel/shared/state.js:35) |
| #328 failover-proxy status endpoint | FIXED | Optional bearer token via --status-token / NINEROUTER_FAILOVER_STATUS_TOKEN with timingSafeEqual compare (failover-proxy.cjs). Bind address unchanged — the proxy must be externally reachable to forward traffic |
| #329 Host header trust | DEFENDED | `custom-server.js` strips `x-forwarded-host`, `x-forwarded-proto`, `x-forwarded-server`, `x-original-host`, `x-real-host` at socket boundary. `getPublicOrigin` only sees raw `Host` header (TCP-peer controlled, not attacker-spoofable remotely). OIDC state/nonce validation + SAML InResponseTo/Destination checks provide protocol-level defense-in-depth. Operator should still set `BASE_URL` for production deployments behind trusted proxies. |
| #330 CLI app v0.5.75 | ARCHITECTURAL | Release engineering decision |
| #331 SAML metadata leak | FIXED | `getSamlBaseUrl` used (saml/metadata/route.js:13) |
| #332 SAML InResponseTo | FIXED | Mandatory check (saml.js:156, commit 42c67928) |
| #333 auth/status unauthenticated | DEFENDED | Login page needs pre-auth access to render correctly |
| #334 logout CSRF | DEFENDED | SameSite=lax + profile page caller is auth-gated; low-impact |
| #335 loginLimiter "unknown" bucket | DEFENDED | Intentional — "single bucket so spoofed XFF rotation cannot escape" |
| #336 require-login tunnel leak | FIXED | Only `{requireLogin}` returned (settings/require-login/route.js) |
| #337 translator credential leak | FIXED | `redactSensitiveHeaders` (translator/translate/route.js) |
| #338 translator/send rate limit | DEFENDED | Middleware ALWAYS_PROTECTED + rateLimiter 600/min default |
| #339 pxpipe @latest | ARCHITECTURAL | Operator picks version |
| #341 apiKey Math.random | FIXED | `crypto.randomBytes` (apiKey.js:14) |
| #342 cloudflared supply-chain | ARCHITECTURAL | Operator picks release + checksum |
| #343 model-catalog supply-chain | ARCHITECTURAL | Operator pins catalog hash |
| #344 MITM serial Math.random | FIXED | `generateSerialHex` CSPRNG (mitm/cert/rootCA.js:131) |

## AUDIT-002 (GHSA-vjc7)

| Status | Evidence |
|--------|----------|
| FIXED | `maskApiKey()` bucket keys in all 3 paths (usageRepo.js:98, 578, 655, commit e2bf16bf) |

## Cherry-picked reliability gaps (session 26)

| Gap | Status | Evidence |
|-----|--------|----------|
| GAP-P1-25 provider validation timeouts | FIXED | 22 `AbortSignal.timeout(8000)` added (fc3ddbe7, cherry-pick of d0b9e29e) |
| GAP-P2-20 gitlab-pat timeout | FIXED | `AbortSignal.timeout(10000)` added (31785669, cherry-pick of d787cc5f) |
| GAP-P2-21 iflow cookie timeout | DEFENDED | Source already had `AbortSignal.timeout(15000)` — test mock fixed (ee8b106c) |
| GAP-P3-30 translator alert() | FIXED | 9 `alert()` → toast notifications (0e1ab3a1, cherry-pick of 31619bb1) |
| GAP-P1-05 onRequestSuccess guard | DEFENDED | Guard + test already in HEAD |
| GAP-P2-ERR silent catch blocks | DEFENDED | 20/20 tests pass — fix already merged |
| #3714 suggested-models SSRF | DEFENDED | `fetchPublic` already guards (suggested-models/route.js:76) |
| GAP-P1-17 headerSanitizer | ARCHITECTURAL | Module exists at `src/lib/middleware/headerSanitizer.js` but is never imported outside its own barrel export. `custom-server.js` already strips the dangerous headers at the TCP socket boundary (lines 68-80). Operator decision: is the middleware-layer redundancy worth the wiring cost? |

## Findings needing investigation (no clear status)

These findings from the audit doc have no SECURITY annotation or fix commit on this branch. Each needs honest code investigation:

- **#21, #42** — low-numbered findings from early waves, likely pre-branch fixes
- **#282** — need to locate in audit doc and verify against code
- **#301, #307, #311, #313, #314, #315** — mid-wave findings, status unknown

## Untracked sensitive files (resolved)

- `.agent/mint-jwt.cjs` — JWT minter using real host secret → now gitignored
- `.agent/mini4-launch.sh` — launcher script → now gitignored
- `.agent/` directory added to `.gitignore` to prevent accidental commit

## How to verify a finding's status

1. `grep -rn 'Finding #NNN\|SECURITY.*#NNN' src/ open-sse/ cli/` — code annotations
2. `git log origin/master..HEAD --oneline | grep '#NNN'` — fix commits
3. Read the actual file and look for the defense
4. Run the relevant test: `cd tests && npx vitest run unit/<finding-name>.test.js`

