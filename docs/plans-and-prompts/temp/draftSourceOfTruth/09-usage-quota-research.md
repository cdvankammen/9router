# USAGE-QUOTA Cluster — Deep Research

**Date:** 2026-08-12
**Cluster PRs:** #3163, #3083, #3122, #3047, #3056, #2919, #2909
**Base:** decolua/9router `master`

---

## Executive Summary

| PR | Title | Author | Files | Risk | Tier | Verdict |
|----|-------|--------|-------|------|------|---------|
| **#3083** | fix(usage): read cached_tokens from nested prompt_tokens_details | thatssoheil | 2 | LOW | T1 | ✅ Merge first. Fixes billing accuracy bug. |
| **#3163** | fix(usage): make hourly usage chart timezone-aware | alfiyansys | 3 | LOW | T1 | ✅ Merge second. Clean, backward compatible. |
| **#3122** | fix(quota): isolate quota row visibility per connection | techysy | 3 | LOW | T1 | ✅ Merge third. Backward compatible legacy fallback. |
| **#2909** | fix(qoder): show organization quota with zero total | Beants | 4 | MED | T2 | ⚠️ Review parseQuotaData logic. |
| **#3047** | feat(usage): TokenRouter quota tracker via Management Key | dasepmoch | 8 | MED | T2 | ✅ Merge fourth. Opt-in feature, well-tested. |
| **#2919** | fix(usage): group API-key statistics by stable key identity | hiennguyenle | 3 | HIGH | T3 | ⚠️ Security review needed. Touches usageRepo.js foundations. |
| **#3056** | fix(antigravity): accurate twin bucket percentage-based quota | monkey2jack | 3 | — | CLOSED | ❌ Skip (closed). |

### Recommended Merge Order
```
1. #3083  (usage cache)          — independent, 2 files
2. #3163  (timezone chart)       — independent, 3 files
3. #3122  (per-connection vis)   — touches utils.js (conflict with #3047/#2909)
4. #3047  (TokenRouter)          — touches utils.js (merge after #3122)
5. #2909  (qoder org quota)      — touches utils.js (merge after #3047)
6. #2919  (api-key grouping)     — heavy usageRepo.js rewrite (merge last)
```

### Conflict Matrix
| File | PRs |
|------|-----|
| `open-sse/utils/usageTracking.js` | #3083 |
| `src/lib/db/repos/usageRepo.js` | #3163, #2919 |
| `ProviderLimits/utils.js` | #3122, #3047, #2909 |
| `EditConnectionModal.js` | #3047 |

---

## Per-PR Detailed Analysis

### PR #3083 — fix(usage): read cached_tokens from nested prompt_tokens_details
**Tier: T1 — Merge first**

| Field | Value |
|-------|-------|
| Author | thatssoheil |
| Files | 2 (`open-sse/utils/usageTracking.js`, test) |
| Closes | #2873 |
| Risk | LOW |

**Problem:** `buildUsage()` writes cache-read tokens only into nested `prompt_tokens_details.cached_tokens`. `canonicalizeUsage()` only read top-level `cached_tokens` → streaming usage silently dropped cache hits → billing at full input rate (10× overcharge).

**Proposed Patch for `open-sse/utils/usageTracking.js`:**
```javascript
// In canonicalizeUsage(), around line ~190:
// BEFORE:
cached = num(usage.cached_tokens);

// AFTER:
const nestedCached = num(usage.prompt_tokens_details?.cached_tokens);
cached = num(usage.cached_tokens) || nestedCached;
```

**Current master state:** Confirmed NOT fixed. Line ~190 has `cached = num(usage.cached_tokens