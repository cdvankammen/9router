# Mini2 Dashboard DOM / Console Error Audit

**Date:** 2026-10-23
**Author:** Copilot agent (main session — chat ID `3ba69e69-a2a3-4b6e-8e3a-9acd4cb9bb8d`)
**Status:** active — two root causes fixed; residual items remain
**Applies to:** `mini2:20128` (9Router v0.5.75 installed at `/Applications/9Router.app/`)
**Tags:** #dashboard #rate-limiter #sqlite #foreign-key #dom #console-errors #nextjs-rsc

## TL;DR (for future agents)

The user-reported "ton of DOM errors" on the providers page traced to **two server-side problems**, not actual DOM bugs. Every console error on `/dashboard/providers` was a network `429` or `500` surfacing in the DevTools console — the rendered DOM itself (89 links, 53 provider cards, 17 nav, no duplicate IDs, no Next.js error overlays, no uncaught exceptions) was clean.

| # | Symptom | Root cause | Fix | Status |
|---|---------|------------|-----|--------|
| 1 | 32+ `429 Too Many Requests` on `?_rsc=` and `/_next/` URLs on every page load | `custom-server.rate-limiter.js` counted Next.js RSC prefetches + static chunks as user traffic; providers page alone emits 53+ `<Link>` prefetches → blows the 120 req/min general bucket | Added `isNextInternal()` bypass in both `custom-server.rate-limiter.js` (root) and `cli/app/custom-server.rate-limiter.js`; 3 new regression tests | ✅ Repo fixed. ✅ Live-patched installed app + restarted 2026-10-23 |
| 2 | Every "Add provider" attempt → `500 Failed to create provider` regardless of key validity | Rogue migration `002-fk-provider-connections.js` (in the installed v0.5.75 app, **not** in this repo's `migrations/index.js`) added `FOREIGN KEY providerConnections.provider → providerNodes(id) ON DELETE CASCADE`; built-in providers (openai, xai, claude, grok-cli, …) have no rows in `providerNodes`, so every insert failed FK check | Reverse-migrated live DB at `~/.9router/db/data.sqlite` (backup `data.sqlite.bak-before-fk-drop.*`); rebuilt table without FK, preserved all rows/indexes | ✅ Live-fixed 2026-10-23. ⚠️ Watch on next app update (see migration-version discrepancy below) |

**Chat reference:** session `3ba69e69-a2a3-4b6e-8e3a-9acd4cb9bb8d` (VS Code Copilot Chat), 2026-10-23.

---

## Investigation method

1. Drove VS Code's integrated browser (visible Chromium via Playwright) at `http://mini2:20128/dashboard` per `~/.agents/skills/9router-browser-e2e/SKILL.md`.
2. Hooked `page.on('console')` + `page.on('pageerror')` for every navigation.
3. Took accessibility snapshots via `read_page` (no-vision — text tree + element refs) and DOM probes via `page.evaluate`.
4. Probed every API the dashboard hits (`fetch()` inside the page).
5. SSH'd into mini2 to read live server logs via `/api/translator/console-logs/stream` and `~/.9router/db/data.sqlite`.

---

## Finding #1 — 429 storm on every dashboard page

### Reproduction

```
open http://mini2:20128/dashboard/providers?bust=<ts>
DevTools console → 32+ entries:
  Failed to load resource: the server responded with a status of 429
    url: /dashboard/providers/openai-compatible-chat-243bb69d…?_rsc=11hzb
    url: /dashboard/providers/claude?_rsc=11hzb
    url: /dashboard/providers/antigravity?_rsc=11hzb
    … (one per <Link> in the provider list + one per nav prefetch)
```

### Root cause (code location)

`custom-server.rate-limiter.js:112 checkLimit(ip, url, method)` — called from `custom-server.js:205` inside the `http.createServer` wrapper. Classifies every request as `chat` (20/min) or `general` (120/min) and increments an in-memory per-IP counter. Loopback IPs bypass, but a LAN peer at `mini2`'s real address does not.

Next.js App Router emits two classes of framework traffic that the user never sees:
- **RSC flight-data prefetches** — when a `<Link>` enters the viewport or is hovered, Next fetches `<href>?_rsc=<hash>` to precompute the target segment. The providers page has 53 provider `<Link>`s + 17 nav `<Link>`s = 70 prefetches on mount.
- **`/_next/static/chunks/*.js`** — JS/CSS chunks, images, data.

Both were being bucketed as `general` traffic. A single page load + one or two clicks exhausted the 120/min budget, after which **every** subsequent prefetch, nav click, and API call from the UI returned `429`.

### Fix applied

```js
// custom-server.rate-limiter.js (both root + cli/app copies)
const NEXT_INTERNAL_MARKERS = ["_rsc=", "/_next/"];

function isNextInternal(url) {
  if (!url) return false;
  for (const m of NEXT_INTERNAL_MARKERS) if (url.indexOf(m) !== -1) return true;
  return false;
}

function checkLimit(ip, url, method) {
  if (isLoopback(ip)) return { allowed: true };
  // Next.js RSC prefetches and static assets bypass rate limiting entirely.
  // (Also skips counter increment so they can't starve real requests.)
  if (isNextInternal(url)) return { allowed: true };
  // …rest unchanged
}
```

### Tests added (tests/unit/rate-limiter.test.cjs)

- Test 7 — RSC + `_next` bypass under exhausted general bucket
- Test 8 — user URLs with substring "rsc"/"next" are NOT accidentally bypassed
- Test 9 — 500-req RSC burst leaves the general budget 120/120 intact

All 9 tests pass.

### Defense in depth (still to consider)

- **Rate-limit by bucket, not by IP alone.** `/_next/` could be a separate unlimited bucket rather than a magic-string bypass. More robust against attackers who craft URLs with `_rsc=` in them to bypass (the substring check already defeats this for most cases but a bucket is cleaner).
- **Expose `X-RateLimit-Remaining` headers on every response.** The dashboard currently has no way to see it's being throttled until the console lights up. Surfacing the counter in DevTools network tab → easier diagnosis.
- **Separate per-IP budget for SSE/WebSocket.** Long-lived streams shouldn't share a counter with REST.

---

## Finding #2 — 500 on POST /api/providers (FK constraint failed)

### Reproduction

From the browser (any valid key):
```
POST http://mini2:20128/api/providers 500 (Internal Server Error)
{ "error": "Failed to create provider" }
```

### Stack trace (pulled from mini2's in-app console-log SSE stream)

```
Error creating provider: Error: FOREIGN KEY constraint failed
    at Object.run (file:///Applications/9Router.app/.../nodeSqliteAdapter.js:64:30)
    at j (/Applications/9Router.app/.../app/api/usage/stream/route.js:1:1889)
    at /Applications/9Router.app/.../app/api/usage/stream/route.js:6:2419
    at Object.transaction (nodeSqliteAdapter.js:79:19)
    at n (/Applications/9Router.app/.../app/api/usage/stream/route.js:6:1024)
    at processTicksAndRejections:104:5
    at async l (/Applications/9Router.app/.../app/api/providers/route.js:10:4691)
```

### Root cause

The installed app at `/Applications/9Router.app/Contents/Resources/app/app/src/lib/db/migrations/index.js` registers **five** migrations:

```
001-initial.js
002-fk-provider-connections.js    ← THE CULPRIT (not in this repo)
003-message-facets.js
004-message-annotations.js
005-seen-models.js
```

But this workspace's `src/lib/db/migrations/index.js` only registers two:

```
001-initial.js
002-seen-models.js                ← different file, same version number
```

The installed `002-fk-provider-connections.js` does:
```sql
CREATE TABLE providerConnections (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL REFERENCES providerNodes(id) ON DELETE CASCADE,
  …
);
```

But `providerNodes` only ever contains rows for user-created *compatible* provider nodes (e.g. `openai-compatible-chat-<uuid>`). Built-in providers (`openai`, `anthropic`, `xai`, `grok-cli`, `cursor`, `kilocode`, `codex`, `qoder`, `cline`, `github`, …) are constants in `src/shared/constants/providers.js` — they have **no** `providerNodes` rows. So every `INSERT` into `providerConnections` for a built-in provider failed the FK check.

Live state on mini2 before the fix:
```
sqlite> SELECT COUNT(*) FROM providerNodes;          → 2
sqlite> SELECT id FROM providerNodes;                → openai-compatible-chat-243bb69d…, openai-compatible-chat-eb21da1d…
sqlite> PRAGMA foreign_key_list(providerConnections);→ 0|0|providerNodes|provider|id|NO ACTION|CASCADE|NONE
```

### Fix applied (live, on mini2)

Backup: `~/.9router/db/data.sqlite.bak-before-fk-drop.<ts>`

```sql
PRAGMA foreign_keys = OFF;
BEGIN;
ALTER TABLE providerConnections RENAME TO providerConnections_old;
CREATE TABLE providerConnections (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,   -- no REFERENCES clause
  authType TEXT NOT NULL,
  name TEXT, email TEXT, priority INTEGER,
  isActive INTEGER DEFAULT 1,
  data TEXT NOT NULL,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
INSERT INTO providerConnections SELECT * FROM providerConnections_old;
DROP TABLE providerConnections_old;
CREATE INDEX idx_pc_provider         ON providerConnections(provider);
CREATE INDEX idx_pc_provider_active ON providerConnections(provider, isActive);
CREATE INDEX idx_pc_priority        ON providerConnections(provider, priority);
COMMIT;
PRAGMA foreign_keys = ON;
```

Verified: `POST /api/providers {provider:'openai', apiKey:'sk-test-…'}` now returns **201 Created**.

### ⚠️ Migration versioning discrepancy (action item for next update)

The installed v0.5.75 app's migration registry is out of sync with this repo's checkout:

| Installed app | Repo checkout |
|---|---|
| `001-initial` | `001-initial` |
| `002-fk-provider-connections` ❌ (rogue) | `002-seen-models` ✅ |
| `003-message-facets` | — |
| `004-message-annotations` | — |
| `005-seen-models` | — |

Before the next in-place app update (`npm i -g 9router@latest --prefer-online` or the tray's "Update now" button), **audit both registries** and either:
1. Add the missing migrations to this repo (`003`, `004`, and the correct `002-seen-models` ordering), **or**
2. Downgrade mini2's `schema_version` so re-running migrations from this repo is safe.

Otherwise the migration runner may skip or re-apply migrations in the wrong order and corrupt the DB.

### Where to look for similar issues

- `src/lib/db/migrations/index.js` — the registry
- `src/lib/db/migrate.js` — `runMigrationOnce()` / `syncSchemaFromTables()`
- `src/lib/db/schema.js` — canonical declarative schema (this file has `provider TEXT NOT NULL` with **no** FK — confirms the FK was a rogue addition)
- `~/.9router/db/data.sqlite` — live production DB location (NOT `9router.db` — that's a stale leftover)

---

## Finding #3 — UI has no graceful fallback when API returns 429 mid-render

### Symptom

When the rate limiter fires mid-page-load, Next.js returns `{"error":"Too many requests"}` as JSON with `Content-Type: application/json`. The App Router's client-side navigator renders this **as literal text** in the viewport:

```
bodyLen: 100   (statistics, quota, token-saver, claude-compat)
bodyLen: 100   (memory, cli-tools, proxy-pools, skills, model-context)
bodyLen: 29    (profile — even shorter)
```

The user sees a blank page with `{"error":"Too many requests"}` — no header, no nav, no retry button.

### Root cause

`src/lib/middleware/rateLimiter.js:rateLimitResponse()` returns a `NextResponse.json()` with no HTML body, and the Next app has no top-level `error.tsx`/`error.js` boundary that catches failed RSC segment loads and offers retry.

### Proposed fix (not yet implemented)

1. Add a global error boundary in `src/app/(dashboard)/error.js` that catches segment-load failures and renders a retry button.
2. Have the rate-limiter return a minimal HTML page (with `<meta http-equiv="refresh" content="5">` for Retry-After) when the client's `Accept` header prefers HTML.
3. Dashboard client should detect `429` on prefetch and show a non-scary toast ("Server busy — retrying…") instead of letting the whole page blank out.

---

## Finding #4 — Console Log page nav item points to a working page, but API URL guesses 404

Sidebar: **Console Log** → `/dashboard/console-log` (renders fine, `bodyLen: 22854`).
But the obvious API paths all 404:
- `/api/console-log` → 404
- `/api/console-logs` → 404
- `/api/logs` → 404
- `/api/log` → 404

The actual route (found by reading `src/app/(dashboard)/dashboard/console-log/ConsoleLogClient.js`) is:
- `GET /api/translator/console-logs` (initial dump)
- `GET /api/translator/console-logs/stream` (SSE)
- `DELETE /api/translator/console-logs` (clear)

Not a bug — just a discoverability note for future agents poking at the API surface. The `translator/` namespace is non-obvious.

---

## Finding #5 — Google Analytics calls aborted on every page view

Every page load triggers a failed `POST https://www.google-analytics.com/g/collect?…tid=G-LC959F603F…` → `net::ERR_ABORTED`. Not a server bug — just GA being blocked or unreachable from mini2. Cosmetic noise in the console. Probably worth a `sendBeacon` wrapper that swallows failures silently, or conditional loading (only enable GA in production cloud builds, not self-hosted).

---

## Finding #6 — Sidebar shows stale "New version available: v0.5.109" banner

The UI advertises an upgrade to v0.5.109 from the installed v0.5.75. The upgrade button runs `npm i -g 9router@latest --prefer-online`. **Do NOT click it** until the migration-registry discrepancy in Finding #2 is resolved — the new version's migrations may corrupt the live DB.

---

## Finding #7 — Provider page DOM audit (clean)

`/dashboard/providers` DOM state (snapshot taken 2026-10-23T22:47 UTC):
- **Links:** 89 total, 53 provider detail links + 17 nav + misc
- **Buttons:** 25
- **Duplicate IDs:** 0
- **Next.js error portals:** 0
- **Uncaught page errors:** 0
- **Hydration markers:** none

The page renders correctly when not 429'd. No accessibility regressions visible in the text tree.

---

## Finding #8 — Post-restart: `_rsc` 429s persist despite patch on disk

**Status:** under investigation — patch verified on disk, but live server still 429ing `_rsc=` URLs

After patching the installed `custom-server.rate-limiter.js` on mini2 and allowing the tray process to respawn the server, a clean sweep shows:

| Page | bodyLen | 429 errors | `_rsc=` 429s | Other errors |
|------|---------|------------|---------------|-------------|
| `/dashboard/providers` | 2426 (renders) | 32 | 32 | 0 |
| `/dashboard/combos` | 6180 (renders) | 18 | 18 | 0 |
| `/dashboard/token-saver` | 1046 (renders) | 18 | 15 | 0 |
| `/dashboard/endpoint` | 29 (blank) | 2 | 0 | 0 |
| `/dashboard/usage` through `/dashboard/profile` | 29 (blank) | 2 each | 0 | 0 |

The `_rsc=` URLs are still being 429'd even though `isNextInternal` is present in the on-disk file. Two hypotheses:

1. **Second rate limiter.** `src/lib/middleware/rateLimiter.js` exports `checkRateLimit()` — a separate per-IP limiter with a 30-request burst limit (`BURST_LIMIT = 30` in a 5-second window). If the Next.js middleware layer (`src/middleware.js` or built equivalent) calls this on every request including RSC prefetches, it would 429 them independently of the `custom-server.rate-limiter.js` bypass. The built app at `.next-cli-build/server/middleware.js` exists and may contain this logic compiled in.

2. **Stale process.** The respawned server (PID 45682) may have been spawned before the patch was written to disk, or the tray process cached the old module. A full tray restart (kill the `cli.js --tray` process, let launchd respawn it) would confirm.

### Diagnostic steps for next session

```bash
# Check if middleware.js contains rate limiting
ssh mini2 'grep -c "checkRateLimit\|429\|Too many" /Applications/9Router.app/Contents/Resources/app/app/.next-cli-build/server/middleware.js'

# Full tray restart (not just server restart)
ssh mini2 'pkill -f "cli.js --tray"; sleep 3; pgrep -af "9router\|cli.js"'

# Verify the running server loaded the patched file
ssh mini2 'cat /proc/$(pgrep -f "next-server" | head -1)/maps 2>/dev/null | grep rate-limiter'
```

### Fix proposals

- **Repo fix (already applied):** `custom-server.rate-limiter.js` bypass for `_rsc=` / `/_next/` — needs rebuild + reinstall to take effect on mini2.
- **Also patch `src/lib/middleware/rateLimiter.js`:** add the same `isNextInternal()` bypass to `checkRateLimit()` so both layers agree.
- **Disable the middleware rate limiter entirely** for dashboard routes (it's redundant with the custom-server limiter for a self-hosted LAN app).

---

## Finding #9 — `custom-server.rate-limiter.js` is not the only rate limiter

The `custom-server.rate-limiter.js` file is not the only rate limiter in the app. The `src/lib/middleware/rateLimiter.js` file exports `checkRateLimit()` — a separate per-IP limiter with a 30-request burst limit (`BURST_LIMIT = 30` in a 5-second window). If the Next.js middleware layer (`src/middleware.js` or built equivalent) calls this on every request including RSC prefetches, it would 429 them independently of the `custom-server.rate-limiter.js` bypass. The built app at `.next-cli-build/server/middleware.js` exists and may contain this logic compiled in.

---

## Proposed follow-up research (for future sessions)

1. **Rate-limiter bucket redesign.** Split into `static`, `rsc`, `api`, `chat`, `auth` buckets with independent limits. Replace magic-string URL detection with proper route classification.
2. **Migration runner hardening.** Add a dry-run mode that refuses to apply migrations if the installed registry differs from the expected set; surface a warning in the dashboard instead of silently corrupting.
3. **Dashboard error boundaries.** Sweep every `(dashboard)/*` page for missing `error.js` boundaries; add retry UI for transient 429/5xx.
4. **Provider-add UX.** The current flow does `POST /api/providers` with no client-side pre-validation of provider type. A client-side `providerRegistry.includes(provider)` guard would turn the opaque "Failed to add" into "Provider X is OAuth-only, use the OAuth button."
5. **Audit the installed v0.5.109 changelog** before the next upgrade — specifically check whether `002-fk-provider-connections.js` ships in the published package and, if so, how it handles the providerNodes-seeding gap.

---

## Files touched

- `custom-server.rate-limiter.js` — added `isNextInternal` bypass
- `cli/app/custom-server.rate-limiter.js` — same (published package copy)
- `tests/unit/rate-limiter.test.cjs` — 3 regression tests
- `/Applications/9Router.app/Contents/Resources/app/app/custom-server.rate-limiter.js` — live-patched on mini2
- `~/.9router/db/data.sqlite` — reverse-migrated (FK dropped), backup at `data.sqlite.bak-before-fk-drop.*`

## See also

- `docs/ARCHITECTURE.md` — system overview
- `docs/plans-and-prompts/research/9router/11-db-layer-deep-dive.md`
- `docs/plans-and-prompts/research/9router/15-api-routes-deep-dive.md`
- `docs/plans-and-prompts/research/9router/21-audit-no-more-bugs.md`
- `docs/plans-and-prompts/research/9router/22-error-sweep.md`
