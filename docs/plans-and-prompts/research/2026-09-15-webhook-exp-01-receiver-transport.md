# Exponential Branch 01 — Receiver & Transport (R01–R04)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #receiver #transport #http #branch-exp-01

## Objective

N-ary exponential expansion (6 levels, N children per node) of the receiver/transport roots: R01 webhook receiver endpoint, R02 raw body preservation, R03 payload size limits, R04 response contract.

## R01 — Webhook receiver endpoint

```
L0 R01: WEBHOOK RECEIVER ENDPOINT
├─ L1: route design
│  ├─ L2: path shape (/api/webhooks/[id])
│  │  ├─ L3: dynamic segment [id]
│  │  │  ├─ L4: UUID vs slug vs numeric
│  │  │  │  ├─ L5: UUID (Home Assistant, Svix)
│  │  │  │  │  └─ L6: 128-bit entropy, unguessable
│  │  │  │  ├─ L5: slug (Healthchecks.io)
│  │  │  │  │  └─ L6: human-readable, less entropy
│  │  │  │  └─ L5: numeric (Stripe)
│  │  │  │     └─ L6: sequential, needs auth
│  │  │  └─ L4: id = secret (UUID-as-password)
│  │  │     ├─ L5: Home Assistant pattern
│  │  │     │  └─ L6: POST /api/webhook/<webhook_id>
│  │  │     └─ L5: 9router: id in URL + HMAC header
│  │  │        └─ L6: defense in depth
│  │  ├─ L3: Next.js route handler (src/app/api/webhooks/[id]/route.js)
│  │  │  ├─ L4: POST method only
│  │  │  │  ├─ L5: 405 for others
│  │  │  │  └─ L6: OPTIONS for CORS
│  │  │  └─ L4: dynamic import (edge vs node runtime)
│  │  │     ├─ L5: node runtime (crypto, sqlite)
│  │  │     └─ L6: no edge for local gateway
│  │  └─ L3: versioning (/api/v1/webhooks)
│  │     ├─ L4: version in path (Stripe)
│  │     └─ L4: version in header (GitHub)
│  ├─ L2: method handling
│  │  ├─ L3: POST (create event)
│  │  │  ├─ L4: body = event payload
│  │  │  └─ L4: content-type application/json
│  │  ├─ L3: GET (challenge/health)
│  │  │  ├─ L4: challenge handshake (Slack URL verification)
│  │  │  └─ L4: health check (Uptime Kuma)
│  │  └─ L3: DELETE (disable)
│  │     └─ L4: admin-only
│  └─ L2: middleware chain
│     ├─ L3: rate limiting (custom-server.rate-limiter.js)
│     │  ├─ L4: per-endpoint cap
│     │  └─ L4: 429 + Retry-After
│     ├─ L3: IP allowlist (local_only)
│     │  ├─ L4: loopback only
│     │  └─ L4: configurable CIDR
│     └─ L3: logging (usageDb)
│        ├─ L4: request capture
│        └─ L4: error fingerprints
├─ L1: endpoint lifecycle
│  ├─ L2: creation (dashboard UI)
│  │  ├─ L3: generate secret
│  │  ├─ L3: name + description
│  │  └─ L3: enabled toggle
│  ├─ L2: listing (dashboard)
│  │  ├─ L3: table of endpoints
│  │  └─ L3: last-event status
│  └─ L2: deletion
│     ├─ L3: soft delete (archive)
│     └─ L3: hard delete
└─ L1: exposure
   ├─ L2: localhost only
   │  ├─ L3: 127.0.0.1 binding
   │  └─ L3: no tunnel needed
   ├─ L2: tunnel (cloudflared/ngrok)
   │  ├─ L3: public URL
   │  ├─ L3: HMAC protects
   │  └─ L3: tunnel config in settings
   └─ L2: reverse proxy
      ├─ L3: custom-server.js XFF stripping
      └─ L3: TLS termination
```

## R02 — Raw body preservation

```
L0 R02: RAW BODY PRESERVATION
├─ L1: why raw body matters
│  ├─ L2: HMAC computed over exact bytes
│  │  ├─ L3: Svix/Standard Webhooks mandate
│  │  │  ├─ L4: req.text() before JSON.parse
│  │  │  │  ├─ L5: Next.js App Router
│  │  │  │  │  └─ L6: await request.text() once
│  │  │  │  └─ L5: re-parse for handler
│  │  │  │     └─ L6: JSON.parse(rawBody)
│  │  │  └─ L4: body re-serialization breaks HMAC
│  │  │     ├─ L5: key order changes
│  │  │     └─ L6: whitespace changes
│  │  └─ L3: Stripe t=,v1= over raw body
│  │     └─ L4: same principle
│  ├─ L2: signature schemes need exact bytes
│  │  ├─ L3: Slack v0:timestamp:raw
│  │  ├─ L3: GitHub X-Hub-Signature-256
│  │  └─ L3: Discord Ed25519
│  └─ L2: content-type variations
│     ├─ L3: application/json
│     ├─ L3: application/x-www-form-urlencoded (Telegram)
│     └─ L3: text/plain (some providers)
├─ L1: implementation
│  ├─ L2: Next.js request.text()
│  │  ├─ L3: single read
│  │  │  ├─ L4: cache in closure
│  │  │  └─ L4: pass to verify + handler
│  │  └─ L3: body size guard
│  │     └─ L4: cap before read
│  ├─ L2: buffer vs string
│  │  ├─ L3: Buffer for binary
│  │  └─ L3: string for JSON
│  └─ L2: streaming bodies
│     ├─ L3: read fully (webhooks are small)
│     └─ L3: no streaming for HMAC
└─ L1: edge cases
   ├─ L2: empty body
   │  ├─ L3: reject (no signature)
   │  └─ L3: 400
   ├─ L2: gzip/compressed
   │  ├─ L3: decompress first
   │  └─ L3: content-encoding header
   └─ L2: charset
      ├─ L3: utf-8 assumed
      └─ L3: explicit charset header
```

## R03 — Payload size limits

```
L0 R03: PAYLOAD SIZE LIMITS
├─ L1: limits by platform
│  ├─ L2: n8n 16MB cap
│  │  ├─ L3: webhook node max
│  │  └─ L3: configurable
│  ├─ L2: Pipedream 5TB uploads
│  │  ├─ L3: file uploads via presigned URLs
│  │  └─ L3: not inline JSON
│  ├─ L2: Slack 16KB (events)
│  │  └─ L3: truncation
│  ├─ L2: GitHub 25MB (deliveries)
│  │  └─ L3: large payloads
│  └─ L2: Stripe 16KB (events)
│     └─ L3: documented limit
├─ L1: 9router design
│  ├─ L2: default cap
│  │  ├─ L3: 1MB (generous for AI events)
│  │  │  ├─ L4: configurable in settings
│  │  │  └─ L4: 413 on exceed
│  │  └─ L3: per-endpoint override
│  ├─ L2: large payload offload
│  │  ├─ L3: reject with 413 + guidance
│  │  │  └─ L4: sender should use smaller events
│  │  └─ L3: store-to-disk option (v2)
│  │     └─ L4: reference in event row
│  └─ L2: body read guard
│     ├─ L3: content-length check
│     └─ L3: streaming cap
└─ L1: consequences
   ├─ L2: memory (single-node)
   │  └─ L3: 1MB × concurrent = fine
   ├─ L2: DB row size
   │  └─ L3: outbox stores payload
   └─ L2: HMAC over large body
      └─ L3: still fine (hash)
```

## R04 — Response contract (2xx <3s)

```
L0 R04: RESPONSE CONTRACT (2xx <3s)
├─ L1: why 2xx fast
│  ├─ L2: Slack 3-second rule
│  │  ├─ L3: retries on timeout
│  │  │  ├─ L4: x-slack-retry-num 1/2/3
│  │  │  └─ L4: duplicate events
│  │  └─ L3: Socket Mode ack
│  ├─ L2: Discord 3-second rule
│  │  ├─ L3: interaction must ack
│  │  └─ L3: deferred responses
│  ├─ L2: Pipedream $.respond({immediate:true})
│  │  └─ L3: ack-then-process
│  └─ L2: Stripe retries
│     ├─ L3: 3 days of retries
│     └─ L3: exponential backoff
├─ L1: 9router design
│  ├─ L2: verify → enqueue → 200
│  │  ├─ L3: never process in route
│  │  │  ├─ L4: Slack "implement a queue" mandate
│  │  │  └─ L4: outbox worker (R10)
│  │  └─ L3: 200 with {accepted: true}
│  ├─ L2: error responses
│  │  ├─ L3: 400 invalid signature
│  │  ├─ L3: 401 bad secret
│  │  ├─ L3: 413 too large
│  │  └─ L3: 500 unexpected
│  └─ L2: challenge handshake
│     ├─ L3: GET returns challenge
│     │  └─ L4: Slack URL verification
│     └─ L3: POST echo (v2)
└─ L1: idempotency for retries
   ├─ L2: event_id dedupe
   │  ├─ L3: Stripe Idempotency-Key
   │  ├─ L3: GitHub delivery GUID
   │  └─ L3: outbox unique constraint
   └─ L2: duplicate window
      ├─ L3: 5-min tolerance
      └─ L3: configurable
```

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| R01-L6-1 | UUID-as-password in path = unguessable endpoint | Home Assistant, Svix |
| R01-L6-2 | Node runtime for crypto/sqlite | Next.js |
| R01-L6-3 | 405 for non-POST, OPTIONS for CORS | HTTP spec |
| R01-L6-4 | Rate limit per endpoint + 429 Retry-After | custom-server.rate-limiter.js |
| R01-L6-5 | Loopback-only binding for local gateway | 9router local-first |
| R02-L6-1 | req.text() once, cache, re-parse | Svix/Next.js |
| R02-L6-2 | Re-serialization breaks HMAC (key order/whitespace) | Standard Webhooks |
| R02-L6-3 | Buffer for binary, string for JSON | Node.js |
| R02-L6-4 | Reject empty body (no signature) | Stripe |
| R03-L6-1 | 1MB default cap, configurable, 413 | n8n 16MB, Stripe 16KB |
| R03-L6-2 | Content-length check before read | HTTP spec |
| R03-L6-3 | Store-to-disk offload v2 | Pipedream presigned URLs |
| R04-L6-1 | Verify → enqueue → 200, never process in route | Slack queue mandate |
| R04-L6-2 | 400/401/413/500 error contract | Stripe |
| R04-L6-3 | event_id dedupe for retries | Stripe/GitHub |
| R04-L6-4 | 5-min duplicate window | Slack |

## Related Docs

- Master map: `2026-09-15-webhook-exponential-master-map.md`
- Prior 2-way spine: `2026-09-15-webhook-master-research-tree.md`, `2026-09-15-webhook-branch-a1a-transport.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 4 M1, Part 5 D3)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M1)