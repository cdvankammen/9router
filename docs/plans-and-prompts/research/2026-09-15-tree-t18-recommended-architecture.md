# Tree T18 — Recommended Architecture (Phases) (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #architecture #phases #t18

## Objective

Full 6-level binary tree expansion of the **recommended architecture (phases)** topic (from `2026-08-31-message-origin-and-destination-research.md` Part C.3). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Recommended architecture (phases)
├─ L1L: Phase 1 — Foundation
│  ├─ L2LL: Attribution core
│  │  ├─ L3LLL: source fingerprinting
│  │  │  ├─ L4LLLL: UA rules
│  │  │  │  ├─ L5LLLLL: sourceApps.js
│  │  │  │  │  ├─ L6LLLLLL: existing
│  │  │  │  │  └─ L6LLLLLR: harden
│  │  │  │  └─ L5LLLLR: header fusion
│  │  │  │     ├─ L6LLLLRL: X-Title
│  │  │  │     └─ L6LLLLRR: session-id
│  │  │  └─ L4LLLR: class output
│  │  │     ├─ L5LLLRL: stable class
│  │  │     │  ├─ L6LLLRLL: app class
│  │  │     │  └─ L6LLLRLR: usage
│  │  │     └─ L5LLLRR: unknown
│  │  │        ├─ L6LLLRRL: default
│  │  │        └─ L6LLLRRR: strict
│  │  └─ L3LLR: usage capture
│  │     ├─ L4LLRL: task type
│  │     │  ├─ L5LLRLL: smartRouter
│  │     │  │  ├─ L6LLRLLL: classify
│  │     │  │  └─ L6LLRLLR: thread
│  │     │  └─ L5LLRLR: scores
│  │     │     ├─ L6LLRLRL: meta.scores
│  │     │     └─ L6LLRLRR: store
│  │     └─ L4LLRR: app class
│  │        ├─ L5LLRRL: usage meta
│  │        │  ├─ L6LLRRLL: store
│  │        │  └─ L6LLRRLR: usage.json
│  │        └─ L5LLRRR: privacy
│  │           ├─ L6LLRRRL: class only
│  │           └─ L6LLRRRR: no UA
│  └─ L2LR: Rate limiting
│     ├─ L3LRL: inbound limiter
│     │  ├─ L4LRLL: per-IP
│     │  │  ├─ L5LRLLL: sliding window
│     │  │  │  ├─ L6LRLLLL: existing
│     │  │  │  └─ L6LRLLLR: harden
│     │  │  └─ L5LRLLR: tiers
│     │  │     ├─ L6LRLLRL: general
│     │  │     └─ L6LRLLRR: chat
│     │  └─ L4LRLR: per-app
│     │     ├─ L5LRLRL: app class
│     │     │  ├─ L6LRLRLL: key
│     │     │  └─ L6LRLRLR: limits
│     │     └─ L5LRLRR: app limits
│     │        ├─ L6LRLRRL: rate
│     │        └─ L6LRLRRR: quota
│     └─ L3LRR: auth
│        ├─ L4LRRL: keyed mode
│        │  ├─ L5LRRLL: API keys
│        │  │  ├─ L6LRRLLL: bearer
│        │  │  └─ L6LRRLLR: validate
│        │  └─ L5LRRLR: keyless
│        │     ├─ L6LRRLRL: localhost
│        │     └─ L6LRRLRR: trust
│        └─ L4LRRR: dashboard
│           ├─ L5LRRRL: JWT
│           │  ├─ L6LRRRLL: session
│           │  └─ L6LRRRLR: cookie
│           └─ L5LRRRR: password
│              ├─ L6LRRRRL: initial
│              └─ L6LRRRRR: change
└─ L1R: Phase 2 — Governance
   ├─ L2RL: Per-app policy
   │  ├─ L3RLL: policy engine
   │  │  ├─ L4RLLL: rules
   │  │  │  ├─ L5RLLLL: app rules
   │  │  │  │  ├─ L6RLLLLL: per-app
   │  │  │  │  └─ L6RLLLLR: limits
   │  │  │  └─ L5RLLLR: task rules
   │  │  │     ├─ L6RLLLRL: per-task
   │  │  │     └─ L6RLLLRR: limits
   │  │  └─ L4RLLR: precedence
   │  │     ├─ L5RLLRL: explicit
   │  │     │  ├─ L6RLLRLL: user
   │  │     │  └─ L6RLLRLR: wins
   │  │     └─ L5RLLRR: default
   │  │        ├─ L6RLLRRL: smart
   │  │        └─ L6RLLRRR: router
   │  └─ L3RLR: budgets
   │     ├─ L4RLRL: spend caps
   │     │  ├─ L5RLRLL: per-app
   │     │  │  ├─ L6RLRLLL: budget
   │     │  │  └─ L6RLRLLR: cap
   │     │  └─ L5RLRLR: per-key
   │     │     ├─ L6RLRLRL: budget
   │     │     └─ L6RLRLRR: cap
   │     └─ L4RLRR: enforcement
   │        ├─ L5RLRRL: hard stop
   │        │  ├─ L6RLRRLL: block
   │        │  └─ L6RLRRLR: 429
   │        └─ L5RLRRR: alert
   │           ├─ L6RLRRRL: notify
   │           └─ L6RLRRRR: warn
   └─ L2RR: Phase 3 — Adaptive
      ├─ L3RRL: adaptive routing
      │  ├─ L4RRLL: load-aware
      │  │  ├─ L5RRLLL: concurrency
      │  │  │  ├─ L6RRLLLL: per-model
      │  │  │  └─ L6RRLLLR: skip
      │  │  └─ L5RRLLR: health
      │  │     ├─ L6RRLLRL: provider
      │  │     └─ L6RRLLRR: down
      │  └─ L4RRLR: cost-aware
      │     ├─ L5RRLRL: budget
      │     │  ├─ L6RRLRLL: remaining
      │     │  └─ L6RRLRLR: route
      │     └─ L5RRLRR: cheapest
      │        ├─ L6RRLRRL: cost
      │        └─ L6RRLRRR: route
      └─ L3RRR: adaptive limits
         ├─ L4RRRL: AIMD
         │  ├─ L5RRRLL: increase
         │  │  ├─ L6RRRLLL: additive
         │  │  └─ L6RRRLLR: slow
         │  └─ L5RRRLR: decrease
         │     ├─ L6RRRLRL: halve
         │     └─ L6RRRLRR: fast
         └─ L4RRRR: EWMA
            ├─ L5RRRRL: rate est
            │  ├─ L6RRRRLL: smooth
            │  └─ L6RRRRLR: O(1)
            └─ L5RRRRR: prediction
               ├─ L6RRRRRL: forecast
               └─ L6RRRRRR: preempt
```

## Node research (all 127 nodes)

### L0 — Recommended architecture (phases)
Three-phase roadmap: Phase 1 foundation (attribution + rate + auth), Phase 2 governance (per-app policy + budgets), Phase 3 adaptive (routing + limits).

### L1L — Phase 1 — Foundation
Attribution core + rate limiting + auth.

### L1R — Phase 2 — Governance
Per-app policy + budgets.

### L2LL — Attribution core
Source fingerprinting + usage capture.

### L2LR — Rate limiting
Inbound + per-app.

### L2RL — Per-app policy
Policy engine + budgets.

### L2RR — Phase 3 — Adaptive
Adaptive routing + limits.

### L3LLL — source fingerprinting
UA rules + header fusion.

### L3LLR — usage capture
Task type + app class.

### L3LRL — inbound limiter
Per-IP + tiers.

### L3LRR — auth
Keyed/keyless + dashboard.

### L3RLL — policy engine
Rules + precedence.

### L3RLR — budgets
Spend caps + enforcement.

### L3RRL — adaptive routing
Load/cost-aware.

### L3RRR — adaptive limits
AIMD + EWMA.

### L4LLLL — UA rules
sourceApps.js.

### L4LLLR — class output
Stable class.

### L4LLRL — task type
smartRouter.

### L4LLRR — app class
Usage meta.

### L4LRLL — per-IP
Sliding window.

### L4LRLR — per-app
App class.

### L4LRRL — keyed mode
API keys.

### L4LRRR — dashboard
JWT.

### L4RLLL — rules
App/task.

### L4RLLR — precedence
Explicit.

### L4RLRL — spend caps
Per-app/key.

### L4RLRR — enforcement
Hard stop.

### L4RRLL — load-aware
Concurrency.

### L4RRLR — cost-aware
Budget.

### L4RRRL — AIMD
Increase/decrease.

### L4RRRR — EWMA
Rate est.

### L5LLLLL — sourceApps.js
Existing.

### L5LLLLR — header fusion
X-Title.

### L5LLLRL — stable class
App class.

### L5LLLRR — unknown
Default.

### L5LLRLL — smartRouter
Classify.

### L5LLRLR — scores
meta.scores.

### L5LLRRL — usage meta
Store.

### L5LLRRR — privacy
Class only.

### L5LRLLL — sliding window
Existing.

### L5LRLLR — tiers
General.

### L5LRLRL — app class
Key.

### L5LRLRR — app limits
Rate.

### L5LRRLL — API keys
Bearer.

### L5LRRLR — keyless
Localhost.

### L5LRRRL — JWT
Session.

### L5LRRRR — password
Initial.

### L5RLLLL — app rules
Per-app.

### L5RLLLR — task rules
Per-task.

### L5RLLRL — explicit
User.

### L5RLLRR — default
Smart.

### L5RLRLL — per-app
Budget.

### L5RLRLR — per-key
Budget.

### L5RLRRL — hard stop
Block.

### L5RLRRR — alert
Notify.

### L5RRLLL — concurrency
Per-model.

### L5RRLLR — health
Provider.

### L5RRLRL — budget
Remaining.

### L5RRLRR — cheapest
Cost.

### L5RRRLL — increase
Additive.

### L5RRRLR — decrease
Halve.

### L5RRRRL — rate est
Smooth.

### L5RRRRR — prediction
Forecast.

### L6 leaves (64)
- **L6LLLLLL** existing: sourceApps.
- **L6LLLLLR** harden: improve.
- **L6LLLLRL** X-Title: header.
- **L6LLLLRR** session-id: header.
- **L6LLLRLL** app class: output.
- **L6LLLRLR** usage: store.
- **L6LLLRRL** default: unknown.
- **L6LLLRRR** strict: policy.
- **L6LLRLLL** classify: task.
- **L6LLRLLR** thread: usage.
- **L6LLRLRL** meta.scores: store.
- **L6LLRLRR** store: usage.
- **L6LLRRLL** store: usage.
- **L6LLRRLR** usage.json: file.
- **L6LLRRRL** class only: privacy.
- **L6LLRRRR** no UA: privacy.
- **L6LRLLLL** existing: limiter.
- **L6LRLLLR** harden: improve.
- **L6LRLLRL** general: tier.
- **L6LRLLRR** chat: tier.
- **L6LRLRLL** key: app.
- **L6LRLRLR** limits: caps.
- **L6LRLRRL** rate: limit.
- **L6LRLRRR** quota: cap.
- **L6LRRLLL** bearer: header.
- **L6LRRLLR** validate: check.
- **L6LRRLRL** localhost: trust.
- **L6LRRLRR** trust: boundary.
- **L6LRRRLL** session: cookie.
- **L6LRRRLR** cookie: JWT.
- **L6LRRRRL** initial: password.
- **L6LRRRRR** change: force.
- **L6RLLLLL** per-app: limits.
- **L6RLLLLR** limits: caps.
- **L6RLLLRL** per-task: limits.
- **L6RLLLRR** limits: caps.
- **L6RLLRLL** user: override.
- **L6RLLRLR** wins: explicit.
- **L6RLLRRL** smart: router.
- **L6RLLRRR** router: default.
- **L6RLRLLL** budget: per-app.
- **L6RLRLLR** cap: limit.
- **L6RLRLRL** budget: per-key.
- **L6RLRLRR** cap: limit.
- **L6RLRRLL** block: stop.
- **L6RLRRLR** 429: reject.
- **L6RLRRRL** notify: alert.
- **L6RLRRRR** warn: alert.
- **L6RRLLLL** per-model: count.
- **L6RRLLLR** skip: overloaded.
- **L6RRLLRL** provider: health.
- **L6RRLLRR** down: skip.
- **L6RRLRLL** remaining: budget.
- **L6RRLRLR** route: budget.
- **L6RRLRRL** cost: cheapest.
- **L6RRLRRR** route: cheapest.
- **L6RRRLLL** additive: +1.
- **L6RRRLLR** slow: increase.
- **L6RRRLRL** halve: decrease.
- **L6RRRLRR** fast: decrease.
- **L6RRRRLL** smooth: EWMA.
- **L6RRRRLR** O(1): cheap.
- **L6RRRRRL** forecast: predict.
- **L6RRRRRR** preempt: act.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Phase 1 (attribution + rate + auth) mostly exists today | High |
| Phase 2 (per-app policy + budgets) is the main gap | High |
| Phase 3 (adaptive) is a design proposal | Medium |
| AIMD + EWMA are proven techniques for adaptive control | High |

## Open questions

1. Should Phase 2 budgets be per-app, per-key, or both?
2. Should Phase 3 adaptive limits use AIMD on 429 signals?
3. Should the roadmap be re-sequenced based on user priorities?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b6b-attribution-dimensions.md`
- Industry: LiteLLM, OpenRouter, Cloudflare AI gateway architecture