# Hardening Roadmap — Fix-It Plan for Reviewed Gaps

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #plan #hardening #fixes #roadmap #fallbacks #observability #providers

## Purpose

Organize every issue raised in `../research/9router/18-feature-gap-review.md` and
`19-upstream-provider-risks.md` into a prioritized, executable roadmap. Each
item: what it means, whether WE introduced it (fix now) or it pre-dates our work
(keep for later), the fix approach, and importance.

## Origin legend

- **OURS** = introduced by this session's commits (v1 feature work) → fix now, with tests
- **YOURS** = your pre-session master commits (capacity adapter, TokenRouter, etc.) → keep for later unless trivial
- **PRE-EXISTING** = existed before this session's work entirely (SQLite-era) → keep for later
- **NEW** = net-new suggestion from review → plan/phase

---

## Phase 1 — Quick wins (OURS, small, do now)

| # | Item | Origin | What it means | Fix approach | Importance |
|---|------|--------|---------------|--------------|------------|
| 1.1 | **Deep-merge nested settings** | PRE-EXISTING pattern, ACTIVATED by our nested objects | `mergeWithDefaults` shallow-merges. UI sends full objects so it's safe today, but ANY external partial PATCH (e.g. `{smartRouter:{enabled:true}}`) silently shadows the other defaults (names, allowedModels, etc.) | Deep-merge the 4 nested keys (capacityAdapter, smartRouter, srComboCleanup, modelFallbacks) in `updateSettings`; add unit test | **HIGH** — silent misconfiguration is the worst kind |
| 1.2 | **JSDoc on `calculateCostFromTokens`** | YOURS (TokenRouter pricing) | Arg order `(tokens, pricing)` is surprising — I got NaN during review. Cosmetic | Add JSDoc with usage example; optionally swap args (breaking — avoid) | LOW |
| 1.3 | **Provider+model rule conflict warning** | OURS (fallbacks) | `fbMap[modelStr] || fbMap[provider]` — if BOTH a provider-level and model-level rule exist, model wins silently; user can't see both exist | UI: when a rule targets a provider that also has model rules (or vice versa), show a warning chip in the rules table; document precedence in the modal helper text | **HIGH** — surprising routing |
| 1.4 | **Fallback string validation on save** | OURS (fallbacks UI) | Typos in fallback model strings become silent dead fallbacks (never tried, never error) | On save: check each fallback against the known catalog (getModelsByProviderId + custom models); warn on unknown with "still save?" option | MEDIUM-HIGH |

## Phase 2 — UX gaps (OURS, medium)

| # | Item | Origin | What it means | Fix approach | Importance |
|---|------|--------|---------------|--------------|------------|
| 2.1 | **Smart router score breakdown** | OURS | "Why did it pick X?" is invisible; only the winner is known | `resolveSmartRouter` returns scores; store top-N candidates + scores in usage meta; show a "why" popover on smart-router usage rows / or a debug panel in Smart Router card | **HIGH** — trust |
| 2.2 | **Sticky TTL configurable** | OURS | 5-min sticky session hardcoded | Add `smartRouter.stickyTtlMin` setting (default 5) | MEDIUM |
| 2.3 | **Node models refresh button** | OURS | `getNodeModels` 5-min cache can't be invalidated from UI | "Refresh" button next to custom node in pickers → busts cache | MEDIUM |
| 2.4 | **Chain Flow chip truncation** | OURS (UI) | Long model names wrap unpredictably | `max-w + truncate + title` tooltip on chips | LOW |
| 2.5 | **Expert Text invalid-line highlighting** | OURS (UI) | Bad lines silently ignored | Highlight malformed lines in the textarea preview | LOW-MEDIUM |

## Phase 3 — Robustness (OURS, medium)

| # | Item | Origin | What it means | Fix approach | Importance |
|---|------|--------|---------------|--------------|------------|
| 3.1 | **Markdown flush concurrency** | OURS (markdownLog) | Two processes/servers flushing the same daily file clobber each other (write + no lock) | Single-instance lock (flock/pid file) OR per-process suffix; at minimum document single-server assumption | MEDIUM |
| 3.2 | **Export pagination** | OURS (export route) | Large datasets → huge payloads, no cursor | `limit`+`offset` or cursor params on `/api/export/requests` | MEDIUM |
| 3.3 | **Dropped-record surfacing** | PRE-EXISTING (1000-cap) + OUR markdownLog consumes it | Cap silently drops; user doesn't know observability is lossy | Counter in usage UI: "capture at 1000/1000 — oldest dropped"; bump default? | MEDIUM |

## Phase 4 — Provider resilience (MIXED — see notes)

| # | Item | Origin | What it means | Fix approach | Importance |
|---|------|--------|---------------|--------------|------------|
| 4.1 | **Provider health endpoint** | NEW | No aggregate view of auth/429/last-error state per provider | `/api/health/providers` (auth valid?, last error, credential expiry, lock state) + dashboard section | **HIGH** (usefulness-per-effort) |
| 4.2 | **Auto-disable after repeated refresh failures** | NEW (fixes YOURS xAI issue observed) | xAI `invalid_grant` → provider dead until manual re-auth, silently | After N consecutive refresh failures: mark connection `needsReauth`, show badge in providers page, stop hammering refresh | MEDIUM-HIGH |
| 4.3 | **TokenRouter catalog/pricing re-validation** | YOURS | 120-model seed can drift; pricing estimates go stale | Periodic `/api/pricing` re-fetch (opt-in); flag "estimate" vs "exact" in usage UI | MEDIUM — keep for later per user |
| 4.4 | **mimo fallback health check** | YOURS | `oc/mimo-v2.5-free` is adapter's last resort; if opencode channel dies, vision/audio requests fail at the end of the chain | Startup headless probe of `https://opencode.ai/zen/v1/models`; if unreachable, warn in adapter UI ("default fallback unavailable — set a pool model") | MEDIUM — keep for later per user |
| 4.5 | **Node /models fetch error badge** | OURS (custom nodes) | Silent fail-open on node discovery | Picker badge "models failed to load — click to retry" | MEDIUM |

## Open questions for user (from risks doc)

1. **Auto-disable behavior**: should a provider with repeated refresh failures auto-disable (with UI re-enable), or stay enabled-but-flagged?
2. **TokenRouter pricing re-fetch**: auto re-fetch on interval (privacy/ToS considerations) or stay snapshot-based?
3. **mimo fallback policy**: keep `oc/mimo-v2.5-free` as universal default, or require an explicit pool model when mimo is unreachable?

## Subagent failure mode (context for why reviews were done in-session)

`rate_limit_exceeded` = the Copilot model API rejected concurrent subagent calls
(account/session quota). `net::ERR_FAILED` = the network connection to the model
API dropped. Neither is a code problem — both are transient infra failures.
Mitigation already documented: spawn subagents one-at-a-time, retry on failure,
fall back to main-session execution if retries fail. This is exactly what the
earlier research passes did (5/5 completed with retries).

## Suggested execution order

1. Phase 1 (quick wins, ~1 session: deep-merge + tests, JSDoc, conflict warning, validation)
2. Phase 4.1 provider health endpoint (biggest usefulness-per-effort)
3. Phase 2 UX gaps (score breakdown next)
4. Phase 3 robustness (as time allows)
5. Phase 4.2–4.5 after user answers the 3 open questions

## Related docs

- `../research/9router/18-feature-gap-review.md` (source of Phases 1–3)
- `../research/9router/19-upstream-provider-risks.md` (source of Phase 4 + open questions)
- `fallback-rules-ux-plan.md` (UI consolidation pending user pick)

---

## STATUS UPDATE 2026-08-08 — ALL PHASES COMPLETE + AUDIT CLEAN

Phase 1 ✅ (commits 5918de88, f7c1bf8e) — incl. sequential-PATCH accumulation fix (BUG-A)
Phase 2 ✅ (6485e782, 12895e19)
Phase 3 ✅ (cb01da52) — incl. markdown atomic write, export pagination, drop surfacing
Phase 4 ✅ (723e9669) — health endpoint, auto-disable (D1), node error badge
Messages review bugs: B1 status filter ✅ (ba7378db), B3/B4 deferred (documented)
Exhaustive audit ✅ — 7 bugs fixed (21-audit-no-more-bugs.md); refactor decisions D1–D8 (23-refactor-decisions.md); error sweep E1–E6 (22-error-sweep.md)

### Still open (user/owner-gated)
- User re-auth xAI (E1); OpenRouter privacy setting (E2)
- B3 conversation-grouped query; B4 providerUrl capture (P3)
- 4.3 TokenRouter pricing re-validation; 4.4 mimo health check (YOURS)
- Error Inbox P2; fallback-rule view pick (D8)
