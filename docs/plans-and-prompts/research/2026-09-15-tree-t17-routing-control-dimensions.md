# Tree T17 — Routing/Control Dimensions ("where to") (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #routing #control #dimensions #t17

## Objective

Full 6-level binary tree expansion of the **routing/control dimensions ("where to")** topic (from `2026-08-31-message-origin-and-destination-research.md` Part C.2). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Routing/control dimensions ("where to")
├─ L1L: Model selection
│  ├─ L2LL: Model pool
│  │  ├─ L3LLL: provider models
│  │  │  ├─ L4LLLL: model registry
│  │  │  │  ├─ L5LLLLL: providerModels
│  │  │  │  │  ├─ L6LLLLLL: config
│  │  │  │  │  └─ L6LLLLLR: registry
│  │  │  │  └─ L5LLLLR: model metadata
│  │  │  │     ├─ L6LLLLRL: capabilities
│  │  │  │     └─ L6LLLLRR: pricing
│  │  │  └─ L4LLLR: model groups
│  │  │     ├─ L5LLLRL: group def
│  │  │     │  ├─ L6LLLRLL: group
│  │  │     │  └─ L6LLLRLR: models
│  │  │     └─ L5LLLRR: group use
│  │  │        ├─ L6LLLRRL: routing
│  │  │        └─ L6LLLRRR: limiting
│  │  └─ L3LLR: selection criteria
│  │     ├─ L4LLRL: task fit
│  │     │  ├─ L5LLRLL: task type
│  │     │  │  ├─ L6LLRLLL: classify
│  │     │  │  └─ L6LLRLLR: score
│  │     │  └─ L5LLRLR: capability
│  │     │     ├─ L6LLRLRL: needs
│  │     │     └─ L6LLRLRR: match
│  │     └─ L4LLRR: cost/latency
│  │        ├─ L5LLRRL: cost
│  │        │  ├─ L6LLRRLL: price
│  │        │  └─ L6LLRRLR: budget
│  │        └─ L5LLRRR: latency
│  │           ├─ L6LLRRRL: p50
│  │           └─ L6LLRRRR: interactive
│  └─ L2LR: Combo expansion
│     ├─ L3LRL: combos
│     │  ├─ L4LRLL: combo def
│     │  │  ├─ L5LRLLL: ordered list
│     │  │  │  ├─ L6LRLLLL: models
│     │  │  │  └─ L6LRLLLR: order
│     │  │  └─ L5LRLLR: fallback
│     │  │     ├─ L6LRLLRL: next
│     │  │     └─ L6LRLLRR: on fail
│     │  └─ L4LRLR: sr-* combos
│     │     ├─ L5LRLRL: dynamic
│     │     │  ├─ L6LRLRLL: smart router
│     │     │  └─ L6LRLRLR: generated
│     │     └─ L5LRLRR: alias map
│     │        ├─ L6LRLRRL: ALIAS_TO_PROVIDER_ID
│     │        └─ L6LRLRRR: resolve
│     └─ L3LRR: fallback chain
│        ├─ L4LRRL: account fallback
│        │  ├─ L5LRRLL: multi-account
│        │  │  ├─ L6LRRLLL: next key
│        │  │  └─ L6LRRLLR: switch
│        │  └─ L5LRRLR: quota
│        │     ├─ L6LRRLRL: exhausted
│        │     └─ L6LRRLRR: switch
│        └─ L4LRRR: model fallback
│           ├─ L5LRRRL: different model
│           │  ├─ L6LRRRLL: same provider
│           │  └─ L6LRRRLR: different
│           └─ L5LRRRR: different provider
│              ├─ L6LRRRRL: cross
│              └─ L6LRRRRR: provider
└─ L1R: Control dimensions
   ├─ L2RL: Routing policy
   │  ├─ L3RLL: policy rules
   │  │  ├─ L4RLLL: rule types
   │  │  │  ├─ L5RLLLL: app-based
   │  │  │  │  ├─ L6RLLLLL: app class
   │  │  │  │  └─ L6RLLLLR: route
   │  │  │  └─ L5RLLLR: task-based
   │  │  │     ├─ L6RLLLRL: task type
   │  │  │     └─ L6RLLLRR: route
   │  │  └─ L4RLLR: policy precedence
   │  │     ├─ L5RLLRL: explicit
   │  │     │  ├─ L6RLLRLL: user override
   │  │     │  └─ L6RLLRLR: wins
   │  │     └─ L5RLLRR: default
   │  │        ├─ L6RLLRRL: smart router
   │  │        └─ L6RLLRRR: score
   │  └─ L3RLR: model groups
   │     ├─ L4RLRL: group routing
   │     │  ├─ L5RLRLL: group → models
   │     │  │  ├─ L6RLRLLL: map
   │     │  │  └─ L6RLRLLR: route
   │     │  └─ L5RLRLR: group limiting
   │     │     ├─ L6RLRLRL: per-group
   │     │     └─ L6RLRLRR: limits
   │     └─ L4RLRR: group priority
   │        ├─ L5RLRRL: priority
   │        │  ├─ L6RLRRLL: order
   │        │  └─ L6RLRRLR: preference
   │        └─ L5RLRRR: fallback
   │           ├─ L6RLRRRL: group fallback
   │           └─ L6RLRRRR: chain
   └─ L2RR: Control knobs
      ├─ L3RRL: per-app routing
      │  ├─ L4RRLL: app → models
      │  │  ├─ L5RRLLL: map
      │  │  │  ├─ L6RRLLLL: app
      │  │  │  └─ L6RRLLLR: models
      │  │  └─ L5RRLLR: app → providers
      │  │     ├─ L6RRLLRL: map
      │  │     └─ L6RRLLRR: providers
      │  └─ L4RRLR: per-task routing
      │     ├─ L5RRLRL: task → models
      │     │  ├─ L6RRLRLL: map
      │     │  └─ L6RRLRLR: models
      │     └─ L5RRLRR: task → providers
      │        ├─ L6RRLRRL: map
      │        └─ L6RRLRRR: providers
      └─ L3RRR: adaptive control
         ├─ L4RRRL: load-aware
         │  ├─ L5RRRLL: concurrency
         │  │  ├─ L6RRRLLL: per-model
         │  │  └─ L6RRRLLR: skip
         │  └─ L5RRRLR: health
         │     ├─ L6RRRLRL: provider
         │     └─ L6RRRLRR: down
         └─ L4RRRR: cost-aware
            ├─ L5RRRRL: budget
            │  ├─ L6RRRRLL: remaining
            │  └─ L6RRRRLR: route
            └─ L5RRRRR: cheapest
               ├─ L6RRRRRL: cost
               └─ L6RRRRRR: route
```

## Node research (all 127 nodes)

### L0 — Routing/control dimensions ("where to")
Dimensions that answer "where should this request go": model selection, combo expansion, routing policy, control knobs.

### L1L — Model selection
Model pool + selection criteria.

### L1R — Control dimensions
Routing policy + control knobs.

### L2LL — Model pool
Registry + groups.

### L2LR — Combo expansion
Combos + fallback.

### L2RL — Routing policy
Rules + precedence.

### L2RR — Control knobs
Per-app/task routing + adaptive.

### L3LLL — provider models
Registry.

### L3LLR — selection criteria
Task fit + cost/latency.

### L3LRL — combos
Ordered fallback.

### L3LRR — fallback chain
Account + model.

### L3RLL — policy rules
App/task-based.

### L3RLR — model groups
Group routing.

### L3RRL — per-app routing
App → models.

### L3RRR — adaptive control
Load/cost-aware.

### L4LLLL — model registry
providerModels.

### L4LLLR — model groups
Group def.

### L4LLRL — task fit
Classify + score.

### L4LLRR — cost/latency
Price + p50.

### L4LRLL — combo def
Ordered list.

### L4LRLR — sr-* combos
Dynamic.

### L4LRRL — account fallback
Multi-account.

### L4LRRR — model fallback
Different model.

### L4RLLL — rule types
App/task.

### L4RLLR — policy precedence
Explicit wins.

### L4RLRL — group routing
Group → models.

### L4RLRR — group priority
Order.

### L4RRLL — app → models
Map.

### L4RRLR — per-task routing
Task → models.

### L4RRRL — load-aware
Concurrency.

### L4RRRR — cost-aware
Budget.

### L5LLLLL — providerModels
Config.

### L5LLLLR — model metadata
Capabilities.

### L5LLLRL — group def
Group.

### L5LLLRR — group use
Routing.

### L5LLRLL — task type
Classify.

### L5LLRLR — capability
Needs.

### L5LLRRL — cost
Price.

### L5LLRRR — latency
p50.

### L5LRLLL — ordered list
Models.

### L5LRLLR — fallback
Next.

### L5LRLRL — dynamic
Smart router.

### L5LRLRR — alias map
Resolve.

### L5LRRLL — multi-account
Next key.

### L5LRRLR — quota
Exhausted.

### L5LRRRL — different model
Same provider.

### L5LRRRR — different provider
Cross.

### L5RLLLL — app-based
App class.

### L5RLLLR — task-based
Task type.

### L5RLLRL — explicit
User override.

### L5RLLRR — default
Smart router.

### L5RLRLL — group → models
Map.

### L5RLRLR — group limiting
Per-group.

### L5RLRRL — priority
Order.

### L5RLRRR — fallback
Group chain.

### L5RRLLL — map
App.

### L5RRLLR — app → providers
Map.

### L5RRLRL — task → models
Map.

### L5RRLRR — task → providers
Map.

### L5RRRLL — concurrency
Per-model.

### L5RRRLR — health
Provider.

### L5RRRRL — budget
Remaining.

### L5RRRRR — cheapest
Cost.

### L6 leaves (64)
- **L6LLLLLL** config: models.
- **L6LLLLLR** registry: list.
- **L6LLLLRL** capabilities: features.
- **L6LLLLRR** pricing: cost.
- **L6LLLRLL** group: models.
- **L6LLLRLR** models: group.
- **L6LLLRRL** routing: group.
- **L6LLLRRR** limiting: group.
- **L6LLRLLL** classify: task.
- **L6LLRLLR** score: fit.
- **L6LLRLRL** needs: task.
- **L6LLRLRR** match: model.
- **L6LLRRLL** price: cost.
- **L6LLRRLR** budget: cap.
- **L6LLRRRL** p50: latency.
- **L6LLRRRR** interactive: weight.
- **L6LRLLLL** models: combo.
- **L6LRLLLR** order: fallback.
- **L6LRLLRL** next: on fail.
- **L6LRLLRR** on fail: fallback.
- **L6LRLRLL** smart router: generated.
- **L6LRLRLR** generated: combos.
- **L6LRLRRL** ALIAS_TO_PROVIDER_ID: map.
- **L6LRLRRR** resolve: provider.
- **L6LRRLLL** next key: pool.
- **L6LRRLLR** switch: failover.
- **L6LRRLRL** exhausted: quota.
- **L6LRRLRR** switch: key.
- **L6LRRRLL** same provider: model.
- **L6LRRRLR** different: model.
- **L6LRRRRL** cross: provider.
- **L6LRRRRR** provider: fallback.
- **L6RLLLLL** app class: route.
- **L6RLLLLR** route: policy.
- **L6RLLLRL** task type: route.
- **L6RLLLRR** route: policy.
- **L6RLLRLL** user override: wins.
- **L6RLLRLR** wins: explicit.
- **L6RLLRRL** smart router: default.
- **L6RLLRRR** score: default.
- **L6RLRLLL** map: group.
- **L6RLRLLR** route: group.
- **L6RLRLRL** per-group: limits.
- **L6RLRLRR** limits: caps.
- **L6RLRRLL** order: priority.
- **L6RLRRLR** preference: priority.
- **L6RLRRRL** group fallback: chain.
- **L6RLRRRR** chain: fallback.
- **L6RRLLLL** app: key.
- **L6RRLLLR** models: value.
- **L6RRLLRL** map: app.
- **L6RRLLRR** providers: value.
- **L6RRLRLL** map: task.
- **L6RRLRLR** models: value.
- **L6RRLRRL** map: task.
- **L6RRLRRR** providers: value.
- **L6RRRLLL** per-model: count.
- **L6RRRLLR** skip: overloaded.
- **L6RRRLRL** provider: health.
- **L6RRRLRR** down: skip.
- **L6RRRRLL** remaining: budget.
- **L6RRRRLR** route: budget.
- **L6RRRRRL** cost: cheapest.
- **L6RRRRRR** route: cheapest.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Model registry + groups exist (providerModels) | High |
| Combo expansion + sr-* dynamic combos exist | High |
| Account fallback + model fallback exist | High |
| Per-app/task routing policy is a design proposal | Medium |
| Adaptive (load/cost-aware) control is a design proposal | Medium |

## Open questions

1. Should routing policy be per-app, per-task, or both (matrix)?
2. Should model groups be the primary routing unit?
3. Should cost-aware routing consider remaining budget?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b6b-attribution-dimensions.md`
- Industry: LiteLLM routing, OpenRouter model routing, RouteLLM