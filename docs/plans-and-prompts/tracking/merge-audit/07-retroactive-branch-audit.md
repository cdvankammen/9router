# Retroactive Audit: Our 263 Branch Commits vs Upstream

This document audits our 263 commits ahead of origin/master for overlap with upstream work.

## Commit Categorization

| Category | Count | Overlap Risk |
|----------|-------|-------------|
| fix | 104 | HIGH — may duplicate upstream bug fixes |
| docs | 66 | LOW — documentation only |
| feat | 58 | MEDIUM — may implement same features differently |
| test | 17 | LOW — test additions |
| security | 6 | HIGH — critical overlap area |
| refactor | 3 | LOW — internal restructuring |
| chore | 3 | LOW — housekeeping |
| Other (update/tracking/perf/merge/ci/build) | 6 | LOW |

## Overlap Analysis: Security Commits (HIGH priority)

Our branch has 6 security commits that may overlap with upstream security work:

| Our Commit | Subject | Upstream Equivalent | Verdict |
|------------|---------|---------------------|--------|
| 35905a8a | allow loopback OIDC issuers while keeping SSRF guard | None in upstream | **OURS ONLY** — our security hardening |
| 103567e2 | restrict _rsc= rate-limit bypass to page routes only | Related to Finding #16 | **OURS ONLY** — refinement of RSC bypass |
| 868f549c | size guard on STT uploads — prevent memory-exhaustion DoS | None | **OURS ONLY** |
| 6116cd96 | SSRF guard on OIDC discovery + JWT-gate console-log stream | None | **OURS ONLY** |
| ffbc8ca8 | SSRF guard on headroomUrl proxy + health probe | None | **OURS ONLY** |
| 90bc5935 | mask API keys server-side + sanitize settings numeric keys | None | **OURS ONLY** |

**Pattern**: Our branch has extensive security hardening (SSRF guards, JWT gating, size guards) that upstream does NOT have. These are all ours-only additions.

## Overlap Analysis: Rate-Limiter Commits

| Our Commit | Subject | Upstream Equivalent | Verdict |
|------------|---------|---------------------|--------|
| b6fd4264 | exempt RSC prefetches from middleware-layer limiter | Finding #16 fix | **BOTH** — both branches solved the same problem |
| b6dcc553 | multi-bucket per-(ip,category) limits | Finding #1 remediation | **OURS ONLY** — upstream has simpler limiter |
| 1ca9f5d8 | restore dashboardGuard rate-limiting (middleware 429) | Rebase restoration | **REBASE FIX** — restoring branch feature after merge |

**Pattern**: Both branches fixed the RSC-prefetch 429 problem independently. Our implementation is more sophisticated (multi-bucket). Keep ours.

## Overlap Analysis: Feature Commits

Major feature areas in our 58 feat commits:
- System One router + smart policy (multiple commits)
- OIDC save-time validation gate
- Dashboard error boundaries
- Provider-add UX guard
- i18n ESLint rule
- Model-context + statistics dashboard rework
- Migration runner hardening

None of these have direct upstream equivalents based on the Stage 1 audit (all 106 upstream commits reviewed, no matching feature work found).

## Overlap Analysis: Merge/Rebase Commits

| Our Commit | Subject | Purpose |
|------------|---------|--------|
| 664b0a42 | merge: integrate origin/master (v0.5.95→v0.5.109) | The bring-in merge |
| 10772992 | fix: resolve merge regressions | Post-merge fixup |
| b1cc8721 | fix(combo): resolve 3 post-merge structural breaks | Post-merge fixup |
| Multiple 'fix(rebase):' commits | Restore lost branch features | Rebase recovery |

**Pattern**: The merge was followed by extensive rebase-fixup work restoring features that got lost during conflict resolution. All these are ours-only recovery commits.

## True Overlap Summary

| Category | Ours Only | Both (keep ours) | Take Upstream |
|----------|-----------|------------------|---------------|
| Security | 6 | 0 | 0 |
| Rate-limiter | 2 | 1 (b6fd4264) | 0 |
| Features | 58 | 0 | 0 |
| Rebase recovery | ~20 | 0 | 0 |
| Docs | 66 | 0 | 0 |
| Tests | 17 | 0 | 0 |

**Conclusion**: Our 263 branch commits are overwhelmingly ours-only work. The one genuine overlap (RSC prefetch exemption, b6fd4264) is already resolved — our implementation is more sophisticated than upstream's. No upstream commits need to replace our work.

---

*Last updated: 2026-10-26*
