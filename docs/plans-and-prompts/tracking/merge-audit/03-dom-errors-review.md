# DOM Errors Chat Log Review

This document tracks the review and fixes for all DOM errors found in the 9router-dashboard-DOM-errors chat log.

## Source

- **Chat log**: `9router-dashboard-DOM-errors` (session `3ba69e69-a2a3-4b6e-8e3a-9acd4cb9bb8d`, VS Code Copilot Chat, 2026-10-23)
- **Full audit document**: `docs/plans-and-prompts/research/9router/51-mini2-dashboard-dom-error-audit.md` (665 lines, 17 findings)
- **Recovered chat transcripts**: `.agent/recovered-chat-552ecf4c-COMPLETE.md` (1.6MB, 2576 entries, session 2026-09-14), `.agent/recovered-chat-552ecf4c-full.md` (1.2MB), `.agent/recovered-chat-552ecf4c.md` (117KB)
- **Applies to**: `mini2:20128` (9Router v0.5.75 installed at `/Applications/9Router.app/`; repo at v0.5.95)

## Key Finding from the Audit

The user-reported "ton of DOM errors" on the providers page traced to **two server-side problems**, not actual DOM bugs. Every console error on `/dashboard/providers` was a network `429` or `500` surfacing in the DevTools console — the rendered DOM itself (89 links, 53 provider cards, 17 nav, no duplicate IDs, no Next.js error overlays, no uncaught exceptions) was clean.

## Error Inventory

| # | Symptom | Root Cause | Fix | Status |
|---|---------|------------|-----|--------|
| 1 | 32+ `429 Too Many Requests` on `?_rsc=` and `/_next/` URLs on every page load | `custom-server.rate-limiter.js` counted Next.js RSC prefetches + static chunks as user traffic; providers page alone emits 53+ `<Link>` prefetches → blows the 120 req/min general bucket | Added `isNextInternal()` bypass in both `custom-server.rate-limiter.js` (root) and `cli/app/custom-server.rate-limiter.js`; 3 new regression tests | ✅ Fixed |
| 2 | Every "Add provider" attempt → `500 Failed to create provider` regardless of key validity | Rogue migration `002-fk-provider-connections.js` (in installed v0.5.75 app, NOT in repo) added `FOREIGN KEY providerConnections.provider → providerNodes(id) ON DELETE CASCADE`; built-in providers have no rows in `providerNodes`, so every insert failed FK check | Reverse-migrated live DB at `~/.9router/db/data.sqlite` (backup `data.sqlite.bak-before-fk-drop.*`); rebuilt table without FK, preserved all rows/indexes | ✅ Fixed live |
| 3 | UI has no graceful fallback when API returns 429 mid-render — page shows literal `{"error":"Too many requests"}` with no header/nav/retry | `rateLimitResponse()` returns JSON with no HTML body; no top-level `error.tsx`/`error.js` boundary catches failed RSC segment loads | Added `src/app/(dashboard)/error.js` (dashboard-group boundary with 429/5xx retry UI) + `src/app/global-error.js` (root fallback) | ✅ Fixed |
| 4 | Console Log page API URL guesses 404 | Sidebar nav points to `/dashboard/console-log` but obvious API paths (`/api/console-log`, `/api/console-logs`, `/api/logs`, `/api/log`) all 404; actual routes are `/api/translator/console-logs*` | Not a bug — discoverability note for future agents | ✅ Documented |
| 5 | Google Analytics calls aborted on every page view | `POST https://www.google-analytics.com/g/collect?…` → `net::ERR_ABORTED`; GA blocked or unreachable from mini2 | Cosmetic noise; consider `sendBeacon` wrapper or conditional loading | ⚪ Cosmetic |
| 6 | Sidebar shows stale "New version available: v0.5.109" banner | UI advertises upgrade to v0.5.109 from installed v0.5.75 | **Do NOT click** until migration-registry discrepancy (Finding #2) is resolved | ⚠️ Blocked on #2 |
| 7 | Provider page DOM audit | 89 links, 53 provider cards, 25 buttons, 0 duplicate IDs, 0 Next.js error portals, 0 uncaught page errors, no hydration markers | Renders correctly when not 429'd; no accessibility regressions | ✅ Clean |
| 8 | Post-restart: `_rsc` 429s persist despite patch on disk | Patch verified on disk but live server still 429ing `_rsc=` URLs — second rate limiter (`src/lib/middleware/rateLimiter.js`) or stale process | See Finding #16 for confirmed root cause + fix | ✅ Fixed (see #16) |
| 9 | `custom-server.rate-limiter.js` is not the only rate limiter | `src/lib/middleware/rateLimiter.js` exports `checkRateLimit()` — separate per-IP limiter with 30-request burst limit | Confirmed real and wired into `src/dashboardGuard.js:proxy()` | ✅ Confirmed |
| 10 | Full dashboard page inventory (25 URLs visited) | Exhaustive walk: combos, endpoint, providers, usage, messages, statistics, quota, token-saver, claude-compat, memory, cli-tools, proxy-pools, skills, model-context, console-log, profile, header bar, sidebar, 6 media sub-pages | 25 distinct URLs, 1250+ interactive elements inventoried, 6 media sub-pages fully walked | ✅ Complete |
| 11 | Media Provider sub-pages (6 sub-pages, 92 providers total) | Embedding (17, has "Add Custom"), Image (21), TTS (17), STT (7), Video (3), Web (27, two "Create Combo" buttons) | Embedding only sub-page with "Add Custom"; Video smallest (3); Web largest (27) | ✅ Documented |
| 12 | Hardcoded Chinese strings across 3 dashboard files (i18n bug) | `model-context/page.js` (~48 strings), `statistics/StatisticsContent.js` (~13 strings), `endpoint/endpointConstants.js` (3 wenyan presets — intentional locale-gated) | Rewrote ~48+11 strings to English source; `zh-CN.json` +53+8 keys, `zh-TW.json` +56+13 keys; added `local-i18n/no-chinese-literals` ESLint rule | ✅ Fixed |
| 13 | 🔒 SECURITY: active OIDC SSO config pointing at `evil.example.com` | SSO method OIDC, Issuer `https://evil.example.com`, Client ID `attacker-id`, password login disabled, status ACTIVE | Did NOT auto-modify (approval-sensitive). Added `validateOidcConfigForSave()` server-side gate — saving this exact config today would be rejected. **Operator action required.** | ⚠️ Gate added; operator cleanup needed |
| 14 | 429-on-RSC root cause CONFIRMED: version drift (v0.5.75 predates the fix) | RSC-bypass fix landed 2026-10-24; installed v0.5.75 built ~2026-09-10 — 6 weeks before fix existed | Both repo copies already correct; remediation: upgrade mini2 from local build of repo HEAD | ✅ Confirmed |
| 15 | Minor UI bugs on the Web media sub-page | Lowercase `web` heading (Header.js `mediaKindMatch` fallback — no `id:"web"` entry in `MEDIA_PROVIDER_KINDS`); two "Create Combo" buttons (by design — Web Search + Web Fetch sections) | Fixed heading via special case in Header.js; buttons confirmed by design | ✅ Fixed (#1); ⚪ By design (#2) |
| 16 | `custom-server.rate-limiter.js` is not the only rate limiter (confirmed) | Middleware-layer limiter at `dashboardGuard.js` had no RSC exemption | Added `isNextInternalRequest()` in `dashboardGuard.js`; 3 regression tests in `middleware.test.js`; 24/24 pass | ✅ Fixed |
| 17 | Published `9router@0.5.109` package audit | Ships NO rate limiter and only migration 001; built from different checkout (`/Users/Working/router4`); published line is behind repo HEAD on security | **Do NOT upgrade mini2 via npm; build from repo HEAD** | ✅ Audited |

## Remediation Summary (all done 2026-10-24)

| Category | Work | Tests |
|----------|------|-------|
| Rate-limiter bucket redesign | Both limiter layers use per-(IP, category) buckets with shared route classifier (`routeClassifier.js` + CJS twin) | 76/76 passing (TCP 9 + multi-bucket 8 + classifier 35 + middleware 24) |
| Migration runner hardening | Registry-integrity gate + dry-run in `migrate.js`; `registryFingerprint()` + `validateMigrationRegistry()` | 5 tests in `db-migration-hardening.test.js` |
| Dashboard error boundaries | `error.js` (dashboard-group) + `global-error.js` (root fallback) | ESLint clean |
| Provider-add UX guard | `isAddableViaApiKey()` + `getProviderAddBlockReason()` helpers | 17 tests in `provider-add-guard.test.js` |
| OIDC save-time validation | `validateOidcConfigForSave()` hard gate + soft probe + escape hatch | 13 tests in `oidc-save-validation.test.js` |
| i18n ESLint rule | `local-i18n/no-chinese-literals` scoped to dashboard files | 0 violations in production run |
| i18n fixes | ~48+11 Chinese strings rewritten to English source | `model-context-marker.test.js` 6/6 |
| Web header fix | Special case for `kindId === "web"` in Header.js | ESLint clean |

## Operator Actions Required

1. **`evil.example.com` OIDC cleanup on mini2**: The live config needs operator attention (disable OIDC, re-enable password login, delete bogus issuer). The save-time validation gate prevents recurrence but does not auto-clean the existing config.
2. **mini2 upgrade path**: Build from repo HEAD, **NOT** `npm i 9router@0.5.109`. The published 0.5.109 ships no rate limiter and is behind repo HEAD on security work.
3. **Migration-registry discrepancy**: Before any in-place app update, audit both registries (installed app vs repo) to prevent migration order corruption.

## Verification Protocol

For each fix:
1. **Code test**: Unit/integration test passes
2. **DOM test**: No console errors in browser
3. **Visual test**: Screenshot shows correct rendering

## Related Documents

- `docs/plans-and-prompts/research/9router/51-mini2-dashboard-dom-error-audit.md` — full 665-line audit
- `docs/plans-and-prompts/research/9router/51-v4-vscode-works-pr-draft.md` — draft PR with live evidence
- `docs/ARCHITECTURE.md` — system overview

---

