# MEGA-PRs Cluster — Deep Research

**Date:** 2026-08-10
**Cluster:** MEGA-PRS (PRs 3159, 3120, 3062, 3126)
**Repo:** decolua/9router

## Executive Summary

| PR | Title | Author | Status | Files | Lines | Tier | Verdict |
|----|-------|--------|--------|-------|-------|------|---------|
| **#3159** | 8 Production Features | claytontavaresdan | 🔴 CLOSED | 76 | large | C — dead | Do not merge. Superset of #3120. |
| **#3120** | 50+ community issue fixes | claytontavaresdan | 🟡 OPEN | 40 | +1,863/−308 | B — must split | Good content, 17 unrelated topics. Cherry-pick security fixes. |
| **#3126** | Local vs hosted deployment mode | ojusave | 🟢 OPEN | 8 | +227/−3 | A — merge-ready | Clean, well-scoped. Conflicts with #3120 on dashboardGuard.js. |
| **#3062** | Combos import/export + capacityAdapter | vianhanif | 🟢 OPEN | 4 | +323/−8 | A — merge-ready | Not actually mega. Tight scope, atomic, tested. |

## Key Findings

- #3120 and #3126 both edit `src/dashboardGuard.js` — **they conflict**
- #3120 rewrites `trae.js` — **breaking change** for existing Trae OAuth users
- #3159 is a strict superset of #3120 — if #3120 lands, #3159 is redundant
- #3120 contains a **duplicate-insertion bug** in openai-to-claude.js reasoning_content
- #3120's rate-limit.js is misnamed (fixed-window, not token bucket) and in-memory only
- #3120's health.js uses wrong property path (PROVIDERS[id].baseUrl vs transport.baseUrl)

---

## Per-PR Analysis

### PR #3159 — 8 Production Features (CLOSED)
**Verdict: Do not reopen.** Reference implementation only.

8 features: Prometheus metrics, rate limiter, webhooks, health monitor, playground, cost dashboard, semantic cache, free model discovery. All on top of #3120's 22 commits.

Concerns: semantic cache uses crude Jaccard (no embeddings), free-model discovery scrapes 3rd-party with no self-rate-limit (DDOS hazard), webhooks schema undiscussed.

### PR #3120 — 50+ Community Issue Fixes
**Verdict: Must split.** Cherry-pick security fixes first.

**Security (valuable, cherry-pick these):**
- Remove Google Analytics telemetry (master still has it on lines 2, 47 of layout.js)
- pxpipe LOCAL_ONLY_PATHS (overlaps #3078)
- SSRF guard on search/callers.js (overlaps #3063)
- requireApiKey enforcement

**Translator (mixed):**
- Kiro systemPrompt fix (overlaps #2891/#2911)
- NVIDIA/vLLM reasoning_content (has duplicate-insertion bug)
- Provider-scoped CLAUDE_SYSTEM_PROMPT

**Providers (caution):**
- trae.js rewrite BREAKS existing OAuth users
- reasonix, ovh, joycode, openmodel are trivial stubs

**Services (needs work):**
- rate-limit.js: misnamed, in-memory, fragile IP detection
- latencyMonitor.js: never wired into request flow
- health.js: wrong property path

### PR #3126 — Local vs Hosted Deployment Mode
**Verdict: Merge-ready.** Clean single-purpose PR.

Adds `isHosted()` helper, deployment mode detection, modifies dashboardGuard.js for hosted vs local access control. Well-tested.

**Conflict:** dashboardGuard.js changes overlap with #3120. Land this first (smaller), then rebase #3120's security cherry-picks.

### PR #3062 — Combos Import/Export + capacityAdapter
**Verdict: Merge-ready.** Misclassified as mega-PR.

Atomic transaction, validation, tests. Adds combo import/export API and capacity adapter for provider selection. Clean scope.

---

## Overlap Matrix

| | #3159 | #3120 | #3126 | #3062 |
|---|---|---|---|---|
| **#3159** | — | Superset | dashboardGuard | — |
| **#3120** | Subset | — | dashboardGuard | — |
| **#3126** | — | dashboardGuard | — | — |
| **#3062** | — | — | — | — |

## Recommendations
1. **Do NOT merge #3159** (closed, superseded)
2. **Land #3126 first** (clean, small)
3. **Land #3062** (independent, tested)
4. **Cherry-pick from #3120:** GA removal, pxpipe guard, SSRF guard
5. **Reject #3120's trae.js rewrite** (breaking)
6. **Fix #3120's bugs** before considering other parts (duplicate reasoning_content, health.js path, rate-limit naming)
