# Draft PR: mini2 dashboard audit — remediation (v4-vscode-works)

> **Status:** DRAFT — not yet submitted. Branch `v4-vscode-works` cannot be pushed as-is due to a pre-existing repo blocker (see "Push blocker" below). This draft is for review and manual PR creation once the blocker is resolved.

## Target branch
`master` (or whatever the current integration branch is).

## Summary

Autonomous remediation of the 12-item follow-up research backlog from the mini2 dashboard DOM-error audit (`docs/plans-and-prompts/research/9router/51-mini2-dashboard-dom-error-audit.md`). Nine atomic commits land:

- i18n literal rewrites + ESLint guard-rail for hardcoded Chinese
- OIDC save-time validation gate (security)
- RSC-prefetch exemption in the middleware rate limiter (Finding #16 fix)
- Multi-bucket per-(IP, category) rate limiter with a shared route classifier (backlog #1)
- Provider-add client-side pre-validation guard (backlog #4 / Finding #4)
- Dashboard + global error boundaries with transient 429/5xx retry UI (backlog #3)
- Migration runner registry-integrity gate + dry-run preview endpoint (backlog #2)
- Published `9router@0.5.109` package audit write-up (backlog #5 / Finding #17)
- CHANGELOG Unreleased section covering the above

All 204 regression tests across 15 suites covering every touched subsystem pass green. Canonical snapshot verifiers (`verify-oauth-urls.mjs`) byte-stable; `verify-providers.mjs` and `verify-alias.mjs` show pre-existing drift unrelated to this branch (codex header 0.155→0.159, windsurf provider addition, idToAlias/modelKeys — confirmed via `git blame` to predate this session's commits).

## Commits (9, oldest → newest)

```
0ca07bf6 fix(i18n): rewrite Chinese literals in dashboard + add eslint guard-rail
3c3cb02a feat(security): OIDC save-time validation gate on /api/settings PATCH
b6fd4264 fix(rate-limiter): exempt RSC prefetches from middleware-layer limiter
16a1fe33 docs(research): Finding #17 — published 9router@0.5.109 package audit
88240fa2 feat(providers): client-side guard blocks non-addable providers before POST
61bed9dd feat(dashboard): add error boundaries with transient 429/5xx retry UI
b6dcc553 feat(rate-limiter): multi-bucket per-(ip,category) limits with shared route classifier
380ee9e9 feat(db): migration runner registry-integrity gate + dry-run preview
9ce2241b docs(changelog): log this session's 8 commits under Unreleased
```

## Test evidence

| Suite | Pass | Covers |
|---|---|---|
| `unit/db-migration-chain.test.js` | ✓ | existing chain stays green |
| `unit/db-migration-hardening.test.js` | 5/5 | new: registry validation, refusal, downgrade, dry-run |
| `unit/silent-catch-coverage.test.js` | ✓ | policy unchanged |
| `unit/provider-display-split.test.js` | ✓ | registry shape unchanged |
| `unit/oidc-save-validation.test.js` | 13/13 | new: OIDC save gate |
| `unit/provider-add-guard.test.js` | 17/17 | new: isAddableViaApiKey predicate |
| `unit/route-classifier.test.js` | 35/35 | new: classifier fixture table |
| `unit/rate-limiter-buckets.test.cjs` | 8/8 | new: per-bucket isolation |
| `unit/rate-limiter.test.cjs` | 9/9 | existing TCP suite green |
| `unit/middleware.test.js` | 24/24 | existing middleware suite green |
| `unit/security-audit.test.js` | ✓ | policy unchanged |
| `unit/annotations-repo.test.js` | ✓ | DB-adapter dependent |
| `unit/db-driver-chain.test.js` | ✓ | DB-adapter dependent |
| `unit/request-details-tab.test.js` | ✓ | DB-adapter dependent |
| `unit/search.test.js` | ✓ | DB-adapter dependent |
| `unit/sr-combo-cleanup.test.js` | ✓ | DB-adapter dependent |
| `unit/tasktype-tracking.test.js` | ✓ | DB-adapter dependent |
| **Total** | **204/204** | |

Snapshot verifiers: `verify-oauth-urls.mjs` ✅ byte-stable. `verify-providers.mjs` and `verify-alias.mjs` show pre-existing drift outside this branch's scope (git-blame confirmed).

**Build verification**: `JWT_SECRET=… npm run build` ✅ all routes compile; standalone postbuild copies rewritten `custom-server.rate-limiter.js` into `.next/standalone/`. (Bare `npm run build` without env fails on a pre-existing `JWT_SECRET` requirement in `src/lib/auth/dashboardSession.js` — not a regression, and none of the 9 commits touch that module.)

## Live evidence from mini2 (v0.5.75, pre-branch)

A live probe of `http://mini2:20128/dashboard/media-providers/web` on 2026-10-24 captured the exact failure modes this PR remediates — on the production box, running the pre-branch global-bucket rate limiter:

1. **RSC prefetch 429 storm** — `performance.getEntriesByType('resource').slice(-30)` showed 29 out of 30 recent requests were Next.js RSC prefetches (`?_rsc=`) all returning **HTTP 429** within a 22 ms window. Hit routes included `/dashboard/quota`, `/dashboard/token-saver`, `/dashboard/claude-compat`, `/dashboard/memory`, `/dashboard/cli-tools`, `/dashboard/proxy-pools`, `/dashboard/skills`, `/dashboard/model-context`, and every `/dashboard/media-providers/webSearch/{provider}` prefetch. This is exactly the false-positive storm that Finding #16 / commit `b6fd4264` (RSC exemption in middleware) and backlog #1 / commit `b6dcc553` (per-(IP, category) buckets) were designed to eliminate. Under the new code, these prefetches bypass the middleware limiter entirely (`BYPASS_CATEGORIES` includes `rsc`), and even if they didn't, they'd draw from their own bucket rather than contending with real API traffic.

2. **Finding #13 confirmed live** — `GET /api/auth/status` returned:
   ```json
   {
     "authMode": "oidc",
     "ssoType": "oidc",
     "oidcConfigured": false,
     "hasPassword": true,
     "authenticated": false,
     "oidcName": null,
     "oidcEmail": null
   }
   ```
   This is the degraded state the save-time gate (commit `3c3cb02a`) prevents from recurring: an unreachable OIDC IdP (the `evil.example.com` fixture) saved to settings, discovery failing silently at runtime, and the dashboard stuck reporting `authMode: "oidc"` while falling back to password login. The new gate would have rejected this save at PATCH time with a concrete discovery-doc error rather than letting the config persist.

3. **Version drift live** — sidebar advertises `v0.5.75` with a banner `↑ New version available: v0.5.109` and a button offering `npm i -g 9router@latest --prefer-online`. Per Finding #17 (published package audit, commit `16a1fe33`), the operator should **not** click that button — the published `0.5.109` is behind repo HEAD on security work. The upgrade path is a local build from repo HEAD.

None of these three issues block merging this PR, but (1) and (2) should be cited when scheduling the mini2 upgrade.

## Security-relevant changes (reviewer attention)

1. **`src/app/api/settings/route.js`** — new hard gate on PATCH that fetches the OIDC discovery doc before persisting when the effective auth mode would disable password login. Rejects unreachable IdPs, non-HTTPS (except localhost), bad JSON, missing discovery fields. Has a `skipOidcValidation` escape hatch for air-gapped setups.
2. **`src/lib/middleware/rateLimiter.js`** + **`custom-server.rate-limiter.js`** — both rate limiters rewritten with per-(IP, category) buckets. Tight `auth` bucket (10/min) narrowed to POST `login`/`setup`/`reset-password` only — `GET /api/auth/status` stays in the general `api` bucket because `Header.js` polls it every page load.
3. **`src/lib/db/migrate.js`** — refusal gate on invalid registry, diverged fingerprint, or downgrade (DB schema newer than build). Non-fatal: skips applying, persists `_meta.migrationWarnings`, runs additive sync so DB stays read-usable.
4. **`src/app/api/settings/database/migrations/route.js`** — new read-only dry-run endpoint. Auto auth-gated by `dashboardGuard` `ALWAYS_PROTECTED` prefix `/api/settings/database`.

## Push blocker (must be resolved before this PR can be opened)

The branch cannot be pushed to GitHub: two historical blobs in commit `729e786d` (long predating this branch) exceed GitHub's 100 MB limit:
- `docs/plans-and-prompts/research/9router/llm-routing-tree-6levels.csv` — 166 MB
- `scripts/.routing-tree-cache.json` — 226 MB

These ride along on any push of any descendant of `729e786d`. **This branch's 9 commits are clean**; the blocker is in the shared history.

### Remediation options (repo-admin decision required)

**Option A — git-filter-repo** (one-time history rewrite, then force-push):
```bash
# ⚠️ DESTRUCTIVE — run on a backup clone first
git clone --mirror . 9router-backup.git
git filter-repo --invert-paths --path docs/plans-and-prompts/research/9router/llm-routing-tree-6levels.csv --path scripts/.routing-tree-cache.json --force
# Then add large files to .gitignore and force-push to a new branch for PR review.
```

**Option B — Git LFS migration**: track both files via `.gitattributes` with `filter=lfs`, migrate history with `git lfs migrate import`.

**Option C — patch bundle**: a portable patch of all 10 session commits (9 remediation + 1 docs) is at `/tmp/9router-session-10commits.patch` (255 KB). Applies on top of commit `a59bdcaa` (the pre-session rebase fix), not directly on v0.5.95 — the recipient's clone must have the pre-session rebase commits in place. Apply with `git am /tmp/9router-session-10commits.patch`. **Verified portable**: applied cleanly via `git am` in a fresh `git clone` checked out at `a59bdcaa` (exit 0, all 10 commits landed with matching subjects and new hashes `cbd9b3ad` → `06738fab`).

## Operator-decision follow-ups (parked, not in this PR)

1. **Finding #13** — live `evil.example.com` OIDC config on mini2 (saved by a user, never rotated). Needs a human call on whether it's a test placeholder or a compromise. The new save-time gate (commit `3c3cb02a`) prevents this exact mistake from recurring.
2. **mini2 upgrade** — build from repo HEAD locally (`npm run build` + `scripts/copy-standalone-assets.mjs`). **Do NOT** `npm i -g 9router@0.5.109` — Finding #17 documents that the published line is behind the repo HEAD in security work (no rate limiter, only migration 001).

## Related docs

- `docs/plans-and-prompts/research/9router/51-mini2-dashboard-dom-error-audit.md` — the audit this PR remediates (all 12 backlog items marked resolved)
- `CHANGELOG.md` — Unreleased section added
