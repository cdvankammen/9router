# DASHBOARD-UI Cluster — Deep Research

**Date:** 2026-08-13
**Cluster PRs:** #3068, #3123, #3118, #3077, #2908, #2972
**Base:** decolua/9router `master`

---

## Executive Summary

| PR | Title | Author | Files | Risk | Tier | Verdict |
|----|-------|--------|-------|------|------|---------|
| **#3068** | fix(usage): React reconciliation bug when switching viewMode | rusak47 | 2 | LOW | T1 | 🔴 **CLOSED by author** — content likely merged elsewhere or abandoned. Do not merge. |
| **#2972** | feat(usage-stats): default view mode 'costs'→'tokens' | teddytkz | 1 | LOW | T1 | ✅ Merge-ready. Trivial 1-line default change. |
| **#3118** | feat(i18n): usage cost follows UI locale + currency toggle | techysy | 8 | LOW-MED | T1/T2 | ✅ Merge-ready. Closes #2976. Supersedes #3053. |
| **#3123** | feat(providers): per-provider topology canvas toggle | techysy | 5 | LOW | T1 | ✅ Merge-ready. Clean settings addition. |
| **#2908** | feat(dashboard): interactive model sub-node tree topology | maulinul | 4 | MED | T2 | ⚠️ Review carefully. 14 commits, heavy UI rework. |
| **#3077** | feat(branding): OpenDesign logo + integration guides (5 langs) | Diwak4r | 18 | LOW | T1 | ✅ Merge-ready. Pure docs/assets. |

### Key Findings
1. **#3068 is CLOSED** (author closed 2 days ago, branch deleted). Exclude from merge queue — but note its content (React reconciliation fix) may have been absorbed by #2908's UsageStats rework. Verify master's `UsageTable.js` has the `key={valcells-${viewMode}}` fix.
2. **#3118 and #3123 are from the same author (techysy)** — likely mergeable together. #3118 touches `src/shared/components/UsageStats.js` (currency in cost columns); #3123 also touches `UsageStats.js` (topology filtering). **They conflict on that file** — merge sequentially.
3. **#2908 touches UsageStats.js heavily** (14 commits) — conflicts with BOTH #3118 and #3123. This is the biggest conflict zone in the cluster.
4. **#2972 is trivial** (1 file, 1 line default flip). Merge anytime.
5. **#3077 is pure docs/assets** (gitbook + PNG) — zero code conflict risk.

---

## Per-PR Detailed Analysis

### PR #3068 — fix(usage): React reconciliation bug when switching viewMode
**Tier: T1 — but CLOSED. Do not merge.**

| Field | Value |
|-------|-------|
| Author | rusak47 |
| State | 🔴 **CLOSED** (author closed, branch deleted) |
| Files | 2 (`UsageTable.js`, `UsageStats.js`) |
| Risk | LOW |

**Problem:** `ValueCells` renders 4 `<td>` in costs/tokens mode but 6 in latency mode. When `viewMode` changes, React reuses first 4 DOM nodes → stale cost values leak into latency columns.

**Fix (content):**
```javascript
// UsageTable.js — add key to force remount:
<ValueCells key={`valcells-${viewMode}`} ... />
// UsageStats.js — move sortBy/sortOrder from searchParams to useState,
// add switchViewMode callback that resets sort and clears URL params
```

**Assessment:** Fix is real and valuable, but the PR is closed. Two options:
1. Verify whether master already has this fix (likely absorbed via #2908 or another PR)
2. If not, re-implement as a new PR (2 small files, low risk)

**Verdict: DON'T MERGE — check if content is already in master; re-file if not.**

---

### PR #2972 — feat(usage-stats): change default view mode from 'costs' to 'tokens'
**Tier: T1 — Merge anytime**

| Field | Value |
|-------|-------|
| Author | teddytkz |
| Files | 1 |
| Risk | LOW |

**What it does:** Flips the default `viewMode` in UsageStats from `'costs'` to `'tokens'` so users see Input/Cached/Output tokens per model by default.

**Proposed Patch:**
```javascript
// src/shared/components/UsageStats.js (or wherever default viewMode is set):
- const [viewMode, setViewMode] = useState("costs");
+ const [viewMode, setViewMode] = useState("tokens");
```

**Conflict with #3068/#2908:** #3068 (closed) also touched viewMode switching. #2908 reworks UsageStats. Verify exact line location on master before merging.

**Verdict: MERGE — trivial, but coordinate with #2908 if both land.**

---

### PR #3118 — feat(i18n): usage cost display follows UI locale + Regional currency toggle
**Tier: T1 — Merge-ready**

| Field | Value |
|-------|-------|
| Author | techysy |
| Files | 8 |
| Closes | #2976 |
| Supersedes | #3053 (closed) |
| Risk | LOW-MED |

**What it does:**
- New `src/shared/utils/currency.js` with `fmtCost(n, precision)`:
  - zh-CN → ¥ (fullwidth ￥), zh-TW → NT$, ja → ¥ (halfwidth), ko → ₩, vi → ₫, else $
  - Respects `useRegionalCurrency` localStorage toggle
- All cost surfaces use `fmtCost`: usage cards, chart Y-axis/tooltip, usage table, provider info card
- Profile > Language card gets Regional currency toggle

**Proposed Patch (new file `src/shared/utils/currency.js`):**
```javascript
const REGIONAL_CURRENCY = {
  "zh-CN": { symbol: "￥", pos: "prefix" },
  "zh-TW": { symbol: "NT$", pos: "prefix" },
  "ja":    { symbol: "¥", pos: "prefix" },
  "ko":    { symbol: "₩", pos: "prefix" },
  "vi":    { symbol: "₫", pos: "suffix" },
};

export function fmtCost(n, precision = 4) {
  const locale = typeof window !== "undefined"
    ? (localStorage.getItem("useRegionalCurrency") === "false"
      ? "en" : (navigator.language || "en"))
    : "en";
  const cur = REGIONAL_CURRENCY[locale] || { symbol: "$", pos: "prefix" };
  const v = Number(n).toFixed(precision);
  return cur.pos === "prefix" ? `${cur.symbol}${v}` : `${v}${cur.symbol}`;
}
```

**Conflicts:** Touches `UsageStats.js` (cost columns) — conflicts with #3123 (topology filter) and #2908 (UsageStats rework). Merge BEFORE #2908, coordinate with #3123.
**Verdict: MERGE — high value for international users.**

---

### PR #3123 — feat(providers): per-provider toggle for usage topology canvas
**Tier: T1 — Merge-ready**

| Field | Value |
|-------|-------|
| Author | techysy |
| Files | 5 |
| Risk | LOW |

**What it does:**
- New `topologyVisibility` setting in settingsRepo.js defaults
- Show/hide toggle on Free Tier provider cards
- `UsageStats.js` filters noAuth free providers by visibility + `topologyHiddenByDefault`
- `mimo-free.js` gets `topologyHiddenByDefault` + deprecation notice (MiMo free channel ended)

**Proposed Patch (settingsRepo.js ~line 17):**
```javascript
  quotaVisibility: {},
  topologyVisibility: {},   // { [providerId]: boolean }
  comboStrategy: "fallback",
```

**Proposed Patch (UsageStats.js topology filter):**
```javascript
// In provider filtering for topology canvas:
const visibleProviders = providers.filter(p => {
  if (!p.noAuth) return true;
  if (topologyVisibility[p.id] === false) return false;
  if (p.topologyHiddenByDefault && topologyVisibility[p.id] === undefined) return false;
  return true;
});
```

**Conflicts:** `UsageStats.js` shared with #3118 and #2908. `settingsRepo.js` shared with #2895 (retryDelayByProvider) — different fields, clean merge.
**Verdict: MERGE — solves real UX issue (dead MiMo provider stuck on canvas).**

---

### PR #2908 — feat(dashboard): interactive model sub-node tree topology
**Tier: T2 — Review carefully**

| Field | Value |
|-------|-------|
| Author | maulinul |
| Files | 4 |
| Commits | 14 |
| Risk | MED |

**What it does:** Major rework of Usage Overview Topology Map:
1. 3-tier radial tree: 9Router → Provider → Model sub-nodes
2. Real-time active request pulse (cyan neon glow + electric beam animations)
3. 3-way display modes: ON / AUTO (default) / OFF
4. Smart zoom: Providers Only (115%) / All Models view fit buttons, minZoom 0.5
5. Registry integration: exposes static model definitions from registry entries, combines with dynamically detected models from usage history

**Files:** `UsageStats.js`, `providers.js` (constants), topology canvas component, usage page.

**Conflicts:** `UsageStats.js` — conflicts with #3118, #3123, and possibly #3068's content. `providers.js` constants — conflicts with #3120 (mega-PR) and #3123.

**Assessment:** High visual value but 14 commits of iterative UI polish. The model-sub-node feature is genuinely useful for multi-provider users. Needs careful review of:
- Performance with many models (radial layout computation)
- EventSource/SSE handling for the pulse animation (reuse of existing streams vs new)
- The `providers.js` change exposes registry models to the client — verify no secret leakage

**Verdict: MERGE AFTER #3118 and #3123. Rebase required.**

---

### PR #3077 — feat(branding): real OpenDesign logo + per-tool integration guide (5 langs)
**Tier: T1 — Merge-ready**

| Field | Value |
|-------|-------|
| Author | Diwak4r |
| Files | 18 |
| Risk | LOW |

**What it does:** Pure docs/assets PR:
- `public/providers/opendesign.png` — real 128×128 brand mark (replaces placeholder)
- `gitbook/content/{en,vi,zh-CN,es,ja}/integration/opendesign.md` — 193-line integration guides
- docsConfig.js nav entry, DocsSidebar PenTool icon, FAQ cross-links

**Assessment:** Zero code risk. Copilot review already done. Only concern: i18n completeness verified (all 5 locales present).
**Verdict: MERGE ANYTIME.**

---

## Conflict Matrix

| File | PRs |
|------|-----|
| `src/shared/components/UsageStats.js` | #3068(closed), #2972, #3118, #3123, #2908 |
| `src/shared/constants/providers.js` | #2908, #3123, #3120(mega) |
| `src/lib/db/repos/settingsRepo.js` | #3123, #2895(fallback cluster) |
| `gitbook/content/*` | #3077 (docs only) |

## Recommended Merge Order

```
1. #3077  (docs/assets — zero risk)
2. #2972  (trivial default flip — but verify UsageStats.js line with #3068 content)
3. #3123  (topology toggle — clean, small)
4. #3118  (currency i18n — conflicts with #3123 on UsageStats, merge after)
5. #2908  (topology tree — big rework, rebase on #3123+#3118)
```

## Cross-Cluster Notes
- #3118 supersedes #3053 (closed) — don't look at #3053
- #3068 closed — check if master absorbed the reconciliation fix
- #2908 references #3120 (mega-PR) in providers.js — coordinate if #3120 lands first
- techysy (#3118, #3123) and teddytkz (#2972) are active contributors — worth encouraging
