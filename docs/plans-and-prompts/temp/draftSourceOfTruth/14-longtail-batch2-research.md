# Long-Tail Batch 2 — Deep Research

**Date:** 2026-08-13
**PRs:** #3087, #3079, #3075, #3074, #3066
**Base:** decolua/9router `master`

---

## Executive Summary

| PR | Title | Author | Files | Risk | Tier | Verdict |
|----|-------|--------|-------|------|------|---------|
| **#3075** | fix(9router): correct usage accounting for claude-backed traffic | nguyenha935 | 8 | MED | T1 | ✅ **Merge now.** 6 production-observed defects fixed. |
| **#3087** | feat(headroom): add lossless mode to proxy start | thatssoheil | 5 | LOW | T1 | ✅ **Merge now.** Fixes #2915 (CCR markers in tool outputs). |
| **#3066** | fix(headroom): skip compress on oversize payloads | vianhanif | 4 | LOW | T1 | ✅ **Merge now.** Fixes 3s timeout on large payloads. |
| **#3079** | fix(models/test): raise probe max_tokens for reasoning models | thatssoheil | 2 | LOW | 🔴 **CLOSED** | Skip — superseded by #3184 (maintainer's fix). Cherry-pick capability-based refinement optional. |
| **#3074** | feat: add Vertex thinking config, tune Kiro | henry-banana | — | — | — | ⚠️ Fetch failed. Re-fetch or check via git. |

---

## Per-PR Analysis

### PR #3075 — fix(9router): correct usage accounting and error scope for claude-backed traffic
**Tier: T1 — Merge now**

| Field | Value |
|-------|-------|
| Author | nguyenha935 |
| Files | 8 |
| Commits | 1 |
| Tests | 19 new tests pass; +5 passing vs baseline, 0 new failures; deployed to production |
| Risk | MED (touches usage accounting core) |

**Six defects fixed (all on `openai-responses -> claude` pivot route):**
1. **Double-folded cache totals:** `cached_tokens` marker set unconditionally at both fold sites in `claude-to-openai` so `canonicalizeUsage()` doesn't add Claude's cache totals to `prompt_tokens` twice. Marker must be written even when `0`.
2. **Custom tool names lost:** Forward `_customToolNames` through `openai-responses → openai → claude` pivot so Responses-API custom tools keep emitting `custom_tool_call` instead of JSON-wrapped `function_call`.
3. **No usage on completed:** Add `toResponsesUsage()` and attach usage to synthesized `response.completed` so Responses clients can size context.
4. **Wrong error classification:** Add `fallback: false` rule kind to `ERROR_RULES`; classify `context_length_exceeded` with it so over-long requests don't cool down the account (request-scoped failure, not account failure).
5. **Inconsistent message_stop usage:** Route through same `toOpenAIUsage(..., "claude")` as message_delta exit so both report cache-inclusive `prompt_tokens`.
6. **Cooldown reinstatement bug:** Classify before precise-cooldown branches in `markAccountUnavailable()` so provider reset hint on request-scoped failure can't reinstate lock.

**Notes:** `responsesTransformer.js` has same gap but is dead code (no file imports responsesHandler.js) — left untouched.

**Risk:** MED — touches canonicalizeUsage, ERROR_RULES, fallback logic. But well-tested (19 tests, differential suite), production-verified.
**Verdict: MERGE NOW.** Fixes real billing/usage errors.

---

### PR #3087 — feat(headroom): add lossless mode to proxy start
**Tier: T1 — Merge now**

| Field | Value |
|-------|-------|
| Author | thatssoheil |
| Files | 5 |
| Closes | #2915 |
| Risk | LOW |

**Problem:** Headroom CCR markers injected into tool outputs when lossless mode not set.

**Fix:** Adds `headroomLossless` setting (default false) that passes `--lossless` to headroom proxy. Preserves current compression behavior by default; enables SmartCrusher/CCR-preserving mode on demand.

**Risk:** LOW. New opt-in setting.
**Verdict: MERGE NOW.**

---

### PR #3066 — fix(headroom): skip compress on oversize payloads + disable kompress by default
**Tier: T1 — Merge now**

| Field | Value |
|-------|-------|
| Author | vianhanif |
| Files | 4 |
| Risk | LOW |

**Problem:** `headroom.js` has `DEFAULT_TIMEOUT_MS=3000` hard-coded for compress call to local headroom-ai proxy. Large payloads (~744KB / 104K tokens) take >30s but abort at 3s. Also headroom-ai proxy doesn't cancel in-flight compression on abort → pegged at ~400% CPU.

**Fix:**
- `MAX_COMPRESS_BODY_BYTES` (256KB) size guard: skip compress entirely for oversize payloads (fail-open preserved)
- Disable kompress (ML compression extra) by default when spawning proxy — primary CPU cost driver

**Risk:** LOW. Fail-open preserved. 22 tests pass. Functional probes verified.
**Verdict: MERGE NOW.** Related to #3087 (both headroom) — no file conflict (different files: headroom.js vs proxy start/settings).

---

### PR #3079 — fix(models/test): raise probe max_tokens for reasoning models
**Tier: CLOSED — Skip**

| Field | Value |
|-------|-------|
| Author | thatssoheil |
| State | 🔴 CLOSED (author closed 2 days ago) |
| Closes | #3010 |

**What it was:** Raised probe max_tokens for reasoning models (1→5) so dashboard Test button works for reasoning models (hardcoded max_tokens:16 starves chain-of-thought → empty choices).

**Why closed:** Superseded — maintainer claytontavaresdan implemented the fix in #3184 with a flat 1024. Author notes his version was capability-based (16/1024) — maintainer may cherry-pick that refinement if wanted.

**Verdict: SKIP. Verify #3184 is merged on master.**

---

### PR #3074 — feat: add Vertex thinking config, tune Kiro
**Tier: PENDING**

Fetch failed for this PR. Need to re-fetch. Title suggests: Vertex thinking config additions + Kiro tuning — overlaps with #3074's "tune Kiro" scope which may intersect KIRO-FIXES cluster (#2891/#2911 effort levels).

---

## Cross-PR Notes
- #3066 + #3087 are both headroom — same author family of fixes (thatssoheil + vianhanif), complementary
- #3075's ERROR_RULES change intersects #2879's fallback work (combos-fallbacks cluster) — both touch `checkFallbackError`/`markAccountUnavailable` in `accountFallback.js`. **Merge #3075 BEFORE #2879** or coordinate rebase.
- #3079's content is already on master via #3184 — verify.
