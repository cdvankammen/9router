# 04 — Visual Verification Log (v5-vscode-works)

**Branch**: `v5-vscode-works`
**Host**: mini4 (100.76.147.49 / 192.168.1.189)
**Server PID**: 47527 (started 2026-10-26 00:18 MDT from `.next/standalone/custom-server.js`)
**Build commit**: 2b469c6a (`fix(dashboard): gate GA4 telemetry, fix Local/Remote contradiction, raise rate-limit caps`)
**Method**: Vision subagent (pre-fix static screenshots) + live Playwright browser walk with `performance.getEntriesByType('resource')` probes + accessibility snapshots (post-fix).

---

## Pre-fix findings (vision subagent, static screenshots)

| Page | Verdict | UI Quality | Security Flags | Issues |
|---|---|---|---|---|
| `/dashboard/endpoint` | ISSUES_FOUND | ACCEPTABLE | none | Content not fully enumerable without scroll; redundant hamburger button on desktop |
| `/dashboard/combos` | ISSUES_FOUND | ACCEPTABLE | **GA4 `G-LC959F603F` fires on nav without consent** | Silent third-party telemetry; redundant hamburger button |
| `/dashboard/providers` | VERIFIED | ACCEPTABLE | none (search locality should be confirmed in code) | `dns` icon is a semantically odd choice |
| `/dashboard/profile` | ISSUES_FOUND | NEEDS_POLISH | **GA4 telemetry, unencrypted DB backup download, path disclosure, external promo links in admin nav** | "Local Mode" card contradicted "Remote Mode" footer; disabled toggles had no explanation; marketing links (9Remote/9English) in admin sidebar; icon names likely not aria-hidden |

**Overall pre-fix**: NEEDS_POLISH — three items were blockers for calling v0.5.109 shippable.

---

## Bugs fixed in 2b469c6a

### 1. Silent GA4 telemetry → GATED (opt-in)

- **Root cause**: `src/app/layout.js:55` unconditionally rendered `<GoogleAnalytics gaId={"G-LC959F603F"} />`.
- **Why it matters**: a self-hosted proxy that holds users' API keys must not phone home to Google on every dashboard navigation without explicit consent.
- **Fix**: gated on `process.env.NEXT_PUBLIC_ENABLE_GA === "true"`. Default (unset) = no telemetry.
- **Comment block** added explaining trust rationale, referencing `51-mini2-dashboard-dom-error-audit.md` Finding #5.
- **Production proof** (2026-10-26 06:22 UTC): Playwright `performance.getEntriesByType('resource').filter(r => r.name.includes('google-analytics') || r.name.includes('G-LC959F603F')).length`:
  - `/dashboard/endpoint`: 0
  - `/dashboard/providers`: 0
  - `/dashboard/profile`: 0
  - `/dashboard/combos`: 0
  - **Telemetry silenced. Fix confirmed.**

### 2. Local/Remote Mode self-contradiction → RESOLVED

- **Root cause**: `src/app/(dashboard)/dashboard/profile/page.js:769-778` always rendered a hard-coded "Local Mode — Running on your machine" card, while line 1648 conditionally showed `isRemoteHost ? "Remote Mode" : "Local Mode - All data stored on your machine"` in the footer.
- **Why it matters**: when `isRemoteHost=true`, the page said "Local Mode" at the top and "Remote Mode" at the bottom — undermined operator confidence in what they were administering.
- **Fix**: the top card now adapts on `isRemoteHost`:
  - Remote: `cloud` icon, blue accent, heading "Remote Mode", subtitle "Running on a remote host — verify trust boundary before entering secrets"
  - Local: `computer` icon, green accent, heading "Local Mode", subtitle "Running on your machine"
- **Production proof** (2026-10-26 06:22 UTC): accessibility snapshot on `/dashboard/profile`:
  - ref=e98: `generic: cloud` (icon)
  - ref=e100: `heading "Remote Mode"` (the card)
  - ref=e101: `paragraph: Running on a remote host — verify trust boundary before entering secrets` (subtitle)
  - ref=e199: `paragraph: Remote Mode` (the footer)
  - **Card and footer now agree. Fix confirmed.**

### 3. Heavy-page 429 storm → RAISED caps

- **Root cause**: `src/lib/middleware/rateLimiter.js` had `BURST_LIMIT=30 / BURST_WINDOW_MS=5000`. The providers page fires 92 `<Link>` prefetches on mount; a single human-pace navigation blew the 30/5s cap and generated 11+ 429s to the console.
- **Why it matters**: dashboard became unusable under normal operator pacing — Finding #1 in `51-mini2-dashboard-dom-error-audit.md` recurring on v5.
- **Fix** (three aligned constant sites + CJS twin):
  - `rateLimiter.js`: `BURST_LIMIT` 30→200, `DEFAULT_MAX_REQUESTS` 120→600
  - `routeClassifier.js`: `BUCKET_LIMITS.api` 120→600, `BUCKET_LIMITS.general` 120→600
  - `custom-server.rate-limiter.js` (CJS twin): `LIMITS.api` 120→600, `LIMITS.general` 120→600
  - `tests/unit/route-classifier.test.js`: pinned expectations 120→600
- **Two-tier invariant preserved**: `auth=10, chat=20` (tight, brute-force + upstream-cost protection) `< BURST_LIMIT=200 < api/general=600` (window).
- **Test evidence**:
  - `middleware.test.js` 24/24 pass
  - `route-classifier.test.js` 35/35 pass
  - `rate-limiter.test.cjs` 9/9 pass
  - `rate-limiter-buckets.test.cjs` 8/8 pass
  - Full vitest: 4611 pass / 54 fail, all 54 in `known-fails.txt` baseline
  - `verify-no-regression.mjs`: `No regression (now fails=54, baseline known=56, all known)`
- **Production proof** (2026-10-26 06:22 UTC): Playwright `performance.getEntriesByType('resource').filter(r => r.responseStatus === 429).length`:
  - `/dashboard/endpoint`: 0
  - `/dashboard/providers` (heavy, 92 Link prefetches): 0
  - `/dashboard/profile`: 0
  - `/dashboard/combos`: 0 (one `net::ERR_ABORTED` on a `_rsc` prefetch is a normal prefetch cancel during navigation, NOT a 429)
  - **Heavy-page 429 storm eliminated. Fix confirmed.**

---

## Ancillary fix in the same commit

**`tests/__baseline__/verify-no-regression.mjs`** path normalization was assuming a Docker `/app/` prefix (`f.name.split("/app/")[1]`), producing `undefined` keys on this macOS checkout and reporting 54 false-positive regressions. Fixed to `normalizeTestPath()` using `indexOf("tests/")` so it works on any checkout (Docker, macOS, CI runners). Also filters `#` comment lines from `known-fails.txt` that were being loaded as phantom entries.

---

## Items NOT fixed (deferred to operator / follow-up)

Flagged by the vision subagent but out of scope for the 2b469c6a bug-fix commit — they need operator or maintainer decisions:

1. **Redundant hamburger menu button on desktop viewports** — sidebar is always visible at 1920×1080; the `menu` button wastes space. Cosmetic; not a blocker.
2. **Marketing links in admin sidebar** — `9Remote HOT` (https://9remote.cc) and `9English` (https://9english.net/) are external promo links mixed into the security-sensitive admin nav. Operator decision needed: keep, gate on `isRemoteHost`, or remove.
3. **Material-icon names exposed to screen readers** — `api`, `dns`, `layers`, `hub` etc. appear as visible text in the accessibility tree; should have `aria-hidden="true"`. Accessibility fix, separate PR.
4. **Unencrypted DB backup download** — powerful feature but no visible confirmation dialog or indication that export excludes API keys / OAuth tokens. Security review needed.
5. **Path disclosure** — `~/.9router/db/data.sqlite` shown in UI; harmless on single-tenant, small information-disclosure on shared deployments.
6. **Disabled toggles have no explanation** — Require login, Round Robin, Combo Round Robin, Outbound Proxy, Observability all render `[disabled]` in Remote Mode with no tooltip explaining why. UX polish.
7. **`dns` icon for Providers** — semantically odd (DNS ≠ upstream LLM providers). Cosmetic.

---

## Evidence chain

- **Commit**: `2b469c6a` (8 files, +80 / -20)
- **mini4 build log**: `npm run build` succeeded 00:17:59 → 00:18:17 MDT (18s)
- **Server**: PID 47527, `next-server (v16.4.3)`, `/api/health` → 200 `{"ok":true}`
- **Browser page**: `ffd6c160-fea9-4594-8add-785b28de085f` at `http://192.168.1.189:20129/dashboard`
- **Screenshots on disk**: `.agent/screenshots/visual-verify-{endpoint,combos,providers,profile}.png` (pre-fix) + `.agent/screenshots/post-fix-endpoint.png` (post-fix)
- **Test JSON**: `/tmp/9router-test-results.json` (4611 pass / 54 fail, all 54 in baseline)

---

## Pre-fix screenshot inventory (static, vision subagent)

| Page | File | Status |
|---|---|---|
| `/dashboard/endpoint` | `.agent/screenshots/visual-verify-endpoint.png` | Pre-fix baseline |
| `/dashboard/combos` | `.agent/screenshots/visual-verify-combos.png` | Pre-fix baseline |
| `/dashboard/providers` | `.agent/screenshots/visual-verify-providers.png` | Pre-fix baseline |
| `/dashboard/profile` | `.agent/screenshots/visual-verify-profile.png` | Pre-fix baseline |

## Post-fix browser walk — full 16-page sweep (live Playwright, 2026-10-26 06:26 UTC)

All 16 dashboard pages walked with `performance.getEntriesByType('resource')` probes for GA4 (`G-LC959F603F` / `google-analytics`) and HTTP 429 responses.

| Page | Resources | 429s | GA4 | Title | Verdict |
|---|---|---|---|---|---|
| `/dashboard` | 35 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |
| `/dashboard/endpoint` | 35 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |
| `/dashboard/providers` | 37 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |
| `/dashboard/profile` | — | 0 | 0 | 9Router - AI Infrastructure Management | PASS (accessibility: card+footer agree "Remote Mode") |
| `/dashboard/combos` | — | 0 | 0 | 9Router - AI Infrastructure Management | PASS (1 benign `_rsc` prefetch cancel) |
| `/dashboard/usage` | 7 | 0 | 0 | 9Router - AI Infrastructure Management | PASS (networkidle timeout but page rendered) |
| `/dashboard/quota` | 0 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |
| `/dashboard/token-saver` | 1 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |
| `/dashboard/claude-compat` | 0 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |
| `/dashboard/memory` | 0 | 0 | 0 | AI Memory & Context \| 9Router | PASS |
| `/dashboard/cli-tools` | 4 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |
| `/dashboard/proxy-pools` | 0 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |
| `/dashboard/skills` | 0 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |
| `/dashboard/console-log` | 1 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |
| `/dashboard/statistics` | 3 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |
| `/dashboard/translator` | 21 | 0 | 0 | 9Router - AI Infrastructure Management | PASS |

**Totals**: 16 pages walked, 0 pages with 429s, 0 pages with GA4 telemetry, 0 total 429 responses, 0 total GA4 requests.

**Post-fix overall**: 3/3 blocking bugs eliminated and confirmed across all 16 dashboard pages in production. 7 deferred items documented above for follow-up PRs.
