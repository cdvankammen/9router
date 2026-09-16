# Tree T4 — Auth & API Keys (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #auth #api-keys #t04

## Objective

Full 6-level binary tree expansion of the **auth & API keys** topic (from `2026-08-31-message-origin-and-destination-research.md` Part A.4). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Auth & API keys
├─ L1L: Credential model
│  ├─ L2LL: Key types
│  │  ├─ L3LLL: API keys
│  │  │  ├─ L4LLLL: gateway keys
│  │  │  │  ├─ L5LLLLL: client keys
│  │  │  │  │  ├─ L6LLLLLL: bearer token
│  │  │  │  │  └─ L6LLLLLR: per-app keys
│  │  │  │  └─ L5LLLLR: upstream keys
│  │  │  │     ├─ L6LLLLRL: provider keys
│  │  │  │     └─ L6LLLLRR: encrypted at rest
│  │  │  └─ L4LLLR: key rotation
│  │  │     ├─ L5LLLRL: rotation policy
│  │  │     │  ├─ L6LLLRLL: periodic
│  │  │     │  └─ L6LLLRLR: on-compromise
│  │  │     └─ L5LLLRR: revocation
│  │  │        ├─ L6LLLRRL: revoke list
│  │  │        └─ L6LLLRRR: immediate
│  │  └─ L3LLR: OAuth tokens
│  │     ├─ L4LLRL: access tokens
│  │     │  ├─ L5LLRLL: short-lived
│  │     │  │  ├─ L6LLRLLL: expiry
│  │     │  │  └─ L6LLRLLR: refresh
│  │     │  └─ L5LLRLR: refresh tokens
│  │     │     ├─ L6LLRLRL: long-lived
│  │     │     └─ L6LLRLRR: rotation
│  │     └─ L4LLRR: token refresh
│  │        ├─ L5LLRRL: refresh flow
│  │        │  ├─ L6LLRRLL: refresh grant
│  │        │  └─ L6LLRRLR: new access
│  │        └─ L5LLRRR: failure handling
│  │           ├─ L6LLRRRL: retry
│  │           └─ L6LLRRRR: re-auth
│  └─ L2LR: Storage
│     ├─ L3LRL: encryption at rest
│     │  ├─ L4LRLL: API_KEY_SECRET
│     │  │  ├─ L5LRLLL: env secret
│     │  │  │  ├─ L6LRLLLL: encryption key
│     │  │  │  └─ L6LRLLLR: must override
│     │  │  └─ L5LRLLR: encryption scope
│     │  │     ├─ L6LRLLRL: upstream keys
│     │  │     └─ L6LRLLRR: OAuth tokens
│     │  └─ L4LRLR: DB storage
│     │     ├─ L5LRLRL: SQLite
│     │     │  ├─ L6LRLRLL: credentials table
│     │     │  └─ L6LRLRLR: encrypted columns
│     │     └─ L5LRLRR: secrets hygiene
│     │        ├─ L6LRLRRL: no plaintext
│     │        └─ L6LRLRRR: no logs
│     └─ L3LRR: session auth
│        ├─ L4LRRL: JWT_SECRET
│        │  ├─ L5LRRLL: session cookie
│        │  │  ├─ L6LRRLLL: JWT sign
│        │  │  └─ L6LRRLLR: cookie
│        │  └─ L5LRRLR: dashboard auth
│        │     ├─ L6LRRLRL: login
│        │     └─ L6LRRLRR: session
│        └─ L4LRRR: INITIAL_PASSWORD
│           ├─ L5LRRRL: default 123456
│           │  ├─ L6LRRRLL: must override
│           │  └─ L6LRRRLR: first-run
│           └─ L5LRRRR: password policy
│              ├─ L6LRRRRL: strength
│              └─ L6LRRRRR: change prompt
└─ L1R: Key governance
   ├─ L2RL: Keyless option space
   │  ├─ L3RLL: no-key mode
   │  │  ├─ L4RLLL: local trust
   │  │  │  ├─ L5RLLLL: localhost only
   │  │  │  │  ├─ L6RLLLLL: bind 127.0.0.1
   │  │  │  │  └─ L6RLLLLR: no network
   │  │  │  └─ L5RLLLR: LAN exposure
   │  │  │     ├─ L6RLLLRL: bind 0.0.0.0
   │  │  │     └─ L6RLLLRR: needs auth
   │  │  └─ L4RLLR: trust boundary
   │  │     ├─ L5RLLRL: loopback proxy
   │  │     │  ├─ L6RLLRLL: CLI proxy
   │  │     │  └─ L6RLLRLR: trusted
   │  │     └─ L5RLLRR: risk
   │  │        ├─ L6RLLRRL: any local process
   │  │        └─ L6RLLRRR: CSRF
   │  └─ L3RLR: keyed mode
   │     ├─ L4RLRL: per-app keys
   │     │  ├─ L5RLRLL: app-scoped
   │     │  │  ├─ L6RLRLLL: one key per app
   │     │  │  └─ L6RLRLLR: revoke per app
   │     │  └─ L5RLRLR: key metadata
   │     │     ├─ L6RLRLRL: name/owner
   │     │     └─ L6RLRLRR: limits
   │     └─ L4RLRR: key derivation
   │        ├─ L5RLRRL: hash keys
   │        │  ├─ L6RLRRLL: sha256
   │        │  └─ L6RLRRLR: no plaintext
   │        └─ L5RLRRR: prefix lookup
   │           ├─ L6RLRRRL: key prefix
   │           └─ L6RLRRRR: fast lookup
   └─ L2RR: Upstream credential mgmt
      ├─ L3RRL: multi-account
      │  ├─ L4RRLL: multiple keys per provider
      │  │  ├─ L5RRLLL: account pool
      │  │  │  ├─ L6RRLLLL: key list
      │  │  │  └─ L6RRLLLR: rotation
      │  │  └─ L5RRLLR: fallback
      │  │     ├─ L6RRLLRL: key failover
      │  │     └─ L6RRLLRR: quota exhaustion
      │  └─ L4RRLR: quota tracking
      │     ├─ L5RRLRL: per-key usage
      │     │  ├─ L6RRLRLL: usage counts
      │     │  └─ L6RRLRLR: quota limits
      │     └─ L5RRLRR: auto-switch
      │        ├─ L6RRLRRL: threshold
      │        └─ L6RRLRRR: switch key
      └─ L3RRR: OAuth lifecycle
         ├─ L4RRRL: authorization flow
         │  ├─ L5RRRLL: auth URL
         │  │  ├─ L6RRRLLL: consent
         │  │  └─ L6RRRLLR: redirect
         │  └─ L5RRRLR: token exchange
         │     ├─ L6RRRLRL: code → token
         │     └─ L6RRRLRR: store
         └─ L4RRRR: refresh lifecycle
            ├─ L5RRRRL: scheduled refresh
            │  ├─ L6RRRRLL: timer
            │  └─ L6RRRRLR: proactive
            └─ L5RRRRR: expiry handling
               ├─ L6RRRRRL: 401 → refresh
               └─ L6RRRRRR: retry once
```

## Node research (all 127 nodes)

### L0 — Auth & API keys
Two credential families: gateway API keys (client-facing) and upstream credentials (provider-facing, OAuth/API-key). Secrets: `JWT_SECRET`, `API_KEY_SECRET`, `INITIAL_PASSWORD`.

### L1L — Credential model
Gateway keys + upstream keys + OAuth tokens; encrypted at rest; session auth for dashboard.

### L1R — Key governance
Keyless option space (local trust) vs keyed mode (per-app keys); upstream multi-account + OAuth lifecycle.

### L2LL — Key types
Gateway client keys, upstream provider keys, OAuth access/refresh tokens.

### L2LR — Storage
Encryption at rest via `API_KEY_SECRET`; SQLite storage; session auth via `JWT_SECRET`.

### L2RL — Keyless option space
No-key mode viable only for localhost; LAN exposure requires auth.

### L2RR — Upstream credential mgmt
Multi-account pools, quota tracking, OAuth authorization + refresh lifecycle.

### L3LLL — API keys
Bearer tokens for gateway; upstream provider keys encrypted.

### L3LLR — OAuth tokens
Access (short-lived) + refresh (long-lived) tokens; refresh flow.

### L3LRL — encryption at rest
`API_KEY_SECRET` env; encrypts upstream keys + OAuth tokens.

### L3LRR — session auth
`JWT_SECRET` signs session cookie; `INITIAL_PASSWORD` default 123456 must override.

### L3RLL — no-key mode
Localhost-only trust; LAN needs auth.

### L3RLR — keyed mode
Per-app keys with metadata; hashed storage.

### L3RRL — multi-account
Multiple keys per provider; fallback on quota.

### L3RRR — OAuth lifecycle
Auth flow + refresh lifecycle.

### L4LLLL — gateway keys
Client-facing bearer tokens.

### L4LLLR — key rotation
Periodic + on-compromise rotation; revocation.

### L4LLRL — access tokens
Short-lived; refresh.

### L4LLRR — token refresh
Refresh grant → new access token.

### L4LRLL — API_KEY_SECRET
Encryption key env; must override.

### L4LRLR — DB storage
SQLite credentials table; encrypted columns.

### L4LRRL — JWT_SECRET
Session cookie signing.

### L4LRRR — INITIAL_PASSWORD
Default 123456; must override.

### L4RLLL — local trust
Localhost-only binding.

### L4RLLR — trust boundary
Loopback proxy trusted; local processes risk.

### L4RLRL — per-app keys
App-scoped keys; revoke per app.

### L4RLRR — key derivation
Hash keys; prefix lookup.

### L4RRLL — multiple keys per provider
Account pool.

### L4RRLR — quota tracking
Per-key usage; auto-switch.

### L4RRRL — authorization flow
Consent + redirect.

### L4RRRR — refresh lifecycle
Scheduled refresh; 401 → refresh.

### L5LLLLL — client keys
Bearer tokens.

### L5LLLLR — upstream keys
Provider keys.

### L5LLLRL — rotation policy
Periodic.

### L5LLLRR — revocation
Revoke list.

### L5LLRLL — short-lived
Expiry.

### L5LLRLR — refresh tokens
Long-lived.

### L5LLRRL — refresh flow
Refresh grant.

### L5LLRRR — failure handling
Retry / re-auth.

### L5LRLLL — env secret
Encryption key.

### L5LRLLR — must override
Security.

### L5LRLLRL — upstream keys
Encrypted.

### L5LRLLRR — OAuth tokens
Encrypted.

### L5LRLRL — SQLite
Credentials table.

### L5LRLRR — secrets hygiene
No plaintext, no logs.

### L5LRRLL — session cookie
JWT sign.

### L5LRRLR — dashboard auth
Login.

### L5LRRRL — default 123456
Must override.

### L5LRRRR — password policy
Strength.

### L5RLLLL — localhost only
Bind 127.0.0.1.

### L5RLLLR — LAN exposure
Bind 0.0.0.0.

### L5RLLRL — loopback proxy
CLI proxy.

### L5RLLRR — risk
Local processes.

### L5RLRLL — app-scoped
One key per app.

### L5RLRLR — key metadata
Name/owner/limits.

### L5RLRRL — hash keys
sha256.

### L5RLRRR — prefix lookup
Fast.

### L5RRLLL — account pool
Key list.

### L5RRLLR — fallback
Key failover.

### L5RRLRL — per-key usage
Usage counts.

### L5RRLRR — auto-switch
Threshold.

### L5RRRLL — auth URL
Consent.

### L5RRRLR — token exchange
Code → token.

### L5RRRRL — scheduled refresh
Timer.

### L5RRRRR — expiry handling
401 → refresh.

### L6 leaves (64)
- **L6LLLLLL** bearer token: Authorization header.
- **L6LLLLLR** per-app keys: app-scoped.
- **L6LLLLRL** provider keys: upstream.
- **L6LLLLRR** encrypted at rest: API_KEY_SECRET.
- **L6LLLRLL** periodic: rotation schedule.
- **L6LLLRLR** on-compromise: immediate.
- **L6LLLRRL** revoke list: blacklist.
- **L6LLLRRR** immediate: instant.
- **L6LLRLLL** expiry: access token TTL.
- **L6LLRLLR** refresh: refresh token.
- **L6LLRLRL** long-lived: refresh TTL.
- **L6LLRLRR** rotation: refresh rotation.
- **L6LLRRLL** refresh grant: grant_type=refresh_token.
- **L6LLRRLR** new access: new token.
- **L6LLRRRL** retry: retry once.
- **L6LLRRRR** re-auth: full flow.
- **L6LRLLLL** encryption key: API_KEY_SECRET.
- **L6LRLLLR** must override: security.
- **L6LRLLRL** upstream keys: encrypted.
- **L6LRLLRR** OAuth tokens: encrypted.
- **L6LRLRLL** credentials table: SQLite.
- **L6LRLRLR** encrypted columns: ciphertext.
- **L6LRLRRL** no plaintext: never.
- **L6LRLRRR** no logs: never log keys.
- **L6LRRLLL** JWT sign: HMAC.
- **L6LRRLLR** cookie: httpOnly.
- **L6LRRLRL** login: password.
- **L6LRRLRR** session: JWT cookie.
- **L6LRRRLL** must override: first-run.
- **L6LRRRLR** first-run: prompt.
- **L6LRRRRL** strength: min length.
- **L6LRRRRR** change prompt: force.
- **L6RLLLLL** bind 127.0.0.1: local.
- **L6RLLLLR** no network: safe.
- **L6RLLLRL** bind 0.0.0.0: LAN.
- **L6RLLLRR** needs auth: keys.
- **L6RLLRLL** CLI proxy: failover-proxy.
- **L6RLLRLR** trusted: loopback.
- **L6RLLRRL** any local process: risk.
- **L6RLLRRR** CSRF: browser risk.
- **L6RLRLLL** one key per app: scoped.
- **L6RLRLLR** revoke per app: granular.
- **L6RLRLRL** name/owner: metadata.
- **L6RLRLRR** limits: per-key.
- **L6RLRRLL** sha256: hash.
- **L6RLRRLR** no plaintext: store hash.
- **L6RLRRRL** key prefix: first 8 chars.
- **L6RLRRRR** fast lookup: index.
- **L6RRLLLL** key list: pool.
- **L6RRLLLR** rotation: rotate keys.
- **L6RRLLRL** key failover: next key.
- **L6RRLLRR** quota exhaustion: switch.
- **L6RRLRLL** usage counts: per-key.
- **L6RRLRLR** quota limits: caps.
- **L6RRLRRL** threshold: 80%.
- **L6RRLRRR** switch key: auto.
- **L6RRRLLL** consent: user approves.
- **L6RRRLLR** redirect: callback.
- **L6RRRLRL** code → token: exchange.
- **L6RRRLRR** store: encrypted.
- **L6RRRRLL** timer: proactive refresh.
- **L6RRRRLR** proactive: before expiry.
- **L6RRRRRL** 401 → refresh: on-demand.
- **L6RRRRRR** retry once: single retry.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| JWT_SECRET / API_KEY_SECRET / INITIAL_PASSWORD contract | High |
| Upstream keys + OAuth tokens encrypted at rest | High |
| Multi-account fallback + quota tracking exist | High |
| Keyless mode viable only for localhost | Medium |
| Per-app key derivation (hash + prefix) is a design proposal | Medium |

## Open questions

1. Should gateway keys be hashed (sha256) with prefix lookup, or kept reversible for display?
2. Should keyless mode be gated behind a bind-address check (127.0.0.1 only)?
3. Should OAuth refresh be proactive (timer) or reactive (401)?

## Sources

- Code: `src/lib/db/`, `src/dashboardGuard.js`, `.env.example`, `docs/ARCHITECTURE.md`
- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-a2b-auth-api-keys.md`
- Industry: OAuth 2.0 RFC 6749, RFC 6749 refresh tokens, LiteLLM virtual keys, Anthropic identity-backed keys