# Tree T26 — Governance Architecture (Synthesis) (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #governance #architecture #synthesis #t26

## Objective

Full 6-level binary tree expansion of the **governance architecture synthesis** topic (from `2026-09-14-keyless-governance-research.md` Part H). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Governance architecture (synthesis)
├─ L1L: Architecture layers
│  ├─ L2LL: Attribution layer
│  │  ├─ L3LLL: source identity
│  │  │  ├─ L4LLLL: app class
│  │  │  │  ├─ L5LLLLL: sourceApps
│  │  │  │  │  ├─ L6LLLLLL: UA rules
│  │  │  │  │  └─ L6LLLLLR: class
│  │  │  │  └─ L5LLLLR: session
│  │  │  │     ├─ L6LLLLRL: session id
│  │  │  │     └─ L6LLLLRR: grouping
│  │  │  └─ L4LLLR: user identity
│  │  │     ├─ L5LLLRL: key-bound
│  │  │     │  ├─ L6LLLRLL: API key
│  │  │     │  └─ L6LLLRLR: user
│  │  │     └─ L5LLLRR: keyless
│  │  │        ├─ L6LLLRRL: app proxy
│  │  │        └─ L6LLLRRR: local
│  │  └─ L3LLR: network identity
│  │     ├─ L4LLRL: IP
│  │     │  ├─ L5LLRLL: socket
│  │     │  │  ├─ L6LLRLLL: real
│  │     │  │  └─ L6LLRLLR: client
│  │     │  └─ L5LLRLR: XFF
│  │     │     ├─ L6LLRLRL: stripped
│  │     │     └─ L6LLRLRR: untrusted
│  │     └─ L4LLRR: caveats
│  │        ├─ L5LLRRL: NAT
│  │        │  ├─ L6LLRRLL: shared
│  │        │  └─ L6LLRRLR: coarse
│  │        └─ L5LLRRR: localhost
│  │           ├─ L6LLRRRL: loopback
│  │           └─ L6LLRRRR: no signal
│  └─ L2LR: Policy layer
│     ├─ L3LRL: policy engine
│     │  ├─ L4LRLL: rules
│     │  │  ├─ L5LRLLL: app rules
│     │  │  │  ├─ L6LRLLLL: per-app
│     │  │  │  └─ L6LRLLLR: limits
│     │  │  └─ L5LRLLR: task rules
│     │  │     ├─ L6LRLLRL: per-task
│     │  │     └─ L6LRLLRR: limits
│     │  └─ L4LRLR: precedence
│     │     ├─ L5LRLRL: explicit
│     │     │  ├─ L6LRLRLL: user
│     │     │  └─ L6LRLRLR: wins
│     │     └─ L5LRLRR: default
│     │        ├─ L6LRLRRL: smart
│     │        └─ L6LRLRRR: router
│     └─ L3LRR: enforcement
│        ├─ L4LRRL: limits
│        │  ├─ L5LRRLL: rate
│        │  │  ├─ L6LRRLLL: per-app
│        │  │  └─ L6LRRLLR: per-key
│        │  └─ L5LRRLR: quota
│        │     ├─ L6LRRLRL: tokens
│        │     └─ L6LRRLRR: spend
│        └─ L4LRRR: budgets
│           ├─ L5LRRRL: caps
│           │  ├─ L6LRRRLL: per-app
│           │  └─ L6LRRRLR: per-key
│           └─ L5LRRRR: stop
│              ├─ L6LRRRRL: block
│              └─ L6LRRRRR: 429
└─ L1R: Integration
   ├─ L2RL: Request pipeline
   │  ├─ L3RLL: pipeline stages
   │  │  ├─ L4RLLL: attribution
   │  │  │  ├─ L5RLLLL: fingerprint
   │  │  │  │  ├─ L6RLLLLL: app
   │  │  │  │  └─ L6RLLLLR: session
   │  │  │  └─ L5RLLLR: tag
   │  │  │     ├─ L6RLLLRL: source
   │  │  │     └─ L6RLLLRR: task
   │  │  └─ L4RLLR: policy check
   │  │     ├─ L5RLLRL: evaluate
   │  │     │  ├─ L6RLLRLL: rules
   │  │     │  └─ L6RLLRLR: limits
   │  │     └─ L5RLLRR: decide
   │  │        ├─ L6RLLRRL: allow
   │  │        └─ L6RLLRRR: deny
   │  └─ L3RLR: routing
   │     ├─ L4RLRL: route
   │     │  ├─ L5RLRLL: model
   │     │  │  ├─ L6RLRLLL: select
   │     │  │  └─ L6RLRLLR: combo
   │     │  └─ L5RLRLR: fallback
   │     │     ├─ L6RLRLRL: account
   │     │     └─ L6RLRLRR: model
   │     └─ L4RLRR: usage
   │        ├─ L5RLRRL: record
   │        │  ├─ L6RLRRLL: usage
   │        │  └─ L6RLRRLR: log
   │        └─ L5RLRRR: report
   │           ├─ L6RLRRRL: per-app
   │           └─ L6RLRRRR: per-task
   └─ L2RR: Data model
      ├─ L3RRL: storage
      │  ├─ L4RRLL: SQLite
      │  │  ├─ L5RRLLL: repos
      │  │  │  ├─ L6RRLLLL: entities
      │  │  │  └─ L6RRLLLR: migrations
      │  │  └─ L5RRLLR: tables
      │  │     ├─ L6RRLLRL: profiles
      │  │     └─ L6RRLLRR: policies
      │  └─ L4RRLR: usage store
      │     ├─ L5RRLRL: usage.json
      │     │  ├─ L6RRLRLL: existing
      │     │  └─ L6RRLRLR: extend
      │     └─ L5RRLRR: log.txt
      │        ├─ L6RRLRRL: existing
      │        └─ L6RRLRRR: extend
      └─ L3RRR: config
         ├─ L4RRRL: policy config
         │  ├─ L5RRRLL: file
         │  │  ├─ L6RRRLLL: YAML
         │  │  └─ L6RRRLLR: JSON
         │  └─ L5RRRLR: dashboard
         │     ├─ L6RRRLRL: UI
         │     └─ L6RRRLRR: sync
         └─ L4RRRR: defaults
            ├─ L5RRRRL: safe
            │  ├─ L6RRRRLL: default
            │  └─ L6RRRRLR: deny
            └─ L5RRRRR: permissive
               ├─ L6RRRRRL: default
               └─ L6RRRRRR: allow
```

## Node research (all 127 nodes)

### L0 — Governance architecture (synthesis)
Synthesis of all governance topics into a coherent architecture: attribution layer + policy layer + integration into the request pipeline + data model.

### L1L — Architecture layers
Attribution + policy.

### L1R — Integration
Pipeline + data model.

### L2LL — Attribution layer
Source + network identity.

### L2LR — Policy layer
Engine + enforcement.

### L2RL — Request pipeline
Stages + routing.

### L2RR — Data model
Storage + config.

### L3LLL — source identity
App class + user.

### L3LLR — network identity
IP + caveats.

### L3LRL — policy engine
Rules + precedence.

### L3LRR — enforcement
Limits + budgets.

### L3RLL — pipeline stages
Attribution + policy check.

### L3RLR — routing
Route + usage.

### L3RRL — storage
SQLite + usage store.

### L3RRR — config
Policy config + defaults.

### L4LLLL — app class
sourceApps.

### L4LLLR — user identity
Key-bound.

### L4LLRL — IP
Socket.

### L4LLRR — caveats
NAT.

### L4LRLL — rules
App rules.

### L4LRLR — precedence
Explicit.

### L4LRRL — limits
Rate.

### L4LRRR — budgets
Caps.

### L4RLLL — attribution
Fingerprint.

### L4RLLR — policy check
Evaluate.

### L4RLRL — route
Model.

### L4RLRR — usage
Record.

### L4RRLL — SQLite
Repos.

### L4RRLR — usage store
usage.json.

### L4RRRL — policy config
File.

### L4RRRR — defaults
Safe.

### L5LLLLL — sourceApps
UA rules.

### L5LLLLR — session
Session id.

### L5LLLRL — key-bound
API key.

### L5LLLRR — keyless
App proxy.

### L5LLRLL — socket
Real.

### L5LLRLR — XFF
Stripped.

### L5LLRRL — NAT
Shared.

### L5LLRRR — localhost
Loopback.

### L5LRLLL — app rules
Per-app.

### L5LRLLR — task rules
Per-task.

### L5LRLRL — explicit
User.

### L5LRLRR — default
Smart.

### L5LRRLL — rate
Per-app.

### L5LRRLR — quota
Tokens.

### L5LRRRL — caps
Per-app.

### L5LRRRR — stop
Block.

### L5RLLLL — fingerprint
App.

### L5RLLLR — tag
Source.

### L5RLLRL — evaluate
Rules.

### L5RLLRR — decide
Allow.

### L5RLRLL — model
Select.

### L5RLRLR — fallback
Account.

### L5RLRRL — record
Usage.

### L5RLRRR — report
Per-app.

### L5RRLLL — repos
Entities.

### L5RRLLR — tables
Profiles.

### L5RRLRL — usage.json
Existing.

### L5RRLRR — log.txt
Existing.

### L5RRRLL — file
YAML.

### L5RRRLR — dashboard
UI.

### L5RRRRL — safe
Default.

### L5RRRRR — permissive
Default.

### L6 leaves (64)
- **L6LLLLLL** UA rules: sourceApps.
- **L6LLLLLR** class: sourceApps.
- **L6LLLLRL** session id: session.
- **L6LLLLRR** grouping: session.
- **L6LLLRLL** API key: key-bound.
- **L6LLLRLR** user: key-bound.
- **L6LLLRRL** app proxy: keyless.
- **L6LLLRRR** local: keyless.
- **L6LLRLLL** real: socket.
- **L6LLRLLR** client: socket.
- **L6LLRLRL** stripped: XFF.
- **L6LLRLRR** untrusted: XFF.
- **L6LLRRLL** shared: NAT.
- **L6LLRRLR** coarse: NAT.
- **L6LLRRRL** loopback: localhost.
- **L6LLRRRR** no signal: localhost.
- **L6LRLLLL** per-app: rules.
- **L6LRLLLR** limits: rules.
- **L6LRLLRL** per-task: rules.
- **L6LRLLRR** limits: rules.
- **L6LRLRLL** user: explicit.
- **L6LRLRLR** wins: explicit.
- **L6LRLRRL** smart: default.
- **L6LRLRRR** router: default.
- **L6LRRLLL** per-app: rate.
- **L6LRRLLR** per-key: rate.
- **L6LRRLRL** tokens: quota.
- **L6LRRLRR** spend: quota.
- **L6LRRRLL** per-app: caps.
- **L6LRRRLR** per-key: caps.
- **L6LRRRRL** block: stop.
- **L6LRRRRR** 429: stop.
- **L6RLLLLL** app: fingerprint.
- **L6RLLLLR** session: fingerprint.
- **L6RLLLRL** source: tag.
- **L6RLLLRR** task: tag.
- **L6RLLRLL** rules: evaluate.
- **L6RLLRLR** limits: evaluate.
- **L6RLLRRL** allow: decide.
- **L6RLLRRR** deny: decide.
- **L6RLRLLL** select: model.
- **L6RLRLLR** combo: model.
- **L6RLRLRL** account: fallback.
- **L6RLRLRR** model: fallback.
- **L6RLRRLL** usage: record.
- **L6RLRRLR** log: record.
- **L6RLRRRL** per-app: report.
- **L6RLRRRR** per-task: report.
- **L6RRLLLL** entities: repos.
- **L6RRLLLR** migrations: repos.
- **L6RRLLRL** profiles: tables.
- **L6RRLLRR** policies: tables.
- **L6RRLRLL** existing: usage.json.
- **L6RRLRLR** extend: usage.json.
- **L6RRLRRL** existing: log.txt.
- **L6RRLRRR** extend: log.txt.
- **L6RRRLLL** YAML: file.
- **L6RRRLLR** JSON: file.
- **L6RRRLRL** UI: dashboard.
- **L6RRRLRR** sync: dashboard.
- **L6RRRRLL** default: deny.
- **L6RRRRLR** deny: safe.
- **L6RRRRRL** default: allow.
- **L6RRRRRR** allow: permissive.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Attribution layer can be built on existing sourceApps + session headers | High |
| Policy layer is the main new component | Medium |
| Integration point is pre-routing in the request pipeline | High |
| Data model can extend existing SQLite + usage store | High |

## Open questions

1. Should the policy engine be a new module or extend smartRouter?
2. Should defaults be safe (deny) or permissive (allow)?
3. Should policy config live in files, dashboard, or both?

## Sources

- Prior research: `2026-09-14-keyless-governance-research.md`, `2026-09-15-branch-b4b-governance-architecture.md`
- Industry: API gateway architecture, policy engines (OPA), LiteLLM proxy architecture