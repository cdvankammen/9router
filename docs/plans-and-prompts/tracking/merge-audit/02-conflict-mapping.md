# Conflict Mapping: Our Branch vs Upstream

This document maps every instance where:
- Our branch fixed something upstream also fixed (prefer upstream if EXACT same bug)
- Our branch added a feature upstream also added (analyze which is better)
- Our code touches the same lines/functions as upstream changes
- Conflicts occurred during merge

## Categories

### A. Exact Same Bug Fix (Prefer Upstream)
| Our Commit | Upstream Commit | Bug Description | Resolution |
|---|---|---|---|
| c933eefc (670 lines, 2026-09-21) | cbd594ac (15 lines, 2026-10-07) | Cursor AgentService returns HTTP 200 with an empty turn (or hangs) whenever a client sends tools | Not a strict prefer-upstream: ours is a comprehensive rewrite (MCP tools, protobuf encoders, thinking mapping, request_context ack, FIXED64) while upstream is a minimal `finishTurn()` extraction. Ours predates by 16 days. Keep ours; adopt upstream's `finishTurn()` naming/helpers + its 4 new tests (empty-EOF, empty-explicit-turn, non-stream 400, transport-interrupt) as a refinement. |

### B. Similar But Not Identical (Keep Both, Document Differences)
| Our Commit | Upstream Commit | Feature/Fix | Differences | Notes |
|---|---|---|---|---|

### C. Different Solutions, Same Area (Analyze Which is Better)
| Area | Our Approach | Upstream Approach | Recommendation | Rationale |
|---|---|---|---|---|

### D. Pure Conflicts (No Functional Overlap)
| File | Our Change | Upstream Change | Resolution Strategy |
|---|---|---|---|
| open-sse/translator/formats/gemini.js | 10 schema-cleaning commits (aafe3002, 30464bc2, e7b5f09d, f6c59d30, 2abe8b85, e3e3e235, 319caa2d, 3d20a4cc, f6c2f7ca, db9ec3af) — JSON Schema keyword stripping in cleanJSONSchemaForAntigravity/normalizeGeminiContents | 625df74d adds sanitizeFunctionResponsePayload ($ref→_ref) and changes `c.parts.filter(...)` to `.filter(...).map(sanitizeFunctionResponsePart)` | Take upstream's sanitization (leaf function, good tests); expect text conflict on the single `c.parts.filter()` line; re-apply our schema commits on top. |
| src/shared/components/OAuthModal.js | 15+ provider additions (glm, grok-cli, muse, qoder-cn, xiaomi-mimo, zed, trae, windsurf, kimi, kimchi) editing the `deviceCodeProviders` array | 85bc33ce adds minimax-code + minimax-code-global to `deviceCodeProviders` + `_minimaxPollByUser` extra + `device_code || user_code` fallback | Take upstream's additions; the array is a known conflict hotspot — verify final ordering contains our providers AND minimax entries. |

---

## Batch 1 Analysis (2026-10-07, 5 commits)

| Commit | Category | Notes |
|--------|----------|-------|
| d2f90177 systemone clef-flash | NO_CONFLICT | Extends System One infrastructure our branch created (0a879c5c, b7446f8d). Clean additive; take as-is. |
| e10da160 codex image usage | NO_CONFLICT | Files untouched by our branch. Clean additive; take as-is. |
| 625df74d gemini $ref | D (same-file, unrelated purpose) | See table D row 1. Take upstream sanitization, re-apply our schema commits. |
| 85bc33ce minimax-code | D (OAuthModal array) | See table D row 2. Take upstream; verify deviceCodeProviders ordering. |
| cbd594ac cursor empty turns | A (exact-same-bug) | See table A. Keep our comprehensive c933eefc; adopt upstream finishTurn() + 4 tests. |

## Stage 1 Complete Summary (All 106 Commits)

### Absorption Statistics
| Verdict | Count | Percentage |
|---------|-------|------------|
| CLEAN_SUBSUMED | 98 | 92.5% |
| NOT_IN_OURS | 2 | 1.9% |
| NO_ACTION_NEEDED | 5 | 4.7% |
| PARTIAL_OVERLAP | 1 | 0.9% |
| Total | 106 | 100% |

### NOT_IN_OURS Items (2 commits, both survive in origin/master, adoption recommended)
1. **d8c585fb** — per-API-key access control foundation (26 files, 1131 insertions). `keyAccess.js` survives in origin/master. Clean additive feature.
2. **813a0121** — usage token fallback + stable key masking (2 files, 16 insertions). `input_tokens` fallback survives in origin/master `usageRepo.js`. Small defensive fix.

Both are clean additive changes with no conflict risk. Adoption recommended as a small bundle.

### NO_ACTION_NEEDED Items (5 commits)
- 7e0043de — merge commit (git bookkeeping)
- 87a74e1b — v0.5.104 changelog bump
- 6ed88685 — revert of 2aa9307f (abandoned feature)
- 3c48d275 — changelog revert + version bumps
- f39d8f07 — v0.5.109 changelog bump

### PARTIAL_OVERLAP Items (1 commit)
- **63de82b8** — codebuddy-cn catalog (line-by-line triage at merge time)

### Key Findings
1. Our branch (v5-vscode-works) is at v0.5.109 — same version as latest upstream. The 106-commit audit is largely a verification of a prior merge.
2. 92.5% absorption rate — overwhelming alignment between our branch and upstream.
3. Massive features already absorbed: web-cookie (89 files, 14572 insertions), Smart Router System One (1450 insertions), empty-content failover (753 insertions), test triage (2442 insertions).
4. Critical verdict correction: 2aa9307f (per-key token quotas) originally flagged NOT_IN_OURS → corrected to NO_ACTION_NEEDED after upstream reverted it same day via 6ed88685.

### Outstanding Work
- PR comment reading per commit (user explicit requirement — not yet done for any batch due to scope)
- Retroactive audit of 20 draft v5 commits against expanded standard
- DOM/code/visual triple verification of all dashboard pages
- 3-model-family final review
- Operator decisions: evil.example.com OIDC cleanup, mini2 upgrade path

### Our Branch Commits Ahead of Upstream (261 commits)

Our branch has 261 commits not in origin/master. These are the draft v5 commits that need retroactive audit against the expanded standard. The audit will check:
1. Whether any of our commits duplicate work that upstream also did (and which is better)
2. Whether our commits touch the same files/functions as upstream changes we already absorbed
3. Whether our commits introduce regressions relative to upstream
4. Whether our commits should be kept, merged, or superseded

### Conflict Hotspots Identified

| File/Area | Conflict Type | Notes |
|-----------|--------------|-------|
| `open-sse/translator/formats/gemini.js` | D (same-file, unrelated purpose) | Our 10 schema-cleaning commits vs upstream $ref sanitization |
| `src/shared/components/OAuthModal.js` | D (OAuthModal array) | Our 15+ provider additions vs upstream minimax-code additions |
| `open-sse/executors/cursor/` | A (exact-same-bug) | Our c933eefc rewrite vs upstream cbd594ac finishTurn() |
| `open-sse/rtk/headroom.js` | CLEAN_SUBSUMED | Our headroom infrastructure already handles upstream tool-dominance + CommandCode |
| `open-sse/services/browserPool.js` | CLEAN_SUBSUMED | Our web-cookie infrastructure already present |
| `open-sse/providers/registry/*.js` | CLEAN_SUBSUMED | All provider registry additions already present |
| `open-sse/config/errorConfig.js` | CLEAN_SUBSUMED | All error config additions already present |
| `src/lib/db/` | CLEAN_SUBSUMED | All DB layer additions already present |
| `open-sse/providers/capabilities.js` | CLEAN_SUBSUMED | All capability additions already present |

### Verification Protocol

For each conflict resolution:
1. **Code test**: Unit/integration test passes
2. **DOM test**: No console errors in browser
3. **Visual test**: Screenshot shows correct rendering

---

*Last updated: 2026-10-26*
