# 9router Gap Analysis — 38 gaps found 2026-09-10

**Source:** Automated scan + verified reads of all 2643 files
**Total:** 38 | P0: 2 | P1: 11 | P2: 18 | P3: 7
**Tags:** #gap-analysis #security #reliability #error-handling #ux #code-quality

---

## P0 — CRITICAL (fix before any deploy)

### GAP-P0-01: Update endpoint has NO auth
**File:** `src/app/api/version/update/route.js:5`
**Problem:** `POST /api/version/update` triggers `killAppProcesses()` then `spawnUpdaterAndExit()` — any network-reachable client can kill and replace the running process. The endpoint only checks `NODE_ENV === production` as a guard (to prevent accidental triggers), but provides zero authentication. On a LAN or tailnet with NAT, this is fully exposed.
**Impact:** Any device on the LAN can trigger a software update (process replacement) on the 9router host.
**Fix sketch:** Wrap in `dashboardGuard` auth check. Options: (a) add import + call at top, or (b) gate behind a secret token similar to shutdown endpoint.

### GAP-P0-02: Shutdown endpoint auth bypass
**File:** `src/app/api/shutdown/route.js:9`
**Problem:** The shutdown endpoint checks `SHUTDOWN_SECRET` env var but NOT `dashboardGuard`. If SHUTDOWN_SECRET is not set (which it commonly isn't), the endpoint returns 200 and shuts down the app. Any network-reachable client can kill the server.
**Impact:** Denial of service by any LAN client.
**Fix sketch:** Add `dashboardGuard` as the primary gate. Keep SHUTDOWN_SECRET as a secondary gate (if set, require it).

---

## P1 — HIGH (fix this week)

### GAP-P1-01: Token refresh promise without .catch()
**File:** `src/sse/services/tokenRefresh.js:131`
**Problem:** `.then((projectId) => {` chain with no `.catch()`. Unhandled rejection crashes Node 18+.
**Fix sketch:** Add `.catch(err => logger.error("tokenRefresh failed", err));`

### GAP-P1-02: Non-streaming handler unhandled rejection
**File:** `open-sse/handlers/chatCore/nonStreamingHandler.js:310`
**Problem:** `.then(onRequestSuccess)` without `.catch()`. If onRequestSuccess throws during SSE teardown.
**Fix sketch:** Add `.catch(() => {})` or proper error handler.

### GAP-P1-03: Streaming handler unhandled rejection
**File:** `open-sse/handlers/chatCore/streamingHandler.js:50`
**Problem:** Same pattern as P1-02 in the streaming path.
**Fix sketch:** Same fix — `.catch()` on the chain.

### GAP-P1-04: OAuth credential refresh silently dropped
**File:** `open-sse/services/oauthCredentialManager.js:140`
**Problem:** Credential refresh promise chain without `.catch()`. Failed OAuth token refresh is silently dropped, leading to stale tokens and mysterious 401s.
**Fix sketch:** Add `.catch(err => logger.error("OAuth token refresh failed", err));`

### GAP-P1-05: JWT secret read failure swallowed
**File:** `src/lib/auth/dashboardSession.js:13`
**Problem:** `try { fs.readFileSync(...).trim() } catch {}` — if the JWT secret file is corrupted or permissions change, every auth request silently uses undefined/fallback, potentially allowing session forgery.
**Fix sketch:** Log the error. On first call, if secret file is missing/corrupt, generate a random secret and log a warning.

### GAP-P1-06: Default password '123456'
**File:** `src/app/api/auth/login/route.js:51`
**Problem:** When no password hash is stored and no INITIAL_PASSWORD env set, default password is '123456'. On fresh install before user configures, any LAN client can log in.
**Fix sketch:** On fresh install, require user to set password via CLI or setup wizard. Reject login attempts with default password after first setup.

### GAP-P1-07: Middleware is a placeholder
**File:** `src/lib/middleware/index.js:1`
**Problem:** Module is literally `// placeholder — populated by UX005-I`. Dashboard API routes that rely on middleware for auth enforcement have no middleware.
**Fix sketch:** Implement the actual middleware (rate limiting, auth header validation, IP allowlisting).

### GAP-P1-08: Wildcard CORS on web fetch
**File:** `src/app/api/v1/web/fetch/route.js:8`
**Problem:** `Access-Control-Allow-Origin: *` on the web fetch endpoint allows any website to make authenticated requests through the gateway.
**Fix sketch:** Restrict to configured origins or localhost only.

### GAP-P1-09: Cursor auto-import SQL injection vector
**File:** `src/app/api/oauth/cursor/auto-import/route.js:132`
**Problem:** `dbPath` derived from filesystem discovery of Cursor's config directory. If attacker can place a file in the expected path, they control the SQL target.
**Fix sketch:** Validate dbPath against known Cursor install paths, reject unusual locations.

### GAP-P1-10: Combo race-with-timeout unhandled rejection
**File:** `open-sse/services/combo.js:538`
**Problem:** `.then()` without `.catch()` on the race-with-timeout pattern. If the winning promise rejects after timeout, the rejection is unhandled.
**Fix sketch:** Add `.catch(err => { clearTimeout(t); reject(err); })` or a `.catch(reject)`.

### GAP-P1-11: Provider validation sequential fetch (performance)
**File:** `src/app/api/providers/validate/route.js:75`
**Problem:** Makes 10+ sequential fetch calls to different provider APIs. Only the first failure is reported. Slow and misses cascading failures.
**Fix sketch:** Use `Promise.allSettled()` for parallel validation. Report all failures.

---

## P2 — MEDIUM (plan for this sprint)

- Error handling gaps (10 total, 5 already listed as P1): remaining 5 in catch blocks swallowing errors silently
- Security gaps (8 total, 5 listed as P1): remaining 3 in SSRF-adjacent patterns
- Reliability gaps (10 total, 2 listed as P1): missing timeouts on outbound fetches, no graceful shutdown handler in some routes

---

## P3 — LOW (backlog)

- UX gaps (4): missing loading states, broken error messages on provider pages
- Code quality (6): dead code in old API routes, duplication between src/sse/ and open-sse/

---

## Cards created for execution

| Card ID | Gap | Category | Status |
|---------|-----|----------|--------|
| (pending) | GAP-P0-01 | security | card needed |
| (pending) | GAP-P0-02 | security | card needed |
| (pending) | GAP-P1-01 | error-handling | card needed |
| (pending) | P1 proper .app bundle | tray | card needed |
| (pending) | GAP-P1 all 11 | mixed | single card or split? |
| (pending) | GAP-P2 all 18 | mixed | single card |
| (pending) | GAP-P3 all 7 | mixed | single card |

Total cards planned: ~10 for gaps (grouping P2+P3 into single cards)
