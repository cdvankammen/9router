# COMBOS-FALLBACKS Cluster — Deep Research

**Date:** 2026-08-12
**Cluster PRs:** #3125, #3042, #3062, #2895, #2879
**Base:** decolua/9router `master`

---

## Executive Summary

| PR | Title | Author | Files | +/- | Risk | Mergeable | Depends On | User Input |
|----|-------|--------|-------|-----|------|-----------|------------|------------|
| **#2879** | feat(fallback): lock accounts for provider's real rate-limit reset | MuhammadUsamaMX | 2 | +48/-4 | **LOW** | ✅ clean | — | No |
| **#2895** | feat(fallback): per-provider retry-delay control | MuhammadUsamaMX | 5 | +158/-6 | **MED** | ✅ clean | **#2879** | No |
| **#3125** | fix(combos): resolve provider-prefixed combo names | Jordannst | 3 | +47/-9 | **LOW** | ✅ clean | — | No |
| **#3042** | feat(combos): combo test runner + diagnostic | berthojoris | 7 | +783/-13 | **MED** | ✅ clean | — | No |
| **#3062** | feat(combos): import/export with capacity adapter | vianhanif | 4 | +323/-8 | **MED** | ✅ clean | — | Yes ⚠️ |

### Recommended Merge Order
```
1. #2879  (foundation: parseProviderResetMs + resolveCooldownMs)
2. #2895  (stacked on #2879: per-provider retry-delay UI)
3. #3125  (independent combo fix)
4. #3042  (independent combo test runner UI)
5. #3062  (combo import/export — review destructive import semantics)
```

### Conflict Matrix
| | #2879 | #2895 | #3125 | #3042 | #3062 |
|---|---|---|---|---|---|
| **#2879** | — | 🟡 STACKED | ✅ | ✅ | ✅ |
| **#2895** | 🟡 STACKED | — | ✅ | ✅ | ✅ |
| **#3125** | ✅ | ✅ | — | 🟡 combos/page.js | 🟡 combos/page.js |
| **#3042** | ✅ | ✅ | 🟡 combos/page.js | — | 🟡 combos/page.js |
| **#3062** | ✅ | ✅ | 🟡 combos/page.js | 🟡 combos/page.js | — |

**Key conflict zone:** `src/app/(dashboard)/dashboard/combos/page.js` touched by #3042, #3062, and affected by #3125. Must be merged sequentially with rebase.

---

## Per-PR Analysis

### PR #2879 — feat(fallback): lock accounts for provider's real rate-limit reset
**Tier: T1 — Merge FIRST**

| Field | Value |
|-------|-------|
| Author | MuhammadUsamaMX |
| Files | 2 (`errorConfig.js`, `accountFallback.js`) |
| Closes | #789 |
| Risk | LOW |

**What it does:** Replaces fixed exponential backoff with the provider's actual rate-limit reset window when available. New exports:
- `parseProviderResetMs(errorText, now)` — extracts reset from 429 bodies/headers (Google RetryInfo, OpenAI resets_at, OpenRouter X-RateLimit-Reset, Retry-After)
- `resolveCooldownMs(newLevel, errorText)` — prefers parsed reset, floors at static backoff, caps at `MAX_RATE_LIMIT_COOLDOWN_MS`

Raises `MAX_RATE_LIMIT_COOLDOWN_MS` from 30min → 6h.

**Proposed Patch:**
```javascript
// errorConfig.js (~line 42):
export const MAX_RATE_LIMIT_COOLDOWN_MS = 6 * 60 * 60 * 1000;  // was 30 * 60 * 1000

// accountFallback.js — new functions:
export function parseProviderResetMs(errorText, now = Date.now()) {
  if (!errorText) return null;
  const s = typeof errorText === "string" ? errorText : JSON.stringify(errorText);
  let m;
  if ((m = s.match(/"?retry[_-]?delay"?\s*[:=]\s*"?\s*([0-9]+(?:\.[0-9]+)?)\s*s/i))) {
    return Math.round(parseFloat(m[1]) * 1000);
  }
  if ((m = s.match(/"?(?:resets?_at|x-?ratelimit-?reset|ratelimit-?reset)"?\s*[:=]\s*"?\s*([0-9]{9,})/i))) {
    let v = parseInt(m[1], 10);
    if (v < 1e12) v *= 1000;
    const ms = v - now;
    return ms > 0 ? ms : null;
  }
  if ((m = s.match(/"?retry[_-]?after"?\s*[:=]\s*"?\s*([0-9]+)\b/i))) {
    return parseInt(m[1], 10) * 1000;
  }
  return null;
}

export function resolveCooldownMs(newLevel, errorText) {
  const staticMs = getQuotaCooldown(newLevel);
  const providerMs = parseProviderResetMs(errorText);
  if (providerMs == null || !(providerMs > 0)) return staticMs;
  return Math.min(Math.max(providerMs, staticMs), MAX_RATE_LIMIT_COOLDOWN_MS);
}
```

**Assessment:** Risk LOW — strictly additive, falls through to static backoff when no provider signal. Foundation PR.
**Verdict: MERGE FIRST.**

---

### PR #2895 — feat(fallback): per-provider retry-delay control
**Tier: T2 — Merge SECOND (after #2879)**

| Field | Value |
|-------|-------|
| Author | MuhammadUsamaMX |
| Files | 5 |
| Stacked on | #2879 |
| Risk | MED |

**What it does:** Dashboard UI selector per provider to override fallback cooldown. Three-tier precedence in `markAccountUnavailable`:
1. Provider-reported reset → always honored
2. Configured numeric value → fixed lock duration
3. `auto` (default) → free/free-tier providers cap at 60s

New setting: `retryDelayByProvider: { [providerId]: "auto" | <seconds> }` in DEFAULT_SETTINGS.

**Proposed Patch (settingsRepo.js ~line 17):**
```javascript
  quotaVisibility: {},
  retryDelayByProvider: {},   // { [providerId]: "auto" | <seconds> }
  comboStrategy: "fallback",
```

**Assessment:** Risk MED — touches `markAccountUnavailable` hot path, adds async DB call per fallback event. Requires #2879's `parseProviderResetMs`. Verify `FREE_TIER_PROVIDERS` exists in providers constants.
**Verdict: MERGE SECOND, immediately after #2879.**

---

### PR #3125 — fix(combos): resolve provider-prefixed combo names to member models
**Tier: T1 — Merge anytime**

| Field | Value |
|-------|-------|
| Author | Jordannst |
| Files | 3 |
| Closes | #2996 |
| Risk | LOW |

**What it does:** Fixes combo resolution when clients send `provider/combo-name`. Currently bails on any string containing `/`. Fix: try full-name match first, then basename.

**Proposed Patch (open-sse/services/combo.js ~line 222):**
```javascript
export function getComboModelsFromData(modelStr, combosData) {
  const baseName = modelStr.includes("/") ? modelStr.split("/").pop() : null;
  const combos = Array.isArray(combosData) ? combosData : (combosData?.combos || []);
  const combo = combos.find(c => c.name === modelStr) ||
    (baseName ? combos.find(c => c.name === baseName) : null);
  if (combo && combo.models && combo.models.length > 0) {
    return combo.models;
  }
  return null;
}
```

**Assessment:** Risk LOW. Pure bugfix with 4 unit tests. Independent.
**Verdict: MERGE ANYTIME.**

---

### PR #3042 — feat(combos): add combo test runner and fallback sequence diagnostic
**Tier: T2 — Merge fourth**

| Field | Value |
|-------|-------|
| Author | berthojoris |
| Files | 7 |
| Risk | MED |

**What it does:** Adds combo test feature: two API routes (`POST /api/combos/[id]/test`, `POST /api/combos/test`), `ComboTestModal.js` (347 lines), enhances `pingModelByKind` for custom prompts + output previews.

**Assessment:** Risk MED. 4/4 unit tests pass. Independent of fallback PRs.
**Verdict: MERGE FOURTH.**

---

### PR #3062 — feat(combos): add import/export with capacity adapter
**Tier: T2 — User decision needed**

| Field | Value |
|-------|-------|
| Author | vianhanif |
| Files | 4 |
| Risk | MED |

**What it does:** Combo import/export with capacity adapter support. Atomic transaction, validation, tests. Previously misclassified in MEGA-PRS.

**⚠️ USER INPUT NEEDED:** Review destructive import semantics — does import replace existing combos or merge?

**Assessment:** Risk MED. Well-tested. `combos/page.js` conflict zone with #3042.
**Verdict: MERGE FIFTH (after #3042).**

---

## Recommended Merge Sequence

```
1. #2879  → 2. #2895  → 3. #3125  → 4. #3042  → 5. #3062
```

Note: #2879+#2895 are from same author (MuhammadUsamaMX), #3042+#3062 touch combos/page.js so must be rebased sequentially.
