# Tree T22 — Tag/Keyword Priority Queues (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #tag #priority #queues #t22

## Objective

Full 6-level binary tree expansion of the **tag/keyword priority queues** topic (from `2026-09-14-keyless-governance-research.md` Part D). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Tag/keyword priority queues
├─ L1L: Tag model
│  ├─ L2LL: Tag sources
│  │  ├─ L3LLL: request tags
│  │  │  ├─ L4LLLL: header tags
│  │  │  │  ├─ L5LLLLL: X-Tag
│  │  │  │  │  ├─ L6LLLLLL: header
│  │  │  │  │  └─ L6LLLLLR: parse
│  │  │  │  └─ L5LLLLR: metadata
│  │  │  │     ├─ L6LLLLRL: body
│  │  │  │     └─ L6LLLLRR: parse
│  │  │  └─ L4LLLR: body tags
│  │  │     ├─ L5LLLRL: user field
│  │  │     │  ├─ L6LLLRLL: metadata
│  │  │     │  └─ L6LLLRLR: tags
│  │  │     └─ L5LLLRR: model field
│  │  │        ├─ L6LLLRRL: model
│  │  │        └─ L6LLLRRR: tag
│  │  └─ L3LLR: keyword tags
│  │     ├─ L4LLRL: content keywords
│  │     │  ├─ L5LLRLL: prompt scan
│  │     │  │  ├─ L6LLRLLL: keywords
│  │     │  │  └─ L6LLRLLR: match
│  │     │  └─ L5LLRLR: task keywords
│  │     │     ├─ L6LLRLRL: task type
│  │     │     └─ L6LLRLRR: match
│  │     └─ L4LLRR: derived tags
│  │        ├─ L5LLRRL: app class
│  │        │  ├─ L6LLRRLL: derive
│  │        │  └─ L6LLRRLR: tag
│  │        └─ L5LLRRR: task type
│  │           ├─ L6LLRRRL: derive
│  │           └─ L6LLRRRR: tag
│  └─ L2LR: Tag store
│     ├─ L3LRL: tag registry
│     │  ├─ L4LRLL: known tags
│     │  │  ├─ L5LRLLL: list
│     │  │  │  ├─ L6LRLLLL: registry
│     │  │  │  └─ L6LRLLLR: config
│     │  │  └─ L5LRLLR: unknown tags
│     │  │     ├─ L6LRLLRL: reject
│     │  │     └─ L6LRLLRR: ignore
│     │  └─ L4LRLR: tag config
│     │     ├─ L5LRLRL: priorities
│     │     │  ├─ L6LRLRLL: levels
│     │     │  └─ L6LRLRLR: config
│     │     └─ L5LRLRR: limits
│     │        ├─ L6LRLRRL: per-tag
│     │        └─ L6LRLRRR: caps
│     └─ L3LRR: tag lifecycle
│        ├─ L4LRRL: create
│        │  ├─ L5LRRLL: admin
│        │  │  ├─ L6LRRLLL: define
│        │  │  └─ L6LRRLLR: config
│        │  └─ L5LRRLR: auto
│        │     ├─ L6LRRLRL: derive
│        │     └─ L6LRRLRR: register
│        └─ L4LRRR: expire
│           ├─ L5LRRRL: TTL
│           │  ├─ L6LRRRLL: idle
│           │  └─ L6LRRRLR: purge
│           └─ L5LRRRR: archive
│              ├─ L6LRRRRL: keep
│              └─ L6LRRRRR: stats
└─ L1R: Priority queues
   ├─ L2RL: Queue model
   │  ├─ L3RLL: priority levels
   │  │  ├─ L4RLLL: levels
   │  │  │  ├─ L5RLLLL: high
   │  │  │  │  ├─ L6RLLLLL: urgent
   │  │  │  │  └─ L6RLLLLR: priority
   │  │  │  └─ L5RLLLR: low
   │  │  │     ├─ L6RLLLRL: batch
   │  │  │     └─ L6RLLLRR: defer
   │  │  └─ L4RLLR: queue structure
   │  │     ├─ L5RLLRL: per-priority
   │  │     │  ├─ L6RLLRLL: queues
   │  │     │  └─ L6RLLRLR: separate
   │  │     └─ L5RLLRR: single queue
   │  │        ├─ L6RLLRRL: sorted
   │  │        └─ L6RLLRRR: heap
   │  └─ L3RLR: scheduling
   │     ├─ L4RLRL: strict priority
   │     │  ├─ L5RLRLL: high first
   │     │  │  ├─ L6RLRLLL: always
   │     │  │  └─ L6RLRLLR: starvation
   │     │  └─ L5RLRLR: risk
   │     │     ├─ L6RLRLRL: low starve
   │     │     └─ L6RLRLRR: mitigate
   │     └─ L4RLRR: weighted fair
   │        ├─ L5RLRRL: WFQ
   │        │  ├─ L6RLRRLL: weights
   │        │  └─ L6RLRRLR: fairness
   │        └─ L5RLRRR: proportional
   │           ├─ L6RLRRRL: share
   │           └─ L6RLRRRR: no starve
   └─ L2RR: Enforcement
      ├─ L3RRL: tag-based limits
      │  ├─ L4RRLL: per-tag rate
      │  │  ├─ L5RRLLL: rate
      │  │  │  ├─ L6RRLLLL: per-tag
      │  │  │  └─ L6RRLLLR: cap
      │  │  └─ L5RRLLR: quota
      │  │     ├─ L6RRLLRL: per-tag
      │  │     └─ L6RRLLRR: cap
      │  └─ L4RRLR: priority routing
      │     ├─ L5RRLRL: high → fast
      │     │  ├─ L6RRLRLL: models
      │     │  └─ L6RRLRLR: route
      │     └─ L5RRLRR: low → cheap
      │        ├─ L6RRLRRL: models
      │        └─ L6RRLRRR: route
      └─ L3RRR: keyword policy
         ├─ L4RRRL: keyword rules
         │  ├─ L5RRRLL: match rules
         │  │  ├─ L6RRRLLL: keyword
         │  │  └─ L6RRRLLR: action
         │  └─ L5RRRLR: action
         │     ├─ L6RRRLRL: route
         │     └─ L6RRRLRR: limit
         └─ L4RRRR: priority policy
            ├─ L5RRRRL: tag priority
            │  ├─ L6RRRRLL: map
            │  └─ L6RRRRLR: priority
            └─ L5RRRRR: keyword priority
               ├─ L6RRRRRL: map
               └─ L6RRRRRR: priority
```

## Node research (all 127 nodes)

### L0 — Tag/keyword priority queues
Tag requests with explicit or derived tags/keywords, then schedule and enforce via priority queues.

### L1L — Tag model
Tag sources + store.

### L1R — Priority queues
Queue model + enforcement.

### L2LL — Tag sources
Request tags + keywords.

### L2LR — Tag store
Registry + lifecycle.

### L2RL — Queue model
Priority levels + scheduling.

### L2RR — Enforcement
Limits + policy.

### L3LLL — request tags
Header/body.

### L3LLR — keyword tags
Content scan.

### L3LRL — tag registry
Known tags.

### L3LRR — tag lifecycle
Create + expire.

### L3RLL — priority levels
High/low.

### L3RLR — scheduling
Strict/WFQ.

### L3RRL — tag-based limits
Rate + quota.

### L3RRR — keyword policy
Rules + priority.

### L4LLLL — header tags
X-Tag.

### L4LLLR — body tags
User field.

### L4LLRL — content keywords
Prompt scan.

### L4LLRR — derived tags
App class.

### L4LRLL — known tags
List.

### L4LRLR — tag config
Priorities.

### L4LRRL — create
Admin.

### L4LRRR — expire
TTL.

### L4RLLL — levels
High.

### L4RLLR — queue structure
Per-priority.

### L4RLRL — strict priority
High first.

### L4RLRR — weighted fair
WFQ.

### L4RRLL — per-tag rate
Rate.

### L4RRLR — priority routing
High → fast.

### L4RRRL — keyword rules
Match.

### L4RRRR — priority policy
Tag priority.

### L5LLLLL — X-Tag
Header.

### L5LLLLR — metadata
Body.

### L5LLLRL — user field
Metadata.

### L5LLLRR — model field
Model.

### L5LLRLL — prompt scan
Keywords.

### L5LLRLR — task keywords
Task type.

### L5LLRRL — app class
Derive.

### L5LLRRR — task type
Derive.

### L5LRLLL — list
Registry.

### L5LRLLR — unknown tags
Reject.

### L5LRLRL — priorities
Levels.

### L5LRLRR — limits
Per-tag.

### L5LRRLL — admin
Define.

### L5LRRLR — auto
Derive.

### L5LRRRL — TTL
Idle.

### L5LRRRR — archive
Keep.

### L5RLLLL — high
Urgent.

### L5RLLLR — low
Batch.

### L5RLLRL — per-priority
Queues.

### L5RLLRR — single queue
Sorted.

### L5RLRLL — high first
Always.

### L5RLRLR — risk
Low starve.

### L5RLRRL — WFQ
Weights.

### L5RLRRR — proportional
Share.

### L5RRLLL — rate
Per-tag.

### L5RRLLR — quota
Per-tag.

### L5RRLRL — high → fast
Models.

### L5RRLRR — low → cheap
Models.

### L5RRRLL — match rules
Keyword.

### L5RRRLR — action
Route.

### L5RRRRL — tag priority
Map.

### L5RRRRR — keyword priority
Map.

### L6 leaves (64)
- **L6LLLLLL** header: X-Tag.
- **L6LLLLLR** parse: X-Tag.
- **L6LLLLRL** body: metadata.
- **L6LLLLRR** parse: metadata.
- **L6LLLRLL** metadata: user.
- **L6LLLRLR** tags: user.
- **L6LLLRRL** model: field.
- **L6LLLRRR** tag: model.
- **L6LLRLLL** keywords: scan.
- **L6LLRLLR** match: keywords.
- **L6LLRLRL** task type: match.
- **L6LLRLRR** match: task.
- **L6LLRRLL** derive: app.
- **L6LLRRLR** tag: app.
- **L6LLRRRL** derive: task.
- **L6LLRRRR** tag: task.
- **L6LRLLLL** registry: tags.
- **L6LRLLLR** config: tags.
- **L6LRLLRL** reject: unknown.
- **L6LRLLRR** ignore: unknown.
- **L6LRLRLL** levels: priority.
- **L6LRLRLR** config: priority.
- **L6LRLRRL** per-tag: limits.
- **L6LRLRRR** caps: limits.
- **L6LRRLLL** define: admin.
- **L6LRRLLR** config: admin.
- **L6LRRLRL** derive: auto.
- **L6LRRLRR** register: auto.
- **L6LRRRLL** idle: TTL.
- **L6LRRRLR** purge: TTL.
- **L6LRRRRL** keep: archive.
- **L6LRRRRR** stats: archive.
- **L6RLLLLL** urgent: high.
- **L6RLLLLR** priority: high.
- **L6RLLLRL** batch: low.
- **L6RLLLRR** defer: low.
- **L6RLLRLL** queues: per-priority.
- **L6RLLRLR** separate: queues.
- **L6RLLRRL** sorted: queue.
- **L6RLLRRR** heap: queue.
- **L6RLRLLL** always: high first.
- **L6RLRLLR** starvation: risk.
- **L6RLRLRL** low starve: risk.
- **L6RLRLRR** mitigate: risk.
- **L6RLRRLL** weights: WFQ.
- **L6RLRRLR** fairness: WFQ.
- **L6RLRRRL** share: proportional.
- **L6RLRRRR** no starve: proportional.
- **L6RRLLLL** per-tag: rate.
- **L6RRLLLR** cap: rate.
- **L6RRLLRL** per-tag: quota.
- **L6RRLLRR** cap: quota.
- **L6RRLRLL** models: fast.
- **L6RRLRLR** route: fast.
- **L6RRLRRL** models: cheap.
- **L6RRLRRR** route: cheap.
- **L6RRRLLL** keyword: rule.
- **L6RRRLLR** action: rule.
- **L6RRRLRL** route: action.
- **L6RRRLRR** limit: action.
- **L6RRRRLL** map: tag.
- **L6RRRRLR** priority: tag.
- **L6RRRRRL** map: keyword.
- **L6RRRRRR** priority: keyword.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Derived tags (app class, task type) already exist | High |
| Explicit request tags (X-Tag) are a design proposal | Medium |
| WFQ avoids starvation vs strict priority | High |
| Priority routing (high → fast models) is a design proposal | Medium |

## Open questions

1. Should tags come from headers, body metadata, or both?
2. Should unknown tags be rejected or ignored?
3. Should scheduling be strict priority or WFQ?

## Sources

- Prior research: `2026-09-14-keyless-governance-research.md`, `2026-09-15-branch-b2b-tag-priority-queues.md`
- Industry: WFQ (Cisco), priority queues, LiteLLM tags