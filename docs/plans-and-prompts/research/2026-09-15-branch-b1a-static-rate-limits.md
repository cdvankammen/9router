# Branch Research — B1a: Static Rate Limits (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #rate-limiting #token-bucket #sliding-window #binary-tree #branch-b1a

## Objective

Deep-dive the **static rate limits** subtree: token bucket (B1a1) and sliding window (B1a2), down to L6 leaves.

```
B1a STATIC LIMITS
├─ B1a1: TOKEN BUCKET
│  ├─ B1a1L: algorithm (refill rate + burst capacity)
│  │  ├─ B1a1LL: Anthropic RPM/ITPM/OTPM model
│  │  └─ B1a1LR: continuous refill semantics
│  └─ B1a1R: implementations
│     ├─ B1a1RL: in-memory (zero-dep, custom-server)
│     └─ B1a1RR: Redis / GCRA (distributed)
└─ B1a2: SLIDING WINDOW
   ├─ B1a2L: fixed-window counter
   │  ├─ B1a2LL: current limiter (60s window)
   │  └─ B1a2LR: boundary burst problem
   └─ B1a2R: sliding-window log / counter
      ├─ B1a2RL: exact log (memory-heavy)
      └─ B1a2RR: approximate counter (Redis ZSET)
```

## Codebase grounding

### B1a2LL — the current limiter

- `custom-server.rate-limiter.js`: sliding-window-ish per-IP limiter, zero-dependency, in-memory.
  - `WINDOW_MS = 60_000`; `LIMITS = { general: 120, chat: 20 }`; `CHAT_PATHS = ["/v1/chat/completions", "/v1/completions"]`.
  - `classifyRequest(url, method)` → `'chat'` or `'general'`.
  - `checkLimit(ip, url, method)` → `{ allowed, retryAfter? }`; 429 + `Retry-After` on limit.
  - `sweep()` evicts entries older than 2× window every 60s.
  - `LOOPBACK` set bypasses all limiting.
- This is a **fixed-window counter** (B1a2L): counts per 60s bucket. Simple, memory-light, but has the classic boundary burst problem (B1a2LR): 20 chat requests at 00:59 + 20 at 01:00 = 40 in 2 seconds, all "allowed".

### B1a1 — token bucket (not yet implemented)

- The phase-1 plan (M2) proposed per-key + per-source-app **token-bucket** limits with `x-ratelimit-*` headers. Not yet built.

## External research

### B1a1LL — Anthropic's RPM/ITPM/OTPM model

- Anthropic rate limits: **RPM** (requests per minute), **ITPM** (input tokens per minute), **OTPM** (output tokens per minute). Three independent dimensions — requests, input tokens, output tokens.
- This is the industry-standard shape for LLM gateways: request-count limits alone are insufficient because a 1-token request and a 100k-token request cost wildly different amounts. Token-based limits (ITPM/OTPM) protect upstream quota; RPM protects connection/queue resources.
- 9router implication: per-source limits should be **multi-dimensional** (RPM + ITPM + OTPM), mirroring upstream provider limits so the gateway can enforce *before* hitting upstream 429s.

### B1a1LR — Continuous refill semantics

- Token bucket: bucket holds up to `burst` tokens; refilled at `rate` tokens/sec continuously (not per-window reset). A request consumes `n` tokens (1 for RPM, actual tokens for ITPM/OTPM).
- Properties: allows bursts up to `burst`, enforces long-run average `rate`, no boundary-burst problem (unlike fixed window), O(1) memory per key (store `tokens`, `lastRefillTs`).
- The leaky-bucket-as-meter is the mirror image (Wikipedia, Turner 1986 / ITU-T I.371): same conformance decisions given equivalent parameters. Leaky bucket *as queue* (fixed-rate drain) is the pacing variant — see B2b branch.

### B1a1RL — In-memory implementation

- 9router's zero-dep convention (custom-server.rate-limiter.js is deliberately dependency-free) favors a hand-rolled token bucket: ~40 lines, `Map<key, {tokens, lastRefillTs}>` + periodic sweep.
- Single-process Next.js server → in-memory is correct. Multi-process (cluster/PM2) would need shared state.

### B1a1RR — Redis / GCRA

- **GCRA** (Generic Cell Rate Algorithm, ITU-T I.371) is the algorithm behind Redis `CL.THROTTLE` and rate-limit libraries (e.g. `rate-limiter-flexible`). It's a token-bucket variant with a single "next allowed time" state — ideal for distributed counters.
- For 9router: Redis is a new dependency and a new process — only justified for multi-instance deployments. Document as the scale-out path; in-memory token bucket is the v1.

### B1a2R — Sliding-window log / counter

- **Exact log (B1a2RL):** store every request timestamp; count those within the window. Exact but O(n) memory per key — fine for low rates, bad for chat-scale.
- **Approximate counter (B1a2RR):** Redis ZSET (`ZREMRANGEBYSCORE` + `ZCARD`) or the weighted fixed-window approximation (count in current window × remaining fraction + previous window × elapsed fraction). The approximation is what most production limiters use (Cloudflare's approach); memory O(1) per key.

## Synthesis — design space

1. **Recommended v1:** token bucket per (key, source-app, profile) with three dimensions (RPM, ITPM, OTPM), in-memory, zero-dep, mirroring `custom-server.rate-limiter.js` conventions. Emit `x-ratelimit-limit/remaining/reset` headers (phase-1 M2).
2. **Keep** the existing fixed-window limiter as the *coarse* per-IP guard (cheap, catches floods); add the token bucket as the *fine* per-identity limiter. Two layers, different granularity.
3. **Boundary burst:** fixed window's weakness is acceptable at the coarse layer (it's a flood guard); the token bucket at the fine layer has no boundary problem.
4. **Scale-out:** GCRA/Redis documented as the multi-instance path; not v1.
5. **Upstream mirroring:** per-provider limits (from provider config) can seed the token bucket so the gateway pre-enforces upstream quota — connects to B3 (model-group limiting).

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Multi-dimensional limits (RPM/ITPM/OTPM) are the right shape | High |
| Token bucket is the right fine-grained algorithm | High |
| In-memory zero-dep is right for single-process 9router | High |
| Fixed-window boundary burst is a real but acceptable coarse-layer flaw | High |
| GCRA/Redis only for multi-instance | High |

## Open questions

1. Should ITPM/OTPM be enforced per-request (count tokens before dispatch) or post-hoc (count after)? Pre-dispatch needs a token estimate — the translator already computes token usage for usage tracking, so pre-dispatch estimation is feasible.
2. Do per-source-app limits default to the same values as per-key limits, or stricter?
3. Should the coarse per-IP limiter stay fixed-window or be upgraded to the token bucket too (unify the code)?

## Sources

- Code: `custom-server.rate-limiter.js` (read in prior research)
- Prior research: `2026-08-31-message-origin-and-destination-research.md` (M2), `2026-09-14-keyless-governance-research.md`
- Industry: Anthropic rate-limit docs (RPM/ITPM/OTPM), Wikipedia leaky bucket / token bucket (fetched 2026-09-15), ITU-T I.371 GCRA, Redis CL.THROTTLE