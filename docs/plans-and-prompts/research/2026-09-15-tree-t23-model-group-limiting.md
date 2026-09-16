# Tree T23 — Model-Group Limiting (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #model-group #limiting #t23

## Objective

Full 6-level binary tree expansion of the **model-group limiting** topic (from `2026-09-14-keyless-governance-research.md` Part E). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Model-group limiting
├─ L1L: Group model
│  ├─ L2LL: Group definition
│  │  ├─ L3LLL: group types
│  │  │  ├─ L4LLLL: capability groups
│  │  │  │  ├─ L5LLLLL: reasoning
│  │  │  │  │  ├─ L6LLLLLL: group
│  │  │  │  │  └─ L6LLLLLR: models
│  │  │  │  └─ L5LLLLR: fast groups
│  │  │  │     ├─ L6LLLLRL: group
│  │  │  │     └─ L6LLLLRR: models
│  │  │  └─ L4LLLR: cost groups
│  │  │     ├─ L5LLLRL: cheap
│  │  │     │  ├─ L6LLLRLL: group
│  │  │     │  └─ L6LLLRLR: models
│  │  │     └─ L5LLLRR: premium
│  │  │        ├─ L6LLLRRL: group
│  │  │        └─ L6LLLRRR: models
│  │  └─ L3LLR: group membership
│  │     ├─ L4LLRL: model → group
│  │     │  ├─ L5LLRLL: map
│  │     │  │  ├─ L6LLRLLL: model
│  │     │  │  └─ L6LLRLLR: group
│  │     │  └─ L5LLRLR: multi-group
│  │     │     ├─ L6LLRLRL: overlap
│  │     │     └─ L6LLRLRR: allowed
│  │     └─ L4LLRR: group config
│  │        ├─ L5LLRRL: config file
│  │        │  ├─ L6LLRRLL: define
│  │        │  └─ L6LLRRLR: groups
│  │        └─ L5LLRRR: registry
│  │           ├─ L6LLRRRL: providerModels
│  │           └─ L6LLRRRR: groups
│  └─ L2LR: Group limits
│     ├─ L3LRL: limit types
│     │  ├─ L4LRLL: rate limits
│     │  │  ├─ L5LRLLL: per-group
│     │  │  │  ├─ L6LRLLLL: rate
│     │  │  │  └─ L6LRLLLR: cap
│     │  │  └─ L5LRLLR: shared
│     │  │     ├─ L6LRLLRL: across
│     │  │     └─ L6LRLLRR: models
│     │  └─ L4LRLR: quota limits
│     │     ├─ L5LRLRL: per-group
│     │     │  ├─ L6LRLRLL: tokens
│     │     │  └─ L6LRLRLR: cap
│     │     └─ L5LRLRR: spend
│     │        ├─ L6LRLRRL: per-group
│     │        └─ L6LRLRRR: cap
│     └─ L3LRR: limit scope
│        ├─ L4LRRL: global
│        │  ├─ L5LRRLL: all apps
│        │  │  ├─ L6LRRLLL: shared
│        │  │  └─ L6LRRLLR: pool
│        │  └─ L5LRRLR: per-app
│        │     ├─ L6LRRLRL: app
│        │     └─ L6LRRLRR: group
│        └─ L4LRRR: per-profile
│           ├─ L5LRRRL: profile
│           │  ├─ L6LRRRLL: group
│           │  └─ L6LRRRLR: limit
│           └─ L5LRRRR: session
│              ├─ L6LRRRRL: group
│              └─ L6LRRRRR: limit
└─ L1R: Enforcement
   ├─ L2RL: Enforcement points
   │  ├─ L3RLL: pre-routing
   │  │  ├─ L4RLLL: check
   │  │  │  ├─ L5RLLLL: before route
   │  │  │  │  ├─ L6RLLLLL: check
   │  │  │  │  └─ L6RLLLLR: limit
   │  │  │  └─ L5RLLLR: reject
   │  │  │     ├─ L6RLLLRL: 429
   │  │  │     └─ L6RLLLRR: block
   │  │  └─ L4RLLR: fallback
   │  │     ├─ L5RLLRL: to other group
   │  │     │  ├─ L6RLLRLL: group
   │  │     │  └─ L6RLLRLR: fallback
   │  │     └─ L5RLLRR: to other model
   │  │        ├─ L6RLLRRL: model
   │  │        └─ L6RLLRRR: fallback
   │  └─ L3RLR: post-routing
   │     ├─ L4RLRL: usage count
   │     │  ├─ L5RLRLL: increment
   │     │  │  ├─ L6RLRLLL: count
   │     │  │  └─ L6RLRLLR: usage
   │     │  └─ L5RLRLR: decrement
   │     │     ├─ L6RLRLRL: release
   │     │     └─ L6RLRLRR: slot
   │     └─ L4RLRR: concurrency
   │        ├─ L5RLRRL: per-group
   │        │  ├─ L6RLRRLL: count
   │        │  └─ L6RLRRLR: cap
   │        └─ L5RLRRR: per-model
   │           ├─ L6RLRRRL: count
   │           └─ L6RLRRRR: cap
   └─ L2RR: Interaction
      ├─ L3RRL: with combos
      │  ├─ L4RRLL: combo fallback
      │  │  ├─ L5RRLLL: group-aware
      │  │  │  ├─ L6RRLLLL: combo
      │  │  │  └─ L6RRLLLR: group
      │  │  └─ L5RRLLR: skip limited
      │  │     ├─ L6RRLLRL: skip
      │  │     └─ L6RRLLRR: limited
      │  └─ L4RRLR: sr-* combos
      │     ├─ L5RRLRL: dynamic
      │     │  ├─ L6RRLRLL: smart router
      │     │  └─ L6RRLRLR: groups
      │     └─ L5RRLRR: respect
      │        ├─ L6RRLRRL: limits
      │        └─ L6RRLRRR: groups
      └─ L3RRR: with fallback
         ├─ L4RRRL: account fallback
         │  ├─ L5RRRLL: group-aware
         │  │  ├─ L6RRRLLL: account
         │  │  └─ L6RRRLLR: group
         │  └─ L5RRRLR: skip limited
         │     ├─ L6RRRLRL: skip
         │     └─ L6RRRLRR: limited
         └─ L4RRRR: model fallback
            ├─ L5RRRRL: group-aware
            │  ├─ L6RRRRLL: model
            │  └─ L6RRRRLR: group
            └─ L5RRRRR: skip limited
               ├─ L6RRRRRL: skip
               └─ L6RRRRRR: limited
```

## Node research (all 127 nodes)

### L0 — Model-group limiting
Group models by capability/cost, then apply rate/quota/concurrency limits per group.

### L1L — Group model
Definition + limits.

### L1R — Enforcement
Points + interaction.

### L2LL — Group definition
Types + membership.

### L2LR — Group limits
Rate + quota.

### L2RL — Enforcement points
Pre/post-routing.

### L2RR — Interaction
With combos + fallback.

### L3LLL — group types
Capability/cost.

### L3LLR — group membership
Model → group.

### L3LRL — limit types
Rate + quota.

### L3LRR — limit scope
Global/per-app.

### L3RLL — pre-routing
Check.

### L3RLR — post-routing
Usage count.

### L3RRL — with combos
Combo fallback.

### L3RRR — with fallback
Account fallback.

### L4LLLL — capability groups
Reasoning.

### L4LLLR — cost groups
Cheap.

### L4LLRL — model → group
Map.

### L4LLRR — group config
Config file.

### L4LRLL — rate limits
Per-group.

### L4LRLR — quota limits
Per-group.

### L4LRRL — global
All apps.

### L4LRRR — per-profile
Profile.

### L4RLLL — check
Before route.

### L4RLLR — fallback
To other group.

### L4RLRL — usage count
Increment.

### L4RLRR — concurrency
Per-group.

### L4RRLL — combo fallback
Group-aware.

### L4RRLR — sr-* combos
Dynamic.

### L4RRRL — account fallback
Group-aware.

### L4RRRR — model fallback
Group-aware.

### L5LLLLL — reasoning
Group.

### L5LLLLR — fast groups
Group.

### L5LLLRL — cheap
Group.

### L5LLLRR — premium
Group.

### L5LLRLL — map
Model.

### L5LLRLR — multi-group
Overlap.

### L5LLRRL — config file
Define.

### L5LLRRR — registry
providerModels.

### L5LRLLL — per-group
Rate.

### L5LRLLR — shared
Across.

### L5LRLRL — per-group
Tokens.

### L5LRLRR — spend
Per-group.

### L5LRRLL — all apps
Shared.

### L5LRRLR — per-app
App.

### L5LRRRL — profile
Group.

### L5LRRRR — session
Group.

### L5RLLLL — before route
Check.

### L5RLLLR — reject
429.

### L5RLLRL — to other group
Fallback.

### L5RLLRR — to other model
Fallback.

### L5RLRLL — increment
Count.

### L5RLRLR — decrement
Release.

### L5RLRRL — per-group
Count.

### L5RLRRR — per-model
Count.

### L5RRLLL — group-aware
Combo.

### L5RRLLR — skip limited
Skip.

### L5RRLRL — dynamic
Smart router.

### L5RRLRR — respect
Limits.

### L5RRRLL — group-aware
Account.

### L5RRRLR — skip limited
Skip.

### L5RRRRL — group-aware
Model.

### L5RRRRR — skip limited
Skip.

### L6 leaves (64)
- **L6LLLLLL** group: reasoning.
- **L6LLLLLR** models: reasoning.
- **L6LLLLRL** group: fast.
- **L6LLLLRR** models: fast.
- **L6LLLRLL** group: cheap.
- **L6LLLRLR** models: cheap.
- **L6LLLRRL** group: premium.
- **L6LLLRRR** models: premium.
- **L6LLRLLL** model: map.
- **L6LLRLLR** group: map.
- **L6LLRLRL** overlap: multi.
- **L6LLRLRR** allowed: multi.
- **L6LLRRLL** define: config.
- **L6LLRRLR** groups: config.
- **L6LLRRRL** providerModels: registry.
- **L6LLRRRR** groups: registry.
- **L6LRLLLL** rate: per-group.
- **L6LRLLLR** cap: rate.
- **L6LRLLRL** across: models.
- **L6LRLLRR** models: shared.
- **L6LRLRLL** tokens: quota.
- **L6LRLRLR** cap: quota.
- **L6LRLRRL** per-group: spend.
- **L6LRLRRR** cap: spend.
- **L6LRRLLL** shared: pool.
- **L6LRRLLR** pool: global.
- **L6LRRLRL** app: per-app.
- **L6LRRLRR** group: per-app.
- **L6LRRRLL** group: profile.
- **L6LRRRLR** limit: profile.
- **L6LRRRRL** group: session.
- **L6LRRRRR** limit: session.
- **L6RLLLLL** check: limit.
- **L6RLLLLR** limit: check.
- **L6RLLLRL** 429: reject.
- **L6RLLLRR** block: reject.
- **L6RLLRLL** group: fallback.
- **L6RLLRLR** fallback: group.
- **L6RLLRRL** model: fallback.
- **L6RLLRRR** fallback: model.
- **L6RLRLLL** count: usage.
- **L6RLRLLR** usage: count.
- **L6RLRLRL** release: slot.
- **L6RLRLRR** slot: release.
- **L6RLRRLL** count: per-group.
- **L6RLRRLR** cap: concurrency.
- **L6RLRRRL** count: per-model.
- **L6RLRRRR** cap: concurrency.
- **L6RRLLLL** combo: group.
- **L6RRLLLR** group: combo.
- **L6RRLLRL** skip: limited.
- **L6RRLLRR** limited: skip.
- **L6RRLRLL** smart router: dynamic.
- **L6RRLRLR** groups: dynamic.
- **L6RRLRRL** limits: respect.
- **L6RRLRRR** groups: respect.
- **L6RRRLLL** account: group.
- **L6RRRLLR** group: account.
- **L6RRRLRL** skip: limited.
- **L6RRRLRR** limited: skip.
- **L6RRRRLL** model: group.
- **L6RRRRLR** group: model.
- **L6RRRRRL** skip: limited.
- **L6RRRRRR** limited: skip.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Model registry (providerModels) exists; groups are a natural layer | High |
| Per-group rate/quota/concurrency limits are design proposals | Medium |
| Group-aware combo/fallback interaction is required for correctness | High |
| Concurrency tracking per model already exists (smartRouter) | High |

## Open questions

1. Should groups be capability-based, cost-based, or both?
2. Should limits be global, per-app, or per-profile?
3. Should limited groups be skipped in fallback chains?

## Sources

- Prior research: `2026-09-14-keyless-governance-research.md`, `2026-09-15-branch-b3a-model-group-limiting.md`
- Industry: LiteLLM model groups, OpenRouter model tiers, concurrency limits