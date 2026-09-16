# Exponential Branch 02 — Auth & Secrets (R05–R08)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #auth #hmac #secrets #security #branch-exp-02

## Objective

N-ary exponential expansion (6 levels, N children per node) of the auth/secrets roots: R05 HMAC signature verification, R06 secret management (UUID-as-password), R07 secret rotation, R08 timing-safe comparison.

## R05 — HMAC signature verification

```
L0 R05: HMAC SIGNATURE VERIFICATION
├─ L1: signature schemes
│  ├─ L2: Stripe t=,v1=
│  │  ├─ L3: header format
│  │  │  ├─ L4: t=timestamp,v1=hex
│  │  │  │  ├─ L5: parse comma-separated
│  │  │  │  │  └─ L6: split on comma, key=value
│  │  │  │  └─ L5: v1 = HMAC-SHA256
│  │  │  │     └─ L6: hex digest
│  │  │  └─ L4: multiple signatures
│  │  │     └─ L5: accept any matching
│  │  └─ L3: tolerance
│  │     ├─ L4: 5-min skew
│  │     │  ├─ L5: replay window
│  │     │  └─ L5: clock skew allowance
│  │     └─ L4: configurable
│  ├─ L2: Standard Webhooks v1,
│  │  ├─ L3: webhook-id, webhook-timestamp, webhook-signature
│  │  │  ├─ L4: signature = v1,base64(hmac)
│  │  │  │  ├─ L5: base64 not hex
│  │  │  │  └─ L5: HMAC-SHA256
│  │  │  └─ L4: id = idempotency key
│  │  │     └─ L5: dedupe
│  │  └─ L3: raw body requirement
│  │     └─ L4: exact bytes
│  ├─ L2: Slack v0:timestamp:raw
│  │  ├─ L3: HMAC-SHA256
│  │  │  └─ L4: v0=hex
│  │  └─ L3: 5-min tolerance
│  ├─ L2: GitHub X-Hub-Signature-256
│  │  ├─ L3: HMAC-SHA256 hex
│  │  └─ L3: sha256= prefix
│  └─ L2: Discord Ed25519
│     ├─ L3: public-key crypto
│     │  ├─ L4: X-Signature-Ed25519
│     │  └─ L4: X-Signature-Timestamp
│     └─ L3: no shared secret
│        └─ L4: verify with public key
├─ L1: verification mechanics
│  ├─ L2: compute HMAC
│  │  ├─ L3: crypto.createHmac
│  │  │  ├─ L4: sha256
│  │  │  └─ L4: secret key
│  │  ├─ L3: update with raw body
│  │  │  └─ L4: exact bytes
│  │  └─ L3: digest
│  │     ├─ L4: hex vs base64
│  │     └─ L4: match scheme
│  ├─ L2: compare
│  │  ├─ L3: timingSafeEqual
│  │  │  ├─ L4: equal-length buffers
│  │  │  │  ├─ L5: pad if needed
│  │  │  │  └─ L5: hash both sides
│  │  │  └─ L4: constant-time
│  │  └─ L3: never string ===
│  │     └─ L4: timing leak
│  └─ L2: timestamp check
│     ├─ L3: abs(now - t) < 300s
│     │  └─ L4: reject stale
│     └─ L3: replay protection
│        └─ L4: nonce/event_id
├─ L1: failure handling
│  ├─ L2: 400 invalid signature
│  │  └─ L3: log + no retry hint
│  ├─ L2: 401 bad secret
│  │  └─ L3: log + alert
│  └─ L2: 408 stale timestamp
│     └─ L3: sender clock skew
└─ L1: multi-scheme support
   ├─ L2: per-endpoint scheme config
   │  ├─ L3: stripe | standard | slack | github | discord
   │  │  └─ L4: settings field
   │  └─ L3: auto-detect
   │     └─ L4: header inspection
   └─ L2: custom HMAC (v2)
      ├─ L3: user-defined template
      └─ L3: custom header names
```

## R06 — Secret management (UUID-as-password)

```
L0 R06: SECRET MANAGEMENT (UUID-AS-PASSWORD)
├─ L1: secret ID in URL
│  ├─ L2: Home Assistant pattern
│  │  ├─ L3: POST /api/webhook/<webhook_id>
│  │  │  ├─ L4: id IS the auth
│  │  │  │  ├─ L5: no headers needed
│  │  │  │  └─ L5: simple for senders
│  │  │  └─ L4: unguessable
│  │  │     └─ L5: UUID v4
│  │  └─ L3: no TLS requirement (still recommended)
│  ├─ L2: Svix endpoint secret
│  │  ├─ L3: whsec_ prefix
│  │  │  └─ L4: recognizable
│  │  └─ L3: shown once
│  │     └─ L4: copy on creation
│  └─ L2: 9router design
│     ├─ L3: /api/webhooks/<uuid>
│     │  ├─ L4: uuid = secret
│     │  │  ├─ L5: 128-bit entropy
│     │  │  └─ L5: crypto.randomUUID()
│     │  └─ L4: + HMAC header (defense in depth)
│     │     └─ L5: both required
│     └─ L3: local_only binding
│        ├─ L4: reject non-loopback
│        │  └─ L5: custom-server.js IP derivation
│        └─ L4: configurable
├─ L1: storage
│  ├─ L2: settingsRepo
│  │  ├─ L3: webhookEndpoints array
│  │  │  ├─ L4: {id, secretHash, name, enabled}
│  │  │  │  ├─ L5: store hash not plaintext
│  │  │  │  │  └─ L6: sha256(secret)
│  │  │  │  └─ L5: never log secret
│  │  │  └─ L4: PATCH-able
│  │  └─ L3: PROTECTED_SETTING_KEYS
│  │     ├─ L4: add webhookSecrets
│  │     │  └─ L5: never returned by API
│  │     └─ L4: like password/mitmSudoEncrypted
│  └─ L2: env var (v2)
│     ├─ L3: WEBHOOK_SECRETS
│     └─ L3: for headless setup
└─ L1: secret properties
   ├─ L2: entropy
   │  ├─ L3: UUID v4 = 122 bits
   │  └─ L3: randomBytes(32) hex = 256 bits
   ├─ L2: length
   │  ├─ L3: 32+ chars
   │  └─ L3: no short secrets
   └─ L2: visibility
      ├─ L3: shown once at creation
      └─ L3: copy button
```

## R07 — Secret rotation

```
L0 R07: SECRET ROTATION
├─ L1: rotation models
│  ├─ L2: Svix whsec_ rotation
│  │  ├─ L3: dual-secret grace
│  │  │  ├─ L4: old + new valid
│  │  │  │  ├─ L5: sender updates at leisure
│  │  │  │  └─ L5: no downtime
│  │  │  └─ L4: revoke old after window
│  │  │     └─ L5: configurable days
│  │  └─ L3: endpoint secret page
│  │     └─ L4: rotate button
│  ├─ L2: Stripe
│  │  ├─ L3: sign in to rotate
│  │  └─ L3: immediate effect
│  ├─ L2: GitHub
│  │  ├─ L3: regenerate token
│  │  └─ L3: old invalid immediately
│  └─ L2: Slack
│     ├─ L3: regenerate signing secret
│     └─ L3: app-level
├─ L1: 9router design
│  ├─ L2: rotate endpoint
│  │  ├─ L3: POST /api/webhooks/[id]/rotate
│  │  │  ├─ L4: generates new secret
│  │  │  │  ├─ L5: dual-secret grace (7d default)
│  │  │  │  │  └─ L6: both accepted
│  │  │  │  └─ L5: old expires
│  │  │  └─ L4: returns new secret once
│  │  └─ L3: audit log entry
│  │     └─ L4: who/when
│  └─ L2: auto-rotation (v2)
│     ├─ L3: schedule
│     └─ L3: notify sender
└─ L1: rotation risks
   ├─ L2: sender not updated
   │  ├─ L3: grace period mitigates
   │  └─ L3: alert on repeated 401
   ├─ L2: secret leak
   │  ├─ L3: immediate rotate
   │  └─ L3: revoke old now
   └─ L2: lost secret
      ├─ L3: regenerate
      └─ L3: sender must reconfigure
```

## R08 — Timing-safe comparison

```
L0 R08: TIMING-SAFE COMPARISON
├─ L1: why constant-time
│  ├─ L2: timing side channel
│  │  ├─ L3: string === short-circuits
│  │  │  ├─ L4: first mismatch returns
│  │  │  │  ├─ L5: attacker measures
│  │  │  │  └─ L5: byte-by-byte recovery
│  │  │  └─ L4: length leak
│  │  └─ L3: HMAC comparison
│  │     └─ L4: compare digests not secrets
│  └─ L2: local gateway threat model
│     ├─ L3: low risk (loopback)
│     │  └─ L4: still best practice
│     └─ L3: tunnel exposure
│        └─ L4: timing attacks possible
├─ L1: implementation
│  ├─ L2: crypto.timingSafeEqual
│  │  ├─ L3: equal-length buffers
│  │  │  ├─ L4: pad shorter
│  │  │  │  ├─ L5: Buffer.alloc
│  │  │  │  └─ L5: hash both to equalize
│  │  │  └─ L4: both hex-decoded
│  │  └─ L3: returns boolean
│  │     └─ L4: no early exit
│  └─ L2: alternatives
│     ├─ L3: double-HMAC
│     │  └─ L4: hmac(secret, hmac(secret, msg))
│     └─ L3: hash-then-compare
│        └─ L4: sha256 both sides
└─ L1: pitfalls
   ├─ L2: length mismatch
   │  ├─ L3: throw or pad
   │  └─ L3: never return early
   ├─ L2: encoding mismatch
   │  ├─ L3: hex vs base64
   │  └─ L3: normalize first
   └─ L2: logging secrets
      ├─ L3: never log signature
      └─ L3: log only outcome
```

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| R05-L6-1 | Parse t=,v1= comma-separated; v1 = HMAC-SHA256 hex | Stripe |
| R05-L6-2 | Standard Webhooks: v1,base64(hmac); id = dedupe | Svix |
| R05-L6-3 | Slack v0:timestamp:raw, 5-min tolerance | Slack |
| R05-L6-4 | Discord Ed25519 public-key verify | Discord |
| R05-L6-5 | timingSafeEqual on equal-length buffers | Node.js |
| R05-L6-6 | Reject stale timestamps (>5min) | Stripe/Slack |
| R06-L6-1 | UUID v4 in path = 122-bit unguessable secret | Home Assistant |
| R06-L6-2 | Store sha256 hash, never plaintext | security best practice |
| R06-L6-3 | PROTECTED_SETTING_KEYS for webhook secrets | 9router settingsRepo |
| R06-L6-4 | local_only loopback binding | 9router custom-server.js |
| R07-L6-1 | Dual-secret grace (7d) during rotation | Svix |
| R07-L6-2 | Rotate endpoint + audit log | Stripe/GitHub |
| R07-L6-3 | Alert on repeated 401 after rotation | ops best practice |
| R08-L6-1 | timingSafeEqual, pad to equal length | Node.js |
| R08-L6-2 | Compare digests, never raw secrets | crypto best practice |
| R08-L6-3 | Never log signatures | security best practice |

## Related Docs

- Master map: `2026-09-15-webhook-exponential-master-map.md`
- Prior 2-way spine: `2026-09-15-webhook-master-research-tree.md`, `2026-09-15-webhook-branch-a1b-auth-security.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 D1 Stripe, D3 Svix, C1 Slack, C2 Discord; Part 5 D1)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M1)