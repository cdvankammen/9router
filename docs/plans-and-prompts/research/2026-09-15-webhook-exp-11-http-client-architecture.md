# Exponential Branch 11 — HTTP Client Architecture (R47–R48)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #http-client #undici #fetch #retry #timeout #branch-exp-11

## Objective

N-ary exponential expansion (6 levels, N children per node) of the outbound HTTP client roots: R47 client stack, R48 timeout & retry semantics.

## R47 — HTTP client stack

```
L0 R15: HTTP CLIENT STACK
├─ L1: fetch vs undici vs axios
│  ├─ L2: built-in fetch (Node 18+)
│  │  ├─ L3: zero dependency
│  │  │  ├─ L4: works everywhere
│  │  │  │  ├─ L5: no install
│  │  │  │  │  └─ L6: ✓
│  │  │  │  └─ L5: CLI + server parity
│  │  │  │     └─ L6: one impl
│  │  │  └─ L4: ESM native
│  │  │     └─ L5: aligns 9router ESM
│  ├─ L2: undici (fetch impl)
│  │  ├─ L3: Node's internal fetch
│  │  │  └─ L4: reuse, no pin
│  │  └─ L3: Interceptors API
│  │     ├─ L4: retry interceptor
│  │     │  └─ L5: 9router retry wrapper
│  │     └─ L4: cache interceptor
│  │        └─ L5: for idempotent GET
│  └─ L2: axios
│     ├─ L3: battle-tested
│     │  └─ L4: 105k★
│     └─ L3: but extra dep
│        └─ L4: why add?
├─ L1: agent & DNS
│  ├─ L2: custom Agent (undici)
│  │  ├─ L3: keep-alive
│  │  │  ├─ L4: reuse sockets
│  │  │  │  └─ L5: outbound bursts (B1b)
│  │  │  └─ L4: connections setting
│  │  │     └─ L5: cap per origin
│  │  └─ L3: TLS options
│  │     ├─ L4: SNI
│  │     └─ L4: custom CA
│  └─ L2: DNS
│     ├─ L3: Happy Eyeballs (Node)
│     │  └─ L4: default
│     └─ L3: custom resolver (v2)
│        └─ L4: dns.resolve
├─ L1: streaming responses
│  ├─ L2: response.body (Web Streams)
│  │  ├─ L3: SSE parsing (existing)
│  │  │  ├─ L4: instrumentation.js
│  │  │  └─ L4: llm streaming
│  │  └─ L3: text() / json()
│  │     └─ L4: small payloads
│  └─ L2: AbortController
│     ├─ L3: client abort
│     │  └─ L4: cancel mid-stream
│     └─ L3: timeout abort
│        └─ L4: R16L
└─ L1: redirects
   ├─ L2: follow (default)
   │  ├─ L3: 3xx loop guard
   │  └─ L3: preserve verb
   └─ L2: not for HMAC targets
      └─ L3: redirect = new URL
         └─ L4: breaks signature
```

## R48 — Timeout & retry semantics

```
L0 R16: TIMEOUT & RETRY SEMANTICS
├─ L1: timeouts
│  ├─ L2: connect
│  │  ├─ L3: 5s
│  │  │  └─ L4: undici connect timeout
│  │  └─ L3: socket hang
│  │     └─ L4: reset
│  ├─ L2: request (headers)
│  │  ├─ L3: 10s
│  │  │  └─ L4: headersTimeout
│  │  └─ L3: body timeout
│  │     └─ L4: separate
│  └─ L2: response
│     ├─ L3: overall 15s
│     │  ├─ L4: 9router actions
│     │  │  └─ L5: <15s action budget
│     │  └─ L4: message platforms slower
│     │     └─ L5: Slack/Discord 3s cap
│     └─ L3: per-attempt
│        └─ L4: reset on retry
├─ L1: retries
│  ├─ L2: which errors
│  │  ├─ L3: network
│  │  │  └─ L4: ECONNRESET, ENOTFOUND
│  │  ├─ L3: 5xx
│  │  │  └─ L4: retryable
│  │  ├─ L3: 408/429
│  │  │  ├─ L4: Retry-After honored
│  │  │  └─ L4: 429 backoff
│  │  └─ L3: NOT 4xx
│  │     └─ L4: permanent
│  ├─ L2: backoff
│  │  ├─ L3: exponential
│  │  │  ├─ L4: 1s 2s 4s 8s
│  │  │  └─ L4: max 30s
│  │  └─ L3: jitter
│  │     ├─ L4: full (AWS)
│  │     └─ L4: equal (Google)
│  └─ L2: max attempts
│     ├─ L3: 4 (1+3 retries)
│     │  └─ L4: configurable
│     └─ L3: per-action-type
│        ├─ L4: notify 5
│        └─ L4: http 3
└─ L1: per-action timeout budget
   ├─ L2: worker-level
   │  ├─ L3: action must finish <15s
   │  │  └─ L4: else worker alerts
   │  └─ L3: total queue latency
   │     └─ L4: dashboard
   └─ L2: combine with response contract
      ├─ L3: receiver 2xx <3s
      │  └─ L4: queue, not wait
      └─ L3: action timeout < retry horizon
         └─ L4: Slack 30k/hr
```

## L6 Leaf Summary

| Leaves | Finding | Precedent |
|--------|---------|-----------|
| R47-L6 | Native fetch (Node 18+) — zero dep, ESM-aligned | Node.js fetch, 9router ESM |
| R47-L6 | undici Interceptors for retry/cache | undici docs |
| R47-L6 | Custom Agent: keep-alive + per-origin conn cap | undici Agent |
| R47-L6 | Happy Eyeballs DNS (default) | Node.js |
| R47-L6 | Web Streams response.body for SSE | 9router instrumentation.js |
| R47-L6 | AbortController for cancel + timeout | fetch spec |
| R47-L6 | Don't follow redirects on HMAC targets | HTTP spec |
| R48-L6 | connect 5s / headers 10s / total 15s per attempt | undici timeout knobs |
| R48-L6 | Retry only network/5xx/408/429, never 4xx | standard practice |
| R48-L6 | Retry-After honored on 408/429 | HTTP spec |
| R48-L6 | Exponential 1s→2s→4s→8s, max 30s, full jitter | AWS SDK |
| R48-L6 | Max 4 attempts (1+3), per-action-type override | Pipedream |
| R48-L6 | Per-action budget 15s, worker alerts on exceed | 9router worker |
| R48-L6 | Action timeout < retry horizon (Slack 30k/hr) | Slack |

## Related Docs

- Master map: `2026-09-15-webhook-exponential-master-map.md` (R47–R48)
- Transport: `2026-09-15-webhook-exp-01-receiver-transport.md` (R01–R04, response contract)
- Worker & outbox: `2026-09-15-webhook-exp-03-event-store-worker.md` (R09–R11)
- Messaging platforms: `2026-09-15-webhook-exp-05-messaging-platforms.md` (Slack/Discord/Telegram, outbound shape)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M4 outbound)