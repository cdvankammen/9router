# Tree T13 — LiteLLM Virtual Keys / Teams / Budgets (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #litellm #virtual-keys #teams #budgets #t13

## Objective

Full 6-level binary tree expansion of the **LiteLLM virtual keys / teams / budgets** topic (from `2026-08-31-message-origin-and-destination-research.md` Part B.3). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: LiteLLM virtual keys / teams / budgets
├─ L1L: Virtual keys
│  ├─ L2LL: Key model
│  │  ├─ L3LLL: virtual key
│  │  │  ├─ L4LLLL: key generation
│  │  │  │  ├─ L5LLLLL: sk- prefix
│  │  │  │  │  ├─ L6LLLLLL: prefix
│  │  │  │  │  └─ L6LLLLLR: random
│  │  │  │  └─ L5LLLLR: key hash
│  │  │  │     ├─ L6LLLLRL: stored hash
│  │  │  │     └─ L6LLLLRR: no plaintext
│  │  │  └─ L4LLLR: key metadata
│  │  │     ├─ L5LLLRL: name
│  │  │     │  ├─ L6LLLRLL: label
│  │  │     │  └─ L6LLLRLR: owner
│  │  │     └─ L5LLLRR: limits
│  │  │        ├─ L6LLLRRL: rate limits
│  │  │        └─ L6LLLRRR: spend limits
│  │  └─ L3LLR: key scoping
│  │     ├─ L4LLRL: model scoping
│  │     │  ├─ L5LLRLL: allowed models
│  │     │  │  ├─ L6LLRLLL: model list
│  │     │  │  └─ L6LLRLLR: enforce
│  │     │  └─ L5LLRLR: model groups
│  │     │     ├─ L6LLRLRL: group access
│  │     │     └─ L6LLRLRR: group limits
│  │     └─ L4LLRR: team scoping
│  │        ├─ L5LLRRL: team keys
│  │        │  ├─ L6LLRRLL: team-bound
│  │        │  └─ L6LLRRLR: team limits
│  │        └─ L5LLRRR: user scoping
│  │           ├─ L6LLRRRL: user-bound
│  │           └─ L6LLRRRR: user limits
│  └─ L2LR: key lifecycle
│     ├─ L3LRL: create
│     │  ├─ L4LRLL: generate
│     │  │  ├─ L5LRLLL: new key
│     │  │  │  ├─ L6LRLLLL: random
│     │  │  │  └─ L6LRLLLR: unique
│     │  │  └─ L5LRLLR: assign
│     │  │     ├─ L6LRLLRL: team
│     │  │     └─ L6LRLLRR: user
│     │  └─ L4LRLR: revoke
│     │     ├─ L5LRLRL: disable
│     │     │  ├─ L6LRLRLL: immediate
│     │     │  └─ L6LRLRLR: block
│     │     └─ L5LRLRR: delete
│     │        ├─ L6LRLRRL: remove
│     │        └─ L6LRLRRR: purge
│     └─ L3LRR: key rotation
│        ├─ L4LRRL: rotate
│        │  ├─ L5LRRLL: new key
│        │  │  ├─ L6LRRLLL: replace
│        │  │  └─ L6LRRLLR: old invalid
│        │  └─ L5LRRLR: schedule
│        │     ├─ L6LRRLRL: periodic
│        │     └─ L6LRRLRR: on-compromise
│        └─ L4LRRR: audit
│           ├─ L5LRRRL: key usage
│           │  ├─ L6LRRRLL: per-key
│           │  └─ L6LRRRLR: log
│           └─ L5LRRRR: key events
│              ├─ L6LRRRRL: create/revoke
│              └─ L6LRRRRR: audit trail
└─ L1R: Teams & budgets
   ├─ L2RL: Teams
   │  ├─ L3RLL: team model
   │  │  ├─ L4RLLL: team members
   │  │  │  ├─ L5RLLLL: members
   │  │  │  │  ├─ L6RLLLLL: users
   │  │  │  │  └─ L6RLLLLR: roles
   │  │  │  └─ L5RLLLR: team keys
   │  │  │     ├─ L6RLLLRL: shared keys
   │  │  │     └─ L6RLLLRR: team-scoped
   │  │  └─ L4RLLR: team limits
   │  │     ├─ L5RLLRL: team budget
   │  │     │  ├─ L6RLLRLL: shared budget
   │  │     │  └─ L6RLLRLR: cap
   │  │     └─ L5RLLRR: team rates
   │  │        ├─ L6RLLRRL: shared rate
   │  │        └─ L6RLLRRR: cap
   │  └─ L3RLR: team hierarchy
   │     ├─ L4RLRL: org → teams
   │     │  ├─ L5RLRLL: org level
   │     │  │  ├─ L6RLRLLL: org budget
   │     │  │  └─ L6RLRLLR: org admin
   │     │  └─ L5RLRLR: team level
   │     │     ├─ L6RLRLRL: team budget
   │     │     └─ L6RLRLRR: team admin
   │     └─ L4RLRR: team isolation
   │        ├─ L5RLRRL: no cross
   │        │  ├─ L6RLRRLL: isolated
   │        │  └─ L6RLRRLR: separate
   │        └─ L5RLRRR: shared pool
   │           ├─ L6RLRRRL: shared
   │           └─ L6RLRRRR: pool
   └─ L2RR: Budgets
      ├─ L3RRL: budget types
      │  ├─ L4RRLL: spend budget
      │  │  ├─ L5RRLLL: $ cap
      │  │  │  ├─ L6RRLLLL: hard cap
      │  │  │  └─ L6RRLLLR: soft cap
      │  │  └─ L5RRLLR: token budget
      │  │     ├─ L6RRLLRL: token cap
      │  │     └─ L6RRLLRR: per-period
      │  └─ L4RRLR: budget scope
      │     ├─ L5RRLRL: per-key
      │     │  ├─ L6RRLRLL: key budget
      │     │  └─ L6RRLRLR: key cap
      │     └─ L5RRLRR: per-team
      │        ├─ L6RRLRRL: team budget
      │        └─ L6RRLRRR: team cap
      └─ L3RRR: enforcement
         ├─ L4RRRL: hard stop
         │  ├─ L5RRRLL: block
         │  │  ├─ L6RRRLLL: 429
         │  │  └─ L6RRRLLR: reject
         │  └─ L5RRRLR: alert
         │     ├─ L6RRRLRL: notify
         │     └─ L6RRRLRR: warn
         └─ L4RRRR: rollover
            ├─ L5RRRRL: reset
            │  ├─ L6RRRRLL: period
            │  └─ L6RRRRLR: reset
            └─ L5RRRRR: carryover
               ├─ L6RRRRRL: unused
               └─ L6RRRRRR: roll
```

## Node research (all 127 nodes)

### L0 — LiteLLM virtual keys / teams / budgets
Virtual keys (sk- prefix, hashed storage, metadata, scoping), teams (members, shared keys, budgets), budgets (spend/token caps, enforcement).

### L1L — Virtual keys
Key model + lifecycle.

### L1R — Teams & budgets
Team model + budget enforcement.

### L2LL — Key model
Generation, metadata, scoping.

### L2LR — key lifecycle
Create/revoke/rotate/audit.

### L2RL — Teams
Members, keys, limits.

### L2RR — Budgets
Types, scope, enforcement.

### L3LLL — virtual key
sk- prefix.

### L3LLR — key scoping
Model/team/user.

### L3LRL — create
Generate.

### L3LRR — key rotation
Rotate.

### L3RLL — team model
Members.

### L3RLR — team hierarchy
Org → teams.

### L3RRL — budget types
Spend/token.

### L3RRR — enforcement
Hard stop.

### L4LLLL — key generation
sk- prefix.

### L4LLLR — key metadata
Name/limits.

### L4LLRL — model scoping
Allowed models.

### L4LLRR — team scoping
Team keys.

### L4LRLL — generate
New key.

### L4LRLR — revoke
Disable.

### L4LRRL — rotate
Replace.

### L4LRRR — audit
Usage.

### L4RLLL — team members
Users.

### L4RLLR — team limits
Budget.

### L4RLRL — org → teams
Hierarchy.

### L4RLRR — team isolation
No cross.

### L4RRLL — spend budget
$ cap.

### L4RRLR — budget scope
Per-key/team.

### L4RRRL — hard stop
Block.

### L4RRRR — rollover
Reset.

### L5LLLLL — sk- prefix
Prefix.

### L5LLLLR — key hash
Stored hash.

### L5LLLRL — name
Label.

### L5LLLRR — limits
Rate/spend.

### L5LLRLL — allowed models
List.

### L5LLRLR — model groups
Group access.

### L5LLRRL — team keys
Team-bound.

### L5LLRRR — user scoping
User-bound.

### L5LRLLL — new key
Random.

### L5LRLLR — assign
Team/user.

### L5LRLRL — disable
Immediate.

### L5LRLRR — delete
Remove.

### L5LRRLL — new key
Replace.

### L5LRRLR — schedule
Periodic.

### L5LRRRL — key usage
Per-key.

### L5LRRRR — key events
Audit.

### L5RLLLL — members
Users.

### L5RLLLR — team keys
Shared.

### L5RLLRL — team budget
Shared.

### L5RLLRR — team rates
Shared.

### L5RLRLL — org level
Org budget.

### L5RLRLR — team level
Team budget.

### L5RLRRL — no cross
Isolated.

### L5RLRRR — shared pool
Shared.

### L5RRLLL — $ cap
Hard/soft.

### L5RRLLR — token budget
Token cap.

### L5RRLRL — per-key
Key budget.

### L5RRLRR — per-team
Team budget.

### L5RRRLL — block
429.

### L5RRRLR — alert
Notify.

### L5RRRRL — reset
Period.

### L5RRRRR — carryover
Unused.

### L6 leaves (64)
- **L6LLLLLL** prefix: sk-.
- **L6LLLLLR** random: generated.
- **L6LLLLRL** stored hash: sha256.
- **L6LLLLRR** no plaintext: never.
- **L6LLLRLL** label: name.
- **L6LLLRLR** owner: user.
- **L6LLLRRL** rate limits: caps.
- **L6LLLRRR** spend limits: caps.
- **L6LLRLLL** model list: allowed.
- **L6LLRLLR** enforce: block.
- **L6LLRLRL** group access: groups.
- **L6LLRLRR** group limits: caps.
- **L6LLRRLL** team-bound: key.
- **L6LLRRLR** team limits: caps.
- **L6LLRRRL** user-bound: key.
- **L6LLRRRR** user limits: caps.
- **L6LRLLLL** random: unique.
- **L6LRLLLR** unique: no dup.
- **L6LRLLRL** team: assign.
- **L6LRLLRR** user: assign.
- **L6LRLRLL** immediate: revoke.
- **L6LRLRLR** block: stop.
- **L6LRLRRL** remove: delete.
- **L6LRLRRR** purge: remove.
- **L6LRRLLL** replace: new.
- **L6LRRLLR** old invalid: revoke.
- **L6LRRLRL** periodic: schedule.
- **L6LRRLRR** on-compromise: immediate.
- **L6LRRRLL** per-key: usage.
- **L6LRRRLR** log: record.
- **L6LRRRRL** create/revoke: events.
- **L6LRRRRR** audit trail: log.
- **L6RLLLLL** users: members.
- **L6RLLLLR** roles: perms.
- **L6RLLLRL** shared keys: team.
- **L6RLLLRR** team-scoped: keys.
- **L6RLLRLL** shared budget: team.
- **L6RLLRLR** cap: limit.
- **L6RLLRRL** shared rate: team.
- **L6RLLRRR** cap: limit.
- **L6RLRLLL** org budget: org.
- **L6RLRLLR** org admin: org.
- **L6RLRLRL** team budget: team.
- **L6RLRLRR** team admin: team.
- **L6RLRRLL** isolated: no cross.
- **L6RLRRLR** separate: budgets.
- **L6RLRRRL** shared: pool.
- **L6RLRRRR** pool: shared.
- **L6RRLLLL** hard cap: stop.
- **L6RRLLLR** soft cap: warn.
- **L6RRLLRL** token cap: tokens.
- **L6RRLLRR** per-period: window.
- **L6RRLRLL** key budget: per-key.
- **L6RRLRLR** key cap: limit.
- **L6RRLRRL** team budget: per-team.
- **L6RRLRRR** team cap: limit.
- **L6RRRLLL** 429: reject.
- **L6RRRLLR** reject: block.
- **L6RRRLRL** notify: alert.
- **L6RRRLRR** warn: warn.
- **L6RRRRLL** period: window.
- **L6RRRRLR** reset: renew.
- **L6RRRRRL** unused: rollover.
- **L6RRRRRR** roll: carry.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| LiteLLM virtual keys: sk- prefix, hashed, metadata, scoping | High |
| Teams: members, shared keys, budgets | High |
| Budgets: spend/token caps, per-key/team, hard stop | High |
| 9router has multi-account pools but no virtual-key layer | Medium |

## Open questions

1. Should 9router add a virtual-key layer (sk- keys mapped to upstream pools)?
2. Should teams map to source-app classes (keyless teams)?
3. Should budgets be per-key, per-app, or both?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b5a-litellm-keys-teams-budgets.md`
- Industry: LiteLLM virtual keys docs, LiteLLM teams/budgets docs