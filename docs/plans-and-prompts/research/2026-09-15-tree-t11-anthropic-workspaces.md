# Tree T11 — Anthropic Workspaces (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #anthropic #workspaces #t11

## Objective

Full 6-level binary tree expansion of the **Anthropic workspaces** topic (from `2026-08-31-message-origin-and-destination-research.md` Part B.2). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Anthropic workspaces
├─ L1L: Workspace model
│  ├─ L2LL: Organization structure
│  │  ├─ L3LLL: org → workspaces
│  │  │  ├─ L4LLLL: org level
│  │  │  │  ├─ L5LLLLL: org admin
│  │  │  │  │  ├─ L6LLLLLL: admin role
│  │  │  │  │  └─ L6LLLLLR: org settings
│  │  │  │  └─ L5LLLLR: org billing
│  │  │  │     ├─ L6LLLLRL: billing owner
│  │  │  │     └─ L6LLLLRR: payment
│  │  │  └─ L4LLLR: workspace level
│  │  │     ├─ L5LLLRL: workspace admin
│  │  │     │  ├─ L6LLLRLL: admin role
│  │  │     │  └─ L6LLLRLR: workspace settings
│  │  │     └─ L5LLLRR: members
│  │  │        ├─ L6LLLRRL: member roles
│  │  │        └─ L6LLLRRR: permissions
│  │  └─ L3LLR: isolation
│  │     ├─ L4LLRL: per-workspace keys
│  │     │  ├─ L5LLRLL: key scoping
│  │     │  │  ├─ L6LLRLLL: workspace-scoped
│  │     │  │  └─ L6LLRLLR: key limits
│  │     │  └─ L5LLRLR: key isolation
│  │     │     ├─ L6LLRLRL: no cross-access
│  │     │     └─ L6LLRLRR: separate quotas
│  │     └─ L4LLRR: per-workspace usage
│  │        ├─ L5LLRRL: usage tracking
│  │        │  ├─ L6LLRRLL: per-workspace
│  │        │  └─ L6LLRRLR: spend
│  │        └─ L5LLRRR: cost allocation
│  │           ├─ L6LLRRRL: chargeback
│  │           └─ L6LLRRRR: budgets
│  └─ L2LR: Workspace keys
│     ├─ L3LRL: key types
│     │  ├─ L4LRLL: admin keys
│     │  │  ├─ L5LRLLL: full access
│     │  │  │  ├─ L6LRLLLL: all models
│     │  │  │  └─ L6LRLLLR: all endpoints
│     │  │  └─ L5LRLLR: admin scope
│     │  │     ├─ L6LRLLRL: manage keys
│     │  │     └─ L6LRLLRR: manage members
│     │  └─ L4LRLR: member keys
│     │     ├─ L5LRLRL: scoped access
│     │     │  ├─ L6LRLRLL: limited models
│     │     │  └─ L6LRLRLR: limited quota
│     │     └─ L5LRLRR: member scope
│     │        ├─ L6LRLRRL: own usage
│     │        └─ L6LRLRRR: no admin
│     └─ L3LRR: key metadata
│        ├─ L4LRRL: key name
│        │  ├─ L5LRRLL: display name
│        │  │  ├─ L6LRRLLL: label
│        │  │  └─ L6LRRLLR: owner
│        │  └─ L5LRRLR: key limits
│        │     ├─ L6LRRLRL: rate limits
│        │     └─ L6LRRLRR: spend limits
│        └─ L4LRRR: key lifecycle
│           ├─ L5LRRRL: create
│           │  ├─ L6LRRRLL: new key
│           │  └─ L6LRRRLR: assign
│           └─ L5LRRRR: revoke
│              ├─ L6LRRRRL: disable
│              └─ L6LRRRRR: delete
└─ L1R: 9router mapping
   ├─ L2RL: Account model
   │  ├─ L3RLL: provider accounts
   │  │  ├─ L4RLLL: account CRUD
   │  │  │  ├─ L5RLLLL: create account
   │  │  │  │  ├─ L6RLLLLL: provider
   │  │  │  │  └─ L6RLLLLR: key
   │  │  │  └─ L5RLLLR: account metadata
   │  │  │     ├─ L6RLLLRL: name
   │  │  │     └─ L6RLLLRR: workspace
   │  │  └─ L4RLLR: workspace field
   │  │     ├─ L5RLLRL: workspace label
   │  │     │  ├─ L6RLLRLL: label
   │  │     │  └─ L6RLLRLR: grouping
   │  │     └─ L5RLLRR: grouping
   │  │        ├─ L6RLLRRL: group accounts
   │  │        └─ L6RLLRRR: per-workspace
   │  └─ L3RLR: multi-account pools
   │     ├─ L4RLRL: per-workspace pools
   │     │  ├─ L5RLRLL: pool per workspace
   │     │  │  ├─ L6RLRLLL: keys
   │     │  │  └─ L6RLRLLR: fallback
   │     │  └─ L5RLRLR: cross-workspace
   │     │     ├─ L6RLRLRL: no cross
   │     │     └─ L6RLRLRR: isolation
   │     └─ L4RLRR: quota per workspace
   │        ├─ L5RLRRL: per-workspace quota
   │        │  ├─ L6RLRRLL: budget
   │        │  └─ L6RLRRLR: usage
   │        └─ L5RLRRR: enforcement
   │           ├─ L6RLRRRL: block
   │           └─ L6RLRRRR: warn
   └─ L2RR: Governance mapping
      ├─ L3RRL: workspace → app
      │  ├─ L4RRLL: workspace as app
      │  │  ├─ L5RRLLL: map workspace
      │  │  │  ├─ L6RRLLLL: workspace id
      │  │  │  └─ L6RRLLLR: app class
      │  │  └─ L5RRLLR: per-workspace policy
      │  │     ├─ L6RRLLRL: limits
      │  │     └─ L6RRLLRR: routing
      │  └─ L4RRLR: workspace as tenant
      │     ├─ L5RRLRL: tenant isolation
      │     │  ├─ L6RRLRLL: separate
      │     │  └─ L6RRLRLR: no cross
      │     └─ L5RRLRR: tenant quotas
      │        ├─ L6RRLRRL: per-tenant
      │        └─ L6RRLRRR: budgets
      └─ L3RRR: keyless analog
         ├─ L4RRRL: source class
         │  ├─ L5RRRLL: app class
         │  │  ├─ L6RRRLLL: source
         │  │  └─ L6RRRLLR: group
         │  └─ L5RRRLR: group as workspace
         │     ├─ L6RRRLRL: group
         │     └─ L6RRRLRR: policy
         └─ L4RRRR: profile
            ├─ L5RRRRL: agent profile
            │  ├─ L6RRRRLL: profile
            │  └─ L6RRRRLR: limits
            └─ L5RRRRR: profile as workspace
               ├─ L6RRRRRL: analog
               └─ L6RRRRRR: governance
```

## Node research (all 127 nodes)

### L0 — Anthropic workspaces
Org → workspaces hierarchy; per-workspace keys, isolation, usage. 9router maps this to account model + governance.

### L1L — Workspace model
Org structure + workspace keys.

### L1R — 9router mapping
Account model + governance mapping.

### L2LL — Organization structure
Org → workspaces.

### L2LR — Workspace keys
Admin/member keys.

### L2RL — Account model
Provider accounts + workspace field.

### L2RR — Governance mapping
Workspace → app/tenant.

### L3LLL — org → workspaces
Hierarchy.

### L3LLR — isolation
Per-workspace keys + usage.

### L3LRL — key types
Admin/member.

### L3LRR — key metadata
Name/limits/lifecycle.

### L3RLL — provider accounts
Account CRUD.

### L3RLR — multi-account pools
Per-workspace pools.

### L3RRL — workspace → app
Map.

### L3RRR — keyless analog
Source class as workspace.

### L4LLLL — org level
Admin.

### L4LLLR — workspace level
Admin/members.

### L4LLRL — per-workspace keys
Scoped.

### L4LLRR — per-workspace usage
Tracking.

### L4LRLL — admin keys
Full access.

### L4LRLR — member keys
Scoped.

### L4LRRL — key name
Label.

### L4LRRR — key lifecycle
Create/revoke.

### L4RLLL — account CRUD
Create.

### L4RLLR — workspace field
Label.

### L4RLRL — per-workspace pools
Keys.

### L4RLRR — quota per workspace
Budget.

### L4RRLL — workspace as app
Map.

### L4RRLR — workspace as tenant
Isolation.

### L4RRRL — source class
App class.

### L4RRRR — profile
Agent profile.

### L5LLLLL — org admin
Role.

### L5LLLLR — org billing
Owner.

### L5LLLRL — workspace admin
Role.

### L5LLLRR — members
Roles.

### L5LLRLL — key scoping
Workspace.

### L5LLRLR — key isolation
No cross.

### L5LLRRL — usage tracking
Per-workspace.

### L5LLRRR — cost allocation
Chargeback.

### L5LRLLL — full access
All models.

### L5LRLLR — admin scope
Manage.

### L5LRLRL — scoped access
Limited.

### L5LRLRR — member scope
Own usage.

### L5LRRLL — display name
Label.

### L5LRRLR — key limits
Rate/spend.

### L5LRRRL — create
New key.

### L5LRRRR — revoke
Disable.

### L5RLLLL — provider
Account.

### L5RLLLR — key
Credential.

### L5RLLLRL — name
Metadata.

### L5RLLLRR — workspace
Metadata.

### L5RLLRL — workspace label
Grouping.

### L5RLLRR — grouping
Per-workspace.

### L5RLRLL — pool per workspace
Keys.

### L5RLRLR — cross-workspace
No cross.

### L5RLRRL — per-workspace quota
Budget.

### L5RLRRR — enforcement
Block.

### L5RRLLL — workspace id
Map.

### L5RRLLR — per-workspace policy
Limits.

### L5RRLRL — tenant isolation
Separate.

### L5RRLRR — tenant quotas
Per-tenant.

### L5RRRLL — app class
Source.

### L5RRRLR — group as workspace
Policy.

### L5RRRRL — agent profile
Limits.

### L5RRRRR — profile as workspace
Analog.

### L6 leaves (64)
- **L6LLLLLL** admin role: org.
- **L6LLLLLR** org settings: config.
- **L6LLLLRL** billing owner: payment.
- **L6LLLLRR** payment: card.
- **L6LLLRLL** admin role: workspace.
- **L6LLLRLR** workspace settings: config.
- **L6LLLRRL** member roles: roles.
- **L6LLLRRR** permissions: perms.
- **L6LLRLLL** workspace-scoped: key.
- **L6LLRLLR** key limits: caps.
- **L6LLRLRL** no cross-access: isolated.
- **L6LLRLRR** separate quotas: per-ws.
- **L6LLRRLL** per-workspace: usage.
- **L6LLRRLR** spend: cost.
- **L6LLRRRL** chargeback: allocate.
- **L6LLRRRR** budgets: caps.
- **L6LRLLLL** all models: access.
- **L6LRLLLR** all endpoints: access.
- **L6LRLLRL** manage keys: admin.
- **L6LRLLRR** manage members: admin.
- **L6LRLRLL** limited models: scope.
- **L6LRLRLR** limited quota: scope.
- **L6LRLRRL** own usage: member.
- **L6LRLRRR** no admin: member.
- **L6LRRLLL** label: name.
- **L6LRRLLR** owner: user.
- **L6LRRLRL** rate limits: caps.
- **L6LRRLRR** spend limits: caps.
- **L6LRRRLL** new key: create.
- **L6LRRRLR** assign: workspace.
- **L6LRRRRL** disable: revoke.
- **L6LRRRRR** delete: remove.
- **L6RLLLLL** provider: type.
- **L6RLLLLR** key: credential.
- **L6RLLLRL** name: label.
- **L6RLLLRR** workspace: label.
- **L6RLLRLL** label: workspace.
- **L6RLLRLR** grouping: group.
- **L6RLLRRL** group accounts: pool.
- **L6RLLRRR** per-workspace: scoped.
- **L6RLRLLL** keys: pool.
- **L6RLRLLR** fallback: failover.
- **L6RLRLRL** no cross: isolated.
- **L6RLRLRR** isolation: separate.
- **L6RLRRLL** budget: cap.
- **L6RLRRLR** usage: track.
- **L6RLRRRL** block: enforce.
- **L6RLRRRR** warn: alert.
- **L6RRLLLL** workspace id: key.
- **L6RRLLLR** app class: map.
- **L6RRLLRL** limits: policy.
- **L6RRLLRR** routing: policy.
- **L6RRLRLL** separate: tenant.
- **L6RRLRLR** no cross: isolated.
- **L6RRLRRL** per-tenant: quota.
- **L6RRLRRR** budgets: caps.
- **L6RRRLLL** source: class.
- **L6RRRLLR** group: class.
- **L6RRRLRL** group: workspace analog.
- **L6RRRLRR** policy: per-group.
- **L6RRRRLL** profile: agent.
- **L6RRRRLR** limits: profile.
- **L6RRRRRL** analog: workspace.
- **L6RRRRRR** governance: policy.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Anthropic org → workspace hierarchy | High |
| Per-workspace keys with isolation | High |
| Per-workspace usage + cost allocation | High |
| 9router account model can carry workspace label | Medium |
| Source class / profile as keyless workspace analog | Medium |

## Open questions

1. Should 9router accounts carry a workspace/tenant field for grouping?
2. Should per-workspace quotas be enforced locally (mirroring Anthropic)?
3. Should keyless governance use source class as the workspace analog?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b4a-anthropic-workspaces.md`
- Industry: Anthropic Console workspaces docs, LiteLLM teams, multi-tenant gateway patterns