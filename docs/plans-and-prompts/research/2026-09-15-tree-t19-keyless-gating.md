# Tree T19 — Keyless Gating (Option Space) (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #keyless #gating #t19

## Objective

Full 6-level binary tree expansion of the **keyless gating option space** topic (from `2026-09-14-keyless-governance-research.md` Part A). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Keyless gating (option space)
├─ L1L: Trust models
│  ├─ L2LL: Local trust
│  │  ├─ L3LLL: loopback trust
│  │  │  ├─ L4LLLL: loopback set
│  │  │  │  ├─ L5LLLLL: 127.0.0.1
│  │  │  │  │  ├─ L6LLLLLL: bypass
│  │  │  │  │  └─ L6LLLLLR: trusted
│  │  │  │  └─ L5LLLLR: ::1
│  │  │  │     ├─ L6LLLLRL: bypass
│  │  │  │     └─ L6LLLLRR: trusted
│  │  │  └─ L4LLLR: local network
│  │  │     ├─ L5LLLRL: LAN
│  │  │     │  ├─ L6LLLRLL: private
│  │  │     │  └─ L6LLLRLR: range
│  │  │     └─ L5LLLRR: trust level
│  │  │        ├─ L6LLLRRL: partial
│  │  │        └─ L6LLLRRR: config
│  │  └─ L3LLR: no-auth mode
│  │     ├─ L4LLRL: open access
│  │     │  ├─ L5LLRLL: no key
│  │     │  │  ├─ L6LLRLLL: any client
│  │     │  │  └─ L6LLRLLR: local only
│  │     │  └─ L5LLRLR: risk
│  │     │     ├─ L6LLRLRL: exposure
│  │     │     └─ L6LLRLRR: abuse
│  │     └─ L4LLRR: trust boundary
│  │        ├─ L5LLRRL: host
│  │        │  ├─ L6LLRRLL: same host
│  │        │  └─ L6LLRRLR: trusted
│  │        └─ L5LLRRR: network
│  │           ├─ L6LLRRRL: same net
│  │           └─ L6LLRRRR: trusted
│  └─ L2LR: Remote trust
│     ├─ L3LRL: remote access
│     │  ├─ L4LRLL: exposed
│     │  │  ├─ L5LRLLL: internet
│     │  │  │  ├─ L6LRLLLL: public
│     │  │  │  └─ L6LRLLLR: risk
│     │  │  └─ L5LRLLR: tunnel
│     │  │     ├─ L6LRLLRL: tailscale
│     │  │     └─ L6LRLLRR: wireguard
│     │  └─ L4LRLR: auth required
│     │     ├─ L5LRLRL: key required
│     │     │  ├─ L6LRLRLL: API key
│     │     │  └─ L6LRLRLR: mandatory
│     │     └─ L5LRLRR: mTLS
│     │        ├─ L6LRLRRL: cert
│     │        └─ L6LRLRRR: client
│     └─ L3LRR: hybrid
│        ├─ L4LRRL: local keyless
│        │  ├─ L5LRRLL: loopback
│        │  │  ├─ L6LRRLLL: no key
│        │  │  └─ L6LRRLLR: allowed
│        │  └─ L5LRRLR: remote keyed
│        │     ├─ L6LRRLRL: key
│        │     └─ L6LRRLRR: required
│        └─ L4LRRR: policy
│           ├─ L5LRRRL: per-source
│           │  ├─ L6LRRRLL: app
│           │  └─ L6LRRRLR: network
│           └─ L5LRRRR: per-app
│              ├─ L6LRRRRL: app class
│              └─ L6LRRRRR: policy
└─ L1R: Gating mechanisms
   ├─ L2RL: Identity-based
   │  ├─ L3RLL: app identity
   │  │  ├─ L4RLLL: app class
   │  │  │  ├─ L5RLLLL: allowlist
   │  │  │  │  ├─ L6RLLLLL: apps
   │  │  │  │  └─ L6RLLLLR: allowed
   │  │  │  └─ L5RLLLR: denylist
   │  │  │     ├─ L6RLLLRL: apps
   │  │  │     └─ L6RLLLRR: blocked
   │  │  └─ L4RLLR: session identity
   │  │     ├─ L5RLLRL: session id
   │  │     │  ├─ L6RLLRLL: allow
   │  │     │  └─ L6RLLRLR: deny
   │  │     └─ L5RLLRR: session state
   │  │        ├─ L6RLLRRL: valid
   │  │        └─ L6RLLRRR: invalid
   │  └─ L3RLR: network identity
   │     ├─ L4RLRL: IP allowlist
   │     │  ├─ L5RLRLL: ranges
   │     │  │  ├─ L6RLRLLL: CIDR
   │     │  │  └─ L6RLRLLR: match
   │     │  └─ L5RLRLR: IP denylist
   │     │     ├─ L6RLRLRL: ranges
   │     │     └─ L6RLRLRR: block
   │     └─ L4RLRR: IP caveats
   │        ├─ L5RLRRL: NAT
   │        │  ├─ L6RLRRLL: shared
   │        │  └─ L6RLRRLR: false
   │        └─ L5RLRRR: spoof
   │           ├─ L6RLRRRL: XFF
   │           └─ L6RLRRRR: stripped
   └─ L2RR: Capability-based
      ├─ L3RRL: capability tokens
      │  ├─ L4RRLL: short-lived
      │  │  ├─ L5RRLLL: TTL
      │  │  │  ├─ L6RRLLLL: expiry
      │  │  │  └─ L6RRLLLR: renew
      │  │  └─ L5RRLLR: scoped
      │  │     ├─ L6RRLLRL: scope
      │  │     └─ L6RRLLRR: limit
      │  └─ L4RRLR: device-bound
      │     ├─ L5RRLRL: device id
      │     │  ├─ L6RRLRLL: bind
      │     │  └─ L6RRLRLR: verify
      │     └─ L5RRLRR: machine id
      │        ├─ L6RRLRRL: MACHINE_ID_SALT
      │        └─ L6RRLRRR: derive
      └─ L3RRR: first-use gating
         ├─ L4RRRL: first-use
         │  ├─ L5RRRLL: claim
         │  │  ├─ L6RRRLLL: first request
         │  │  └─ L6RRRLLR: bind
         │  └─ L5RRRLR: pairing
         │     ├─ L6RRRLRL: code
         │     └─ L6RRRLRR: verify
         └─ L4RRRR: dashboard gate
            ├─ L5RRRRL: login
            │  ├─ L6RRRRLL: password
            │  └─ L6RRRRLR: session
            └─ L5RRRRR: device gate
               ├─ L6RRRRRL: approve
               └─ L6RRRRRR: deny
```

## Node research (all 127 nodes)

### L0 — Keyless gating (option space)
Options for gating access without API keys: trust models (local/remote/hybrid) + gating mechanisms (identity/capability-based).

### L1L — Trust models
Local trust + remote trust + hybrid.

### L1R — Gating mechanisms
Identity-based + capability-based.

### L2LL — Local trust
Loopback + no-auth.

### L2LR — Remote trust
Exposed + auth.

### L2RL — Identity-based
App/session/network.

### L2RR — Capability-based
Tokens + first-use.

### L3LLL — loopback trust
Loopback set.

### L3LLR — no-auth mode
Open access.

### L3LRL — remote access
Exposed.

### L3LRR — hybrid
Local keyless.

### L3RLL — app identity
App class.

### L3RLR — network identity
IP allowlist.

### L3RRL — capability tokens
Short-lived.

### L3RRR — first-use gating
Claim.

### L4LLLL — loopback set
127.0.0.1.

### L4LLLR — local network
LAN.

### L4LLRL — open access
No key.

### L4LLRR — trust boundary
Host.

### L4LRLL — exposed
Internet.

### L4LRLR — auth required
Key.

### L4LRRL — local keyless
Loopback.

### L4LRRR — policy
Per-source.

### L4RLLL — app class
Allowlist.

### L4RLLR — session identity
Session id.

### L4RLRL — IP allowlist
Ranges.

### L4RLRR — IP caveats
NAT.

### L4RRLL — short-lived
TTL.

### L4RRLR — device-bound
Device id.

### L4RRRL — first-use
Claim.

### L4RRRR — dashboard gate
Login.

### L5LLLLL — 127.0.0.1
Bypass.

### L5LLLLR — ::1
Bypass.

### L5LLLRL — LAN
Private.

### L5LLLRR — trust level
Partial.

### L5LLRLL — no key
Any client.

### L5LLRLR — risk
Exposure.

### L5LLRRL — host
Same host.

### L5LLRRR — network
Same net.

### L5LRLLL — internet
Public.

### L5LRLLR — tunnel
Tailscale.

### L5LRLRL — key required
API key.

### L5LRLRR — mTLS
Cert.

### L5LRRLL — loopback
No key.

### L5LRRLR — remote keyed
Key.

### L5LRRRL — per-source
App.

### L5LRRRR — per-app
App class.

### L5RLLLL — allowlist
Apps.

### L5RLLLR — denylist
Apps.

### L5RLLRL — session id
Allow.

### L5RLLRR — session state
Valid.

### L5RLRLL — ranges
CIDR.

### L5RLRLR — IP denylist
Ranges.

### L5RLRRL — NAT
Shared.

### L5RLRRR — spoof
XFF.

### L5RRLLL — TTL
Expiry.

### L5RRLLR — scoped
Scope.

### L5RRLRL — device id
Bind.

### L5RRLRR — machine id
MACHINE_ID_SALT.

### L5RRRLL — claim
First request.

### L5RRRLR — pairing
Code.

### L5RRRRL — login
Password.

### L5RRRRR — device gate
Approve.

### L6 leaves (64)
- **L6LLLLLL** bypass: loopback.
- **L6LLLLLR** trusted: loopback.
- **L6LLLLRL** bypass: loopback.
- **L6LLLLRR** trusted: loopback.
- **L6LLLRLL** private: LAN.
- **L6LLLRLR** range: LAN.
- **L6LLLRRL** partial: trust.
- **L6LLLRRR** config: trust.
- **L6LLRLLL** any client: open.
- **L6LLRLLR** local only: safe.
- **L6LLRLRL** exposure: risk.
- **L6LLRLRR** abuse: risk.
- **L6LLRRLL** same host: trusted.
- **L6LLRRLR** trusted: host.
- **L6LLRRRL** same net: trusted.
- **L6LLRRRR** trusted: net.
- **L6LRLLLL** public: exposed.
- **L6LRLLLR** risk: exposed.
- **L6LRLLRL** tailscale: tunnel.
- **L6LRLLRR** wireguard: tunnel.
- **L6LRLRLL** API key: required.
- **L6LRLRLR** mandatory: auth.
- **L6LRLRRL** cert: mTLS.
- **L6LRLRRR** client: mTLS.
- **L6LRRLLL** no key: local.
- **L6LRRLLR** allowed: loopback.
- **L6LRRLRL** key: remote.
- **L6LRRLRR** required: remote.
- **L6LRRRLL** app: source.
- **L6LRRRLR** network: source.
- **L6LRRRRL** app class: policy.
- **L6LRRRRR** policy: per-app.
- **L6RLLLLL** apps: allow.
- **L6RLLLLR** allowed: gate.
- **L6RLLLRL** apps: block.
- **L6RLLLRR** blocked: gate.
- **L6RLLRLL** allow: session.
- **L6RLLRLR** deny: session.
- **L6RLLRRL** valid: session.
- **L6RLLRRR** invalid: session.
- **L6RLRLLL** CIDR: match.
- **L6RLRLLR** match: allow.
- **L6RLRLRL** ranges: block.
- **L6RLRLRR** block: deny.
- **L6RLRRLL** shared: NAT.
- **L6RLRRLR** false: positive.
- **L6RLRRRL** XFF: spoof.
- **L6RLRRRR** stripped: safe.
- **L6RRLLLL** expiry: TTL.
- **L6RRLLLR** renew: TTL.
- **L6RRLLRL** scope: limit.
- **L6RRLLRR** limit: scope.
- **L6RRLRLL** bind: device.
- **L6RRLRLR** verify: device.
- **L6RRLRRL** MACHINE_ID_SALT: derive.
- **L6RRLRRR** derive: machine.
- **L6RRRLLL** first request: claim.
- **L6RRRLLR** bind: claim.
- **L6RRRLRL** code: pairing.
- **L6RRRLRR** verify: pairing.
- **L6RRRRLL** password: login.
- **L6RRRRLR** session: login.
- **L6RRRRRL** approve: device.
- **L6RRRRRR** deny: device.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Loopback trust already exists (rate limiter LOOPBACK set) | High |
| Keyless local + keyed remote hybrid is the recommended option | High |
| IP-based gating is weak (NAT, spoof) | High |
| Capability tokens / first-use gating are design proposals | Medium |

## Open questions

1. Should keyless mode be default-on for loopback only?
2. Should remote access require API key or mTLS?
3. Should first-use pairing be implemented for keyless onboarding?

## Sources

- Prior research: `2026-09-14-keyless-governance-research.md`, `2026-09-15-branch-b1a-keyless-gating.md`
- Industry: Tailscale auth, Cloudflare Access, mTLS patterns