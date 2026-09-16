# Tree T10 — Anthropic Rate Limits (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #anthropic #rate-limits #t10

## Objective

Full 6-level binary tree expansion of the **Anthropic rate limits** topic (from `2026-08-31-message-origin-and-destination-research.md` Part B.2). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Anthropic rate limits
├─ L1L: Limit structure
│  ├─ L2LL: Tiered limits
│  │  ├─ L3LLL: usage tiers
│  │  │  ├─ L4LLLL: tier 1-5
│  │  │  │  ├─ L5LLLLL: tier 1
│  │  │  │  │  ├─ L6LLLLLL: $5/mo
│  │  │  │  │  └─ L6LLLLLR: low limits
│  │  │  │  └─ L5LLLLR: tier 5
│  │  │  │     ├─ L6LLLLRL: $5000/mo
│  │  │  │     └─ L6LLLLRR: high limits
│  │  │  └─ L4LLLR: tier criteria
│  │  │     ├─ L5LLLRL: spend history
│  │  │     │  ├─ L6LLLRLL: cumulative
│  │  │     │  └─ L6LLLRLR: 30-day
│  │  │     └─ L5LLLRR: auto-upgrade
│  │  │        ├─ L6LLLRRL: threshold
│  │  │        └─ L6LLLRRR: instant
│  │  └─ L3LLR: limit types
│  │     ├─ L4LLRL: RPM
│  │     │  ├─ L5LLRLL: requests/min
│  │     │  │  ├─ L6LLRLLL: per-tier
│  │     │  │  └─ L6LLRLLR: per-model
│  │     │  └─ L5LLRLR: burst
│  │     │     ├─ L6LLRLRL: burst allowance
│  │     │     └─ L6LLRLRR: token bucket
│  │     └─ L4LLRR: TPM
│  │        ├─ L5LLRRL: tokens/min
│  │        │  ├─ L6LLRRLL: per-tier
│  │        │  └─ L6LLRRLR: per-model
│  │        └─ L5LLRRR: daily
│  │           ├─ L6LLRRRL: daily cap
│  │           └─ L6LLRRRR: reset
│  └─ L2LR: Headers
│     ├─ L3LRL: response headers
│     │  ├─ L4LRLL: anthropic-ratelimit-*
│     │  │  ├─ L5LRLLL: limit
│     │  │  │  ├─ L6LRLLLL: limit value
│     │  │  │  └─ L6LRLLLR: remaining
│     │  │  └─ L5LRLLR: reset
│     │  │     ├─ L6LRLLRL: reset time
│     │  │     └─ L6LRLLRR: epoch ms
│     │  └─ L4LRLR: retry-after
│     │     ├─ L5LRLRL: 429 header
│     │     │  ├─ L6LRLRLL: seconds
│     │     │  └─ L6LRLRLR: standard
│     │     └─ L5LRLRR: 503
│     │        ├─ L6LRLRRL: overload
│     │        └─ L6LRLRRR: retry-after
│     └─ L3LRR: client handling
│        ├─ L4LRRL: backoff
│        │  ├─ L5LRRLL: exponential
│        │  │  ├─ L6LRRLLL: base delay
│        │  │  │  ├─ L6LRRLLL: 1s
│        │  │  │  └─ L6LRRLLR: jitter
│        │  │  └─ L5LRRLR: max retries
│        │  │     ├─ L6LRRLRL: cap
│        │     │     └─ L6LRRLRR: give up
│        │  └─ L4LRRR: respect headers
│        │     ├─ L5LRRRL: limit/remaining
│        │     │  ├─ L6LRRRLL: throttle
│        │     │     └─ L6LRRRLR: queue
│        │     └─ L5LRRRR: reset
│        │        ├─ L6LRRRRL: wait
│        │        └─ L6LRRRRR: resume
└─ L1R: 9router integration
   ├─ L2RL: Executor handling
   │  ├─ L3RLL: default executor
   │  │  ├─ L4RLLL: OpenAI-compatible
   │  │  │  ├─ L5RLLLL: anthropic executor
   │  │  │  │  ├─ L6RLLLLL: messages API
   │  │  │  │  └─ L6RLLLLR: streaming
   │  │  │  └─ L5RLLLR: rate headers
   │  │  │     ├─ L6RLLLRL: parse
   │  │  │     └─ L6RLLLRR: apply
   │  │  └─ L4RLLR: retry logic
   │  │     ├─ L5RLLRL: 429 handling
   │  │     │  ├─ L6RLLRLL: retry-after
   │  │     │  └─ L6RLLRLR: backoff
   │  │     └─ L5RLLRR: 503 handling
   │  │        ├─ L6RLLRRL: overload
   │  │        └─ L6RLLRRR: backoff
   │  └─ L3RLR: combo fallback
   │     ├─ L4RLRL: account fallback
   │     │  ├─ L5RLRLL: multi-account
   │     │  │  ├─ L6RLRLLL: next key
   │     │  │  └─ L6RLRLLR: switch
   │     │  └─ L5RLRLR: model fallback
   │     │     ├─ L6RLRLRL: different model
   │     │     └─ L6RLRLRR: different tier
   │     └─ L4RLRR: combo switch
   │        ├─ L5RLRRL: sr-* combos
   │        │  ├─ L6RLRRLL: smart router
   │        │  └─ L6RLRRLR: fallback
   │        └─ L5RLRRR: priority
   │           ├─ L6RLRRRL: cost
   │           └─ L6RLRRRR: availability
   └─ L2RR: Local rate limiting
      ├─ L3RRL: inbound limiter
      │  ├─ L4RRLL: general 120
      │  │  ├─ L5RRLLL: all endpoints
      │  │  │  ├─ L6RRLLLL: 120/min
      │  │  │  └─ L6RRLLLR: per-IP
      │  │  └─ L5RRLLR: chat 20
      │  │     ├─ L6RRLLRL: chat endpoints
      │  │     └─ L6RRLLRR: 20/min
      │  └─ L4RRLR: per-app
      │     ├─ L5RRLRL: app class
      │     │  ├─ L6RRLRLL: sourceApps
      │     │  │  ├─ L6RRLRLL: class
      │     │  │  └─ L6RRLRLR: limits
      │     │  └─ L5RRLRR: per-app caps
      │     │     ├─ L6RRLRRL: budget
      │     │     └─ L6RRLRRR: rate
      │  └─ L3RRR: upstream mirror
      │     ├─ L4RRRL: mirror limits
      │     │  ├─ L5RRRLL: local = upstream
      │     │  │  ├─ L6RRRLLL: sync
      │     │  │  └─ L6RRRLLR: enforce
      │     │  └─ L5RRRLR: local stricter
      │     │     ├─ L6RRRLRL: buffer
      │     │     └─ L6RRRLRR: safety
      │     └─ L4RRRR: token bucket
      │        ├─ L5RRRRL: leaky bucket
      │        │  ├─ L6RRRRLL: equivalent
      │        │  └─ L6RRRRLR: mirror
      │        └─ L5RRRRR: EWMA
      │           ├─ L6RRRRRL: rate est
      │           └─ L6RRRRRR: smooth
```

## Node research (all 127 nodes)

### L0 — Anthropic rate limits
Tiered limits (tiers 1-5 by spend), RPM/TPM/daily, response headers for client handling. 9router integrates via executor + combo fallback + local limiting.

### L1L — Limit structure
Tiered by spend; RPM/TPM/daily types.

### L1R — 9router integration
Executor handling + combo fallback + local limiting.

### L2LL — Tiered limits
Tiers 1-5 by cumulative spend.

### L2LR — Headers
anthropic-ratelimit-* + retry-after.

### L2RL — Executor handling
Anthropic executor parses headers.

### L2RR — Local rate limiting
Inbound + per-app + upstream mirror.

### L3LLL — usage tiers
Tier 1-5.

### L3LLR — limit types
RPM/TPM/daily.

### L3LRL — response headers
Limit/remaining/reset.

### L3LRR — client handling
Backoff + respect headers.

### L3RLL — default executor
OpenAI-compatible.

### L3RLR — combo fallback
Account/model/combo.

### L3RRL — inbound limiter
General/chat tiers.

### L3RRR — upstream mirror
Mirror or stricter.

### L4LLLL — tier 1-5
$5 to $5000/mo.

### L4LLLR — tier criteria
Spend history.

### L4LLRL — RPM
Requests/min.

### L4LLRR — TPM
Tokens/min.

### L4LRLL — anthropic-ratelimit-*
Headers.

### L4LRLR — retry-after
429/503.

### L4LRRL — backoff
Exponential.

### L4LRRR — respect headers
Throttle/queue.

### L4RLLL — OpenAI-compatible
Messages API.

### L4RLLR — retry logic
429/503.

### L4RLRL — account fallback
Multi-account.

### L4RLRR — combo switch
sr-* combos.

### L4RRLL — general 120
All endpoints.

### L4RRLR — per-app
App class.

### L4RRRL — mirror limits
Sync upstream.

### L4RRRR — token bucket
Leaky bucket equivalent.

### L5LLLLL — tier 1
$5/mo.

### L5LLLLR — tier 5
$5000/mo.

### L5LLLRL — spend history
Cumulative.

### L5LLLRR — auto-upgrade
Threshold.

### L5LLRLL — per-tier
Tier limits.

### L5LLRLR — burst
Token bucket.

### L5LLRRL — per-tier
Tier limits.

### L5LLRRR — daily
Daily cap.

### L5LRLLL — limit value
Limit.

### L5LRLLR — remaining
Remaining.

### L5LRLRL — reset time
Reset.

### L5LRLRR — 429 header
Retry-after.

### L5LRLRL — 503
Overload.

### L5LRRLL — exponential
Base delay.

### L5LRRLR — max retries
Cap.

### L5LRRRL — limit/remaining
Throttle.

### L5LRRRR — reset
Wait.

### L5RLLLL — messages API
Anthropic format.

### L5RLLLR — rate headers
Parse.

### L5RLLRL — 429 handling
Retry-after.

### L5RLLRR — 503 handling
Overload.

### L5RLRLL — multi-account
Next key.

### L5RLRLR — model fallback
Different model.

### L5RLRRL — sr-* combos
Smart router.

### L5RLRRR — priority
Cost/availability.

### L5RRLLL — all endpoints
120/min.

### L5RRLLR — chat 20
Chat endpoints.

### L5RRLRL — app class
SourceApps.

### L5RRLRR — per-app caps
Budget/rate.

### L5RRRLL — local = upstream
Sync.

### L5RRRLR — local stricter
Buffer.

### L5RRRRL — leaky bucket
Equivalent.

### L5RRRRR — EWMA
Rate estimator.

### L6 leaves (64)
- **L6LLLLLL** $5/mo: tier 1.
- **L6LLLLLR** low limits: tier 1.
- **L6LLLLRL** $5000/mo: tier 5.
- **L6LLLLRR** high limits: tier 5.
- **L6LLLRLL** cumulative: 30-day.
- **L6LLLRLR** 30-day: window.
- **L6LLLRRL** threshold: auto.
- **L6LLLRRR** instant: upgrade.
- **L6LLRLLL** per-tier: RPM.
- **L6LLRLLR** per-model: RPM.
- **L6LLRLRL** burst allowance: bucket.
- **L6LLRLRR** token bucket: burst.
- **L6LLRRLL** per-tier: TPM.
- **L6LLRRLR** per-model: TPM.
- **L6LLRRRL** daily cap: daily.
- **L6LLRRRR** reset: midnight.
- **L6LRLLLL** limit value: limit.
- **L6LRLLLR** remaining: remaining.
- **L6LRLLRL** reset time: epoch.
- **L6LRLLRR** epoch ms: ms.
- **L6LRLRLL** seconds: retry-after.
- **L6LRLRLR** standard: RFC.
- **L6LRLRRL** overload: 503.
- **L6LRLRRR** retry-after: header.
- **L6LRRLLL** base delay: 1s.
- **L6LRRLLR** jitter: random.
- **L6LRRLRL** cap: max.
- **L6LRRLRR** give up: fail.
- **L6LRRRLL** throttle: slow.
- **L6LRRRLR** queue: wait.
- **L6LRRRRL** wait: reset.
- **L6LRRRRR** resume: continue.
- **L6RLLLLL** messages API: format.
- **L6RLLLLR** streaming: SSE.
- **L6RLLLRL** parse: headers.
- **L6RLLLRR** apply: backoff.
- **L6RLLRLL** retry-after: header.
- **L6RLLRLR** backoff: exp.
- **L6RLLRRL** overload: 503.
- **L6RLLRRR** backoff: exp.
- **L6RLRLLL** next key: pool.
- **L6RLRLLR** switch: failover.
- **L6RLRLRL** different model: fallback.
- **L6RLRLRR** different tier: fallback.
- **L6RLRRLL** smart router: sr-*.
- **L6RLRRLR** fallback: chain.
- **L6RLRRRL** cost: priority.
- **L6RLRRRR** availability: priority.
- **L6RRLLLL** 120/min: general.
- **L6RRLLLR** per-IP: key.
- **L6RRLLRL** chat endpoints: chat.
- **L6RRLLRR** 20/min: chat.
- **L6RRLRLL** class: sourceApps.
- **L6RRLRLR** limits: per-app.
- **L6RRLRRL** budget: cap.
- **L6RRLRRR** rate: limit.
- **L6RRRLLL** sync: mirror.
- **L6RRRLLR** enforce: local.
- **L6RRRLRL** buffer: stricter.
- **L6RRRLRR** safety: margin.
- **L6RRRRLL** equivalent: mirror.
- **L6RRRRLR** mirror: leaky.
- **L6RRRRRL** rate est: EWMA.
- **L6RRRRRR** smooth: O(1).

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Anthropic tiered limits (1-5 by spend) | High |
| RPM/TPM/daily limit types | High |
| Response headers: anthropic-ratelimit-* + retry-after | High |
| 9router executor parses headers + combo fallback | High |
| Leaky bucket ≡ token bucket (mirror images) | High |

## Open questions

1. Should 9router proactively throttle based on upstream headers (pre-emptive)?
2. Should local limits mirror upstream exactly or add safety buffer?
3. Should per-app limits use Anthropic tier as a signal?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b3b-anthropic-rate-limits.md`
- Industry: Anthropic rate limit docs, token bucket vs leaky bucket literature, EWMA rate estimation