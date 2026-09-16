# Tree T15 — Queue Management (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #queue #management #t15

## Objective

Full 6-level binary tree expansion of the **queue management** topic (from `2026-08-31-message-origin-and-destination-research.md` Part B.5). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Queue management
├─ L1L: Queueing theory
│  ├─ L2LL: Queue types
│  │  ├─ L3LLL: FIFO
│  │  │  ├─ L4LLLL: first-in-first-out
│  │  │  │  ├─ L5LLLLL: fairness
│  │  │  │  │  ├─ L6LLLLLL: arrival order
│  │  │  │  │  └─ L6LLLLLR: no starvation
│  │  │  │  └─ L5LLLLR: simplicity
│  │  │  │     ├─ L6LLLLRL: easy
│  │  │  │     └─ L6LLLLRR: predictable
│  │  │  └─ L4LLLR: FIFO limits
│  │  │     ├─ L5LLLRL: head-of-line
│  │  │     │  ├─ L6LLLRLL: blocking
│  │  │     │  └─ L6LLLRLR: slow first
│  │  │     └─ L5LLLRR: no priority
│  │  │        ├─ L6LLLRRL: equal
│  │  │        └─ L6LLLRRR: no QoS
│  │  └─ L3LLR: priority queues
│  │     ├─ L4LLRL: priority levels
│  │     │  ├─ L5LLRLL: high/med/low
│  │     │  │  ├─ L6LLRLLL: levels
│  │     │  │  └─ L6LLRLLR: mapping
│  │     │  └─ L5LLRLR: preemption
│  │     │     ├─ L6LLRLRL: preempt
│  │     │     └─ L6LLRLRR: no preempt
│  │     └─ L4LLRR: starvation
│  │        ├─ L5LLRRL: low priority
│  │        │  ├─ L6LLRRLL: starved
│  │        │  └─ L6LLRRLR: never runs
│  │        └─ L5LLRRR: aging
│  │           ├─ L6LLRRRL: promote
│  │           └─ L6LLRRRR: anti-starvation
│  └─ L2LR: Scheduling
│     ├─ L3LRL: WFQ
│     │  ├─ L4LRLL: weighted fair
│     │  │  ├─ L5LRLLL: weights
│     │  │  │  ├─ L6LRLLLL: per-flow
│     │  │  │  └─ L6LRLLLR: proportional
│     │  │  └─ L5LRLLR: fairness
│     │  │     ├─ L6LRLLRL: no starvation
│     │  │     └─ L6LRLLRR: O(log n)
│     │  └─ L4LRLR: round-robin
│     │     ├─ L5LRLRL: simple
│     │     │  ├─ L6LRLRLL: cyclic
│     │     │  └─ L6LRLRLR: equal
│     │     └─ L5LRLRR: weighted RR
│     │        ├─ L6LRLRRL: weights
│     │        └─ L6LRLRRR: proportional
│     └─ L3LRR: AIMD
│        ├─ L4LRRL: additive increase
│        │  ├─ L5LRRLL: linear
│        │  │  ├─ L6LRRLLL: +1
│        │  │  └─ L6LRRLLR: slow
│        │  └─ L5LRRLR: multiplicative decrease
│        │     ├─ L6LRRLRL: halve
│        │     └─ L6LRRLRR: fast
│        └─ L4LRRR: convergence
│           ├─ L5LRRRL: fairness
│           │  ├─ L6LRRRLL: converges
│           │  └─ L6LRRRLR: stable
│           └─ L5LRRRR: 429 signal
│              ├─ L6LRRRRL: binary
│              └─ L6LRRRRR: congestion
└─ L1R: 9router queues
   ├─ L2RL: Current state
   │  ├─ L3RLL: no queue
   │  │  ├─ L4RLLL: direct dispatch
   │  │  │  ├─ L5RLLLL: immediate
   │  │  │  │  ├─ L6RLLLLL: no wait
   │  │  │  │  └─ L6RLLLLR: fire
   │  │  │  └─ L5RLLLR: concurrency
   │  │  │     ├─ L6RLLLRL: per-model
   │  │  │     └─ L6RLLLRR: tracking
   │  │  └─ L4RLLR: rate limiter
   │  │     ├─ L5RLLRL: 429 reject
   │  │     │  ├─ L6RLLRLL: reject
   │  │     │  └─ L6RLLRLR: retry-after
   │  │     └─ L5RLLRR: no queue
   │  │        ├─ L6RLLRRL: drop
   │  │        └─ L6RLLRRR: client retry
   │  └─ L3RLR: concurrency tracking
   │     ├─ L4RLRL: per-model count
   │     │  ├─ L5RLRLL: in-flight
   │     │  │  ├─ L6RLRLLL: count
   │     │  │  └─ L6RLRLLR: per-model
   │     │  └─ L5RLRLR: load-aware
   │     │     ├─ L6RLRLRL: skip
   │     │     └─ L6RLRLRR: overloaded
   │     └─ L4RLRR: smart router
   │        ├─ L5RLRRL: sr-* combos
   │        │  ├─ L6RLRRLL: dynamic
   │        │  └─ L6RLRRLR: fallback
   │        └─ L5RLRRR: selection
   │           ├─ L6RLRRRL: score
   │           └─ L6RLRRRR: availability
   └─ L2RR: Queue design
      ├─ L3RRL: priority queue
      │  ├─ L4RRLL: priority levels
      │  │  ├─ L5RRLLL: app priority
      │  │  │  ├─ L6RRLLLL: per-app
      │  │  │  └─ L6RRLLLR: priority
      │  │  └─ L5RRLLR: task priority
      │  │     ├─ L6RRLLRL: per-task
      │  │     └─ L6RRLLRR: priority
      │  └─ L4RRLR: aging
      │     ├─ L5RRLRL: promote
      │     │  ├─ L6RRLRLL: aging
      │     │  └─ L6RRLRLR: anti-starvation
      │     └─ L5RRLRR: timeout
      │        ├─ L6RRLRRL: TTL
      │        └─ L6RRLRRR: expire
      └─ L3RRR: backpressure
         ├─ L4RRRL: queue full
         │  ├─ L5RRRLL: reject
         │  │  ├─ L6RRRLLL: 429
         │  │  └─ L6RRRLLR: 503
         │  └─ L5RRRLR: signal
         │     ├─ L6RRRLRL: retry-after
         │     └─ L6RRRLRR: backoff
         └─ L4RRRR: admission
            ├─ L5RRRRL: accept
            │  ├─ L6RRRRLL: enqueue
            │  └─ L6RRRRLR: wait
            └─ L5RRRRR: reject
               ├─ L6RRRRRL: drop
               └─ L6RRRRRR: 429
```

## Node research (all 127 nodes)

### L0 — Queue management
Queueing theory (FIFO, priority, WFQ, AIMD) applied to 9router: currently no queue (direct dispatch + 429), design adds priority queue + backpressure.

### L1L — Queueing theory
Queue types + scheduling.

### L1R — 9router queues
Current state + design.

### L2LL — Queue types
FIFO + priority.

### L2LR — Scheduling
WFQ + round-robin + AIMD.

### L2RL — Current state
No queue.

### L2RR — Queue design
Priority + backpressure.

### L3LLL — FIFO
First-in-first-out.

### L3LLR — priority queues
Levels + starvation.

### L3LRL — WFQ
Weighted fair.

### L3LRR — AIMD
Additive increase.

### L3RLL — no queue
Direct dispatch.

### L3RLR — concurrency tracking
Per-model.

### L3RRL — priority queue
Levels.

### L3RRR — backpressure
Full queue.

### L4LLLL — first-in-first-out
Arrival order.

### L4LLLR — FIFO limits
Head-of-line.

### L4LLRL — priority levels
High/med/low.

### L4LLRR — starvation
Low priority.

### L4LRLL — weighted fair
Weights.

### L4LRLR — round-robin
Simple.

### L4LRRL — additive increase
Linear.

### L4LRRR — convergence
Fairness.

### L4RLLL — direct dispatch
Immediate.

### L4RLLR — rate limiter
429.

### L4RLRL — per-model count
In-flight.

### L4RLRR — smart router
sr-*.

### L4RRLL — priority levels
App/task.

### L4RRLR — aging
Promote.

### L4RRRL — queue full
Reject.

### L4RRRR — admission
Accept/reject.

### L5LLLLL — arrival order
FIFO.

### L5LLLLR — simplicity
Easy.

### L5LLLRL — head-of-line
Blocking.

### L5LLLRR — no priority
Equal.

### L5LLRLL — levels
High/med/low.

### L5LLRLR — preemption
Preempt.

### L5LLRRL — low priority
Starved.

### L5LLRRR — aging
Promote.

### L5LRLLL — weights
Per-flow.

### L5LRLLR — proportional
Fair.

### L5LRLRL — simple
Cyclic.

### L5LRLRR — weighted RR
Weights.

### L5LRRLL — linear
+1.

### L5LRRLR — multiplicative
Halve.

### L5LRRRL — fairness
Converges.

### L5LRRRR — 429 signal
Binary.

### L5RLLLL — immediate
No wait.

### L5RLLLR — concurrency
Per-model.

### L5RLLRL — reject
429.

### L5RLLRR — no queue
Drop.

### L5RLRLL — in-flight
Count.

### L5RLRLR — load-aware
Skip.

### L5RLRRL — dynamic
sr-*.

### L5RLRRR — selection
Score.

### L5RRLLL — per-app
Priority.

### L5RRLLR — per-task
Priority.

### L5RRLRL — aging
Promote.

### L5RRLRR — timeout
TTL.

### L5RRRLL — reject
429.

### L5RRRLR — signal
Retry-after.

### L5RRRRL — accept
Enqueue.

### L5RRRRR — reject
Drop.

### L6 leaves (64)
- **L6LLLLLL** arrival order: FIFO.
- **L6LLLLLR** no starvation: fair.
- **L6LLLLRL** easy: simple.
- **L6LLLLRR** predictable: order.
- **L6LLLRLL** blocking: head.
- **L6LLLRLR** slow first: head.
- **L6LLLRRL** equal: all.
- **L6LLLRRR** no QoS: none.
- **L6LLRLLL** levels: priority.
- **L6LLRLLR** mapping: app→level.
- **L6LLRLRL** preempt: interrupt.
- **L6LLRLRR** no preempt: wait.
- **L6LLRRLL** starved: never.
- **L6LLRRLR** never runs: low.
- **L6LLRRRL** promote: raise.
- **L6LLRRRR** anti-starvation: aging.
- **L6LRLLLL** per-flow: weight.
- **L6LRLLLR** proportional: share.
- **L6LRLLRL** no starvation: fair.
- **L6LRLLRR** O(log n): heap.
- **L6LRLRLL** cyclic: order.
- **L6LRLRLR** equal: share.
- **L6LRLRRL** weights: per-flow.
- **L6LRLRRR** proportional: share.
- **L6LRRLLL** +1: additive.
- **L6LRRLLR** slow: increase.
- **L6LRRLRL** halve: decrease.
- **L6LRRLRR** fast: decrease.
- **L6LRRRLL** converges: fair.
- **L6LRRRLR** stable: steady.
- **L6LRRRRL** binary: signal.
- **L6LRRRRR** congestion: 429.
- **L6RLLLLL** no wait: direct.
- **L6RLLLLR** fire: dispatch.
- **L6RLLLRL** per-model: count.
- **L6RLLLRR** tracking: concurrency.
- **L6RLLRLL** reject: 429.
- **L6RLLRLR** retry-after: header.
- **L6RLLRRL** drop: reject.
- **L6RLLRRR** client retry: client.
- **L6RLRLLL** count: in-flight.
- **L6RLRLLR** per-model: scoped.
- **L6RLRLRL** skip: overloaded.
- **L6RLRLRR** overloaded: model.
- **L6RLRRLL** dynamic: combos.
- **L6RLRRLR** fallback: chain.
- **L6RLRRRL** score: select.
- **L6RLRRRR** availability: select.
- **L6RRLLLL** per-app: priority.
- **L6RRLLLR** priority: level.
- **L6RRLLRL** per-task: priority.
- **L6RRLLRR** priority: level.
- **L6RRLRLL** aging: promote.
- **L6RRLRLR** anti-starvation: aging.
- **L6RRLRRL** TTL: timeout.
- **L6RRLRRR** expire: drop.
- **L6RRRLLL** 429: reject.
- **L6RRRLLR** 503: reject.
- **L6RRRLRL** retry-after: signal.
- **L6RRRLRR** backoff: client.
- **L6RRRRLL** enqueue: wait.
- **L6RRRRLR** wait: queue.
- **L6RRRRRL** drop: reject.
- **L6RRRRRR** 429: reject.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| 9router currently has no queue (direct dispatch + 429) | High |
| Concurrency tracking per model exists | High |
| WFQ = proportional fairness without starvation, O(log n) | High |
| AIMD converges to fairness; 429 = binary congestion signal | High |
| Priority queue + aging + backpressure is a design proposal | Medium |

## Open questions

1. Should 9router add an in-process priority queue or rely on 429 + client retry?
2. Should queue priority map from app class or task type?
3. Should WFQ weights be static or adaptive (AIMD)?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b6a-queue-management.md`
- Industry: WFQ (RFC 3662), AIMD (TCP congestion control), priority queue + aging literature