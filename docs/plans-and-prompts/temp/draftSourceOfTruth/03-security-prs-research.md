# Critical Security PRs Research — 9Router Audit

**Date:** 2026-08-08  
**Cluster:** CRITICAL SECURITY  
**PRs Analyzed:** #3078, #3063, #3085, #3080, #3025, #2900, #2926  
**Status:** Research Only (No Code Changes)

---

## Executive Summary

| Tier | PRs | Action |
|------|-----|--------|
| **Tier 1: Merge Now** | #3078, #3063, #3025 | Clean security fixes, tested, minimal conflict risk |
| **Tier 2: Minor Work** | #2900, #3085 | Small rebase needed or dependency on #3080 |
| **Tier 3: Needs Decision** | #3080 | Changes default behavior; user must confirm intent |
| **Tier 4: Complex/Risky** | #2926 | Large refactor (13 files), overlaps with #3085 auth logic |

**Ready-now:** #3078 (pxpipe RCE), #3063 (SSRF + JWT + redaction), #3025 (CORS preflight)  
**Needs input:** #3080 (default `requireApiKey` change), #2926 (multi-credential auth scope)

---

## Per-PR Detailed Analysis

### PR #3078 — fix(security): add /api/pxpipe to LOCAL_ONLY_PATHS
- **Author:** zmf963
- **Files Changed:** 1 (`src/dashboardGuard.js`)
- **Diff Size:** +1 line

#### What It Does
Adds `/api/pxpipe` to the `LOCAL_ONLY_PATHS` array in `dashboardGuard.js`. This prevents unauthenticated remote access to the pxpipe endpoint, which spawns child processes and could enable RCE.

#### Current Master State
Checked `src/dashboardGuard.js` lines 69–86. Current `LOCAL_ONLY_PATHS` includes headroom routes but does **not** include `/api/pxpipe`. The fix is a single-line addition at line 85.

#### Mergeability
✅ **Clean merge expected.** Single-line addition to an array. No structural changes. Rebase should be trivial.

#### Risk Assessment
- **Risk Level:** LOW
- **Breakage:** None. Only restricts access that should have been local-only.
- **User Impact:** Remote/tunnel users lose pxpipe access (intended). Local users unaffected.

#### Dependencies
None. Standalone fix.

#### Recommendation
**TIER 1 — MERGE NOW.** Critical RCE prevention. One-line fix. Zero downside.

---

### PR #3063 — fix(security): SSRF guard + block default-password JWT + redact request details
- **Author:** zmf963 (HotSec fork)
- **Files Changed:** 6
- **Diff Size:** +167 / −5

#### What It Does
Three consolidated fixes from issue #3049:
1. **SSRF Guard:** `resolveBaseUrl()` in `open-sse/handlers/search/callers.js` now validates client-supplied `provider_options.baseUrl` via `assertPublicUrl()`. Blocks private IPs, loopback, metadata endpoints, non-http protocols.
2. **Default-Password JWT Block:** Login route (`src/app/api/auth/login/route.js`) returns 403 without JWT when `mustChangePassword=true` for remote clients. Prevents CVE-2026-56679 class attack.
3. **Request Details Redaction:** `/api/usage/request-details` replaces conversation payloads (`request`, `providerRequest`, `providerResponse`, `response`) with `{ redacted: true }`. Metadata preserved.
4. **Build Fix:** Declares `chalk` and `prop-types` in `package.json`.

#### Current Master State
- `open-sse/handlers/search/callers.js`: Verified `resolveBaseUrl()` exists (~line 70) but has NO SSRF guard. `assertPublicUrl` exists in `src/shared/utils/ssrfGuard.js` (line 48).
- `src/app/api/auth/login/route.js`: Lines 54–66 show current code issues JWT **before** checking `mustChangePassword`. Vulnerable.
- `src/app/api/usage/request-details/route.js`: Currently returns full payloads (verified in earlier terminal output).
- `package.json`: Neither `chalk` nor `prop-types` declared (confirmed missing).

#### Mergeability
⚠️ **Minor rebase likely.** Four commits touch distinct files. Login route may conflict if other auth PRs merged first. Search caller change is isolated. Package.json additions are additive.

#### Risk Assessment
- **Risk Level:** MEDIUM (due to login flow change)
- **Breakage:** Remote fresh-install users cannot self-service password change (deliberate trade-off, documented in PR). Local users unaffected.
- **User Impact:** Dashboard request-details view loses conversation content. Usage analytics/metadata intact.

#### Dependencies
Supersedes #3050 and #3060. Independent of other cluster PRs.

#### Recommendation
**TIER 1 — MERGE NOW.** Addresses verified SSRF PoC and credential leak. Test plan includes 11 unit tests + E2E on Pi 500. Trade-offs are intentional and documented.

---

### PR #3085 — fix(auth): enforce requireApiKey on GET /v1/models
- **Author:** thatssoheil
- **Files Changed:** 2 (`src/app/api/v1/models/route.js`, test file)
- **Diff Size:** +100 / −1

#### What It Does
Enforces `requireApiKey` setting on `GET /v1/models`. Returns 401 when enabled and no valid key present. Internal cross-instance fetches (via `x-9r-internal-models-fetch` header) bypass the check.

#### Current Master State
Checked `src/app/api/v1/models/route.js` lines 530–560. Current `GET` handler has NO auth check — serves models list unconditionally. Closes issue #2834.

#### Mergeability
⚠️ **Depends on #3080.** Uses `extractApiKey` from `@/sse/services/auth`. If #2926 merges first (which refactors `extractApiKey` → `extractApiKeyCandidates`), this PR needs import update. If #3080 merges first (changes `requireApiKey` default), behavior aligns.

#### Risk Assessment
- **Risk Level:** LOW-MEDIUM
- **Breakage:** Clients relying on unauthenticated `/v1/models` will break when `requireApiKey=true`. This is the intended fix.
- **User Impact:** Model catalog no longer leaks on internet-exposed deploys with auth enabled.

#### Dependencies
Complements #3080 (env var bridge). Conflicts with #2926's `extractApiKey` refactor.

#### Recommendation
**TIER 2 — MERGE AFTER #3080.** Correct fix for #2834. Coordinate with #2926 to avoid double-refactor of auth extraction.

---

### PR #3080 — fix(settings): bridge REQUIRE_API_KEY env var to requireApiKey setting
- **Author:** thatssoheil
- **Files Changed:** 2 (`src/lib/db/repos/settingsRepo.js`, test file)
- **Diff Size:** +67 / −1

#### What It Does
Bridges `REQUIRE_API_KEY` environment variable to the `requireApiKey` dashboard setting. Env initializes the default; stored dashboard value wins. **Changes code default from `true` to `false`** to match README documentation.

#### Current Master State
Checked `src/lib/db/repos/settingsRepo.js` line 48: `requireApiKey: true` is the current hardcoded default. README documents `false`. PR aligns code with docs.

#### Mergeability
✅ **Clean merge expected.** Isolated to settings repo. Lazy resolution means env set after import still works.

#### Risk Assessment
- **Risk Level:** MEDIUM (default behavior change)
- **Breakage:** Fresh installs without `REQUIRE_API_KEY=true` will default to OPEN (no API key required). Existing installs with stored `requireApiKey: true` are unaffected.
- **User Input Needed:** ⚠️ **Confirm default-open is acceptable for fresh installs.** This matches README but reverses the secure-by-default posture of current code.

#### Dependencies
Prerequisite for #3085. Independent of other cluster PRs.

#### Recommendation
**TIER 3 — NEEDS USER DECISION.** Technically correct (aligns code with docs), but changes security posture for new deployments. User must decide: secure-by-default (current code) vs. docs-aligned (PR).

---

### PR #3025 — fix: exempt OPTIONS preflight from auth on /v1/* paths
- **Author:** kevin-ho
- **Files Changed:** 1 (`src/dashboardGuard.js`)
- **Diff Size:** +17 lines

#### What It Does
Exempts CORS preflight (OPTIONS) requests from auth middleware on `/v1/*` paths. Browsers send OPTIONS without auth headers by spec. Current middleware rejects with 401 before route handlers can respond with CORS headers, breaking all cross-origin browser clients (extensions, Claude for Office, Cline web).

#### Current Master State
Checked `src/dashboardGuard.js` lines 197–220. No OPTIONS exemption exists. The `isPublicLlmApi` auth check fires on OPTIONS. PR adds short-circuit before that check.

#### Mergeability
✅ **Clean merge expected.** Additive block inserted before existing auth check. No structural changes. Note: #2900 and #3078 also modify `dashboardGuard.js` but in different sections (ALWAYS_PROTECTED gate and LOCAL_ONLY_PATHS array respectively). Three-way merge should resolve cleanly.

#### Risk Assessment
- **Risk Level:** LOW
- **Breakage:** None. GET/POST auth fully preserved. Only OPTIONS exempted, scoped to `/v1/*` via existing `isPublicLlmApi()`.
- **User Impact:** Fixes broken browser/WebView clients. Closes #1381.

#### Dependencies
Independent. Complements #2926 (which also touches dashboardGuard auth but for credential extraction, not OPTIONS).

#### Recommendation
**TIER 1 — MERGE NOW.** Essential for browser compatibility. Well-scoped. Test plan covers preflight + post-auth flows.

---

### PR #2900 — fix(auth): allow local auto-import without JWT when requireLogin=false
- **Author:** AungMyoKyaw
- **Files Changed:** 2 (`src/dashboardGuard.js`, test file)
- **Diff Size:** +56 / −1

#### What It Does
Allows local Cursor/Kiro auto-import requests to pass without JWT when `requireLogin=false`. Currently, `ALWAYS_PROTECTED` gate demands JWT unconditionally, but with login disabled no JWT ever exists. Fix adds `isLocalRequest(request) && isAuthenticated(request)` check to the ALWAYS_PROTECTED gate.

#### Current Master State
Checked `src/dashboardGuard.js` lines 194–198. Current ALWAYS_PROTECTED gate only checks CLI token or JWT. No `requireLogin=false` bypass. Closes #115.

#### Mergeability
⚠️ **Minor rebase needed.** Modifies the ALWAYS_PROTECTED gate block (lines 194–198). #3025 inserts code AFTER this block (line 200+). #3078 modifies LOCAL_ONLY_PATHS array (line 85). All three touch `dashboardGuard.js` but in non-overlapping regions. Git should handle three-way merge, but manual verification recommended.

#### Risk Assessment
- **Risk Level:** LOW
- **Breakage:** None. Remote requests still blocked. `requireLogin=true` still enforces JWT. Only local + no-login combo is newly allowed.
- **User Impact:** Fixes Cursor/Kiro connect for no-login local users.

#### Dependencies
Independent. Touches same file as #3025 and #3078 but different sections.

#### Recommendation
**TIER 2 — MERGE WITH REBASE VERIFICATION.** Correct fix for #115. Verify three-way merge with #3025 and #3078 on `dashboardGuard.js`.

---

### PR #2926 — fix(auth): accept valid x-api-key even when Authorization header is present
- **Author:** omar-nahhas
- **Files Changed:** 13
- **Diff Size:** +189 / −81

#### What It Does
Refactors API key extraction to collect ALL presented credentials (Authorization bearer, x-api-key, x-goog-api-key, query param) and validate each. Fixes Claude Code sending stale `Authorization` alongside valid `x-api-key`. New `resolveClientApiKey()` returns the credential that actually validated for usage attribution. Also adds Anthropic-native error envelope for `/v1/messages` 401s.

#### Current Master State
Checked `src/sse/services/auth.js` lines 298–330. Current `extractApiKey()` returns FIRST match (Authorization > x-api-key > x-goog-api-key > query). No multi-credential validation. `dashboardGuard.js` has identical single-match logic (lines 120–128).

#### Mergeability
❌ **High conflict risk.** Touches 13 files including all `/v1/*` handlers, `dashboardGuard.js`, `auth.js`, and `error.js`. Overlaps with:
- #3085 (also modifies `/v1/models` auth check using `extractApiKey`)
- #3025 (modifies `dashboardGuard.js` proxy function)
- #2900 (modifies `dashboardGuard.js` ALWAYS_PROTECTED gate)

Rebasing this after any other cluster PR merges will require manual resolution across multiple files.

#### Risk Assessment
- **Risk Level:** HIGH (scope + overlap)
- **Breakage:** Changes auth semantics globally. All handlers now use `resolveClientApiKey()` instead of `extractApiKey()`. Usage attribution changes to validated key. Error format changes for `/v1/messages`.
- **User Impact:** Fixes Claude Code + Anthropic SDK compatibility. Positive for users, but large blast radius.

#### Dependencies
Conflicts with #3085 (both touch `/v1/models` auth). Should merge BEFORE #3085 or absorb it.

#### Recommendation
**TIER 4 — COMPLEX/RISKY.** Correct and well-tested (112/112 passing), but massive scope. Options:
1. Merge FIRST before other auth PRs, then rebase #3085 onto it.
2. Defer until other security PRs land, then cherry-pick with manual resolution.
3. Extract just the `extractApiKeyCandidates` + `resolveClientApiKey` core into a smaller PR.

User decision needed on sequencing strategy.

---

## Overlap Matrix

| PR | #3078 | #3063 | #3085 | #3080 | #3025 | #2900 | #2926 |
|----|-------|-------|-------|-------|-------|-------|-------|
| **#3078** | — | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| **#3063** | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| **#3085** | ✅ | ✅ | — | 🔗 | ✅ | ✅ | ❌ |
| **#3080** | ✅ | ✅ | 🔗 | — | ✅ | ✅ | ✅ |
| **#3025** | ✅ | ✅ | ✅ | ✅ | — | ✅ | ⚠️ |
| **#2900** | ✅ | ✅ | ✅ | ✅ | ✅ | — | ⚠️ |
| **#2926** | ⚠️ | ✅ | ❌ | ✅ | ⚠️ | ⚠️ | — |

**Legend:** ✅ = no conflict, ⚠️ = same file different section, 🔗 = dependency, ❌ = direct conflict

**Key Conflicts:**
- `dashboardGuard.js`: Touched by #3078 (array), #3025 (OPTIONS block), #2900 (ALWAYS_PROTECTED), #2926 (extractApiKey). Non-overlapping sections except #2926 vs others.
- `auth.js` / `extractApiKey`: #2926 refactors globally; #3085 imports it. Merge #2926 first or update #3085.
- `settingsRepo.js`: Only #3080. No conflicts.
- `login/route.js`: Only #3063. No conflicts.
- `search/callers.js`: Only #3063. No conflicts.

---

## Tier Ranking

### Tier 1: Merge Now (no blockers)
| PR | Title | Reason |
|----|-------|--------|
| #3078 | pxpipe LOCAL_ONLY | 1-line RCE fix. Zero risk. |
| #3063 | SSRF + JWT + redaction | Verified exploits. Comprehensive tests. Supersedes older PRs. |
| #3025 | CORS preflight exemption | Essential browser compat. Scoped. No auth weakening. |

### Tier 2: Needs Minor Work
| PR | Title | Work Needed |
|----|-------|-------------|
| #2900 | Auto-import requireLogin=false | Verify 3-way merge on dashboardGuard.js with #3025/#3078 |
| #3085 | /v1/models auth enforcement | Rebase after #2926 decision; update import if #2926 merges first |

### Tier 3: Needs User Decision
| PR | Title | Decision Needed |
|----|-------|-----------------|
| #3080 | REQUIRE_API_KEY env bridge | Accept default-open for fresh installs? (matches README, reverses code default) |

### Tier 4: Too Risky/Stale
| PR | Title | Concern |
|----|-------|---------|
| #2926 | Multi-credential auth | 13-file refactor. Conflicts with #3085. Needs sequencing decision. Consider splitting. |

---

## Questions for the User

1. **Default security posture (#3080):** Current code defaults `requireApiKey: true`. PR changes to `false` to match README. Fresh internet-exposed installs would be open by default. Accept this trade-off, or keep secure-by-default and update README instead?

2. **#2926 sequencing:** This is the largest PR (13 files) and conflicts with #3085. Options:
   - (a) Merge #2926 first, then rebase #3085 onto it
   - (b) Merge #3085 first, defer #2926
   - (c) Split #2926 into core auth refactor + Anthropic error envelope as separate PRs
   Which approach?

3. **Merge order for dashboardGuard.js trifecta:** #3078, #3025, #2900 all touch this file in non-overlapping sections. Recommended order: #3078 → #3025 → #2900. Acceptable?

4. **Request details redaction (#3063):** Removes conversation content from `/api/usage/request-details`. Any internal tooling or debugging workflow that depends on viewing full payloads via this endpoint?

5. **Pxpipe scope (#3078):** Adds `/api/pxpipe` to LOCAL_ONLY. Are there legitimate remote/tunnel use cases for pxpipe that would break?

---

## Appendix: Current Master Code References

| File | Line(s) | Current State | PR That Changes It |
|------|---------|---------------|--------------------|
| `src/dashboardGuard.js` | 69–86 | LOCAL_ONLY_PATHS (no pxpipe) | #3078 |
| `src/dashboardGuard.js` | 120–128 | extractApiKey (single-match) | #2926 |
| `src/dashboardGuard.js` | 194–198 | ALWAYS_PROTECTED gate | #2900 |
| `src/dashboardGuard.js` | 197–220 | proxy() auth check (no OPTIONS exempt) | #3025 |
| `src/sse/services/auth.js` | 298–330 | extractApiKey (single-match) | #2926 |
| `src/app/api/auth/login/route.js` | 54–66 | Issues JWT before mustChangePassword check | #3063 |
| `src/app/api/v1/models/route.js` | 540–555 | GET handler (no auth check) | #3085 |
| `src/lib/db/repos/settingsRepo.js` | 48 | requireApiKey: true (hardcoded) | #3080 |
| `open-sse/handlers/search/callers.js` | ~70 | resolveBaseUrl (no SSRF guard) | #3063 |
| `src/shared/utils/ssrfGuard.js` | 48 | assertPublicUrl exists | Used by #3063 |
