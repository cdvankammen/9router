# Tree T25 — Gate Levels (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #gate #levels #t25

## Objective

Full 6-level binary tree expansion of the **gate levels** topic (from `2026-09-14-keyless-governance-research.md` Part G). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Gate levels
├─ L1L: Gate definitions
│  ├─ L2LL: Level 0 — Open
│  │  ├─ L3LLL: no gate
│  │  │  ├─ L4LLLL: all access
│  │  │  │  ├─ L5LLLLL: any client
│  │  │  │  │  ├─ L6LLLLLL: no auth
│  │  │  │  │  └─ L6LLLLLR: no limit
│  │  │  │  └─ L5LLLLR: local only
│  │  │  │     ├─ L6LLLLRL: loopback
│  │  │  │     └─ L6LLLLRR: LAN
│  │  │  └─ L4LLLR: use case
│  │  │     ├─ L5LLLRL: dev
│  │  │     │  ├─ L6LLLRLL: local dev
│  │  │     │  └─ L6LLLRLR: trusted
│  │  │     └─ L5LLLRR: home
│  │  │        ├─ L6LLLRRL: trusted
│  │  │        └─ L6LLLRRR: network
│  │  └─ L3LLR: Level 1 — Rate-limited
│  │     ├─ L4LLRL: basic limits
│  │     │  ├─ L5LLRLL: per-IP
│  │     │  │  ├─ L6LLRLLL: sliding
│  │     │  │  └─ L6LLRLLR: window
│  │     │  └─ L5LLRLR: per-app
│  │     │     ├─ L6LLRLRL: app class
│  │     │     └─ L6LLRLRR: limits
│  │     └─ L4LLRR: 429
│  │        ├─ L5LLRRL: reject
│  │        │  ├─ L6LLRRLL: 429
│  │        │  └─ L6LLRRLR: Retry-After
│  │        └─ L5LLRRR: backoff
│  │           ├─ L6LLRRRL: client
│  │           └─ L6LLRRRR: retry
│  └─ L2LR: Level 2 — Keyed
│     ├─ L3LRL: API keys
│     │  ├─ L4LRLL: key required
│     │  │  ├─ L5LRLLL: bearer
│     │  │  │  ├─ L6LRLLLL: header
│     │  │  │  └─ L6LRLLLR: validate
│     │  │  └─ L5LRLLR: keyless denied
│     │  │     ├─ L6LRLLRL: 401
│     │  │     └─ L6LRLLRR: reject
│     │  └─ L4LRLR: key management
│     │     ├─ L5LRLRL: create
│     │     │  ├─ L6LRLRLL: dashboard
│     │     │  └─ L6LRLRLR: CLI
│     │     └─ L5LRLRR: revoke
│     │        ├─ L6LRLRRL: disable
│     │        └─ L6LRLRRR: delete
│     └─ L3LRR: per-key limits
│        ├─ L4LRRL: rate
│        │  ├─ L5LRRLL: per-key
│        │  │  ├─ L6LRRLLL: rate
│        │  │  └─ L6LRRLLR: cap
│        │  └─ L5LRRLR: quota
│        │     ├─ L6LRRLRL: tokens
│        │     └─ L6LRRLRR: spend
│        └─ L4LRRR: budgets
│           ├─ L5LRRRL: per-key
│           │  ├─ L6LRRRLL: budget
│           │  └─ L6LRRRLR: cap
│           └─ L5LRRRR: enforce
│              ├─ L6LRRRRL: block
│              └─ L6LRRRRR: 429
└─ L1R: Higher gates
   ├─ L2RL: Level 3 — Policy
   │  ├─ L3RLL: per-app policy
   │  │  ├─ L4RLLL: app rules
   │  │  │  ├─ L5RLLLL: allow
   │  │  │  │  ├─ L6RLLLLL: models
   │  │  │  │  └─ L6RLLLLR: providers
   │  │  │  └─ L5RLLLR: deny
   │  │  │     ├─ L6RLLLRL: models
   │  │  │     └─ L6RLLLRR: providers
   │  │  └─ L4RLLR: task rules
   │  │     ├─ L5RLLRL: per-task
   │  │     │  ├─ L6RLLRLL: allow
   │  │     │  └─ L6RLLRLR: deny
   │  │     └─ L5RLLRR: task limits
   │  │        ├─ L6RLLRRL: rate
   │  │        └─ L6RLLRRR: quota
   │  └─ L3RLR: per-profile policy
   │     ├─ L4RLRL: profile rules
   │     │  ├─ L5RLRLL: allow
   │     │  │  ├─ L6RLRLLL: models
   │     │  │  └─ L6RLRLLR: providers
   │     │  └─ L5RLRLR: deny
   │     │     ├─ L6RLRLRL: models
   │     │     └─ L6RLRLRR: providers
   │     └─ L4RLRR: profile limits
   │        ├─ L5RLRRL: rate
   │        │  ├─ L6RLRRLL: per-profile
   │        │  └─ L6RLRRLR: cap
   │        └─ L5RLRRR: quota
   │           ├─ L6RLRRRL: per-profile
   │           └─ L6RLRRRR: cap
   └─ L2RR: Level 4 — Adaptive
      ├─ L3RRL: adaptive limits
      │  ├─ L4RRLL: AIMD
      │  │  ├─ L5RRLLL: increase
      │  │  │  ├─ L6RRLLLL: additive
      │  │  │  └─ L6RRLLLR: slow
      │  │  └─ L5RRLLR: decrease
      │  │     ├─ L6RRLLRL: halve
      │  │     └─ L6RRLLRR: fast
      │  └─ L4RRLR: EWMA
      │     ├─ L5RRLRL: estimate
      │     │  ├─ L6RRLRLL: rate
      │     │  └─ L6RRLRLR: smooth
      │     └─ L5RRLRR: set
      │        ├─ L6RRLRRL: limit
      │        └─ L6RRLRRR: dynamic
      └─ L3RRR: predictive
         ├─ L4RRRL: forecast
         │  ├─ L5RRRLL: trend
         │  │  ├─ L6RRRLLL: detect
         │  │  └─ L6RRRLLR: project
         │  └─ L5RRRLR: season
         │     ├─ L6RRRLRL: detect
         │     └─ L6RRRLRR: project
         └─ L4RRRR: preempt
            ├─ L5RRRRL: reduce
            │  ├─ L6RRRRLL: early
            │  └─ L6RRRRLR: limit
            └─ L5RRRRR: alert
               ├─ L6RRRRRL: notify
               └─ L6RRRRRR: warn
```

## Node research (all 127 nodes)

### L0 — Gate levels
Five escalating gate levels: L0 open, L1 rate-limited, L2 keyed, L3 policy, L4 adaptive.

### L1L — Gate definitions
L0 + L1 + L2.

### L1R — Higher gates
L3 + L4.

### L2LL — Level 0 — Open
No gate.

### L2LR — Level 2 — Keyed
API keys.

### L2RL — Level 3 — Policy
Per-app/profile.

### L2RR — Level 4 — Adaptive
AIMD + predictive.

### L3LLL — no gate
All access.

### L3LLR — Level 1 — Rate-limited
Basic limits.

### L3LRL — API keys
Key required.

### L3LRR — per-key limits
Rate + quota.

### L3RLL — per-app policy
App rules.

### L3RLR — per-profile policy
Profile rules.

### L3RRL — adaptive limits
AIMD + EWMA.

### L3RRR — predictive
Forecast + preempt.

### L4LLLL — all access
Any client.

### L4LLLR — use case
Dev.

### L4LLRL — basic limits
Per-IP.

### L4LLRR — 429
Reject.

### L4LRLL — key required
Bearer.

### L4LRLR — key management
Create.

### L4LRRL — rate
Per-key.

### L4LRRR — budgets
Per-key.

### L4RLLL — app rules
Allow.

### L4RLLR — task rules
Per-task.

### L4RLRL — profile rules
Allow.

### L4RLRR — profile limits
Rate.

### L4RRLL — AIMD
Increase.

### L4RRLR — EWMA
Estimate.

### L4RRRL — forecast
Trend.

### L4RRRR — preempt
Reduce.

### L5LLLLL — any client
No auth.

### L5LLLLR — local only
Loopback.

### L5LLLRL — dev
Local dev.

### L5LLLRR — home
Trusted.

### L5LLRLL — per-IP
Sliding.

### L5LLRLR — per-app
App class.

### L5LLRRL — reject
429.

### L5LLRRR — backoff
Client.

### L5LRLLL — bearer
Header.

### L5LRLLR — keyless denied
401.

### L5LRLRL — create
Dashboard.

### L5LRLRR — revoke
Disable.

### L5LRRLL — per-key
Rate.

### L5LRRLR — quota
Tokens.

### L5LRRRL — per-key
Budget.

### L5LRRRR — enforce
Block.

### L5RLLLL — allow
Models.

### L5RLLLR — deny
Models.

### L5RLLRL — per-task
Allow.

### L5RLLRR — task limits
Rate.

### L5RLRLL — allow
Models.

### L5RLRLR — deny
Models.

### L5RLRRL — rate
Per-profile.

### L5RLRRR — quota
Per-profile.

### L5RRLLL — increase
Additive.

### L5RRLLR — decrease
Halve.

### L5RRLRL — estimate
Rate.

### L5RRLRR — set
Limit.

### L5RRRLL — trend
Detect.

### L5RRRLR — season
Detect.

### L5RRRRL — reduce
Early.

### L5RRRRR — alert
Notify.

### L6 leaves (64)
- **L6LLLLLL** no auth: open.
- **L6LLLLLR** no limit: open.
- **L6LLLLRL** loopback: local.
- **L6LLLLRR** LAN: local.
- **L6LLLRLL** local dev: dev.
- **L6LLLRLR** trusted: dev.
- **L6LLLRRL** trusted: home.
- **L6LLLRRR** network: home.
- **L6LLRLLL** sliding: window.
- **L6LLRLLR** window: per-IP.
- **L6LLRLRL** app class: per-app.
- **L6LLRLRR** limits: per-app.
- **L6LLRRLL** 429: reject.
- **L6LLRRLR** Retry-After: reject.
- **L6LLRRRL** client: backoff.
- **L6LLRRRR** retry: backoff.
- **L6LRLLLL** header: bearer.
- **L6LRLLLR** validate: bearer.
- **L6LRLLRL** 401: denied.
- **L6LRLLRR** reject: denied.
- **L6LRLRLL** dashboard: create.
- **L6LRLRLR** CLI: create.
- **L6LRLRRL** disable: revoke.
- **L6LRLRRR** delete: revoke.
- **L6LRRLLL** rate: per-key.
- **L6LRRLLR** cap: rate.
- **L6LRRLRL** tokens: quota.
- **L6LRRLRR** spend: quota.
- **L6LRRRLL** budget: per-key.
- **L6LRRRLR** cap: budget.
- **L6LRRRRL** block: enforce.
- **L6LRRRRR** 429: enforce.
- **L6RLLLLL** models: allow.
- **L6RLLLLR** providers: allow.
- **L6RLLLRL** models: deny.
- **L6RLLLRR** providers: deny.
- **L6RLLRLL** allow: task.
- **L6RLLRLR** deny: task.
- **L6RLLRRL** rate: task.
- **L6RLLRRR** quota: task.
- **L6RLRLLL** models: allow.
- **L6RLRLLR** providers: allow.
- **L6RLRLRL** models: deny.
- **L6RLRLRR** providers: deny.
- **L6RLRRLL** per-profile: rate.
- **L6RLRRLR** cap: rate.
- **L6RLRRRL** per-profile: quota.
- **L6RLRRRR** cap: quota.
- **L6RRLLLL** additive: increase.
- **L6RRLLLR** slow: increase.
- **L6RRLLRL** halve: decrease.
- **L6RRLLRR** fast: decrease.
- **L6RRLRLL** rate: estimate.
- **L6RRLRLR** smooth: estimate.
- **L6RRLRRL** limit: set.
- **L6RRLRRR** dynamic: set.
- **L6RRRLLL** detect: trend.
- **L6RRRLLR** project: trend.
- **L6RRRLRL** detect: season.
- **L6RRRLRR** project: season.
- **L6RRRRLL** early: reduce.
- **L6RRRRLR** limit: reduce.
- **L6RRRRRL** notify: alert.
- **L6RRRRRR** warn: alert.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| L0/L1 (open + rate-limited) exist today (rate limiter) | High |
| L2 (keyed) partially exists (API key auth) | High |
| L3 (policy) is the main gap | Medium |
| L4 (adaptive) is a design proposal | Medium |

## Open questions

1. Should gate level be configurable per-app or global?
2. Should L0 be default for loopback only?
3. Should L3 policy be per-app, per-profile, or both?

## Sources

- Prior research: `2026-09-14-keyless-governance-research.md`, `2026-09-15-branch-b4a-gate-levels.md`
- Industry: API gateway auth tiers, Cloudflare Access levels, LiteLLM key tiers