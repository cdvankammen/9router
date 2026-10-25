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
