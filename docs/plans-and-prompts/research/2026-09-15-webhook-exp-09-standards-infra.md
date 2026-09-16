# Exponential Branch 09 — Standards & Infrastructure (R26–R29)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #standards #stripe #github #svix #hookdeck #branch-exp-09

## Objective

N-ary exponential expansion (6 levels, N children per node) of the standards/infrastructure roots: R26 Stripe webhook model, R27 GitHub webhook model, R28 Svix / Standard Webhooks, R29 Hookdeck.

## R26 — Stripe webhook model

```
L0 R26: STRIPE WEBHOOK MODEL
├─ L1: signature scheme
│  ├─ L2: t=,v1= header
│  │  ├─ L3: t = timestamp
│  │  │  ├─ L4: seconds since epoch
│  │  │  │  └─ L5: replay protection
│  │  │  └─ L4: tolerance 5 min
│  │  │     └─ L5: configurable
│  │  └─ L3: v1 = HMAC-SHA256
│  │     ├─ L4: key = webhook secret
│  │     │  └─ L5: whsec_ prefix
│  │     └─ L4: message = timestamp + "." + raw body
│  │        └─ L5: exact bytes
│  ├─ L2: verification
│  │  ├─ L3: compute expected
│  │  │  └─ L4: timingSafeEqual
│  │  └─ L3: compare
│  │     └─ L4: constant-time
│  └─ L2: multiple signatures
│     ├─ L3: v1=...,v1=...
│     │  └─ L4: any match
│     └─ L3: rotation support
│        └─ L4: dual-secret grace
├─ L1: event model
│  ├─ L2: event object
│  │  ├─ L3: id (evt_...)
│  │  │  └─ L4: idempotency key
│  │  ├─ L3: type (e.g. invoice.paid)
│  │  │  └─ L4: dot notation
│  │  ├─ L3: data.object
│  │  │  └─ L4: payload
│  │  ├─ L3: created
│  │  ├─ L3: livemode
│  │  └─ L3: api_version
│  │     └─ L4: versioning
│  └─ L2: event types
│     ├─ L3: *.* wildcard
│     │  └─ L4: subscribe all
│     └─ L3: granular
│        └─ L4: invoice.paid only
├─ L1: delivery
│  ├─ L2: retries
│  │  ├─ L3: 3 days
│  │  │  ├─ L4: exponential backoff
│  │  │  │  └─ L5: 1min → 10min → 100min → ...
│  │  │  └─ L4: same event id
│  │  │     └─ L5: dedupe
│  │  └─ L3: disabled after
│  │     └─ L4: dashboard shows
│  ├─ L2: idempotency
│  │  ├─ L3: process once
│  │  │  └─ L4: event id unique
│  │  └─ L3: replay
│  │     └─ L4: dashboard
│  └─ L2: response
│     ├─ L3: 2xx = success
│     │  └─ L4: no retry
│     └─ L3: non-2xx = retry
│        └─ L4: 3 days
├─ L1: dashboard
│  ├─ L2: event log
│  │  ├─ L3: status per delivery
│  │  │  └─ L4: pending/succeeded/failed
│  │  └─ L3: payload viewer
│  ├─ L2: endpoint management
│  │  ├─ L3: create/disable
│  │  └─ L3: secret rotation
│  └─ L2: replay
│     └─ L3: resend event
└─ L1: 9router adoption
   ├─ L2: signature format
   │  ├─ L3: t=,v1= (Stripe-style)
   │  │  └─ L4: R05
   │  └─ L3: or Standard Webhooks v1,
   │     └- L4: R28
   ├─ L2: event id dedupe
   │  └─ L3: R11
   └─ L2: retry window
      ├─ L3: shorter (local)
      │  └─ L4: 5 attempts
      └─ L3: configurable
```

## R27 — GitHub webhook model

```
L0 R27: GITHUB WEBHOOK MODEL
├─ L1: signature scheme
│  ├─ L2: X-Hub-Signature-256
│  │  ├─ L3: HMAC-SHA256
│  │  │  ├─ L4: key = secret
│  │  │  │  └─ L5: sha256=hex
│  │  │  └─ L4: raw body
│  │  │     └─ L5: exact bytes
│  │  └─ L3: X-Hub-Signature (legacy)
│  │     └─ L4: SHA-1
│  ├─ L2: X-GitHub-Event
│  │  ├─ L3: event type header
│  │  │  └─ L4: push, issues, ...
│  │  └─ L3: routing
│  │     └- L4: by header not body
│  ├─ L2: X-GitHub-Delivery
│  │  ├─ L3: GUID
│  │  │  └─ L4: idempotency
│  │  └─ L3: unique per delivery
│  │     └- L4: dedupe
│  └─ L2: X-GitHub-Hook-ID
│     └─ L3: hook identifier
├─ L1: event model
│  ├─ L2: payload per event
│  │  ├─ L3: push
│  │  │  └─ L4: commits, ref
│  │  ├─ L3: issues
│  │  │  └─ L4: action, issue
│  │  ├─ L3: pull_request
│  │  │  └─ L4: action, PR
│  │  └─ L3: workflow_run
│  │     └─ L4: CI status
│  └─ L2: action field
│     ├- L3: opened/closed/...
│     └─ L3: filter
├─ L1: delivery
│  ├─ L2: retries
│  │  ├─ L3: 3 attempts
│  │  │  └─ L4: 1min, 5min, 15min
│  │  └─ L3: same delivery GUID
│  │     └- L4: dedupe
│  ├─ L2: response
│  │  ├─ L3: 2xx = success
│  │  └─ L3: non-2xx = retry
│  └─ L2: redelivery
│     ├- L3: dashboard
│     └─ L3: same GUID
├─ L1: management
│  ├─ L2: webhook settings
│  │  ├─ L3: URL, secret, events
│  │  │  └─ L4: content-type
│  │  │     └- L5: json vs form
│  │  └─ L3: active toggle
│  ├─ L2: recent deliveries
│  │  ├─ L3: status list
│  │  │  └─ L4: response code
│  │  └─ L3: payload view
│  └─ L2: ping event
│     ├- L3: test
│     └─ L3: zen
└─ L1: 9router adoption
   ├─ L2: event header routing
   │  ├- L3: X-Event-Type header
   │  │  └─ L4: rule trigger
   │  └─ L3: vs body field
   │     └- L4: both (v2)
   ├─ L2: delivery GUID
   │  └─ L3: R11
   └─ L2: ping event
      └─ L3: health check
```

## R28 — Svix / Standard Webhooks

```
L0 R28: SVIX / STANDARD WEBHOOKS
├─ L1: Standard Webhooks spec
│  ├─ L2: headers
│  │  ├─ L3: webhook-id
│  │  │  ├─ L4: unique message id
│  │  │  │  └─ L5: idempotency
│  │  │  └─ L4: msg_ prefix
│  │  ├─ L3: webhook-timestamp
│  │  │  ├─ L4: Unix seconds
│  │  │  │  └─ L5: tolerance 5 min
│  │  │  └─ L4: replay protection
│  │  └─ L3: webhook-signature
│  │     ├- L4: v1,<base64>
│  │     │  └─ L5: HMAC-SHA256
│  │     └─ L4: multiple sigs
│  │        └─ L5: rotation
│  ├─ L2: signing
│  │  ├─ L3: secret whsec_ prefix
│  │  │  └─ L4: base64
│  │  ├─ L3: message = id + "." + timestamp + "." + raw body
│  │  │  └─ L4: exact bytes
│  │  └─ L3: HMAC-SHA256
│  │     └─ L4: timingSafeEqual
│  ├─ L2: verification
│  │  ├─ L3: any signature matches
│  │  │  └─ L4: rotation grace
│  │  └─ L3: timestamp check
│  │     └─ L4: reject stale
│  └─ L2: spec status
│     ├- L3: standardwebhooks.com
│     │  └─ L4: open spec
│     └─ L3: adopted by
│        ├- L4: Svix
│        ├─ L4: Kong
│        ├─ L4: ngrok
│        └─ L4: others
├─ L1: Svix platform
│  ├─ L2: managed webhooks
│  │  ├─ L3: send + receive
│  │  │  └─ L4: dashboard
│  │  └─ L3: retries
│  │     ├- L4: exponential
│  │     │  └─ L5: configurable
│  │     └─ L4: dead-letter
│  ├─ L2: libraries
│  │  ├─ L3: SDKs
│  │  │  └─ L4: JS, Python, Go, ...
│  │  └─ L3: verify functions
│  │     └─ L4: Webhook.verify()
│  └─ L2: self-host
│     ├- L3: open source
│     │  └─ L4: Rust
│     └─ L3: Docker
├─ L1: 9router adoption
│  ├─ L2: spec compliance
│  │  ├- L3: webhook-id/timestamp/signature
│  │  │  └─ L4: R05
│  │  └─ L3: raw body req.text()
│  │     └─ L4: R02
│  ├─ L2: outbound (v2)
│  │  ├- L3: sign outgoing
│  │  │  └─ L4: same spec
│  │  └─ L3: retries
│  │     └─ L4: R10
│  └─ L2: verify lib
│     ├- L3: implement
│     │  └─ L4: ~50 lines
│     └─ L3: or use svix SDK
│        └─ L4: optional dep
```

## R29 — Hookdeck

```
L0 R29: HOOKDECK
├─ L1: model
│  ├─ L2: source → connection → destination
│  │  ├─ L3: source (ingress)
│  │  │  ├- L4: URL per source
│  │  │  │  └─ L5: auth
│  │  │  └─ L4: verification
│  │  ├─ L3: connection (rules)
│  │  │  ├- L4: filters
│  │  │  │  └─ L5: JSONPath
│  │  │  ├─ L4: transforms
│  │  │  │  └─ L5: code
│  │  │  ├─ L4: retries
│  │  │  │  └─ L5: policy
│  │  │  └─ L4: rate limit
│  │  │     └─ L5: per connection
│  │  └─ L3: destination (egress)
│  │     ├- L4: URL
│  │     │  └─ L5: auth
│  │     └─ L4: format
│  │        └─ L5: passthrough/transform
│  ├─ L2: dedup
│  │  ├- L3: by event id
│  │  │  └─ L4: configurable
│  │  └─ L3: window
│  │     └─ L4: seconds
│  └─ L2: retries
│     ├- L3: exponential
│     │  └─ L4: configurable
│     └─ L3: dead-letter
│        └─ L4: replay
├─ L1: features
│  ├─ L2: dashboard
│  │  ├- L3: event log
│  │  │  └─ L4: per connection
│  │  └─ L3: replay
│  ├─ L2: CLI
│  │  └─ L3: hookdeck CLI
│  ├─ L2: SDKs
│  │  └─ L3: JS, Python
│  └─ L2: self-host
│     └─ L3: open source
├─ L1: 9router adoption
│  ├─ L2: concepts map
│  │  ├- L3: source = R01 endpoint
│  │  ├─ L3: connection = R12 rules
│  │  │  └─ L4: filters = R13
│  │  └─ L3: destination = R14 actions
│  ├─ L2: JSONPath filters
│  │  └─ L3: R13 v2
│  └─ L2: dedup + retry
│     └─ L3: R11 + R10
└─ L1: comparison
   ├─ L2: vs 9router (embedded)
   │  ├- L3: Hookdeck = external service
   │  │  └─ L4: 9router = embedded
   │  └─ L3: same concepts
   │     └─ L4: simpler
   └─ L2: when to use Hookdeck
      ├- L3: multi-destination
      └─ L3: complex routing
```

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| R26-L6-1 | t=,v1= HMAC-SHA256, 5-min tolerance | Stripe |
| R26-L6-2 | whsec_ secret, dual-secret rotation | Stripe |
| R26-L6-3 | event id evt_ = idempotency key | Stripe |
| R26-L6-4 | 3-day retry window, exponential | Stripe |
| R26-L6-5 | Dashboard: event log, replay | Stripe |
| R27-L6-1 | X-Hub-Signature-256, raw body | GitHub |
| R27-L6-2 | X-GitHub-Event header routing | GitHub |
| R27-L6-3 | X-GitHub-Delivery GUID dedupe | GitHub |
| R27-L6-4 | 3 retries (1/5/15min), redelivery | GitHub |
| R28-L6-1 | webhook-id/timestamp/signature spec | Standard Webhooks |
| R28-L6-2 | v1,<base64> HMAC, whsec_ secret | Standard Webhooks |
| R28-L6-3 | msg = id.timestamp.rawbody | Standard Webhooks |
| R28-L6-4 | Adopted by Svix/Kong/ngrok | Standard Webhooks |
| R29-L6-1 | source→connection→destination | Hookdeck |
| R29-L6-2 | JSONPath filters + transforms | Hookdeck |
| R29-L6-3 | Dedup by event id + window | Hookdeck |
| R29-L6-4 | Concepts map to 9router R01/R12/R14 | Hookdeck |

## Related Docs

- Master map: `2026-09-15-webhook-exponential-master-map.md` (R26–R29)
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 D1–D4)
- Auth & secrets: `2026-09-15-webhook-exp-02-auth-secrets.md` (R05–R08)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M1)