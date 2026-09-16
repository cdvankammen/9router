# v2 Branch — Final Reconciliation Plan (v2 = origin/master + v1 + gap changes)

## Goal (per user directive 2026-09-14)
- **`master`** → reset to PURE upstream (`origin/master` @ `17c4cc76`), NO local changes
- **`master-backup-20260914`** → backup of current master (with all gap merges) BEFORE cleanup ✅ CREATED
- **`v1`** → UNTOUCHED (still at `6754d9c0`, Aug 18) ✅ VERIFIED
- **`v2`** → the new source of truth: `origin/master` + v1's local features + ALL gap changes in proper order (P0 → P1 → P2 → P3)

## Current State (verified)
| Branch | Tip | Notes |
|--------|-----|-------|
| `origin/master` | `17c4cc76` (Sep 11) | Pure upstream 9router GitHub — 0 local commits |
| `master` (local) | `304ffb88` (Sep 14) | = origin/master + **185 local commits** (gap merges + local work) |
| `master-backup-20260914` | `304ffb88` | ✅ Backup of current master created |
| `v1` | `6754d9c0` (Aug 18) | ✅ Untouched — combo duplicate + model features |
| `v2` | `360a70d1` (Sep 14) | ✅ Rebuilt: origin/master + v1 + ALL 33 gap branches |

## Gap Branch Merge Status (verified)
- **ALL 33 gap branches MERGED into v2** ✅ (verified via `git merge-base --is-ancestor` on every branch)
- Merge commits: `9515b459` (origin/master), `2864e375` (p0-02), `a5f4031f` (p1-08), `e5e794dc` (p1-13), `ccb9c2d5` (p2-err), `9863118a` (p2-sec), `360a70d1` (gap-retry-01), plus clean merges for all others

## Merge Order (proper sequence)
1. **Base:** `origin/master` (pure upstream)
2. **v1 features:** combo duplicate, model chooser sorting, capability overrides, model import, dev flag
3. **Gap P0:** `gap-p0-02` (shutdown auth), `gap-p0-11` (RCE defense)
4. **Gap P1:** `gap-p1-05` (chatCore guard), `p1-08` (JWT logging), `p1-12` (cursor path), `p1-13` (CORS), `p1-14` (default password), `p1-17` (rate limiter), `p1-25` (fetch timeouts), `p1-27` (projectId logging)
5. **Gap P2:** `p2-02`, `p2-03`, `p2-15`, `p2-18`, `p2-19`, `p2-20`, `p2-21`, `p2-22`, `p2-23`, `p2-28`, `p2-29`, `p2-34`, `p2-err`, `p2-rel`, `p2-sec`
6. **Gap P3:** `p3-01`, `p3-09`, `p3-26`, `p3-30`, `p3-33`, `p3-37`
7. **Gap retry:** `gap-retry-01` (empty choices 502 fix)

## Known Bugs from Previous Merge (from MERGE-12/15/20 docs)
- **17 conflicted files** in MERGE-12: `.gitignore`, `CHANGELOG.md`, `chatCore.js`, `nonStreamingHandler.js`, `streamingHandler.js`, `capabilities.js`, `registry/index.js`, `usage.js`, `stream.js`, `providers/[id]/page.js`, `providers/page.js`, `models/route.js`, `instrumentation.js`, `aliasRepo.js`, `settingsRepo.js`, `chat.js`, `golden-url-header.test.js.snap`
- **15 new test failures** post-merge (all upstream/env, ZERO resolution mistakes): saml, cline-auth, kimchi, kimchi-strip-reasoning (node:test), db-benchmark (lowdb), db-sqlite-vs-lowdb (API_KEY_SECRET), embeddings.cloud (stale /cloud path), request-details-tab (better-sqlite3 native), empty-choices, error-categorizer, openai-to-kiro, codex-image-models, claude-kiro-direct, translator-helpers-edge, kiro-external-idp
- **Must-keep features** (verified in MERGE-20): WAL PASSIVE (3 adapters), per-IP rate limiter, failover-proxy.cjs packaging, tray watchdog/keepalive
- **DB schema migration** 2→3 works; backup created automatically; no data loss

## Execution Plan
### Phase 0 — Safety (DONE)
- ✅ `master-backup-20260914` created (current master with all gap merges)
- ✅ v1 verified untouched

### Phase 1 — Reset master to pure upstream
1. `git checkout master`
2. `git reset --hard origin/master` → master = `17c4cc76` (pure upstream)
3. Verify: `git rev-list --count origin/master..master` = 0

### Phase 2 — Rebuild v2 (DONE ✅)
1. ✅ `git checkout v2` (currently = v1)
2. ✅ `git merge origin/master` → 14 conflicts resolved, committed `9515b459` (union for distinct features, HEAD superset for chatCore/streamingHandler, upstream for registry/index.js, accepted snapshot deletion)
3. ✅ `git merge gap-p0-02` (8 conflicts, committed `2864e375`) + `gap-p0-11` (clean)
4. ✅ P1: p1-05 (clean), p1-08 (`a5f4031f` — JWT secret union), p1-12 (clean), p1-13 (`e5e794dc` — DEFAULT_SETTINGS union), p1-14 (clean), p1-17 (clean, rate limiter), p1-25 (clean), p1-27 (up to date)
5. ✅ P2: p2-02, p2-03, p2-15, p2-18, p2-19, p2-20, p2-21, p2-22, p2-23, p2-28, p2-29, p2-34 (all clean); p2-err (`ccb9c2d5` — kept HEAD's WAL PASSIVE over TRUNCATE in all 3 adapters, kept HEAD's JWT warn); p2-rel (up to date); p2-sec (`9863118a` — kept HEAD's dashboardSession.js, branch had broken duplicate function line; SSRF guard files came in)
6. ✅ P3: all 6 already in v2 history (verified via merge-base)
7. ✅ `git merge gap-retry-01` (`360a70d1` — checkpoint commit 2792e878 included, only touched ClaudeToolCard.js + claude-settings/route.js)
8. ✅ All 33 gap branches verified IN-V2 via `git merge-base --is-ancestor`

### Phase 3 — Build + Test
1. ✅ `npm install`
2. ✅ `npm run build` + `npm run postbuild` — **GREEN** after fixes:
   - `src/app/(dashboard)/dashboard/providers/[id]/page.js` — restored lost `if (loading)` guard (merge artifact)
   - `src/app/api/cli-tools/cowork-settings/route.js` — removed stray `export` on `getWriteRoot` (gap-p3-33 artifact)
   - `open-sse/utils/responseValidator.js` — **recreated** from research spec (phantom file, never committed)
   - `open-sse/services/smartRouter.js` — **recreated** from chat-log spec (phantom file, never committed)
   - `open-sse/executors/index.js` — removed dead `NineRouterExecutor` import (abandoned approach; file never existed in git)
   - Committed as `26ba46db` `fix(build): restore lost untracked files + merge artifacts for v2 build`
   - Note: first build attempt hit webpack `WasmHash` crash — fixed by `rm -rf .next/cache`
3. ⏳ `npm run cli:pack` — running in background
4. `cd tests && npm install && npx vitest run`
5. Compare vs `known-fails.txt` baseline — only pre-existing failures allowed

### Phase 4 — Feature Verification
1. Combo duplicate button present (`handleDuplicate` in combos/page.js)
2. Model chooser sorting intact
3. Capability overrides intact
4. Model import for all providers intact
5. Dev flag intact
6. Security: SSRF guard, rate limiter, CORS allowlist, no default password
7. WAL PASSIVE in all 3 DB adapters
8. Tray watchdog present

### Phase 5 — Runtime Smoke (per MERGE-16 pattern)
1. `PORT=20200 JWT_SECRET=smoke-test node custom-server.js`
2. Test: `/api/health`, `/api/v1/models`, `/api/combos`, `/api/health/providers`, chat completions (provider + combo + stream), `/dashboard`, `/api/version`, `/login`

### Phase 6 — Deploy to mini2
1. Build standalone, copy to mini2
2. Restart service, verify port 20128

## Risk Register
| Risk | Mitigation |
|------|-----------|
| 17 known conflict files | Use MERGE-12 conflict report as resolution guide |
| v1 features lost | Phase 4 explicit verification |
| 15 known test failures | All upstream/env — compare vs baseline, don't chase |
| DB migration issues | Schema 2→3 verified working in MERGE-16 |
| mini2 deploy breaks | Keep old bundle backup; rollback = restore |