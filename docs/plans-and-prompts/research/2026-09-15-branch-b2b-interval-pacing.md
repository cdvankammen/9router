# Branch Research — B2b: Interval Pacing (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #queue #pacing #leaky-bucket #backpressure #binary-tree #branch-b2b

## Objective

Deep-dive the **interval pacing** subtree: leaky bucket drain (B2b1) and backpressure (B2b2), down to L6 leaves.

```
B2b INTERVAL PACING
├─ B2b1: LEAKY BUCKET DRAIN
│  ├─ B2b1L: fixed-rate drain
│  │  ├─ B2b1LL: 1 per 2s pacing
│  │  └─ B2b1LR: burst smoothing
│  └─ B2b1R: token dispenser
│     ├─ B2b1RL: N tokens per interval
│     └─ B2b1RR: queue drains at configurable rate
└─ B2b2: BACKPRESSURE
   ├─ B2b2L: bounded queue + TTL
   │  ├─ B2b2LL: 503 + Retry-After when full
   │  └─ B2b2LR: TTL expiry → 429
   └─ B2b2R: head-of-line protection
      ├─ B2b2RL: per-profile fairness
      └─ B2b2RR: busy profile can't starve others
```

## Codebase grounding

- No queue or pacing exists today. Requests flow synchronously from entry to dispatch. The phase-2 plan proposed an opt-in bounded queue with interval pacing (M3); this branch designs the drain and backpressure mechanics.

## External research

### B2b1L — Leaky bucket as a drain (fixed-rate)

- The leaky-bucket-as-queue (Tanenbaum, Computer Networks): a FIFO buffer serviced at a fixed rate. Packets arrive, queue up, are drained at exactly the emission rate. Output is completely smooth (no jitter) — Tanenbaum: "enforces a rigid output pattern at the average rate, no matter how bursty the input."
- For 9router pacing: the queue drains at a configurable rate (e.g. 1 request per 2 seconds = 0.5 req/s). This is the "pacing" the user asked for: smooth the burst into a steady stream.
- **B2b1LL — 1 per 2s pacing:** for model-group pacing (e.g. 9 qwen models sharing a provider quota). The rate is `groupQuota / groupMemberCount` or configurable per-group.
- **B2b1LR — burst smoothing:** the primary purpose. Without smoothing, 10 simultaneous requests from a tool-use agent hit the upstream all at once → 429. With pacing, they're spaced out → steady flow.
- Caveat: the leaky-bucket-as-queue only smooths *when there's a queue*. If the queue is empty, output = input (no added delay). So pacing only kicks in during bursts — correct behavior.

### B2b1R — Token dispenser

- Alternative framing: instead of "drain the queue at a fixed rate," think "release tokens at a fixed rate; each request needs one token to proceed." This is exactly the token bucket as a *pace gate* (different from the token bucket as a *rate limiter* in B1a1).
- **B2b1RL — N tokens per interval:** if the group quota is 60 RPM, release 1 token per second (60 tokens per minute). Each request consumes 1 token; if no token is available, the request queues.
- **B2b1RR — configurable rate:** the drain rate is per-profile, per-group, or per-source. Configured by the admin or derived from the upstream provider's rate limits.

### B2b2L — Bounded queue + TTL

- **B2b2LL — 503 + Retry-After:** when the queue is full, new requests get `503 Service Unavailable` + `Retry-After: N` (where N is the estimated wait for the oldest item). This is the backpressure signal: the client should retry after N seconds.
  - Why 503, not 429? 503 = "server overloaded, try later" (infrastructure backpressure); 429 = "you personally are rate-limited" (identity-based gating). When the *queue* is full (not the *user's* limit), 503 is correct.
- **B2b2LR — TTL expiry → 429:** if a request sits in the queue longer than its TTL (configurable, e.g. 30 seconds), it's evicted with a 429 (the user waited too long — they should back off). This prevents stale requests from consuming queue slots.

### B2b2R — Head-of-line protection

- The purpose: a busy profile (high-volume batch agent) filling the queue should not prevent other profiles' requests from being served. This is WFQ's strength (B2a2): WFQ schedules by virtual finish time, so a burst from profile A doesn't block profile B.
- **B2b2RL — per-profile fairness:** WFQ weights ensure each profile gets its fair share of the drain rate. A weight-10 profile gets 10× the throughput of weight-1.
- **B2b2RR — busy profile can't starve others:** this is WFQ's core guarantee. Even if profile A fills the queue, profile B's requests (with smaller virtual finish times) are drained first.

## Synthesis — design space

1. **Pacing architecture:**
   - Per-profile / per-group token dispenser: release N tokens per interval (configurable rate).
   - Requests acquire a token; if none, enter the bounded queue.
   - WFQ scheduler drains the queue proportionally to profile weights.
   - Each request has a TTL (30s default); TTL expiry → 429.
   - Queue full → 503 + Retry-After.
2. **Rate derivation:** `drainRate = min(staticLimit, adaptiveRate, upstreamQuota / groupSize)`. Connects B1a (static) + B1b (adaptive) + B3 (model-group) → the drain rate is the minimum of all constraints.
3. **Implementation:** `Array`-based queue + WFQ heap (from B2a). Token dispenser is a simple interval timer (`setInterval` releasing tokens at the configured rate). No new deps needed.
4. **Integration point:** the queue sits between `chat.js` (entry) and `chatCore.js` (dispatch). When the queue is enabled (opt-in per profile), requests pass through it; otherwise, they flow directly as today.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Leaky-bucket-as-queue is the right pacing mechanism | High |
| 503 is correct for full-queue backpressure (not 429) | High |
| WFQ prevents head-of-line blocking (from B2a research) | High |
| Token dispenser framing is equivalent to leaky-bucket drain | High |
| TTL → 429 prevents stale-queue buildup | High |

## Open questions

1. Should the queue be opt-in per profile (recommended) or always-on?
2. Default queue depth: 50 seems reasonable for a local gateway — too large wastes memory; too small creates 503 storms during legitimate bursts.
3. Should Retry-After be exact (computed from queue depth × drain rate) or a fixed estimate (e.g. 5s)?
4. Does streaming (SSE) need special queue handling? (Recommendation: queue the *dispatch*, not the stream — the request enters the queue, gets dispatched to chatCore, then streams back normally.)

## Sources

- Code: `src/sse/handlers/chat.js` (entry point — where queue would integrate), `open-sse/handlers/chatCore.js` (dispatch)
- Prior research: `2026-09-14-keyless-governance-research.md` (priority queue, interval pacing, backpressure sections)
- Industry: Wikipedia leaky bucket (Tanenbaum, ITU-T I.371; fetched 2026-09-15), HTTP 503 + Retry-After semantics, nginx ngx_http_limit_req_module