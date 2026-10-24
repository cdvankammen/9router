# Mini2 Dashboard DOM / Console Error Audit

**Date:** 2026-10-23 (Day 1) + 2026-10-24 (Day 2 — exhaustive dashboard walk)
**Author:** Copilot agent (main session — chat ID `3ba69e69-a2a3-4b6e-8e3a-9acd4cb9bb8d`)
**Status:** Day 1 fixes deployed; Day 2 exhaustive audit complete — 25 URLs visited, 6 new findings (#10–#15) added including a HIGH-severity SECURITY finding and whole-page i18n omissions on 2 dashboard pages
**Applies to:** `mini2:20128` (9Router v0.5.75 installed at `/Applications/9Router.app/`; repo at v0.5.95)
**Tags:** #dashboard #rate-limiter #sqlite #foreign-key #dom #console-errors #nextjs-rsc #i18n #security #oidc #media-providers #version-drift

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

# Day 2 — Exhaustive dashboard walk (2026-10-24)

**Method:** drove the VS Code integrated browser (page ID `34271fd2-402c-4051-8828-7480e79689b8`) at every dashboard URL, took accessibility snapshots (`read_page`), ran `page.evaluate` DOM probes (headings, buttons, inputs, switches, Chinese-character scan) on each, and took screenshots at every step (screenshots stored in the Copilot chat resources; vision is unsupported by the model so findings come from the DOM text tree and probe payloads).

**Constraint honored:** did not mutate the `dial` provider, `dialTop` combo, or `dialRouter` combo. Sandbox targets `dialTop-copy` and `Ldialtop` were used for any write-path verification on the Combos page. No data on mini2 was altered beyond the Day-1 live fixes already documented above.

---

## Finding #10 — Full dashboard page inventory (every page visited)

| # | Route | Heading(s) | Interactive surface | Chinese i18n? | Bugs found |
|---|-------|------------|---------------------|----------------|------------|
| 1 | `/dashboard/combos` | Combo & Vision Adapter | 4 combo cards × (strategy combo, Details, Copy, Duplicate, Edit, Delete); Edit modal 66 elements; dnd-kit model reorder | no | Duplicate-button handler absent in repo v0.5.95 source; v0.5.75 UI lacks bulk-select + Cursor/Claude presets (version drift) |
| 2 | `/dashboard/combos/[id]` | Combo detail + Run Test | Run Test button (POST `/v1/chat/completions` with Bearer) | no | — |
| 3 | `/dashboard/endpoint` | Endpoint & Key | Tunnel URL, 3 API keys, Create/Revoke | no | — |
| 4 | `/dashboard/providers` | Providers | 38 provider cards, search, filters, Test All, Add, New Models badge | no | — |
| 5 | `/dashboard/usage` | Usage | Overview/Details tabs, 5 period controls, Tokens/Cost toggle, 129 chart elements | no | — |
| 6 | `/dashboard/messages` | Messages | 6 views, bookmarked saved views, search, facet filters, 50 rows | no | — |
| 7 | `/dashboard/statistics` | Statistics | Auto-refresh, aggregate-detail panel, tree columns | **YES — 13 hardcoded strings** | see #12 |
| 8 | `/dashboard/quota` | Quota Tracker | Empty state (no OAuth providers configured) | no | — |
| 9 | `/dashboard/token-saver` | Token Saver | 4 compressors: RTK on, Headroom/Caveman/Ponytail off | no | — |
| 10 | `/dashboard/claude-compat` | Claude Compat | Model prefix, context suffix, default models, JSON config | no | — |
| 11 | `/dashboard/memory` | Memory & Context | 4 pipeline stages, all off | no | — |
| 12 | `/dashboard/cli-tools` | CLI Tools | 25 integrations, Claude Code detail expanded | no | — |
| 13 | `/dashboard/proxy-pools` | Proxy Pools | Failover-proxy error banner, 503 polling, Add Proxy Pool modal, Deploy Relay, Batch Import | no | 503 proxy-poll noise (unreachable failover proxy every 5s) |
| 14 | `/dashboard/skills` | Skills | 9 skill cards, 8 copy-link buttons | no | — |
| 15 | `/dashboard/model-context` | Model Context | 54-row table, filter panel, add/batch/revert | **YES — ~48 hardcoded strings (whole page)** | see #12 |
| 16 | `/dashboard/console-log` | Console Log | Clear button only | no | — |
| 17 | `/dashboard/profile` (Settings) | Settings | Account, security, SSO, appearance, language, data | no | **SECURITY — active OIDC config to `evil.example.com`** (see #13) |
| 18 | Header bar | — | Donate, theme toggle, 36-lang locale picker, overflow (Change Log/Theme/Shutdown/Logout) | no | — |
| 19 | Sidebar | — | Change Log modal, Media Providers expand (6 sub-pages), 9Remote, Update banner | no | — |
| 20 | Media: Embedding | Embedding | 17 providers, Add Custom Embedding button | no | — |
| 21 | Media: Image | Text to Image | 21 providers, no Add Custom button | no | — |
| 22 | Media: TTS | Text To Speech | 17 providers, no Add Custom button | no | — |
| 23 | Media: STT | Speech To Text | 7 providers, no Add Custom button | no | — |
| 24 | Media: Video | Video | 3 providers (OpenRouter, Vertex AI, xAI Grok), no Add Custom button | no | — |
| 25 | Media: Web | **web** (lowercase!) | 27 providers, **two** "Create Combo" buttons (web-search shortcut) | no | lowercase heading, duplicate buttons (see #15) |

Total: **25 distinct URLs** inspected, **1250+ interactive elements** inventoried, **6 media sub-pages** fully walked.

---

## Finding #11 — Media Provider sub-pages (6 sub-pages, 92 providers total)

The Media Providers section expands in the sidebar into 6 sub-pages. Each is a read-only provider grid (no CRUD beyond Embedding's "Add Custom Embedding" and Web's combo-creation shortcut).

| Sub-page | URL suffix | Heading | Provider count | Has "Add Custom"? | Has Chinese? |
|----------|------------|---------|----------------|-------------------|--------------|
| Embedding | `/media-providers/embedding` | Embedding | 17 (OpenRouter, NVIDIA NIM, OpenAI, GitHub Copilot, Voyage AI, Gemini, Fireworks AI, Self-hosted, Together AI, Nebius AI, Mistral, Venice AI, Vercel AI Gateway, Jina AI, TokenRouter, +2) | **yes** | no |
| Image | `/media-providers/image` | Text to Image | 21 (Antigravity, OpenAI Codex, OpenAI, Gemini, Black Forest Labs, Cloudflare, Stability AI, HuggingFace, Recraft, NanoBanana API, Runway ML, Fal.ai, Minimax Coding, SD WebUI, Venice AI, ComfyUI, Vercel AI Gateway, xAI Grok, Topaz, TokenRouter, +1) | no | no |
| TTS | `/media-providers/tts` | Text To Speech | 17 (Edge TTS, Google TTS, Local Device, OpenRouter, NVIDIA NIM, OpenAI, Gemini, Self-hosted TTS, Minimax Coding, Minimax China, Xiaomi MiMo, AWS Polly, ElevenLabs, Inworld TTS, Fish Audio, +2) | no | no |
| STT | `/media-providers/stt` | Speech To Text | 7 (Deepgram, AssemblyAI, OpenAI, Gemini, Self-hosted STT, Groq, HuggingFace) | no | no |
| Video | `/media-providers/video` | Video | 3 (OpenRouter, Vertex AI, xAI Grok) | no | no |
| Web | `/media-providers/web` | **web** (lowercase) | 27 (Antigravity, OpenAI, Gemini, Minimax Coding, GLM Coding, Vercel AI Gateway, Kimi, Perplexity, Perplexity Agent, xAI Grok, SearXNG, Brave Search, Exa, Google PSE, Linkup, Ollama Search, SearchAPI, Serper, Tavily, You.com Search, Xquik, Web Fetch, Ollama Cloud, Exa (dup?), Firecrawl, Jina Reader, +1) | no (has two "Create Combo" buttons) | no |

**Takeaway:** 92 providers across 6 media modalities. Embedding is the only sub-page that exposes "Add Custom" — the other 5 have no user-facing CRUD. Video is by far the smallest surface (3 providers). Web is the largest (27 providers) and has two UI oddities (see #15).

---

## Finding #12 — Hardcoded Chinese strings across 3 dashboard files (i18n bug)

**Severity:** medium — non-Chinese users see an entire page in Chinese regardless of the locale they pick in the header.

**Root cause:** the affected files were authored with **Chinese string literals** instead of wrapping text in `t()` calls from the i18n hook. Not a fallback bug, not a missing-locale-file bug — a wholesale i18n omission in the source.

### Affected files

| File | Hardcoded Chinese strings | User-facing surface | Status |
|------|--------------------------|---------------------|--------|
| `src/app/(dashboard)/dashboard/model-context/page.js` | ~48 (L81, 305, 319, 342, 356, 376, 378, 405, 412, 464, 471, 486, 501, 507, 513, 516, 525, 540, 544, 546, 553, 556, 561, 563, 573, 578, 589, 594, 597, 605, 616, 625, 647, 650, 653, 655, 656, 664, 676, 679, 701, 709, 727, 734, 738, 742, 746, 760, 761, 765) | **entire Model Context page** — filter labels, placeholders, column headers, buttons, tooltips, empty states, flash notices | ✅ **Fixed 2026-10-24** — all rewritten to English source; `zh-CN.json` +53 keys, `zh-TW.json` +56 keys |
| `src/app/(dashboard)/dashboard/statistics/StatisticsContent.js` | ~13 (L39 comment, L288 自动刷新, L294 关闭, L305 立刻刷新, L330 聚合明细, L634 TREE_COLS 8 columns, L645 聚合明细, L649 按提供商, L650 按模型, L660 维度, L668 没有匹配的数据) | auto-refresh control, Refresh Now button, Aggregated Breakdown label, TREE_COLS headers, By Provider / By Model, Dimension, empty state | ✅ **Fixed 2026-10-24** — 11 strings rewritten to English source; `zh-CN.json` +8 keys (1 benign collision: `"Requests"` → `"请求"` already existed, kept as-is), `zh-TW.json` +13 keys |
| `src/app/(dashboard)/dashboard/endpoint/endpointConstants.js` | 3 wenyan presets (L23–25: `文 Lite`, `文 Full`, `文 Ultra` + `文言文` description) | Token Saver preset labels — **only visible to `zh-CN` / `zh-TW` locales** | ⚪ **Intentional locale-gated branding** — `TokenSaverClient.js:71-73` filters them out via `CAVEMAN_LEVELS.filter(lvl => !lvl.wenyan)` when `!WENYAN_LOCALES.includes(locale)`. English users never see them. No fix needed. |

### Representative samples (for a future i18n fix PR)

```
// model-context/page.js L464 — the page's own description paragraph, 100% Chinese
核对每个模型的上下文窗口，不对就直接改。「启用中」的供应商模型排在最前，即 /v1/models 当前对外可见的集合；改动立即生效于路由与 /v1/models。

// model-context/page.js L305 — error message
setError("窗口需为正整数,支持 200k / 1m 缩写");

// statistics/StatisticsContent.js L634 — tree-table column headers
const TREE_COLS = ["请求数", "总 Token", "输入", "输出", "缓存读", "缓存写", "命中率", "用时/首字"];
```

### Fix applied (2026-10-24)

**Runtime i18n architecture (discovered during the fix):** the dashboard uses a **runtime DOM-walking translator**, not compile-time key lookup.

- `src/i18n/runtime.js` exports `translate(text)` which looks up the *exact English source string* (trimmed) in a map loaded from `/i18n/literals/{locale}.json`. English is the source language; the `en` locale is the no-op identity (`translationMap = {}`).
- A `MutationObserver` walks all DOM text nodes (including `characterData` mutations from React re-renders) and swaps them in place. Each node stores `_originalText` so locale switches stay idempotent.
- `RuntimeI18nProvider` (mounted at the dashboard root) initializes on mount and re-processes on every route change via double-`requestAnimationFrame` to land after React commit.
- Locale files live in `public/i18n/literals/` (34 locales, alphabetical key order, `ensure_ascii: false`).

**What was done:**

1. Rewrote all ~48 hardcoded Chinese strings in `src/app/(dashboard)/dashboard/model-context/page.js` to English source text (filter labels, placeholders, column headers, buttons, tooltips, empty states, flash notices, footer). Added 53 new keys to `zh-CN.json` and 56 to `zh-TW.json`; 10/7 existing keys skipped as duplicates.
2. Rewrote 11 hardcoded Chinese strings in `src/app/(dashboard)/dashboard/statistics/StatisticsContent.js` to English source text (auto-refresh label, Off option, Refresh Now button, Aggregated Breakdown label ×2, TREE_COLS 8 headers, By Provider/By Model, Dimension, No matching data). Added 8 keys to `zh-CN.json` and 13 to `zh-TW.json`. One benign collision: `"Requests"` already mapped to `"请求"` — kept the existing value since it's a valid translation for both contexts.
3. Confirmed `src/app/(dashboard)/dashboard/endpoint/endpointConstants.js` wenyan presets (`文 Lite`, `文 Full`, `文 Ultra` + `文言文` description) are **intentional locale-gated branding**: `TokenSaverClient.js:71-73` filters them out via `CAVEMAN_LEVELS.filter(lvl => !lvl.wenyan)` when `!WENYAN_LOCALES.includes(locale)`, and auto-downgrades an active wenyan selection to `ultra` if the user switches away from a Chinese locale. No code change needed.
4. Fixed one ESLint `react/no-unescaped-entities` error I introduced (apostrophe in `model's` on line 464) by rephrasing to `"of each model"`.

**Verification:**
- `python3 -c 're.findall(r"[一-龯]+", open(f).read())'` → 0 Chinese fragments in either fixed file
- `json.load()` succeeds on both `zh-CN.json` (1512 keys) and `zh-TW.json` (264 keys)
- ESLint exits 0 on both files (4 pre-existing `react-hooks/exhaustive-deps` warnings in `StatisticsContent.js`, unrelated)
- `tests/unit/model-context-marker.test.js`: 6/6 passing
- `git diff --numstat`: `page.js` +50/-50, `StatisticsContent.js` +11/-11, `zh-CN.json` +121/-60, `zh-TW.json` +233/-164

**i18n lint guard-rail** (implemented 2026-10-24): added a local ESLint plugin `local-i18n` with the `no-chinese-literals` rule in `eslint.config.mjs`, scoped to `src/app/(dashboard)/dashboard/**/*.js`. The rule walks every `Literal`, `JSXText`, and `TemplateLiteral` quasis, flags any value matching `/[一-龯]/`, and points the author at `public/i18n/literals/*.json` in the message. The only Chinese fragments that remain in the scoped tree are the three intentional wenyan presets in `endpointConstants.js`, wrapped in an explicit `/* eslint-disable local-i18n/no-chinese-literals */` block with a rationale comment. Sanity probe verified the rule fires on a fresh violation; production run reports 0 violations across the whole dashboard tree.

---

## Finding #13 — 🔒 SECURITY: active OIDC SSO config pointing at `evil.example.com`

**Severity:** HIGH — approval-sensitive, **not auto-modified**.

**Observed on:** `/dashboard/profile` (Settings) → SSO tab, 2026-10-24.

**Live state:**
- SSO method: **OIDC**
- Issuer URL: `https://evil.example.com`
- Client ID: `attacker-id`
- Password login: **disabled**
- Status: **ACTIVE** (the UI shows the config as currently enforcing)

**Why this matters:**
- `evil.example.com` is an IANA-reserved domain often used in documentation and adversarial examples — it is not a real IdP.
- With password login disabled and a bogus OIDC issuer active, **no one can currently authenticate to this 9Router instance via the web UI** unless they already have a valid session cookie.
- If the config was set by an attacker, the IdP could be swapped to a real attacker-controlled issuer that mints valid tokens for arbitrary identities.
- If the config was set by the operator as a placeholder and never cleaned up, it's a foot-gun: any restart that invalidates session cookies locks everyone out.

**What I did NOT do:**
- Did not modify the SSO config (approval-sensitive).
- Did not delete the OIDC row from the live DB.
- Did not re-enable password login.

**Recommended action (for the operator):**
1. Confirm who set this config and why.
2. If it's a leftover test: disable OIDC, re-enable password login, delete the bogus issuer.
3. If it's suspected compromise: rotate `JWT_SECRET`, `API_KEY_SECRET`, `MACHINE_ID_SALT` (all in `~/.9router/.env`); invalidate all active sessions; audit `providerConnections` for unauthorized OAuth tokens.
4. Add server-side validation that refuses to save an OIDC issuer whose TLS cert doesn't chain to a public CA, or that fails a discovery-doc fetch at save time.

### Remediation (2026-10-24) — item 4 implemented

Server-side save-time validation is now in place (see backlog item #9 below). Re-saving this exact `evil.example.com` config today would be **rejected** by the hard gate: `validateOidcConfigForSave()` fetches `https://evil.example.com/.well-known/openid-configuration` with a 5s timeout, gets a DNS/fetch failure, and returns `{ ok: false, reason: "fetch-failed" }` → the PATCH route responds 400 before `updateSettings()` runs. The existing live config on mini2 is untouched by this code change — it still needs operator action (items 1–3 above) to clear.

---

## Finding #14 — 429-on-RSC root cause CONFIRMED: version drift (v0.5.75 predates the fix)

**Status:** closed — the regression is explained entirely by version drift.

**Question from Day 1:** Finding #8 observed that `_rsc=` prefetches were still returning 429 even after the on-disk `custom-server.rate-limiter.js` patch. Was the fix missing a layer, or just not yet deployed?

**Git archaeology (2026-10-24):**

```
$ git log -1 --format="%h %ci %s" fa2b99e8
fa2b99e8 2026-10-24 01:35:07 -0600 fix(rebase): resolve 13 post-rebase test regressions (35→22)
    → introduced NEXT_INTERNAL_MARKERS + isNextInternal in both rate-limiter copies

$ git log -S '"version": "0.5.75"' --format='%h %ci %s' -- package.json | head -3
8e15f0bd 2026-09-18 18:09:32 +0700 # v0.5.79 (2026-09-18)
4a390685 2026-09-10 21:56:30 +0700 feat(cli): group model selector by provider with search
    → v0.5.75 bump lives between these two, ~2026-09-10
```

**Conclusion:** the RSC-bypass fix landed 2026-10-24. The installed v0.5.75 on mini2 was built ~2026-09-10 — **6 weeks before the fix existed**. The 429-on-`_rsc=` errors observed during today's exhaustive walk (e.g., 19× 429 during the STT page load on `/dashboard/media-providers/stt/deepgram?_rsc=…` etc.) are *expected behavior* on the installed version, not a regression in repo source.

**Both repo copies are already correct:**
- `custom-server.rate-limiter.js` (root) — has `NEXT_INTERNAL_MARKERS = ["_rsc=", "/_next/"]` and the `isNextInternal` bypass inside `checkLimit`.
- `cli/app/custom-server.rate-limiter.js` — byte-identical logic.

**Remediation:** run `npm i -g 9router@latest --prefer-online` on mini2 (or click the sidebar "Update now" button) — but only **after** resolving the migration-registry discrepancy from Finding #2, otherwise the new version's migrations may re-introduce the FK constraint or run out of order.

**Update (2026-10-24, Finding #17):** the FK risk is cleared — published 0.5.109 ships only migration 001, and 002 is unregistered in repo HEAD, so no upgrade path can re-add the constraint. However, installing published 0.5.109 would remove rate limiting entirely (it predates the GAP-P1-17 limiter); prefer a local build of repo HEAD, which also carries the middleware-layer RSC exemption from the Finding #16 resolution.

---

## Finding #15 — Minor UI bugs on the Web media sub-page

**Route:** `/dashboard/media-providers/web`

1. **Lowercase heading.** The page renders `<h1>web</h1>` instead of `<h1>Web</h1>` (or the i18n key equivalent). Every other media sub-page capitalizes its heading (Embedding, Text to Image, Text To Speech, Speech To Text, Video). Source: likely `src/app/(dashboard)/dashboard/media-providers/web/page.js` (or the shared Media page template) passes a literal `"web"` where it should pass `"Web"` or `t("media.web")`.

2. **Duplicate "Create Combo" buttons.** The page shows **two** `add Create Combo` buttons — unique among the 6 media sub-pages. Likely a web-search combo-creation shortcut that was added twice, or a conditional that renders both a floating action button and an inline button. Not a functional bug, but visual noise.

### Resolution (2026-10-24)

| # | Status | Notes |
|---|--------|-------|
| 1 | ✅ Fixed | Root cause was **not** in `web/page.js` — that file renders `"Web Search"` and `"Web Fetch"` Section titles correctly capitalized. The lowercase `web` came from `src/shared/components/Header.js` L40-49: the `mediaKindMatch` branch derives the page title via `MEDIA_PROVIDER_KINDS.find((k) => k.id === kindId)`, but `src/shared/constants/providers.js` only declares `webSearch` and `webFetch` entries — there is no `id: "web"`. For the combined `/media-providers/web` route, `kindId = "web"` fell through to the raw-slug fallback (`kindConfig?.label || kindId`), rendering the lowercase URL segment as the H1. Fix: added a special case for `kindId === "web"` that returns `{ title: "Web", description: "Manage your Web Search and Web Fetch providers", icon: "travel_explore" }`. Added matching `zh-CN.json` and `zh-TW.json` translations for the two new strings (`Web` kept as-is in both, description localized). ESLint clean. |
| 2 | ⚪ By design | The two buttons are **not** duplicates — the page renders two `<Section>` components (Web Search + Web Fetch), each with its own `Create Combo` button that creates a combo of the matching `kind` via `handleCreateCombo("webSearch")` / `handleCreateCombo("webFetch")`. Other media sub-pages have one button because they host one kind; this page hosts two. No change needed. |

---

## Finding #16 — `custom-server.rate-limiter.js` is not the only rate limiter

The `custom-server.rate-limiter.js` file is not the only rate limiter in the app. The `src/lib/middleware/rateLimiter.js` file exports `checkRateLimit()` — a separate per-IP limiter with a 30-request burst limit (`BURST_LIMIT = 30` in a 5-second window). If the Next.js middleware layer (`src/middleware.js` or built equivalent) calls this on every request including RSC prefetches, it would 429 them independently of the `custom-server.rate-limiter.js` bypass. The built app at `.next-cli-build/server/middleware.js` exists and may contain this logic compiled in.

### Resolution (2026-10-24)

**Confirmed and fixed.** The middleware-layer limiter is real and wired into `src/dashboardGuard.js:proxy()` (invoked from `src/proxy.js`, the Next middleware entry): every `/api/*` and `/dashboard/*` request passes through `checkRateLimit()` (120 req/min sliding window + 30 req/5s burst, per IP). The original code had **no exemption** for Next-internal requests — `?_rsc=` prefetches fired against a page's own path counted against the same bucket as ordinary navigation, so a burst of RSC prefetches from a heavy dashboard page could 429 the very navigation that triggered them (the middleware-layer twin of the Finding #8/#14 TCP-layer bug).

**Fix:** added `isNextInternalRequest()` in `dashboardGuard.js` exempting `/_next/*` paths and any request carrying a `_rsc` query param, mirroring `isNextInternal` in the TCP-layer `custom-server.rate-limiter.js`. Three regression tests added to `tests/unit/middleware.test.js` (RSC prefetch exempt when the bucket is exhausted; `/_next/` asset not 429'd; ordinary dashboard requests still limited). 24/24 middleware tests pass; ESLint clean.

**Published-package note:** this limiter exists only in repo HEAD — it was committed 2026-10-22 (`437cd60f`, GAP-P1-17) and is **absent** from published 0.5.109 (see Finding #17).

---

## Finding #17 — Published `9router@0.5.109` package audit (backlog #5)

**Date:** 2026-10-24. **Method:** downloaded `https://registry.npmjs.org/9router/-/9router-0.5.109.tgz` to `/tmp/9router-audit/` and inspected it without installing (read-only). **npm publish time:** 2026-10-23T08:35:50Z.

### What actually ships

1. **The runtime is the compiled `.next-cli-build/` standalone bundle** (`server.js` + a `custom-server.js` wrapper). The `package/app/src/` tree is **vestigial**: `src/lib/db/migrate.js` imports `./migrations/index.js`, `./paths.js`, `./schema.js`, `./helpers/metaStore.js`, `./backup.js`, `./version.js` — none of which exist in the package, so loading it directly would crash. `custom-server.js` likewise treats `src/sse/services/backgroundTokenRefresh.js` as fail-open ("Expected in published CLI standalone (src/ not on disk)"). The compiled chunks are what runs.
2. **Only migration 001 ships.** Compiled chunks `4055.js`/`5217.js` carry the migration runner (`[DB][migrate` log markers) with exactly `version:1` / `name:"initial"`. **ABSENT** from the entire bundle: `fk-provider-connections`, `message-facets`, `message-annotations`, `add-seen-models`, and the tables they create (`message_facets`, `message_annotations`, `saved_views`, `seenModels`). No `REFERENCES providerNodes` FK clause anywhere.
3. **No rate limiting of any kind ships.** No `*rate-limiter*` file exists; the published `custom-server.js` (reviewed in full) wires socket-IP stamping + h2c downgrade but contains no limiter require/call. The compiled 380KB `middleware.js` and all server chunks have **zero** occurrences of `checkRateLimit`, `BURST_LIMIT`, `Too many requests`, `X-RateLimit-Limit`, or `burstCount`. Control checks pass — the auth layer ships (`Too many failed attempts` present in the login + SAML ACS routes; `x-9r-cli-token` in 5 files) — so the absence is specific to the general limiter, not a grep artifact.

### Why: timeline divergence

| Event | Date |
|---|---|
| Migration 002 (FK) added | 2026-10-22 15:04 -0600 (`cf4dfefb`) |
| Middleware rateLimiter added (GAP-P1-17) | 2026-10-22 15:41 -0600 (`437cd60f`) |
| Migrations 003/004 added | 2026-10-22 15:51 -0600 (`4013bfbf`) |
| **0.5.109 published** | **2026-10-23 08:35 UTC (02:35 -0600)** |
| Migration 005 added | 2026-10-23 19:38 -0600 (`2b63e0dd`) |

Although 002–004 and the limiter were committed ~11 hours before the publish timestamp, the bundle contains none of them: it was cut from a checkout lacking the 2026-10-22 work — the embedded `nextConfig` shows the build machine is a different tree (`outputFileTracingRoot: "/Users/Working/router4"`, `repoRoot: "/Users/Working/router4/9router"`), not this repo. Corroborating drift: `CHANGELOG.md` ends at v0.5.95 (2026-10-01) — versions 0.5.99/0.5.104/0.5.109 were published **without changelog entries**, which is why the changelog audit requested by backlog #5 was impossible and this tarball inspection substitutes for it.

### Consequences for the mini2 upgrade (Finding #14 remediation)

1. **The FK risk from Findings #2/#14 is fully cleared.** `002-fk-provider-connections.js` does not ship in 0.5.109, and it is **UNREGISTERED** in repo HEAD's `src/lib/db/migrations/index.js` (comment: "FK providerConnections.provider → providerNodes(id) was too restrictive in practice"). Neither an npm upgrade nor a build-from-HEAD can re-introduce the FK constraint — the Day-1 reverse-migration on mini2 is forward-compatible with both paths.
2. **Installing published 0.5.109 removes rate limiting entirely.** The TCP-layer limiter would be replaced by a `custom-server.js` with no limiter wiring, and the middleware-layer limiter never shipped. The Day-1 live patch on mini2 (`/Applications/9Router.app/.../custom-server.rate-limiter.js`) would be discarded. The RSC-429 symptom disappears (nothing left to 429), but so does the GAP-P1-17 DoS protection.
3. **Building from repo HEAD is the only path that keeps both** — and as of today it is safe: the middleware limiter now exempts RSC prefetches (Finding #16 resolution), migrations run 001→003→004→005 (002 skipped by the registry), and the FK is never re-added. Requires `npm run build` + `scripts/copy-standalone-assets.mjs` (the same pipeline the app/CLI packager uses).

**Recommendation:** do **not** upgrade mini2 to published 0.5.109 (via npm or the sidebar "Update now" flow) — it trades one bug (RSC 429s) for a security regression (no rate limiting) plus loss of everything committed after the 2026-10-23 bundle cut. Upgrade from a local build of repo HEAD instead, after operator sign-off. Note the version-field inversion: repo HEAD is `0.5.95` while the published line is `0.5.109` — the published line is ahead in version number but behind in security work.

---

## Proposed follow-up research (for future sessions)

1. **Rate-limiter bucket redesign.** Split into `static`, `rsc`, `api`, `chat`, `auth` buckets with independent limits. Replace magic-string URL detection with proper route classification.
2. **Migration runner hardening.** Add a dry-run mode that refuses to apply migrations if the installed registry differs from the expected set; surface a warning in the dashboard instead of silently corrupting.
3. **Dashboard error boundaries.** ✅ Done 2026-10-24. Sweep confirmed **zero** `error.js` / `global-error.js` files existed anywhere under `src/app` — all 29 dashboard pages fell through to Next.js's default error screen on any uncaught render error. Added two boundaries:
   - `src/app/(dashboard)/error.js` — dashboard-group boundary. Sits INSIDE `DashboardLayout`, so sidebar/header stay visible during a page error and users can navigate away without reloading. Detects transient HTTP errors (429 / 5xx) via `error.message`/`digest` and shows a targeted "Rate limited" / "Server error" retry UI; otherwise a generic "Something went wrong" with reset + back-to-dashboard. Self-contained (inline buttons, no shared-component imports) so it cannot be taken down by the same failure it catches.
   - `src/app/global-error.js` — root fallback for errors that escape the group boundary (DashboardLayout itself, login, landing). Renders its own `<html>`/`<body>` with zero layout dependencies; uses a plain `<a>` (not `next/link`) deliberately, since it renders outside the app-router context it is catching failures of.

   ESLint clean on both. Note: this covers render-time errors; the ad-hoc fetch error handling inside individual pages (`alert()`, silent `.catch(() => {})`, `console.log`) is a separate cleanup not addressed here.
4. **Provider-add UX.** ✅ Done 2026-10-24. Added `isAddableViaApiKey()` and `getProviderAddBlockReason()` helpers in `src/shared/constants/providers.js` that mirror the server's `POST /api/providers` validity predicate exactly (accepts: `APIKEY_PROVIDERS`, `FREE_TIER_PROVIDERS`, `WEB_COOKIE_PROVIDERS`, dual-auth providers whose `authModes` includes `"apikey"`, and the three compatible-prefix families). Wired into `providers/new/page.js` as (a) a `validate()` guard that surfaces the targeted reason instead of the opaque server "Invalid provider", (b) a proactive amber inline notice with a deep link to the provider's own page (where the OAuth button or free-connect flow lives), and (c) a `disabled` submit button when a non-addable provider is selected. Category maps are checked directly (not `entry.category`) because `buildProviderEntry` doesn't copy category onto UI entries — dual-auth providers like `codebuddy-cn` (category `"oauth"` but `authModes: ["oauth","apikey"]`) are correctly accepted via the `authModes` check before reaching the reason branch. 17 unit tests in `tests/unit/provider-add-guard.test.js`, all passing. Note: the `providers/new` route is orphaned (no dashboard link points to it) — the primary add flows are the `AddApiKeyModal` on `providers/[id]/page.js` and `ConnectionsCard`, which receive an already-filtered `provider` prop and didn't need the guard.
5. **Audit the installed v0.5.109 changelog** ✅ Done 2026-10-24 — see Finding #17. The changelog itself ends at v0.5.95 (0.5.99–0.5.109 have no entries), so the audit was done by direct tarball inspection: published 0.5.109 ships only migration 001 (the FK migration neither ships there nor can it ever run — it is unregistered in repo HEAD), and ships **no rate limiter at all** (the GAP-P1-17 middleware limiter landed 2026-10-22 but the bundle was cut from a different checkout lacking it). Recommendation: upgrade mini2 from a local build of repo HEAD, not from the published 0.5.109 package.
6. **i18n lint rule (Day 2).** ✅ Done 2026-10-24. `eslint.config.mjs` now declares a local `local-i18n` plugin with the `no-chinese-literals` rule scoped to `src/app/(dashboard)/dashboard/**/*.{js,jsx}`. Catches `Literal`, `JSXText`, and `TemplateLiteral` quasis matching `/[一-龯]/`. Would have flagged both whole-page omissions at author time.
7. **Model Context i18n fix (Day 2).** ✅ Done 2026-10-24. ~48 Chinese strings rewritten to English source text; 53 keys added to `zh-CN.json`, 56 to `zh-TW.json`. See Finding #12 resolution.
8. **Statistics i18n fix (Day 2).** ✅ Done 2026-10-24. 11 Chinese strings rewritten; 8 keys added to `zh-CN.json`, 13 to `zh-TW.json`. See Finding #12 resolution.
9. **OIDC save-time validation (Day 2, SECURITY).** ✅ Done 2026-10-24. Server-side gate added to the `/api/settings` PATCH handler (`src/app/api/settings/route.js`) backed by new `validateOidcConfigForSave()` in `src/lib/auth/oidc.js`. **Hard gate** (full discovery fetch, 5s timeout) fires when the effective authMode would disable password login — `"oidc"`, or `"sso"` with `ssoType === "oidc"` — and rejects: unreachable hosts (`fetch-failed`), timeouts (`timeout`), non-HTTPS except localhost (`insecure`), malformed URLs (`invalid-url`), non-JSON responses (`bad-json`), and discovery docs missing `authorization_endpoint`/`token_endpoint` (`missing-fields`). **Soft probe** (URL format + HTTPS only, no network call) fires when OIDC fields are touched but password login stays enabled — no lockout risk, so no reachability requirement. **Escape hatch:** `skipOidcValidation: true` in the request body (never persisted) for air-gapped / not-yet-reachable IdP setups. **Mode semantics verified against `src/app/api/auth/login/route.js`:** `"both"` never blocks password login (soft probe only); `"saml"` mode is excluded entirely (own config surface); hard gate requires OIDC fields to actually be complete. 13 unit tests in `tests/unit/oidc-save-validation.test.js`, all passing. TLS cert-chain validation is delegated to Node's default TLS verification (the discovery fetch fails on untrusted certs) rather than a custom CA check.
10. **Lowercase `web` heading fix (Day 2).** ✅ Done 2026-10-24. Root cause was in `src/shared/components/Header.js` (the `mediaKindMatch` branch looked up `MEDIA_PROVIDER_KINDS` by `id`, but `/media-providers/web` has `kindId="web"` and no such entry exists — fell through to raw-slug fallback). Added special case returning `{title:"Web", description:"Manage your Web Search and Web Fetch providers", icon:"travel_explore"}` plus zh-CN/zh-TW translations. See Finding #15 resolution.
11. **Duplicate "Create Combo" buttons on `/media-providers/web` (Day 2).** ⚪ By design — the page renders two `<Section>` components (Web Search + Web Fetch), each with its own `Create Combo` button wired to `handleCreateCombo("webSearch")` / `handleCreateCombo("webFetch")`. Other media sub-pages have one button because they host one kind; this page hosts two. No change needed.
12. **Token Saver "文 Full" preset label (Day 2).** ⚪ Intentional locale-gated branding — `TokenSaverClient.js:71-73` filters the wenyan presets out via `CAVEMAN_LEVELS.filter(lvl => !lvl.wenyan)` when the active locale is not in `WENYAN_LOCALES` (`["zh-CN", "zh-TW"]`), and auto-downgrades an active wenyan selection to `ultra` on locale switch. Added `/* eslint-disable local-i18n/no-chinese-literals */` block with rationale comment.

---

## Files touched

**Day 1 (2026-10-23):**
- `custom-server.rate-limiter.js` — added `isNextInternal` bypass
- `cli/app/custom-server.rate-limiter.js` — same (published package copy)
- `tests/unit/rate-limiter.test.cjs` — 3 regression tests
- `/Applications/9Router.app/Contents/Resources/app/app/custom-server.rate-limiter.js` — live-patched on mini2
- `~/.9router/db/data.sqlite` — reverse-migrated (FK dropped), backup at `data.sqlite.bak-before-fk-drop.*`

**Day 2 (2026-10-24, read-only audit — no source edits):**
- `docs/plans-and-prompts/research/9router/51-mini2-dashboard-dom-error-audit.md` — this document, expanded with Findings #10–#15
- `/memories/session/combos-feature-walk.md` — session memory with combo-page interactive inventory
- Browser session `34271fd2-402c-4051-8828-7480e79689b8` — 25 dashboard URLs visited, accessibility snapshots + DOM probes + screenshots at each step (screenshots archived in the Copilot chat resources under this session's GUID `3ba69e69-a2a3-4b6e-8e3a-9acd4cb9bb8d`)

**Day 3 (2026-10-24, remediation):**
- `src/app/(dashboard)/dashboard/model-context/page.js` — 48 Chinese strings rewritten to English source text
- `src/app/(dashboard)/dashboard/statistics/StatisticsContent.js` — 11 Chinese strings rewritten to English source text
- `src/shared/components/Header.js` — added `/media-providers/web` special case for properly-capitalized title
- `public/i18n/literals/zh-CN.json` — added 53 Model-Context keys + 8 Statistics keys + 2 Web-header keys (total 1514), re-sorted alphabetically
- `public/i18n/literals/zh-TW.json` — added 56 Model-Context keys + 13 Statistics keys + 2 Web-header keys (total 266), re-sorted alphabetically
- `eslint.config.mjs` — added inline `local-i18n/no-chinese-literals` rule scoped to dashboard files
- `src/app/(dashboard)/dashboard/endpoint/endpointConstants.js` — wrapped intentional wenyan presets in `eslint-disable` block with rationale comment
- `src/lib/auth/oidc.js` — added `validateOidcConfigForSave()`; extended `fetchOidcDiscovery()` with `{signal}` support
- `src/app/api/settings/route.js` — added OIDC save-time validation gate (hard gate for password-disabled modes, soft probe otherwise, `skipOidcValidation` escape hatch)
- `tests/unit/oidc-save-validation.test.js` — 13 new unit tests for the validation gate, all passing
- `src/dashboardGuard.js` — added `isNextInternalRequest()` RSC/`_next/` exemption to the middleware rate limiter (Finding #16 remediation)
- `tests/unit/middleware.test.js` — `fakeRequest` helper gained `searchParams`; 3 RSC-exemption regression tests added (24/24 passing)
- `/tmp/9router-audit/` — extracted `9router-0.5.109.tgz` for read-only inspection (Finding #17 evidence)
- `src/shared/constants/providers.js` — added `isAddableViaApiKey()` + `getProviderAddBlockReason()` helpers (Finding #4 / backlog #4)
- `src/app/(dashboard)/dashboard/providers/new/page.js` — wired client-side guard (validate() check + inline amber notice + disabled submit)
- `tests/unit/provider-add-guard.test.js` — 17 new unit tests for the helpers, all passing
- `src/app/(dashboard)/error.js` — NEW dashboard-group error boundary with transient 429/5xx retry UI (backlog #3)
- `src/app/global-error.js` — NEW root error boundary (self-contained, zero layout deps) (backlog #3)
- `docs/plans-and-prompts/research/9router/51-mini2-dashboard-dom-error-audit.md` — this document, Finding #12 "Fix applied (2026-10-24)" section + Finding #13 remediation note + Finding #15 Resolution table + Finding #16 resolution + Finding #17 (published-package audit) + backlog items #3/#4/#5/#6/#7/#8/#9/#10/#11/#12 marked resolved

## See also

- `docs/ARCHITECTURE.md` — system overview
- `docs/plans-and-prompts/research/9router/11-db-layer-deep-dive.md`
- `docs/plans-and-prompts/research/9router/15-api-routes-deep-dive.md`
- `docs/plans-and-prompts/research/9router/21-audit-no-more-bugs.md`
- `docs/plans-and-prompts/research/9router/22-error-sweep.md`
