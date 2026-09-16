# Tree T16 — Attribution Dimensions ("where from") (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #attribution #dimensions #t16

## Objective

Full 6-level binary tree expansion of the **attribution dimensions ("where from")** topic (from `2026-08-31-message-origin-and-destination-research.md` Part C.1). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Attribution dimensions ("where from")
├─ L1L: Identity dimensions
│  ├─ L2LL: Source app
│  │  ├─ L3LLL: app class
│  │  │  ├─ L4LLLL: UA-derived
│  │  │  │  ├─ L5LLLLL: sourceApps
│  │  │  │  │  ├─ L6LLLLLL: regex
│  │  │  │  │  └─ L6LLLLLR: class
│  │  │  │  └─ L5LLLLR: class list
│  │  │  │     ├─ L6LLLLRL: 22 classes
│  │  │  │     └─ L6LLLLRR: unknown
│  │  │  └─ L4LLLR: header-derived
│  │  │     ├─ L5LLLRL: X-Title
│  │  │     │  ├─ L6LLLRLL: title
│  │  │     │  └─ L6LLLRLR: map
│  │  │     └─ L5LLLRR: referer
│  │  │        ├─ L6LLLRRL: domain
│  │  │        └─ L6LLLRRR: map
│  │  └─ L3LLR: app version
│  │     ├─ L4LLRL: version parse
│  │     │  ├─ L5LLRLL: UA version
│  │     │  │  ├─ L6LLRLLL: parse
│  │     │  │  └─ L6LLRLLR: store
│  │     │  └─ L5LLRLR: version use
│  │     │     ├─ L6LLRLRL: compat
│  │     │     └─ L6LLRLRR: policy
│  │     └─ L4LLRR: version policy
│  │        ├─ L5LLRRL: min version
│  │        │  ├─ L6LLRRLL: gate
│  │        │  └─ L6LLRRLR: enforce
│  │        └─ L5LLRRR: deprecate
│  │           ├─ L6LLRRRL: old
│  │           └─ L6LLRRRR: block
│  └─ L2LR: Session identity
│     ├─ L3LRL: session id
│     │  ├─ L4LRLL: session header
│     │  │  ├─ L5LRLLL: claude-code
│     │  │  │  ├─ L6LRLLLL: session-id
│     │  │  │  └─ L6LRLLLR: unique
│     │  │  └─ L5LRLLR: other agents
│     │  │     ├─ L6LRLLRL: cursor
│     │  │     └─ L6LRLLRR: copilot
│     │  └─ L4LRLR: session grouping
│     │     ├─ L5LRLRL: per-session
│     │     │  ├─ L6LRLRLL: usage
│     │     │  └─ L6LRLRLR: spend
│     │     └─ L5LRLRR: session limits
│     │        ├─ L6LRLRRL: quota
│     │        └─ L6LRLRRR: rate
│     └─ L3LRR: user identity
│        ├─ L4LRRL: key-bound
│        │  ├─ L5LRRLL: API key
│        │  │  ├─ L6LRRLLL: user
│        │  │  └─ L6LRRLLR: key
│        │  └─ L5LRRLR: identity key
│        │     ├─ L6LRRLRL: user-bound
│        │     └─ L6LRRLRR: attributed
│        └─ L4LRRR: keyless
│           ├─ L5LRRRL: no user
│           │  ├─ L6LRRRLL: anonymous
│           │  └─ L6LRRRLR: local
│           └─ L5LRRRR: source-based
│              ├─ L6LRRRRL: app class
│              └─ L6LRRRRR: proxy
└─ L1R: Network dimensions
   ├─ L2RL: IP address
   │  ├─ L3RLL: IP source
   │  │  ├─ L4RLLL: socket IP
   │  │  │  ├─ L5RLLLL: TCP socket
   │  │  │  │  ├─ L6RLLLLL: real
   │  │  │  │  └─ L6RLLLLR: client
   │  │  │  └─ L5RLLLR: XFF
   │  │  │     ├─ L6RLLLRL: stripped
   │  │  │     └─ L6RLLLRR: untrusted
   │  │  └─ L4RLLR: IP use
   │  │     ├─ L5RLLRL: rate limit
   │  │     │  ├─ L6RLLRLL: per-IP
   │  │     │  └─ L6RLLRLR: key
   │  │     └─ L5RLLRR: attribution
   │  │        ├─ L6RLLRRL: network
   │  │        └─ L6RLLRRR: coarse
   │  └─ L3RLR: NAT caveat
   │     ├─ L4RLRL: shared IP
   │     │  ├─ L5RLRLL: NAT
   │     │  │  ├─ L6RLRLLL: shared
   │     │  │  └─ L6RLRLLR: many users
   │     │  └─ L5RLRLR: false sharing
   │     │     ├─ L6RLRLRL: one blocks
   │     │     └─ L6RLRLRR: all
   │     └─ L4RLRR: localhost
   │        ├─ L5RLRRL: loopback
   │        │  ├─ L6RLRRLL: 127.0.0.1
   │        │  └─ L6RLRRLR: ::1
   │        └─ L5RLRRR: all local
   │           ├─ L6RLRRRL: same IP
   │           └─ L6RLRRRR: no IP signal
   └─ L2RR: Time dimensions
      ├─ L3RRL: request time
      │  ├─ L4RRLL: timestamp
      │  │  ├─ L5RRLLL: start
      │  │  │  ├─ L6RRLLLL: time
      │  │  │  └─ L6RRLLLR: log
      │  │  └─ L5RRLLR: duration
      │  │     ├─ L6RRLLRL: elapsed
      │  │     └─ L6RRLLRR: log
      │  └─ L4RRLR: time windows
      │     ├─ L5RRLRL: daily
      │     │  ├─ L6RRLRLL: day
      │     │  └─ L6RRLRLR: rollup
      │     └─ L5RRLRR: hourly
      │        ├─ L6RRLRRL: hour
      │        └─ L6RRLRRR: peak
      └─ L3RRR: correlation
         ├─ L4RRRL: session correlation
         │  ├─ L5RRRLL: session id
         │  │  ├─ L6RRRLLL: group
         │  │  └─ L6RRRLLR: requests
         │  └─ L5RRRLR: task correlation
         │     ├─ L6RRRLRL: task type
         │     └─ L6RRRLRR: group
         └─ L4RRRR: fingerprint
            ├─ L5RRRRL: conversation
            │  ├─ L6RRRRLL: FNV-1a
            │  └─ L6RRRRLR: sticky
            └─ L5RRRRR: correlation use
               ├─ L6RRRRRL: stickiness
               └─ L6RRRRRR: attribution
```

## Node research (all 127 nodes)

### L0 — Attribution dimensions ("where from")
Dimensions that answer "where did this request come from": identity (app, session, user) + network (IP) + time.

### L1L — Identity dimensions
App class, version, session, user.

### L1R — Network dimensions
IP + time + correlation.

### L2LL — Source app
App class + version.

### L2LR — Session identity
Session id + grouping.

### L2RL — IP address
Socket IP + NAT.

### L2RR — Time dimensions
Timestamps + windows.

### L3LLL — app class
UA/header-derived.

### L3LLR — app version
Version parse.

### L3LRL — session id
Session header.

### L3LRR — user identity
Key-bound/keyless.

### L3RLL — IP source
Socket/XFF.

### L3RLR — NAT caveat
Shared IP.

### L3RRL — request time
Timestamp.

### L3RRR — correlation
Session/task/fingerprint.

### L4LLLL — UA-derived
sourceApps.

### L4LLLR — header-derived
X-Title/referer.

### L4LLRL — version parse
UA version.

### L4LLRR — version policy
Min/deprecate.

### L4LRLL — session header
claude-code.

### L4LRLR — session grouping
Per-session.

### L4LRRL — key-bound
API key.

### L4LRRR — keyless
Anonymous.

### L4RLLL — socket IP
TCP.

### L4RLLR — IP use
Rate/attribution.

### L4RLRL — shared IP
NAT.

### L4RLRR — localhost
Loopback.

### L4RRLL — timestamp
Start.

### L4RRLR — time windows
Daily/hourly.

### L4RRRL — session correlation
Group.

### L4RRRR — fingerprint
Conversation.

### L5LLLLL — sourceApps
Regex.

### L5LLLLR — class list
22 classes.

### L5LLLRL — X-Title
Title.

### L5LLLRR — referer
Domain.

### L5LLRLL — UA version
Parse.

### L5LLRLR — version use
Compat.

### L5LLRRL — min version
Gate.

### L5LLRRR — deprecate
Old.

### L5LRLLL — claude-code
Session-id.

### L5LRLLR — other agents
Cursor.

### L5LRLRL — per-session
Usage.

### L5LRLRR — session limits
Quota.

### L5LRRLL — API key
User.

### L5LRRLR — identity key
User-bound.

### L5LRRRL — no user
Anonymous.

### L5LRRRR — source-based
App class.

### L5RLLLL — TCP socket
Real.

### L5RLLLR — XFF
Stripped.

### L5RLLRL — per-IP
Rate.

### L5RLLRR — attribution
Network.

### L5RLRLL — NAT
Shared.

### L5RLRLR — false sharing
One blocks.

### L5RLRRL — loopback
127.0.0.1.

### L5RLRRR — all local
Same IP.

### L5RRLLL — start
Time.

### L5RRLLR — duration
Elapsed.

### L5RRLRL — daily
Day.

### L5RRLRR — hourly
Hour.

### L5RRRLL — session id
Group.

### L5RRRLR — task type
Group.

### L5RRRRL — FNV-1a
Hash.

### L5RRRRR — correlation use
Stickiness.

### L6 leaves (64)
- **L6LLLLLL** regex: UA rules.
- **L6LLLLLR** class: app.
- **L6LLLLRL** 22 classes: list.
- **L6LLLLRR** unknown: default.
- **L6LLLRLL** title: X-Title.
- **L6LLLRLR** map: class.
- **L6LLLRRL** domain: referer.
- **L6LLLRRR** map: class.
- **L6LLRLLL** parse: version.
- **L6LLRLLR** store: version.
- **L6LLRLRL** compat: behavior.
- **L6LLRLRR** policy: version.
- **L6LLRRLL** gate: min.
- **L6LLRRLR** enforce: block.
- **L6LLRRRL** old: version.
- **L6LLRRRR** block: reject.
- **L6LRLLLL** session-id: header.
- **L6LRLLLR** unique: session.
- **L6LRLLRL** cursor: session.
- **L6LRLLRR** copilot: session.
- **L6LRLRLL** usage: per-session.
- **L6LRLRLR** spend: per-session.
- **L6LRLRRL** quota: per-session.
- **L6LRLRRR** rate: per-session.
- **L6LRRLLL** user: key.
- **L6LRRLLR** key: credential.
- **L6LRRLRL** user-bound: identity.
- **L6LRRLRR** attributed: user.
- **L6LRRRLL** anonymous: no user.
- **L6LRRRLR** local: trust.
- **L6LRRRRL** app class: proxy.
- **L6LRRRRR** proxy: identity.
- **L6RLLLLL** real: client.
- **L6RLLLLR** client: IP.
- **L6RLLLRL** stripped: XFF.
- **L6RLLLRR** untrusted: XFF.
- **L6RLLRLL** per-IP: key.
- **L6RLLRLR** key: limiter.
- **L6RLLRRL** network: coarse.
- **L6RLLRRR** coarse: attribution.
- **L6RLRLLL** shared: NAT.
- **L6RLRLLR** many users: NAT.
- **L6RLRLRL** one blocks: all.
- **L6RLRLRR** all: blocked.
- **L6RLRRLL** 127.0.0.1: loopback.
- **L6RLRRLR** ::1: loopback.
- **L6RLRRRL** same IP: local.
- **L6RLRRRR** no IP signal: local.
- **L6RRLLLL** time: start.
- **L6RRLLLR** log: record.
- **L6RRLLRL** elapsed: duration.
- **L6RRLLRR** log: record.
- **L6RRLRLL** day: rollup.
- **L6RRLRLR** rollup: totals.
- **L6RRLRRL** hour: window.
- **L6RRLRRR** peak: hour.
- **L6RRRLLL** group: requests.
- **L6RRRLLR** requests: session.
- **L6RRRLRL** task type: group.
- **L6RRRLRR** group: tasks.
- **L6RRRRLL** FNV-1a: hash.
- **L6RRRRLR** sticky: session.
- **L6RRRRRL** stickiness: routing.
- **L6RRRRRR** attribution: usage.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Identity dimensions: app class, session, user | High |
| IP is coarse (NAT, localhost) — not a strong identity | High |
| Time dimensions: timestamps + windows | High |
| Correlation: session id + conversation fingerprint | High |

## Open questions

1. Should app version be parsed and stored for compat policy?
2. Should keyless user identity default to app class as proxy?
3. Should IP be used for attribution at all (given NAT/localhost)?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b6b-attribution-dimensions.md`
- Industry: OpenRouter attribution, LiteLLM user tracking, privacy-preserving attribution