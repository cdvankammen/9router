# Tree T20 — Agent Profiles (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #agent #profiles #t20

## Objective

Full 6-level binary tree expansion of the **agent profiles** topic (from `2026-09-14-keyless-governance-research.md` Part B). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Agent profiles
├─ L1L: Profile model
│  ├─ L2LL: Profile identity
│  │  ├─ L3LLL: app class
│  │  │  ├─ L4LLLL: sourceApps
│  │  │  │  ├─ L5LLLLL: UA rules
│  │  │  │  │  ├─ L6LLLLLL: regex
│  │  │  │  │  └─ L6LLLLLR: class
│  │  │  │  └─ L5LLLLR: class list
│  │  │  │     ├─ L6LLLLRL: 22 classes
│  │  │  │     └─ L6LLLLRR: unknown
│  │  │  └─ L4LLLR: session id
│  │  │     ├─ L5LLLRL: session header
│  │  │     │  ├─ L6LLLRLL: claude-code
│  │  │     │  └─ L6LLLRLR: session-id
│  │  │     └─ L5LLLRR: session scope
│  │  │        ├─ L6LLLRRL: per-session
│  │  │        └─ L6LLLRRR: per-task
│  │  └─ L3LLR: profile fields
│  │     ├─ L4LLRL: identity fields
│  │     │  ├─ L5LLRLL: app
│  │     │  │  ├─ L6LLRLLL: class
│  │     │  │  └─ L6LLRLLR: version
│  │     │  └─ L5LLRLR: session
│  │     │     ├─ L6LLRLRL: id
│  │     │     └─ L6LLRLRR: start
│  │     └─ L4LLRR: behavior fields
│  │        ├─ L5LLRRL: task mix
│  │        │  ├─ L6LLRRLL: types
│  │        │  └─ L6LLRRLR: freq
│  │        └─ L5LLRRR: usage
│  │           ├─ L6LLRRRL: tokens
│  │           └─ L6LLRRRR: spend
│  └─ L2LR: Profile store
│     ├─ L3LRL: storage
│     │  ├─ L4LRLL: SQLite
│     │  │  ├─ L5LRLLL: db layer
│     │  │  │  ├─ L6LRLLLL: repos
│     │  │  │  └─ L6LRLLLR: migrations
│     │  │  └─ L5LRLLR: profile table
│     │  │     ├─ L6LRLLRL: schema
│     │  │     └─ L6LRLLRR: rows
│     │  └─ L4LRLR: in-memory
│     │     ├─ L5LRLRL: cache
│     │     │  ├─ L6LRLRLL: hot
│     │     │  └─ L6LRLRLR: TTL
│     │     └─ L5LRLRR: sticky
│     │        ├─ L6LRLRRL: session
│     │        └─ L6LRLRRR: map
│     └─ L3LRR: lifecycle
│        ├─ L4LRRL: create
│        │  ├─ L5LRRLL: first seen
│        │  │  ├─ L6LRRLLL: auto
│        │  │  └─ L6LRRLLR: register
│        │  └─ L5LRRLR: update
│        │     ├─ L6LRRLRL: on request
│        │     └─ L6LRRLRR: merge
│        └─ L4LRRR: expire
│           ├─ L5LRRRL: TTL
│           │  ├─ L6LRRRLL: idle
│           │  └─ L6LRRRLR: purge
│           └─ L5LRRRR: archive
│              ├─ L6LRRRRL: keep
│              └─ L6LRRRRR: stats
└─ L1R: Profile use
   ├─ L2RL: Routing
   │  ├─ L3RLL: profile routing
   │  │  ├─ L4RLLL: per-profile
   │  │  │  ├─ L5RLLLL: model prefs
   │  │  │  │  ├─ L6RLLLLL: preferred
   │  │  │  │  └─ L6RLLLLR: models
   │  │  │  └─ L5RLLLR: provider prefs
   │  │  │     ├─ L6RLLLRL: preferred
   │  │  │     └─ L6RLLLRR: providers
   │  │  └─ L4RLLR: profile fallback
   │  │     ├─ L5RLLRL: fallback chain
   │  │     │  ├─ L6RLLRLL: per-profile
   │  │     │  └─ L6RLLRLR: chain
   │  │     └─ L5RLLRR: default
   │  │        ├─ L6RLLRRL: global
   │  │        └─ L6RLLRRR: fallback
   │  └─ L3RLR: task adaptation
   │     ├─ L4RLRL: task mix
   │     │  ├─ L5RLRLL: observed
   │     │  │  ├─ L6RLRLLL: types
   │     │  │  └─ L6RLRLLR: freq
   │     │  └─ L5RLRLR: adapt
   │     │     ├─ L6RLRLRL: routing
   │     │     └─ L6RLRLRR: prefs
   │     └─ L4RLRR: learning
   │        ├─ L5RLRRL: feedback
   │        │  ├─ L6RLRRLL: success
   │        │  └─ L6RLRRLR: failure
   │        └─ L5RLRRR: adjust
   │           ├─ L6RLRRRL: weights
   │           └─ L6RLRRRR: prefs
   └─ L2RR: Governance
      ├─ L3RRL: per-profile limits
      │  ├─ L4RRLL: rate limits
      │  │  ├─ L5RRLLL: per-profile
      │  │  │  ├─ L6RRLLLL: rate
      │  │  │  └─ L6RRLLLR: cap
      │  │  └─ L5RRLLR: quota
      │  │     ├─ L6RRLLRL: tokens
      │  │     └─ L6RRLLRR: spend
      │  └─ L4RRLR: budgets
      │     ├─ L5RRLRL: per-profile
      │     │  ├─ L6RRLRLL: budget
      │     │  └─ L6RRLRLR: cap
      │     └─ L5RRLRR: enforcement
      │        ├─ L6RRLRRL: block
      │        └─ L6RRLRRR: 429
      └─ L3RRR: policy
         ├─ L4RRRL: per-profile policy
         │  ├─ L5RRRLL: allow
         │  │  ├─ L6RRRLLL: models
         │  │  └─ L6RRRLLR: providers
         │  └─ L5RRRLR: deny
         │     ├─ L6RRRLRL: models
         │     └─ L6RRRLRR: providers
         └─ L4RRRR: profile groups
            ├─ L5RRRRL: group
            │  ├─ L6RRRRLL: profiles
            │  └─ L6RRRRLR: policy
            └─ L5RRRRR: group policy
               ├─ L6RRRRRL: shared
               └─ L6RRRRRR: limits
```

## Node research (all 127 nodes)

### L0 — Agent profiles
Per-agent (app+session) profiles capturing identity, behavior, routing prefs, and governance limits.

### L1L — Profile model
Identity + fields + store.

### L1R — Profile use
Routing + governance.

### L2LL — Profile identity
App class + session id.

### L2LR — Profile store
Storage + lifecycle.

### L2RL — Routing
Profile routing + task adaptation.

### L2RR — Governance
Limits + policy.

### L3LLL — app class
sourceApps.

### L3LLR — profile fields
Identity + behavior.

### L3LRL — storage
SQLite + in-memory.

### L3LRR — lifecycle
Create + expire.

### L3RLL — profile routing
Per-profile prefs.

### L3RLR — task adaptation
Observed mix.

### L3RRL — per-profile limits
Rate + quota.

### L3RRR — policy
Allow/deny.

### L4LLLL — sourceApps
UA rules.

### L4LLLR — session id
Session header.

### L4LLRL — identity fields
App + session.

### L4LLRR — behavior fields
Task mix + usage.

### L4LRLL — SQLite
DB layer.

### L4LRLR — in-memory
Cache.

### L4LRRL — create
First seen.

### L4LRRR — expire
TTL.

### L4RLLL — per-profile
Model prefs.

### L4RLLR — profile fallback
Fallback chain.

### L4RLRL — task mix
Observed.

### L4RLRR — learning
Feedback.

### L4RRLL — rate limits
Per-profile.

### L4RRLR — budgets
Per-profile.

### L4RRRL — per-profile policy
Allow.

### L4RRRR — profile groups
Group.

### L5LLLLL — UA rules
Regex.

### L5LLLLR — class list
22 classes.

### L5LLLRL — session header
claude-code.

### L5LLLRR — session scope
Per-session.

### L5LLRLL — app
Class.

### L5LLRLR — session
Id.

### L5LLRRL — task mix
Types.

### L5LLRRR — usage
Tokens.

### L5LRLLL — db layer
Repos.

### L5LRLLR — profile table
Schema.

### L5LRLRL — cache
Hot.

### L5LRLRR — sticky
Session.

### L5LRRLL — first seen
Auto.

### L5LRRLR — update
On request.

### L5LRRRL — TTL
Idle.

### L5LRRRR — archive
Keep.

### L5RLLLL — model prefs
Preferred.

### L5RLLLR — provider prefs
Preferred.

### L5RLLRL — fallback chain
Per-profile.

### L5RLLRR — default
Global.

### L5RLRLL — observed
Types.

### L5RLRLR — adapt
Routing.

### L5RLRRL — feedback
Success.

### L5RLRRR — adjust
Weights.

### L5RRLLL — per-profile
Rate.

### L5RRLLR — quota
Tokens.

### L5RRLRL — per-profile
Budget.

### L5RRLRR — enforcement
Block.

### L5RRRLL — allow
Models.

### L5RRRLR — deny
Models.

### L5RRRRL — group
Profiles.

### L5RRRRR — group policy
Shared.

### L6 leaves (64)
- **L6LLLLLL** regex: UA.
- **L6LLLLLR** class: app.
- **L6LLLLRL** 22 classes: list.
- **L6LLLLRR** unknown: default.
- **L6LLLRLL** claude-code: session.
- **L6LLLRLR** session-id: header.
- **L6LLLRRL** per-session: scope.
- **L6LLLRRR** per-task: scope.
- **L6LLRLLL** class: app.
- **L6LLRLLR** version: app.
- **L6LLRLRL** id: session.
- **L6LLRLRR** start: session.
- **L6LLRRLL** types: task.
- **L6LLRRLR** freq: task.
- **L6LLRRRL** tokens: usage.
- **L6LLRRRR** spend: usage.
- **L6LRLLLL** repos: db.
- **L6LRLLLR** migrations: db.
- **L6LRLLRL** schema: table.
- **L6LRLLRR** rows: table.
- **L6LRLRLL** hot: cache.
- **L6LRLRLR** TTL: cache.
- **L6LRLRRL** session: sticky.
- **L6LRLRRR** map: sticky.
- **L6LRRLLL** auto: create.
- **L6LRRLLR** register: create.
- **L6LRRLRL** on request: update.
- **L6LRRLRR** merge: update.
- **L6LRRRLL** idle: TTL.
- **L6LRRRLR** purge: TTL.
- **L6LRRRRL** keep: archive.
- **L6LRRRRR** stats: archive.
- **L6RLLLLL** preferred: models.
- **L6RLLLLR** models: prefs.
- **L6RLLLRL** preferred: providers.
- **L6RLLLRR** providers: prefs.
- **L6RLLRLL** per-profile: chain.
- **L6RLLRLR** chain: fallback.
- **L6RLLRRL** global: default.
- **L6RLLRRR** fallback: default.
- **L6RLRLLL** types: observed.
- **L6RLRLLR** freq: observed.
- **L6RLRLRL** routing: adapt.
- **L6RLRLRR** prefs: adapt.
- **L6RLRRLL** success: feedback.
- **L6RLRRLR** failure: feedback.
- **L6RLRRRL** weights: adjust.
- **L6RLRRRR** prefs: adjust.
- **L6RRLLLL** rate: limit.
- **L6RRLLLR** cap: limit.
- **L6RRLLRL** tokens: quota.
- **L6RRLLRR** spend: quota.
- **L6RRLRLL** budget: per-profile.
- **L6RRLRLR** cap: budget.
- **L6RRLRRL** block: enforce.
- **L6RRLRRR** 429: enforce.
- **L6RRRLLL** models: allow.
- **L6RRRLLR** providers: allow.
- **L6RRRLRL** models: deny.
- **L6RRRLRR** providers: deny.
- **L6RRRRLL** profiles: group.
- **L6RRRRLR** policy: group.
- **L6RRRRRL** shared: policy.
- **L6RRRRRR** limits: shared.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| App class + session id are available today (sourceApps, session headers) | High |
| Profile store can use existing SQLite layer | High |
| Profile-based routing/limits are design proposals | Medium |
| Task-mix adaptation is a design proposal | Low |

## Open questions

1. Should profiles be keyed by app class, session id, or both?
2. Should profiles auto-create on first seen?
3. Should profile learning adjust routing weights over time?

## Sources

- Prior research: `2026-09-14-keyless-governance-research.md`, `2026-09-15-branch-b1b-agent-profiles.md`
- Industry: LiteLLM user profiles, OpenRouter app attribution, per-user routing