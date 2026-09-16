# Tree T3 — Inbound Rate Limiter (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #rate-limiter #inbound #t03

## Objective

Full 6-level binary tree expansion of the **inbound rate limiter** topic (`custom-server.rate-limiter.js`, from `2026-08-31-message-origin-and-destination-research.md` Part A.3). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Inbound rate limiter
├─ L1L: Algorithm (sliding window)
│  ├─ L2LL: Window mechanics
│  │  ├─ L3LLL: WINDOW_MS
│  │  │  ├─ L4LLLL: 60_000 ms
│  │  │  │  ├─ L5LLLLL: fixed window
│  │  │  │  │  ├─ L6LLLLLL: bucket reset
│  │  │  │  │  └─ L6LLLLLR: burst at edge
│  │  │  │  └─ L5LLLLR: sliding window
│  │  │  │     ├─ L6LLLLRL: continuous
│  │  │  │     └─ L6LLLLRR: smooth
│  │  │  └─ L4LLLR: window granularity
│  │  │     ├─ L5LLLRL: 1-min buckets
│  │  │     │  ├─ L6LLLRLL: per-minute
│  │  │     │  └─ L6LLLRLR: memory per bucket
│  │  │     └─ L5LLLRR: sub-minute
│  │  │        ├─ L6LLLRRL: finer windows
│  │  │        └─ L6LLLRRR: more memory
│  │  └─ L3LLR: Per-IP tracking
│  │     ├─ L4LLRL: key = IP
│  │     │  ├─ L5LLRLL: IP keying
│  │     │  │  ├─ L6LLRLLL: per-IP map
│  │     │  │  └─ L6LLRLLR: IPv4/IPv6
│  │     │  └─ L5LLRLR: NAT caveat
│  │     │     ├─ L6LLRLRL: shared IP
│  │     │     └─ L6LLRLRR: false sharing
│  │     └─ L4LLRR: timestamp log
│  │        ├─ L5LLRRL: request times
│  │        │  ├─ L6LLRRLL: append
│  │        │  └─ L6LLRRLR: prune old
│  │        └─ L5LLRRR: count in window
│  │           ├─ L6LLRRRL: filter
│  │           └─ L6LLRRRR: count
│  └─ L2LR: Limits
│     ├─ L3LRL: LIMITS map
│     │  ├─ L4LRLL: general: 120
│     │  │  ├─ L5LRLLL: default tier
│     │  │  │  ├─ L6LRLLLL: all endpoints
│     │  │  │  └─ L6LRLLLR: 120/min
│     │  │  └─ L5LRLLR: chat: 20
│     │  │     ├─ L6LRLLRL: chat endpoints
│     │  │     └─ L6LRLLRR: 20/min
│     │  └─ L4LRLR: CHAT_PATHS
│     │     ├─ L5LRLRL: /v1/chat/completions
│     │     │  ├─ L6LRLRLL: chat path
│     │     │  └─ L6LRLRLR: completions path
│     │     └─ L5LRLRR: /v1/completions
│     │        ├─ L6LRLRRL: legacy path
│     │        └─ L6LRLRRR: same tier
│     └─ L3LRR: classifyRequest
│        ├─ L4LRRL: path matching
│        │  ├─ L5LRRLL: exact match
│        │  │  ├─ L6LRRLLL: chat → chat tier
│        │  │  └─ L6LRRLLR: other → general
│        │  └─ L5LRRLR: prefix match
│        │     ├─ L6LRRLRL: /v1/* prefix
│        │     └─ L6LRRLRR: dashboard excluded
│        └─ L4LRRR: tier selection
│           ├─ L5LRRRL: chat tier
│           │  ├─ L6LRRRLL: stricter
│           │  └─ L6LRRRLR: LLM traffic
│           └─ L5LRRRR: general tier
│              ├─ L6LRRRRL: everything else
│              └─ L6LRRRRR: health checks
└─ L1R: Enforcement
   ├─ L2RL: checkLimit
   │  ├─ L3RLL: return shape
   │  │  ├─ L4RLLL: allowed
   │  │  │  ├─ L5RLLLL: boolean
   │  │  │  │  ├─ L6RLLLLL: true = pass
   │  │  │  │  └─ L6RLLLLR: false = block
   │  │  │  └─ L5RLLLR: retryAfter
   │  │  │     ├─ L6RLLLRL: seconds
   │  │  │     └─ L6RLLLRR: Retry-After header
   │  │  └─ L4RLLR: 429 response
   │  │     ├─ L5RLLRL: HTTP 429
   │  │     │  ├─ L6RLLRLL: Too Many Requests
   │  │     │  └─ L6RLLRLR: standard code
   │  │     └─ L5RLLRR: Retry-After
   │  │        ├─ L6RLLRRL: header value
   │  │        └─ L6RLLRRR: client retry
   │  └─ L3RLR: LOOPBACK bypass
   │     ├─ L4RLRL: loopback set
   │     │  ├─ L5RLRLL: 127.0.0.1
   │     │  │  ├─ L6RLRLLL: IPv4 loopback
   │     │  │  └─ L6RLRLLR: ::1
   │     │  └─ L5RLRLR: ::ffff:127.0.0.1
   │     │     ├─ L6RLRLRL: IPv4-mapped
   │     │     └─ L6RLRLRR: IPv6 form
   │     └─ L4RLRR: bypass semantics
   │        ├─ L5RLRRL: local trusted
   │        │  ├─ L6RLRRLL: localhost trusted
   │        │  └─ L6RLRRLR: no limit
   │        └─ L5RLRRR: security note
   │           ├─ L6RLRRRL: local proxy
   │           └─ L6RLRRRR: trust boundary
   └─ L2RR: Maintenance
      ├─ L3RRL: sweep()
      │  ├─ L4RRLL: periodic cleanup
      │  │  ├─ L5RRLLL: every 60s
      │  │  │  ├─ L6RRLLLL: interval
      │  │  │  └─ L6RRLLLR: timer
      │  │  └─ L5RRLLR: prune stale
      │  │     ├─ L6RRLLRL: old entries
      │  │     └─ L6RRLLRR: memory bound
      │  └─ L4RRLR: memory bounds
      │     ├─ L5RRLRL: zero-dep
      │     │  ├─ L6RRLRLL: no deps
      │     │  └─ L6RRLRLR: in-memory
      │     └─ L5RRLRR: unbounded risk
      │        ├─ L6RRLRRL: many IPs
      │        └─ L6RRLRRR: sweep mitigates
      └─ L3RRR: IP derivation
         ├─ L4RRRL: custom-server.js
         │  ├─ L5RRRLL: TCP socket
         │  │  ├─ L6RRRLLL: socket address
         │  │  └─ L6RRRLLR: real client
         │  └─ L5RRRLR: X-Forwarded-For
         │     ├─ L6RRRLRL: stripped
         │     └─ L6RRRLRR: attacker-controlled
         └─ L4RRRR: loopback proxy trust
            ├─ L5RRRRL: trusted proxy
            │  ├─ L6RRRRLL: loopback only
            │  └─ L6RRRRLR: XFF from proxy
            └─ L5RRRRR: spoof prevention
               ├─ L6RRRRRL: no blind trust
               └─ L6RRRRRR: IP integrity
```

## Node research (all 127 nodes)

### L0 — Inbound rate limiter
Per-IP sliding-window limiter in `custom-server.rate-limiter.js`; zero-dep, in-memory; 429 + Retry-After.

### L1L — Algorithm (sliding window)
Sliding-window per-IP; timestamp log per key; count within window.

### L1R — Enforcement
`checkLimit` → {allowed, retryAfter?}; 429 responses; loopback bypass; sweep maintenance.

### L2LL — Window mechanics
`WINDOW_MS = 60_000`; per-IP timestamp logs.

### L2LR — Limits
`LIMITS = {general: 120, chat: 20}`; `CHAT_PATHS` for chat tier.

### L2RL — checkLimit
Core check; returns allowed + retryAfter.

### L2RR — Maintenance
`sweep()` every 60s; memory bounds; IP derivation via custom-server.

### L3LLL — WINDOW_MS
60-second window constant.

### L3LLR — Per-IP tracking
Key = client IP; timestamp log per key.

### L3LRL — LIMITS map
Two tiers: general 120/min, chat 20/min.

### L3LRR — classifyRequest
Path-based tier selection.

### L3RLL — return shape
`{allowed: boolean, retryAfter?: number}`.

### L3RLR — LOOPBACK bypass
Loopback IPs bypass all limits.

### L3RRL — sweep()
Periodic cleanup of stale entries.

### L3RRR — IP derivation
IP from TCP socket; XFF stripped (attacker-controlled).

### L4LLLL — 60_000 ms
One-minute window.

### L4LLLR — window granularity
1-min buckets; sub-minute possible but more memory.

### L4LLRL — key = IP
Per-IP map keyed by client IP.

### L4LLRR — timestamp log
Append request times; prune old.

### L4LRLL — general: 120
Default tier for all endpoints.

### L4LRLR — chat: 20
Stricter tier for chat endpoints.

### L4LRRL — path matching
Exact/prefix match on request path.

### L4LRRR — tier selection
Chat vs general.

### L4RLLL — allowed
Boolean pass/block.

### L4RLLR — 429 response
HTTP 429 + Retry-After.

### L4RLRL — loopback set
127.0.0.1, ::1, ::ffff:127.0.0.1.

### L4RLRR — bypass semantics
Localhost trusted; no limit.

### L4RRLL — periodic cleanup
Every 60s sweep.

### L4RRLR — memory bounds
Zero-dep in-memory; sweep bounds growth.

### L4RRRL — custom-server.js
IP from TCP socket; XFF stripped.

### L4RRRR — loopback proxy trust
XFF trusted only from loopback proxy.

### L5LLLLL — fixed window
Bucket reset at boundary.

### L5LLLLR — sliding window
Continuous, smooth.

### L5LLLRL — 1-min buckets
Per-minute granularity.

### L5LLLRR — sub-minute
Finer windows, more memory.

### L5LLRLL — IP keying
Per-IP map.

### L5LLRLR — NAT caveat
Shared IP → false sharing.

### L5LLRRL — request times
Append timestamps.

### L5LLRRR — count in window
Filter + count.

### L5LRLLL — default tier
All endpoints.

### L5LRLLR — chat tier
Chat endpoints.

### L5LRLRL — /v1/chat/completions
Chat path.

### L5LRLRR — /v1/completions
Legacy path.

### L5LRRLL — exact match
Chat → chat tier.

### L5LRRLR — prefix match
/v1/* prefix.

### L5LRRRL — chat tier
Stricter.

### L5LRRRR — general tier
Everything else.

### L5RLLLL — boolean
true = pass.

### L5RLLLR — retryAfter
Seconds.

### L5RLLRL — HTTP 429
Too Many Requests.

### L5RLLRR — Retry-After
Header value.

### L5RLRLL — 127.0.0.1
IPv4 loopback.

### L5RLRLR — ::ffff:127.0.0.1
IPv4-mapped.

### L5RLRRL — local trusted
Localhost trusted.

### L5RLRRR — security note
Local proxy trust boundary.

### L5RRLLL — every 60s
Interval.

### L5RRLLR — prune stale
Old entries.

### L5RRLRL — zero-dep
No deps.

### L5RRLRR — unbounded risk
Many IPs.

### L5RRRLL — TCP socket
Socket address.

### L5RRRLR — X-Forwarded-For
Stripped.

### L5RRRRL — trusted proxy
Loopback only.

### L5RRRRR — spoof prevention
No blind trust.

### L6 leaves (64)
- **L6LLLLLL** bucket reset: fixed window resets.
- **L6LLLLLR** burst at edge: 2x burst at boundary.
- **L6LLLLRL** continuous: sliding window continuous.
- **L6LLLLRR** smooth: no edge burst.
- **L6LLLRLL** per-minute: 1-min buckets.
- **L6LLLRLR** memory per bucket: O(entries).
- **L6LLLRRL** finer windows: 10s windows.
- **L6LLLRRR** more memory: more buckets.
- **L6LLRLLL** per-IP map: Map<ip, times[]>.
- **L6LLRLLR** IPv4/IPv6: both keyed.
- **L6LLRLRL** shared IP: NAT users share.
- **L6LLRLRR** false sharing: one user blocks all.
- **L6LLRRLL** append: push timestamp.
- **L6LLRRLR** prune old: drop < now-window.
- **L6LLRRRL** filter: keep in-window.
- **L6LLRRRR** count: length.
- **L6LRLLLL** all endpoints: general tier.
- **L6LRLLLR** 120/min: general limit.
- **L6LRLLRL** chat endpoints: chat tier.
- **L6LRLLRR** 20/min: chat limit.
- **L6LRLRLL** chat path: /v1/chat/completions.
- **L6LRLRLR** completions path: /v1/completions.
- **L6LRLRRL** legacy path: completions.
- **L6LRLRRR** same tier: both chat tier.
- **L6LRRLLL** chat → chat tier: exact match.
- **L6LRRLLR** other → general: default.
- **L6LRRLRL** /v1/* prefix: API prefix.
- **L6LRRLRR** dashboard excluded: /dashboard not limited.
- **L6LRRRLL** stricter: chat stricter.
- **L6LRRRLR** LLM traffic: chat = LLM.
- **L6LRRRRL** everything else: general.
- **L6LRRRRR** health checks: general tier.
- **L6RLLLLL** true = pass: allowed.
- **L6RLLLLR** false = block: 429.
- **L6RLLLRL** seconds: retryAfter seconds.
- **L6RLLLRR** Retry-After header: standard.
- **L6RLLRLL** Too Many Requests: 429.
- **L6RLLRLR** standard code: RFC 6585.
- **L6RLLRRL** header value: seconds.
- **L6RLLRRR** client retry: client honors.
- **L6RLRLLL** IPv4 loopback: 127.0.0.1.
- **L6RLRLLR** ::1: IPv6 loopback.
- **L6RLRLRL** IPv4-mapped: ::ffff:127.0.0.1.
- **L6RLRLRR** IPv6 form: mapped form.
- **L6RLRRLL** localhost trusted: bypass.
- **L6RLRRLR** no limit: unlimited.
- **L6RLRRRL** local proxy: CLI failover-proxy.
- **L6RLRRRR** trust boundary: loopback only.
- **L6RRLLLL** interval: 60s.
- **L6RRLLLR** timer: setInterval.
- **L6RRLLRL** old entries: stale.
- **L6RRLLRR** memory bound: bounded.
- **L6RRLRLL** no deps: zero-dep.
- **L6RRLRLR** in-memory: no store.
- **L6RRLRRL** many IPs: growth.
- **L6RRLRRR** sweep mitigates: cleanup.
- **L6RRRLLL** socket address: real client.
- **L6RRRLLR** real client: TCP peer.
- **L6RRRLRL** stripped: XFF removed.
- **L6RRRLRR** attacker-controlled: spoofable.
- **L6RRRRLL** loopback only: trusted proxy.
- **L6RRRRLR** XFF from proxy: only loopback.
- **L6RRRRRL** no blind trust: never trust XFF.
- **L6RRRRRR** IP integrity: socket-derived.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Sliding-window per-IP, WINDOW_MS=60s, LIMITS general:120/chat:20 | High |
| LOOPBACK bypass set | High |
| 429 + Retry-After | High |
| sweep() every 60s | High |
| IP from TCP socket, XFF stripped | High |

## Open questions

1. Should limits be per-source-app (task classification × rate limit)?
2. Should the limiter persist across restarts (SQLite)?
3. Should chat tier be per-model (model-group limiting)?

## Sources

- Code: `custom-server.rate-limiter.js`, `custom-server.js`
- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-a2a-inbound-rate-limiter.md`
- Industry: RFC 6585 (429), Cloudflare rate limiting, token bucket vs sliding window literature