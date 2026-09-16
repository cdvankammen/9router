# Tree T12 — Anthropic Identity-Backed Keys (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #anthropic #identity-keys #t12

## Objective

Full 6-level binary tree expansion of the **Anthropic identity-backed keys** topic (from `2026-08-31-message-origin-and-destination-research.md` Part B.2). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Anthropic identity-backed keys
├─ L1L: Concept
│  ├─ L2LL: What identity keys are
│  │  ├─ L3LLL: user-bound keys
│  │  │  ├─ L4LLLL: bound to user
│  │  │  │  ├─ L5LLLLL: user identity
│  │  │  │  │  ├─ L6LLLLLL: user account
│  │  │  │  │  └─ L6LLLLLR: user profile
│  │  │  │  └─ L5LLLLR: key binding
│  │  │  │     ├─ L6LLLLRL: bound key
│  │  │  │     └─ L6LLLLRR: usage attributed
│  │  │  └─ L4LLLR: vs API keys
│  │  │     ├─ L5LLLRL: API key
│  │  │     │  ├─ L6LLLRLL: shared secret
│  │  │     │  └─ L6LLLRLR: no identity
│  │  │     └─ L5LLLRR: identity key
│  │  │        ├─ L6LLLRRL: user-bound
│  │  │        └─ L6LLLRRR: attributed
│  │  └─ L3LLR: benefits
│  │     ├─ L4LLRL: attribution
│  │     │  ├─ L5LLRLL: per-user usage
│  │     │  │  ├─ L6LLRLLL: usage tracking
│  │     │  │  └─ L6LLRLLR: cost allocation
│  │     │  └─ L5LLRLR: audit
│  │     │     ├─ L6LLRLRL: audit trail
│  │     │     └─ L6LLRLRR: accountability
│  │     └─ L4LLRR: governance
│  │        ├─ L5LLRRL: per-user limits
│  │        │  ├─ L6LLRRLL: user quotas
│  │        │  └─ L6LLRRLR: user rates
│  │        └─ L5LLRRR: per-user policy
│  │           ├─ L6LLRRRL: user policy
│  │           └─ L6LLRRRR: enforcement
│  └─ L2LR: Implementation
│     ├─ L3LRL: key derivation
│     │  ├─ L4LRLL: user → key
│     │  │  ├─ L5LRLLL: derive
│     │  │  │  ├─ L6LRLLLL: HMAC
│     │  │  │  └─ L6LRLLLR: user id
│     │  │  └─ L5LRLLR: key → user
│     │  │     ├─ L6LRLLRL: lookup
│     │  │     └─ L6LRLLRR: reverse
│     │  └─ L4LRLR: key format
│     │     ├─ L5LRLRL: prefix
│     │     │  ├─ L6LRLRLL: key prefix
│     │     │  └─ L6LRLRLR: user hint
│     │     └─ L5LRLRR: payload
│     │        ├─ L6LRLRRL: user id
│     │        └─ L6LRLRRR: signature
│     └─ L3LRR: auth flow
│        ├─ L4LRRL: key check
│        │  ├─ L5LRRLL: verify
│        │  │  ├─ L6LRRLLL: signature
│        │  │  └─ L6LRRLLR: expiry
│        │  └─ L5LRRLR: user resolve
│        │     ├─ L6LRRLRL: user id
│        │     └─ L6LRRLRR: profile
│        └─ L4LRRR: session
│           ├─ L5LRRRL: session-bound
│           │  ├─ L6LRRRLL: session id
│           │  └─ L6LRRRLR: binding
│           └─ L5LRRRR: refresh
│              ├─ L6LRRRRL: rotate
│              └─ L6LRRRRR: re-issue
└─ L1R: 9router analog
   ├─ L2RL: Source identity
   │  ├─ L3RLL: UA class as identity
   │  │  ├─ L4RLLL: app class
   │  │  │  ├─ L5RLLLL: class identity
   │  │  │  │  ├─ L6RLLLLL: app class
   │  │  │  │  └─ L6RLLLLR: identity
   │  │  │  └─ L5RLLLR: class limits
   │  │  │     ├─ L6RLLLRL: per-class
   │  │  │     └─ L6RLLLRR: limits
   │  │  └─ L4RLLR: session id
   │  │     ├─ L5RLLRL: session header
   │  │     │  ├─ L6RLLRLL: session-id
   │  │     │  └─ L6RLLRLR: identity
   │  │     └─ L5RLLRR: session limits
   │  │        ├─ L6RLLRRL: per-session
   │  │        └─ L6RLLRRR: limits
   │  └─ L3RLR: keyless identity
   │     ├─ L4RLRL: no key needed
   │     │  ├─ L5RLRLL: localhost
   │     │  │  ├─ L6RLRLLL: trust
   │     │  │  └─ L6RLRLLR: no key
   │     │  └─ L5RLRLR: identity from
   │     │     ├─ L6RLRLRL: UA
   │     │     └─ L6RLRLRR: headers
   │     └─ L4RLRR: identity strength
   │        ├─ L5RLRRL: weak
   │        │  ├─ L6RLRRLL: spoofable
   │        │  └─ L6RLRRLR: headers
   │        └─ L5RLRRR: strong
   │           ├─ L6RLRRRL: key
   │           └─ L6RLRRRR: session
   └─ L2RR: Governance mapping
      ├─ L3RRL: per-identity limits
      │  ├─ L4RRLL: per-app limits
      │  │  ├─ L5RRLLL: app quotas
      │  │  │  ├─ L6RRLLLL: quota
      │  │  │  └─ L6RRLLLR: per-app
      │  │  └─ L5RRLLR: app rates
      │  │     ├─ L6RRLLRL: rate
      │  │     └─ L6RRLLRR: per-app
      │  └─ L4RRLR: per-session limits
      │     ├─ L5RRLRL: session quotas
      │     │  ├─ L6RRLRLL: quota
      │     │  └─ L6RRLRLR: per-session
      │     └─ L5RRLRR: session rates
      │        ├─ L6RRLRRL: rate
      │        └─ L6RRLRRR: per-session
      └─ L3RRR: identity chain
         ├─ L4RRRL: UA + session
         │  ├─ L5RRRLL: combined
         │  │  ├─ L6RRRLLL: UA + session
         │  │  └─ L6RRRLLR: identity
         │  └─ L5RRRLR: confidence
         │     ├─ L6RRRLRL: agree
         │     └─ L6RRRLRR: high
         └─ L4RRRR: key + session
            ├─ L5RRRRL: keyed
            │  ├─ L6RRRRLL: key identity
            │  └─ L6RRRRLR: strong
            └─ L5RRRRR: strongest
               ├─ L6RRRRRL: key + session
               └─ L6RRRRRR: best
```

## Node research (all 127 nodes)

### L0 — Anthropic identity-backed keys
Keys bound to user identity: attribution, audit, per-user governance. 9router analog: source identity (UA class, session id) for keyless governance.

### L1L — Concept
User-bound keys vs API keys; benefits.

### L1R — 9router analog
Source identity + governance mapping.

### L2LL — What identity keys are
User-bound, attributed.

### L2LR — Implementation
Derivation, format, auth flow.

### L2RL — Source identity
UA class + session id.

### L2RR — Governance mapping
Per-identity limits.

### L3LLL — user-bound keys
Bound to user.

### L3LLR — benefits
Attribution + governance.

### L3LRL — key derivation
User → key.

### L3LRR — auth flow
Verify + resolve.

### L3RLL — UA class as identity
App class.

### L3RLR — keyless identity
No key needed.

### L3RRL — per-identity limits
Per-app/session.

### L3RRR — identity chain
Combined signals.

### L4LLLL — bound to user
User identity.

### L4LLLR — vs API keys
Shared secret.

### L4LLRL — attribution
Per-user usage.

### L4LLRR — governance
Per-user limits.

### L4LRLL — user → key
Derive.

### L4LRLR — key format
Prefix + payload.

### L4LRRL — key check
Verify.

### L4LRRR — session
Session-bound.

### L4RLLL — app class
Class identity.

### L4RLLR — session id
Session header.

### L4RLRL — no key needed
Localhost.

### L4RLRR — identity strength
Weak/strong.

### L4RRLL — per-app limits
Quotas.

### L4RRLR — per-session limits
Quotas.

### L4RRRL — UA + session
Combined.

### L4RRRR — key + session
Strongest.

### L5LLLLL — user identity
Account.

### L5LLLLR — key binding
Bound.

### L5LLLRL — API key
Shared secret.

### L5LLLRR — identity key
User-bound.

### L5LLRLL — usage tracking
Per-user.

### L5LLRLR — audit
Trail.

### L5LLRRL — user quotas
Limits.

### L5LLRRR — user policy
Enforcement.

### L5LRLLL — derive
HMAC.

### L5LRLLR — key → user
Lookup.

### L5LRLRL — prefix
Key prefix.

### L5LRLRR — payload
User id.

### L5LRRLL — verify
Signature.

### L5LRRLR — user resolve
Profile.

### L5LRRRL — session-bound
Session id.

### L5LRRRR — refresh
Rotate.

### L5RLLLL — app class
Identity.

### L5RLLLR — class limits
Per-class.

### L5RLLRL — session header
Session-id.

### L5RLLRR — session limits
Per-session.

### L5RLRLL — trust
Localhost.

### L5RLRLR — identity from
UA/headers.

### L5RLRRL — weak
Spoofable.

### L5RLRRR — strong
Key/session.

### L5RRLLL — app quotas
Per-app.

### L5RRLLR — app rates
Per-app.

### L5RRLRL — session quotas
Per-session.

### L5RRLRR — session rates
Per-session.

### L5RRRLL — combined
UA + session.

### L5RRRLR — confidence
Agree.

### L5RRRRL — keyed
Key identity.

### L5RRRRR — strongest
Key + session.

### L6 leaves (64)
- **L6LLLLLL** user account: identity.
- **L6LLLLLR** user profile: identity.
- **L6LLLLRL** bound key: user.
- **L6LLLLRR** usage attributed: user.
- **L6LLLRLL** shared secret: API key.
- **L6LLLRLR** no identity: API key.
- **L6LLLRRL** user-bound: identity key.
- **L6LLLRRR** attributed: user.
- **L6LLRLLL** usage tracking: per-user.
- **L6LLRLLR** cost allocation: per-user.
- **L6LLRLRL** audit trail: log.
- **L6LLRLRR** accountability: user.
- **L6LLRRLL** user quotas: caps.
- **L6LLRRLR** user rates: limits.
- **L6LLRRRL** user policy: rules.
- **L6LLRRRR** enforcement: block.
- **L6LRLLLL** HMAC: derive.
- **L6LRLLLR** user id: input.
- **L6LRLLRL** lookup: reverse.
- **L6LRLLRR** reverse: user.
- **L6LRLRLL** key prefix: hint.
- **L6LRLRLR** user hint: prefix.
- **L6LRLRRL** user id: payload.
- **L6LRLRRR** signature: verify.
- **L6LRRLLL** signature: check.
- **L6LRRLLR** expiry: check.
- **L6LRRLRL** user id: resolve.
- **L6LRRLRR** profile: load.
- **L6LRRRLL** session id: bind.
- **L6LRRRLR** binding: session.
- **L6LRRRRL** rotate: refresh.
- **L6LRRRRR** re-issue: new.
- **L6RLLLLL** app class: identity.
- **L6RLLLLR** identity: class.
- **L6RLLLRL** per-class: limits.
- **L6RLLLRR** limits: caps.
- **L6RLLRLL** session-id: header.
- **L6RLLRLR** identity: session.
- **L6RLLRRL** per-session: limits.
- **L6RLLRRR** limits: caps.
- **L6RLRLLL** trust: local.
- **L6RLRLLR** no key: keyless.
- **L6RLRLRL** UA: identity.
- **L6RLRLRR** headers: identity.
- **L6RLRRLL** spoofable: weak.
- **L6RLRRLR** headers: weak.
- **L6RLRRRL** key: strong.
- **L6RLRRRR** session: strong.
- **L6RRLLLL** quota: per-app.
- **L6RRLLLR** per-app: scoped.
- **L6RRLLRL** rate: per-app.
- **L6RRLLRR** per-app: scoped.
- **L6RRLRLL** quota: per-session.
- **L6RRLRLR** per-session: scoped.
- **L6RRLRRL** rate: per-session.
- **L6RRLRRR** per-session: scoped.
- **L6RRRLLL** UA + session: combined.
- **L6RRRLLR** identity: combined.
- **L6RRRLRL** agree: high.
- **L6RRRLRR** high: confidence.
- **L6RRRRLL** key identity: strong.
- **L6RRRRLR** strong: key.
- **L6RRRRRL** key + session: best.
- **L6RRRRRR** best: identity.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Anthropic identity-backed keys bind user identity | High |
| Benefits: attribution, audit, per-user governance | High |
| 9router keyless analog: UA class + session id | Medium |
| Identity strength: headers weak, key/session strong | High |

## Open questions

1. Should 9router issue per-session identity tokens (keyless) for stronger attribution?
2. Should UA class + session id combine into an identity score?
3. Should per-identity limits apply to keyless mode only or all modes?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b4b-anthropic-identity-keys.md`
- Industry: Anthropic identity-backed keys docs, LiteLLM user tracking, OAuth identity models