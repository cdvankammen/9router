# Branch Research — B3b: Model-Group Observability (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #model-groups #observability #usage #binary-tree #branch-b3b

## Objective

Deep-dive the **model-group observability** subtree: `model_group` in usage (B3b1) and group vs combo distinction (B3b2), down to L6 leaves.

```
B3b GROUP OBSERVABILITY
├─ B3b1: model_group in usage
│  ├─ B3b1L: LiteLLM spend-log precedent
│  │  ├─ B3b1LL: attempted_fallbacks + original_model_group
│  │  └─ B3b1LR: distinguish fallback-served
│  └─ B3b1R: dashboard per-group throughput
│     ├─ B3b1RL: live usage view
│     └─ B3b1RR: queue depth per group
└─ B3b2: group vs combo distinction
   ├─ B3b2L: combo = ordered fallback list
   │  ├─ B3b2LL: try A then B
   │  └─ B3b2LR: existing engine
   └─ B3b2R: group = shared-budget pool
      ├─ B3b2RL: A and B share cap
      └─ B3b2RR: compose (combo members in group)
```

## Codebase grounding

### What exists

- `src/lib/usageDb.js` — usage.json + log.txt under `~/.9router`. Records per-request usage: model, provider, tokens, cost, timestamp, and (from phase-1 work) source app + task type.
- `src/sse/handlers/chat.js` — threads `smartRouterTaskType` into usage (metacs).
- Combo engine — records which model served a request (the fallback chain is visible in logs).

### What doesn't exist

- No `model_group` field in usage records.
- No per-group aggregation in the dashboard.
- No distinction between "served by group member A" vs "served by fallback B" in analytics.

## External research

### B3b1L — LiteLLM spend-log precedent

- LiteLLM records `model_group` in spend logs (phase 2 research): every request's spend is attributed to the group it was routed through.
- **B3b1LL — attempted_fallbacks + original_model_group:** LiteLLM's spend logs include `attempted_fallbacks` (which deployments were tried) and `original_model_group` (the group the request originally targeted). This makes fallback behavior auditable: you can see the request went to group X, tried A, failed, fell back to B.
- **B3b1LR — distinguish fallback-served:** the key analytics question: "how many requests were served by the *primary* member vs by a *fallback*?" This drives decisions about group sizing and member health.

### B3b1R — Dashboard per-group throughput

- **B3b1RL — live usage view:** the dashboard's usage view should aggregate by group: requests/sec, tokens/sec, cost, error rate, cooldown state.
- **B3b1RR — queue depth per group:** if the group has a queue (B3a2LR), the dashboard shows queue depth + wait time per group. This is the "predictive amounts in the queue" ask made visible.

### B3b2 — Group vs combo distinction

- **B3b2L — combo = ordered fallback list:** a combo is "try A, then B, then C" — sequential fallback. The existing engine (`combosRepo.js`, smartRouter dynamic combos) handles this. Combos are about *reliability* (what to try next).
- **B3b2R — group = shared-budget pool:** a group is "A, B, C share one cap" — parallel budget. Groups are about *quota* (how much total).
- **B3b2RL — A and B share cap:** the defining property. Requests to A and B both consume from the group bucket.
- **B3b2RR — compose:** a combo's members can be group members. E.g. combo [qwen-max, qwen-plus] where both are in the qwen-family group: the combo tries qwen-max first; if it fails, qwen-plus — but both consume from the same group bucket. The group cap applies regardless of which member serves.

## Synthesis — design space

1. **Usage schema addition:** add `modelGroup` (nullable) to usage records. Populate at dispatch time (the group the request was routed through) + `attemptedMembers` (which members were tried) + `servedByFallback` (bool).
2. **Dashboard views:**
   - Per-group: throughput (req/s, tok/s), cost, error rate, cooldown state, queue depth.
   - Fallback analytics: % served by primary vs fallback per group.
   - Source × group cross-tab: which sources consume which groups (connects A2a labels).
3. **Distinction documentation:** the dashboard should label combos and groups distinctly ("fallback chain" vs "shared budget") to avoid confusion.
4. **Composition:** when a combo member is in a group, usage records show both `comboId` and `modelGroup` — the two dimensions are orthogonal.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| LiteLLM's model_group + attempted_fallbacks is the right schema | High |
| Fallback-served distinction is a key analytics question | High |
| Group and combo are orthogonal dimensions | High |
| Per-group queue depth is the right "predictive" view | High |

## Open questions

1. Should `modelGroup` be added to the SQLite usage schema (migration) or derived at query time from the model registry? (Recommendation: store it — derivation breaks when groups change.)
2. Should the dashboard show group cooldown state (active/remaining seconds)?
3. Do we need per-group *budgets* (USD) in addition to RPM/TPM? (Connects B4b.)

## Sources

- Code: `src/lib/usageDb.js`, `src/sse/handlers/chat.js`, `src/lib/db/repos/combosRepo.js`
- Prior research: `2026-09-14-keyless-governance-research.md` (model-group limiting section)
- Industry: LiteLLM spend-log docs (phase 2 fetch)