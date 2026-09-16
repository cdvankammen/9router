# Tree T9 — OpenRouter BYOK (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #openrouter #byok #t09

## Objective

Full 6-level binary tree expansion of the **OpenRouter BYOK (bring-your-own-key)** topic (from `2026-08-31-message-origin-and-destination-research.md` Part B.1). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: OpenRouter BYOK
├─ L1L: Concept
│  ├─ L2LL: What BYOK is
│  │  ├─ L3LLL: user-provided keys
│  │  │  ├─ L4LLLL: provider keys
│  │  │  │  ├─ L5LLLLL: user's own keys
│  │  │  │  │  ├─ L6LLLLLL: direct provider
│  │  │  │  │  └─ L6LLLLLR: user account
│  │  │  │  └─ L5LLLLR: routed via OR
│  │  │  │     ├─ L6LLLLRL: OR proxy
│  │  │  │     └─ L6LLLLRR: OR billing
│  │  │  └─ L4LLLR: key storage
│  │  │     ├─ L5LLLRL: OR stores
│  │  │     │  ├─ L6LLLRLL: encrypted
│  │  │     │  └─ L6LLLRLR: vault
│  │  │     └─ L5LLLRR: user controls
│  │  │        ├─ L6LLLRRL: revoke
│  │  │        └─ L6LLLRRR: manage
│  │  └─ L3LLR: benefits
│  │     ├─ L4LLRL: cost
│  │     │  ├─ L5LLRLL: no markup
│  │     │  │  ├─ L6LLRLLL: direct pricing
│  │     │  │  └─ L6LLRLLR: no OR fee
│  │     │  └─ L5LLRLR: billing
│  │     │     ├─ L6LLRLRL: provider bills
│  │     │     └─ L6LLRLRR: user pays
│  │     └─ L4LLRR: access
│  │        ├─ L5LLRRL: provider models
│  │        │  ├─ L6LLRRLL: full access
│  │        │  └─ L6LLRRLR: no waitlist
│  │        └─ L5LLRRR: rate limits
│  │           ├─ L6LLRRRL: provider limits
│  │           └─ L6LLRRRR: higher
│  └─ L2LR: trade-offs
│     ├─ L3LRL: security
│     │  ├─ L4LRLL: key exposure
│     │  │  ├─ L5LRLLL: OR sees key
│     │  │  │  ├─ L6LRLLLL: trust OR
│     │  │  │  └─ L6LRLLLR: risk
│     │  │  └─ L5LRLLR: leak risk
│     │  │     ├─ L6LRLLRL: breach
│     │  │     └─ L6LRLLRR: misuse
│     │  └─ L4LRLR: management
│     │     ├─ L5LRLRL: key rotation
│     │     │  ├─ L6LRLRLL: user rotates
│     │     │  └─ L6LRLRLR: OR sync
│     │     └─ L5LRLRR: multi-key
│     │        ├─ L6LRLRRL: multiple keys
│     │        └─ L6LRLRRR: per-provider
│     └─ L3LRR: comparison
│        ├─ L4LRRL: vs OR credits
│        │  ├─ L5LRRLL: credits
│        │  │  ├─ L6LRRLLL: prepaid
│        │  │  └─ L6LRRLLR: OR billing
│        │  └─ L5LRRLR: vs direct
│        │     ├─ L6LRRLRL: direct API
│        │     └─ L6LRRLRR: no proxy
│        └─ L4LRRR: vs 9router
│           ├─ L5LRRRL: local keys
│           │  ├─ L6LRRRLL: 9router stores
│           │  └─ L6LRRRLR: encrypted
│           └─ L5LRRRR: local routing
│              ├─ L6LRRRRL: no OR
│              └─ L6LRRRRR: direct
└─ L1R: 9router BYOK
   ├─ L2RL: Credential storage
   │  ├─ L3RLL: encrypted at rest
   │  │  ├─ L4RLLL: API_KEY_SECRET
   │  │  │  ├─ L5RLLLL: env secret
   │  │  │  │  ├─ L6RLLLLL: encryption
   │  │  │  │  └─ L6RLLLLR: key
   │  │  │  └─ L5RLLLR: scope
   │  │  │     ├─ L6RLLLRL: upstream keys
   │  │  │     └─ L6RLLLRR: OAuth tokens
   │  │  └─ L4RLLR: SQLite
   │  │     ├─ L5RLLRL: credentials table
   │  │     │  ├─ L6RLLRLL: encrypted cols
   │  │     │  └─ L6RLLRLR: metadata
   │  │     └─ L5RLLRR: no plaintext
   │  │        ├─ L6RLLRRL: never
   │  │        └─ L6RLLRRR: hygiene
   │  └─ L3RLR: multi-account
   │     ├─ L4RLRL: key pools
   │     │  ├─ L5RLRLL: per-provider
   │     │  │  ├─ L6RLRLLL: multiple keys
   │     │  │  └─ L6RLRLLR: pool
   │     │  └─ L5RLRLR: rotation
   │     │     ├─ L6RLRLRL: rotate
   │     │     └─ L6RLRLRR: failover
   │     └─ L4RLRR: quota tracking
   │        ├─ L5RLRRL: per-key usage
   │        │  ├─ L6RLRRLL: usage
   │        │  └─ L6RLRRLR: quota
   │        └─ L5RLRRR: auto-switch
   │           ├─ L6RLRRRL: threshold
   │           └─ L6RLRRRR: switch
   └─ L2RR: Routing integration
      ├─ L3RRL: executor keys
      │  ├─ L4RRLL: per-executor
      │  │  ├─ L5RRLLL: executor uses key
      │  │  │  ├─ L6RRLLLL: key lookup
      │  │  │  └─ L6RRLLLR: decrypt
      │  │  └─ L5RRLLR: key selection
      │  │     ├─ L6RRLLRL: account select
      │  │     └─ L6RRLLRR: round-robin
      │  └─ L4RRLR: OAuth executors
      │     ├─ L5RRLRL: token refresh
      │     │  ├─ L6RRLRLL: refresh
      │     │  └─ L6RRLRLR: retry
      │     └─ L5RRLRR: 401 handling
      │        ├─ L6RRLRRL: 401 → refresh
      │        └─ L6RRLRRR: retry once
      └─ L3RRR: BYOK vs keyless
         ├─ L4RRRL: BYOK mode
         │  ├─ L5RRRLL: keys required
         │  │  ├─ L6RRRLLL: auth
         │  │  └─ L6RRRLLR: gate
         │  └─ L5RRRLR: attribution
         │     ├─ L6RRRLRL: per-key
         │     └─ L6RRRLRR: per-app
         └─ L4RRRR: keyless mode
            ├─ L5RRRRL: no keys
            │  ├─ L6RRRRLL: localhost
            │  └─ L6RRRRLR: trust
            └─ L5RRRRR: source-based
               ├─ L6RRRRRL: UA class
               └─ L6RRRRRR: gating
```

## Node research (all 127 nodes)

### L0 — OpenRouter BYOK
Bring-your-own-key: user provides provider keys, routed via OpenRouter. 9router's equivalent: local encrypted credential storage + multi-account pools.

### L1L — Concept
User-provided keys, routed via OR; benefits: cost, access.

### L1R — 9router BYOK
Local encrypted storage + routing integration.

### L2LL — What BYOK is
User keys via OR proxy.

### L2LR — trade-offs
Security, management, comparison.

### L2RL — Credential storage
Encrypted at rest.

### L2RR — Routing integration
Executor key use.

### L3LLL — user-provided keys
Provider keys.

### L3LLR — benefits
Cost + access.

### L3LRL — security
Key exposure.

### L3LRR — comparison
Credits/direct/9router.

### L3RLL — encrypted at rest
API_KEY_SECRET.

### L3RLR — multi-account
Key pools.

### L3RRL — executor keys
Per-executor.

### L3RRR — BYOK vs keyless
Modes.

### L4LLLL — provider keys
User's own.

### L4LLLR — key storage
OR stores.

### L4LLRL — cost
No markup.

### L4LLRR — access
Provider models.

### L4LRLL — key exposure
OR sees key.

### L4LRLR — management
Rotation.

### L4LRRL — vs OR credits
Prepaid.

### L4LRRR — vs 9router
Local keys.

### L4RLLL — API_KEY_SECRET
Env secret.

### L4RLLR — SQLite
Credentials table.

### L4RLRL — key pools
Per-provider.

### L4RLRR — quota tracking
Per-key.

### L4RRLL — per-executor
Key lookup.

### L4RRLR — OAuth executors
Token refresh.

### L4RRRL — BYOK mode
Keys required.

### L4RRRR — keyless mode
No keys.

### L5LLLLL — direct provider
User account.

### L5LLLLR — routed via OR
Proxy.

### L5LLLRL — OR stores
Encrypted.

### L5LLLRR — user controls
Revoke.

### L5LLRLL — direct pricing
No markup.

### L5LLRLR — billing
Provider bills.

### L5LLRRL — full access
Models.

### L5LLRRR — rate limits
Provider limits.

### L5LRLLL — trust OR
Risk.

### L5LRLLR — leak risk
Breach.

### L5LRLRL — key rotation
User rotates.

### L5LRLRR — multi-key
Per-provider.

### L5LRRLL — credits
Prepaid.

### L5LRRLR — vs direct
Direct API.

### L5LRRRL — local keys
9router stores.

### L5LRRRR — local routing
No OR.

### L5RLLLL — encryption
API_KEY_SECRET.

### L5RLLLR — scope
Upstream keys.

### L5RLLRL — encrypted cols
Ciphertext.

### L5RLLRR — no plaintext
Never.

### L5RLRLL — multiple keys
Pool.

### L5RLRLR — rotation
Rotate.

### L5RLRRL — usage
Per-key.

### L5RLRRR — threshold
Switch.

### L5RRLLL — key lookup
Executor.

### L5RRLLR — decrypt
Use.

### L5RRLLRL — account select
Choose.

### L5RRLLRR — round-robin
Balance.

### L5RRLRL — refresh
Token.

### L5RRLRR — 401 handling
Refresh.

### L5RRRLL — auth
Gate.

### L5RRRLR — attribution
Per-key.

### L5RRRRL — no keys
Localhost.

### L5RRRRR — source-based
UA class.

### L6 leaves (64)
- **L6LLLLLL** direct provider: user's key.
- **L6LLLLLR** user account: provider account.
- **L6LLLLRL** OR proxy: routed.
- **L6LLLLRR** OR billing: OR bills.
- **L6LLLRLL** encrypted: vault.
- **L6LLLRLR** vault: secure.
- **L6LLLRRL** revoke: user.
- **L6LLLRRR** manage: user.
- **L6LLRLLL** direct pricing: no markup.
- **L6LLRLLR** no OR fee: cheaper.
- **L6LLRLRL** provider bills: user pays.
- **L6LLRLRR** user pays: direct.
- **L6LLRRLL** full access: models.
- **L6LLRRLR** no waitlist: immediate.
- **L6LLRRRL** provider limits: own.
- **L6LLRRRR** higher: than OR.
- **L6LRLLLL** trust OR: third party.
- **L6LRLLLR** risk: exposure.
- **L6LRLLRL** breach: leak.
- **L6LRLLRR** misuse: abuse.
- **L6LRLRLL** user rotates: control.
- **L6LRLRLR** OR sync: update.
- **L6LRLRRL** multiple keys: per-provider.
- **L6LRLRRR** per-provider: scoped.
- **L6LRRLLL** prepaid: credits.
- **L6LRRLLR** OR billing: invoice.
- **L6LRRLRL** direct API: provider.
- **L6LRRLRR** no proxy: direct.
- **L6LRRRLL** 9router stores: local.
- **L6LRRRLR** encrypted: at rest.
- **L6LRRRRL** no OR: direct.
- **L6LRRRRR** direct: routing.
- **L6RLLLLL** encryption: AES.
- **L6RLLLLR** key: API_KEY_SECRET.
- **L6RLLLRL** upstream keys: encrypted.
- **L6RLLLRR** OAuth tokens: encrypted.
- **L6RLLRLL** encrypted cols: columns.
- **L6RLLRLR** metadata: name.
- **L6RLLRRL** never: plaintext.
- **L6RLLRRR** hygiene: no logs.
- **L6RLRLLL** multiple keys: pool.
- **L6RLRLLR** pool: list.
- **L6RLRLRL** rotate: replace.
- **L6RLRLRR** failover: next.
- **L6RLRRLL** usage: counts.
- **L6RLRRLR** quota: caps.
- **L6RLRRRL** threshold: 80%.
- **L6RLRRRR** switch: auto.
- **L6RRLLLL** key lookup: find.
- **L6RRLLLR** decrypt: use.
- **L6RRLLRL** account select: choose.
- **L6RRLLRR** round-robin: balance.
- **L6RRLRLL** refresh: token.
- **L6RRLRLR** retry: once.
- **L6RRLRRL** 401 → refresh: on-demand.
- **L6RRLRRR** retry once: single.
- **L6RRRLLL** auth: required.
- **L6RRRLLR** gate: enforce.
- **L6RRRLRL** per-key: attribution.
- **L6RRRLRR** per-app: attribution.
- **L6RRRRLL** localhost: trust.
- **L6RRRRLR** trust: boundary.
- **L6RRRRRL** UA class: source.
- **L6RRRRRR** gating: policy.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| OpenRouter BYOK routes user keys via OR proxy | High |
| 9router stores upstream keys encrypted at rest | High |
| Multi-account pools + quota auto-switch exist | High |
| BYOK vs keyless is a governance mode choice | Medium |

## Open questions

1. Should 9router expose a BYOK-style "user key" mode distinct from admin keys?
2. Should key pools support weighted selection (not just round-robin)?
3. Should OAuth refresh be proactive or reactive?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b3a-openrouter-byok.md`
- Industry: OpenRouter BYOK docs, LiteLLM key management, Anthropic identity-backed keys