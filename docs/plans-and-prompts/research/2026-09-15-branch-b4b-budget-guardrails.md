# Branch Research — B4b: Budget Guardrails (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #guardrails #budgets #allowlists #binary-tree #branch-b4b

## Objective

Deep-dive the **budget guardrails** subtree: USD budgets (B4b1) and allowlists (B4b2), down to L6 leaves.

```
B4b BUDGET GUARDRAILS
├─ B4b1: USD BUDGETS
│  ├─ B4b1L: daily/weekly/monthly reset
│  │  ├─ B4b1LL: OpenRouter guardrail budgets
│  │  └─ B4b1LR: include_byok_in_budgets
│  └─ B4b1R: soft/hard limits
│     ├─ B4b1RL: warning header
│     └─ B4b1RR: 403 block
└─ B4b2: ALLOWLISTS
   ├─ B4b2L: model allowlist
   │  ├─ B4b2LL: intersection (key ∩ global)
   │  └─ B4b2LR: wildcard support
   └─ B4b2R: provider allowlist
      ├─ B4b2RL: OpenRouter provider allowlist
      └─ B4b2RR: LiteLLM access groups
```

## Codebase grounding

- No budget guardrails exist in 9router today. Usage tracking exists (`src/lib/usageDb.js` — usage.json with cost per request), so the *data* for budgets is already collected.
- The phase-1 plan (M5) proposed budgets + allowlists; this branch deep-dives them.

## External research

### B4b1LL — OpenRouter guardrail budgets

- OpenRouter guardrail budgets (phase 2 research): per-key or per-workspace USD budgets with daily/weekly/monthly reset periods. When the budget is exhausted, requests are blocked (403).
- Key detail: **BYOK spend is not counted toward guardrail budgets unless `include_byok_in_budgets` is set** (phase 2 research). This is a deliberate design: BYOK (bring-your-own-key) traffic doesn't cost OpenRouter anything, so it doesn't count against the user's OpenRouter budget.
- 9router implication: 9router *is* the gateway — all spend is "BYOK" (the user's own provider keys). So budgets count *all* spend. The `include_byok_in_budgets` distinction doesn't apply; instead, budgets can be per-profile, per-source, per-group, or global.

### B4b1LR — include_byok_in_budgets

- For 9router: the equivalent question is "should profile X's spend count toward the global budget?" Recommendation: yes by default (all spend counts), with per-profile budget exemptions as a config option.

### B4b1R — Soft/hard limits

- **B4b1RL — warning header:** at a soft threshold (e.g. 80% of budget), emit a warning header (`X-9R-Budget-Warning: 80%`) and log it. The request proceeds.
- **B4b1RR — 403 block:** at the hard limit, block with 403 + a clear error body. This is the "prevent calls" enforcement for budgets.
- Standard practice: soft warning at 80–90%, hard block at 100%. The warning gives the admin time to act before the block.

### B4b2L — Model allowlist

- **B4b2LL — intersection (key ∩ global):** the effective model allowlist for a request = intersection of the global allowlist and the profile/key allowlist. A model must be allowed by both to be usable.
- **B4b2LR — wildcard support:** allowlist entries support wildcards (`qwen-*`, `claude-3-*`). This is how the 9-qwen grouping (B3a) composes with allowlists: `qwen-*` in the allowlist + group cap = "only qwen models, and only N per minute."

### B4b2R — Provider allowlist

- **B4b2RL — OpenRouter provider allowlist:** OpenRouter lets you restrict which upstream providers serve your requests (e.g. only `openai`, `anthropic`). 9router's equivalent: restrict which *configured providers* a profile can use.
- **B4b2RR — LiteLLM access groups:** LiteLLM's access groups (phase 2 research): keys are assigned to access groups; each group has allowed models/providers. This is the per-key allowlist precedent.

## Synthesis — design space

1. **Budget schema:** `budget = { scope: global|profile|source|group, amountUsd, period: daily|weekly|monthly, softPct: 80, hardPct: 100 }`. Multiple budgets can apply to one request (global + profile); the *most restrictive* wins.
2. **Enforcement:** at dispatch time, compute spend-to-date from usage DB (cost per request is already recorded); compare against budgets; soft → warning header; hard → 403.
3. **Allowlist schema:** `allowlist = { scope, models: ["qwen-*"], providers: ["dashscope"] }`. Effective = intersection of all applicable allowlists. Wildcards supported.
4. **Composition:** budgets and allowlists are orthogonal to groups (B3) and combos. A request must pass: group cap (B3a2) + budget (B4b1) + allowlist (B4b2) + rate limit (B1a/B1b).
5. **Dashboard:** budget progress bars (per scope), allowlist editor, block/warning event log.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| OpenRouter's budget model (periods, soft/hard) is the right shape | High |
| Intersection semantics for allowlists is correct | High |
| Wildcards are essential for model families | High |
| Most-restrictive-wins across multiple budgets is correct | High |

## Open questions

1. Should budget enforcement be pre-dispatch (estimate cost) or post-dispatch (block next request after exceeding)? Pre-dispatch needs cost estimation; post-dispatch is simpler but allows one over-budget request.
2. Should the soft warning be a header, a log entry, or both?
3. Do budgets need to compose with the adaptive pacing (B1b2R — budget-proportional pacing)? (Recommendation: yes — pacing smooths toward the budget; the hard block is the last resort.)

## Sources

- Code: `src/lib/usageDb.js` (cost per request — the budget data source)
- Prior research: `2026-08-31-message-origin-and-destination-research.md` (M5), `2026-09-14-keyless-governance-research.md`
- Industry: OpenRouter guardrail budgets + BYOK docs (phase 2 fetch), LiteLLM access groups (phase 2 fetch)