# Antigravity PRs Research — Cluster Audit

**Date:** 2026-08-08
**Cluster:** ANTIGRAVITY FIXES
**PRs:** #3117, #3114, #3082, #3064, #3056
**Status:** Research Only (no code changes)

---

## Executive Summary

Five open PRs target distinct Antigravity integration failures. Two pairs are **direct duplicates** that must be resolved before merge:

| Issue | PRs | Verdict |
|-------|-----|---------|
| Schema cleaner treats property name-map as schema node (#2884) | #3082, #3114 | **Pick one** — #3082 is more thorough (4 walkers fixed + 62-line test suite); #3114 is smaller but only fixes 2 of 4 walkers |
| Claude→Antigravity image loss + `mime_type` casing | #3117 | **Merge candidate** — direct translator route, regression-safe, tests pass |
| MITM host rewrite to sandbox endpoint + retry parsing | #3064 | **High-value infra fix** — touches 8 files, adds version fingerprinting, retry-delay parser, model-lock normalization |
| Twin-bucket percentage quota tracking | #3056 | **UI + backend alignment** — switches from fake 1000-request base to real 100% buckets; dashboard display updated |

**Key local-code gap:** Current `master` still uses `daily-cloudcode-pa.googleapis.com` (not `.sandbox.`), still has `mime_type` snake_case in `gemini.js`, and still uses hardcoded `total = 1000` for quota. All five PRs address real, unfixed issues.

---

## Per-PR Analysis

### #3117 — fix(translator): preserve image blocks when routing Claude → Antigravity
- **Author:** FadhliRajwaaRahmana
- **Files:** 9 (+193/−18)
- **Problem:** Claude Code images silently dropped via `claude→openai→antigravity` double-hop. Two root causes: (1) `wrapInCloudCodeEnvelopeForClaude` had no `CLAUDE_BLOCK.IMAGE` branch; (2) `claude-to-openai` stringified image blocks inside `tool_result`. Additionally, `convertOpenAIContentToParts` emitted `mime_type` (snake_case) while Antigravity reads `mimeType`.
- **Fix:** New direct `claude:antigravity` translator (`open-sse/translator/request/claude-to-antigravity.js`) activated only when images present; text-only requests keep existing double-hop (zero regression). Also normalizes `mime_type` → `mimeType` globally in `gemini.js`.
- **Tests:** 4 new regression tests in `bugs-antigravity.test.js`; golden snapshot updated; `multimodal-drop-lock.test.js` and `file-block-routing.test.js` assertions updated.
- **Risk:** LOW. Direct route is opt-in (image detection). Text path unchanged. Export of `wrapInCloudCodeEnvelopeForClaude` is additive.
- **User input needed:** None.
- **Overlaps:** The `mimeType` normalization overlaps conceptually with #3064's executor changes (which also filter `inlineData` parts), but they touch different layers (translator vs executor) and are complementary.

### #3114 — fix(antigravity): preserve schema-keyword property names
- **Author:** CBOSSX
- **Files:** 2 (+54/−8)
- **Problem:** Same as #3082 — `cleanJSONSchemaForAntigravity` descends into the `properties` name-map as if it were a schema node, deleting user params named "properties", "title", etc. Closes #2884.
- **Fix:** Adds `isSchema` boolean parameter to `removeUnsupportedKeywords` and `ensureObjectType`; skips keyword deletion when inside a name-map.
- **Tests:** 1 new test file (`antigravity-schema-cleaner.test.js`, 37 lines).
- **Risk:** MEDIUM. Only fixes 2 of the 4 walker functions (`removeUnsupportedKeywords`, `ensureObjectType`). Does NOT fix `cleanupRequired` or `addPlaceholders`, which have the same bug.
- **User input needed:** None.
- **Overlaps:** **DIRECT DUPLICATE of #3082.** See overlap matrix below.

### #3082 — fix(gemini): walk schema nodes only in cleanJSONSchemaForAntigravity
- **Author:** thatssoheil
- **Files:** 2 (+109/−7)
- **Problem:** Identical to #3114 (#2884).
- **Fix:** Restructures all 4 walker functions (`removeUnsupportedKeywords`, `ensureObjectType`, `cleanupRequired`, `addPlaceholders`) to explicitly handle the `properties` name-map separately before iterating remaining keys. More comprehensive than #3114.
- **Tests:** 1 new test file (`gemini-schema-cleaner.test.js`, 62 lines) covering all 4 walkers + nested cases.
- **Risk:** LOW-MEDIUM. Larger diff but more complete fix. Copilot review was attempted but quota-limited.
- **User input needed:** None.
- **Overlaps:** **SUPERSEDES #3114.** Fixes all 4 walkers; #3114 only fixes 2.

### #3064 — fix(antigravity): rewrite MITM proxy host to daily-cloudcode-pa.sandbox.googleapis.com
- **Author:** Nautilaceae (Contributor)
- **Files:** 8 (+115/−22)
- **Problem:** Antigravity models hitting 429/403 on production `cloudcode-pa.googleapis.com`. Closes #2938.
- **Fix:** Multi-part:
  1. Host rewrite: `cloudcode-pa` and `daily-cloudcode-pa` → `daily-cloudcode-pa.sandbox.googleapis.com` (MITM + provider registry)
  2. Version fingerprinting: `ANTIGRAVITY_VERSION`, Chrome/Electron versions, platform-aware UA
  3. Retry-delay parser: `parseRetryFromErrorMessage()` handles ISO timestamps, `retryDelay` seconds, human-readable durations ("96h30m6s")
  4. Model-lock normalization: strips `antigravity/` prefix for consistent lock keys
  5. Backoff cap raised: 5min → 1hr max, rate-limit cap 30min → 7 days
  6. Executor: passes through `inlineData` parts (not just text)
- **Tests:** Verified live streaming on consumer + student accounts.
- **Risk:** MEDIUM-HIGH. Touches MITM config, executor, account fallback, provider registry, error config. The sandbox endpoint may break without notice. Retry parser regex needs edge-case validation.
- **User input needed:** Confirm sandbox endpoint stability; verify 7-day cooldown cap doesn't cause UX issues.
- **Overlaps:** Complements #3117 (executor `inlineData` passthrough aligns with translator image preservation).

### #3056 — fix(antigravity): accurate twin bucket percentage-based quota tracking (v2)
- **Author:** monkey2jack
- **Files:** 3 (+43/−41)
- **Problem:** Quota UI showed fake "X/1000 requests" based on hardcoded base. Google actually enforces percentage-based twin buckets (Gemini vs Claude+GPT).
- **Fix:** Aggregates per-model quotas into 2 shared buckets (`gemini-models`, `claude-gpt-models`) using `remainingFraction` minimum across models. Changes base from 1000 to 100. Dashboard `QuotaProgressBar` shows "% used" for percentage quotas.
- **Tests:** None added (relies on existing quota tests).
- **Risk:** LOW-MEDIUM. Simplifies quota logic significantly. Removes hardcoded model list (future-proof). Dashboard change is cosmetic.
- **User input needed:** Confirm twin-bucket model matches Google's actual enforcement boundaries.
- **Overlaps:** Independent of other PRs. No conflicts.

---

## Overlap Matrix

| | #3117 | #3114 | #3082 | #3064 | #3056 |
|---|---|---|---|---|---|
| **#3117** | — | ✗ | ✗ | ✓ complementary | ✗ |
| **#3114** | ✗ | — | ⚠️ DUPLICATE | ✗ | ✗ |
| **#3082** | ✗ | ⚠️ SUPERSEDES | — | ✗ | ✗ |
| **#3064** | ✓ complementary | ✗ | ✗ | — | ✗ |
| **#3056** | ✗ | ✗ | ✗ | ✗ | — |

**Legend:** ⚠️ = conflict/duplicate, ✓ = complementary, ✗ = independent

---

## Tier Ranking

### Tier 1 — Merge Immediately (after dedup)
1. **#3117** (Claude→AG image fix) — High impact, low risk, well-tested, no conflicts
2. **#3082** (schema walker fix) — Pick OVER #3114; fixes all 4 walkers, better tests

### Tier 2 — Merge After Review
3. **#3056** (quota tracking) — Clean simplification, needs confirmation of bucket boundaries
4. **#3064** (MITM sandbox rewrite) — Highest value but highest risk; needs sandbox endpoint stability confirmation and retry-parser edge-case review

### Tier 3 — Close Without Merge
5. **#3114** — Superseded by #3082; close as duplicate

---

## User Questions

1. **Sandbox endpoint longevity:** Is `daily-cloudcode-pa.sandbox.googleapis.com` a stable Google endpoint or a temporary dev/sandbox that could disappear? (#3064)
2. **Quota bucket boundaries:** Does Google truly enforce exactly 2 buckets (Gemini vs 3rd-party), or are there per-model sub-buckets we're collapsing? (#3056)
3. **7-day cooldown cap:** Is capping rate-limit cooldown at 7 days appropriate, or should it be uncapped/configurable? (#3064)
4. **Schema fix preference:** Confirm #3082 over #3114 for the #2884 fix? (#3082 vs #3114)
5. **Direct translator maintenance:** Are we comfortable maintaining a `claude:antigravity` direct route alongside the generic pipeline, given future Claude/Antigravity format divergence? (#3117)
