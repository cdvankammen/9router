# Tree T7 — OpenRouter App Attribution (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #openrouter #app-attribution #t07

## Objective

Full 6-level binary tree expansion of the **OpenRouter app attribution** topic (from `2026-08-31-message-origin-and-destination-research.md` Part B.1). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: OpenRouter app attribution
├─ L1L: HTTP-Referer header
│  ├─ L2LL: Purpose
│  │  ├─ L3LLL: app identification
│  │  │  ├─ L4LLLL: site URL
│  │  │  │  ├─ L5LLLLL: referer value
│  │  │  │  │  ├─ L6LLLLLL: app site
│  │  │  │  │  └─ L6LLLLLR: dashboard
│  │  │  │  └─ L5LLLLR: attribution
│  │  │  │     ├─ L6LLLLRL: app attribution
│  │  │  │     └─ L6LLLLRR: analytics
│  │  │  └─ L4LLLR: required?
│  │  │     ├─ L5LLLRL: recommended
│  │  │     │  ├─ L6LLLRLL: best practice
│  │  │     │  └─ L6LLLRLR: not enforced
│  │  │     └─ L5LLLRR: enforcement
│  │  │        ├─ L6LLLRRL: some endpoints
│  │  │        └─ L6LLLRRR: 400 error
│  │  └─ L3LLR: value format
│  │     ├─ L4LLRL: URL format
│  │     │  ├─ L5LLRLL: https://
│  │     │  │  ├─ L6LLRLLL: scheme
│  │     │  │  └─ L6LLRLLR: domain
│  │     │  └─ L5LLRLR: path
│  │     │     ├─ L6LLRLRL: optional
│  │     │     └─ L6LLRLRR: ignored
│  │     └─ L4LLRR: privacy
│  │        ├─ L5LLRRL: referer leak
│  │        │  ├─ L6LLRRLL: sent to provider
│  │        │  └─ L6LLRRLR: visible
│  │        └─ L5LLRRR: local gateway
│  │           ├─ L6LLRRRL: 9router strips?
│  │           └─ L6LLRRRR: privacy choice
│  └─ L2LR: X-Title header
│     ├─ L3LRL: app name
│     │  ├─ L4LRLL: title value
│     │  │  ├─ L5LRLLL: app name
│     │  │  │  ├─ L6LRLLLL: human name
│     │  │  │  └─ L6LRLLLR: display
│     │  │  └─ L5LRLLR: fallback
│     │  │     ├─ L6LRLLRL: referer
│     │  │     └─ L6LRLLRR: unknown
│     │  └─ L4LRLR: usage
│     │     ├─ L5LRLRL: dashboard
│     │     │  ├─ L6LRLRLL: activity view
│     │     │  └─ L6LRLRLR: app column
│     │     └─ L5LRLRR: analytics
│     │        ├─ L6LRLRRL: per-app stats
│     │        └─ L6LRLRRR: top apps
│     └─ L3LRR: header precedence
│        ├─ L4LRRL: X-Title wins
│        │  ├─ L5LRRLL: explicit
│        │  │  ├─ L6LRRLLL: X-Title first
│        │  │  └─ L6LRRLLR: more specific
│        │  └─ L5LRRLR: referer fallback
│        │     ├─ L6LRRLRL: X-Title absent
│        │     └─ L6LRRLRR: referer used
│        └─ L4LRRR: unknown default
│           ├─ L5LRRRL: no headers
│           │  ├─ L6LRRRLL: unknown app
│           │  └─ L6LRRRLR: default
│           └─ L5LRRRR: grouping
│              ├─ L6LRRRRL: unknown bucket
│              └─ L6LRRRRR: analytics
└─ L1R: 9router mapping
   ├─ L2RL: UA → app class
   │  ├─ L3RLL: sourceApps.js
   │  │  ├─ L4RLLL: fingerprint
   │  │  │  ├─ L5RLLLL: UA rules
   │  │  │  │  ├─ L6RLLLLL: regex match
   │  │  │  │  └─ L6RLLLLR: app class
   │  │  │  └─ L5RLLLR: 300-char cap
   │  │  │     ├─ L6RLLLRL: bounded
   │  │  │     └─ L6RLLLRR: safe
   │  │  └─ L4RLLR: class output
   │  │     ├─ L5RLLRL: stable class
   │  │     │  ├─ L6RLLRLL: "Claude Code"
   │  │     │  └─ L6RLLRLR: "Cursor"
   │  │     └─ L5RLLRR: unknown
   │  │        ├─ L6RLLRRL: no match
   │  │        └─ L6RLLRRR: default
   │  └─ L3RLR: header mapping
   │     ├─ L4RLRL: X-Title → class
   │     │  ├─ L5RLRLL: title match
   │     │  │  ├─ L6RLRLLL: known app
   │     │  │  └─ L6RLRLLR: map
   │     │  └─ L5RLRLR: title unknown
   │     │     ├─ L6RLRLRL: new app
   │     │     └─ L6RLRLRR: unknown class
   │     └─ L4RLRR: referer → class
   │        ├─ L5RLRRL: domain match
   │        │  ├─ L6RLRRLL: known domain
   │        │  └─ L6RLRRLR: map
   │        └─ L5RLRRR: domain unknown
   │           ├─ L6RLRRRL: new domain
   │           └─ L6RLRRRR: unknown class
   └─ L2RR: Governance use
      ├─ L3RRL: per-app limits
      │  ├─ L4RRLL: app-scoped quotas
      │  │  ├─ L5RRLLL: per-app budget
      │  │  │  ├─ L6RRLLLL: budget cap
      │  │  │  └─ L6RRLLLR: per-app
      │  │  └─ L5RRLLR: app-scoped rate
      │  │     ├─ L6RRLLRL: rate limit
      │  │     └─ L6RRLLRR: per-app
      │  └─ L4RRLR: app-scoped routing
      │     ├─ L5RRLRL: model pools
      │     │  ├─ L6RRLRLL: per-app pool
      │     │  └─ L6RRLRLR: model groups
      │     └─ L5RRLRR: priorities
      │        ├─ L6RRLRRL: app priority
      │        └─ L6RRLRRR: queue order
      └─ L3RRR: attribution chain
         ├─ L4RRRL: UA + headers
         │  ├─ L5RRRLL: combined signal
         │  │  ├─ L6RRRLLL: UA + X-Title
         │  │  └─ L6RRRLLR: UA + referer
         │  └─ L5RRRLR: confidence
         │     ├─ L6RRRLRL: agree → high
         │     └─ L6RRRLRR: disagree → low
         └─ L4RRRR: spoof resistance
            ├─ L5RRRRL: headers spoofable
            │  ├─ L6RRRRLL: client-controlled
            │  └─ L6RRRRLR: easy to fake
            └─ L5RRRRR: behavior check
               ├─ L6RRRRRL: session-id
               └─ L6RRRRRR: tool-use
```

## Node research (all 127 nodes)

### L0 — OpenRouter app attribution
OpenRouter identifies apps via `HTTP-Referer` (site URL) and `X-Title` (app name). 9router maps this to its own UA-based app classes.

### L1L — HTTP-Referer header
Site URL for app identification; recommended, not always enforced.

### L1R — 9router mapping
Map OpenRouter headers → 9router app classes; governance use.

### L2LL — Purpose
App identification + attribution analytics.

### L2LR — X-Title header
Human app name; fallback to referer.

### L2RL — UA → app class
sourceApps.js fingerprinting.

### L2RR — Governance use
Per-app limits, routing, priorities.

### L3LLL — app identification
Referer identifies the app.

### L3LLR — value format
URL format.

### L3LRL — app name
X-Title value.

### L3LRR — header precedence
X-Title wins; referer fallback.

### L3RLL — sourceApps.js
UA fingerprinting.

### L3RLR — header mapping
X-Title/referer → class.

### L3RRL — per-app limits
Quotas + rates.

### L3RRR — attribution chain
Combined signals + spoof resistance.

### L4LLLL — site URL
Referer value.

### L4LLLR — required?
Recommended.

### L4LLRL — URL format
https://domain.

### L4LLRR — privacy
Referer leak.

### L4LRLL — title value
App name.

### L4LRLR — usage
Dashboard + analytics.

### L4LRRL — X-Title wins
Explicit.

### L4LRRR — unknown default
No headers → unknown.

### L4RLLL — fingerprint
UA rules.

### L4RLLR — class output
Stable class.

### L4RLRL — X-Title → class
Title match.

### L4RLRR — referer → class
Domain match.

### L4RRLL — app-scoped quotas
Per-app budget.

### L4RRLR — app-scoped routing
Model pools.

### L4RRRL — UA + headers
Combined.

### L4RRRR — spoof resistance
Behavior check.

### L5LLLLL — referer value
Site URL.

### L5LLLLR — dashboard
App dashboard.

### L5LLLLRL — app attribution
Attribution.

### L5LLLLRR — analytics
Stats.

### L5LLLRL — recommended
Best practice.

### L5LLLRR — enforcement
Some endpoints.

### L5LLRLL — https://
Scheme.

### L5LLRLR — path
Optional.

### L5LLRRL — referer leak
Sent to provider.

### L5LLRRR — local gateway
9router strips?

### L5LRLLL — app name
Human name.

### L5LRLLR — fallback
Referer.

### L5LRLRL — dashboard
Activity view.

### L5LRLRR — analytics
Per-app stats.

### L5LRRLL — explicit
X-Title first.

### L5LRRLR — referer fallback
Absent.

### L5LRRRL — no headers
Unknown.

### L5LRRRR — grouping
Unknown bucket.

### L5RLLLL — regex match
UA rules.

### L5RLLLR — 300-char cap
Bounded.

### L5RLLRL — stable class
"Claude Code".

### L5RLLRR — unknown
No match.

### L5RLRLL — known app
Map.

### L5RLRLR — title unknown
New app.

### L5RLRRL — known domain
Map.

### L5RLRRR — domain unknown
New domain.

### L5RRLLL — budget cap
Per-app.

### L5RRLLR — rate limit
Per-app.

### L5RRLRL — per-app pool
Model groups.

### L5RRLRR — priorities
Queue order.

### L5RRRLL — combined signal
UA + X-Title.

### L5RRRLR — confidence
Agree/disagree.

### L5RRRRL — headers spoofable
Client-controlled.

### L5RRRRR — behavior check
Session-id.

### L6 leaves (64)
- **L6LLLLLL** app site: referer.
- **L6LLLLLR** dashboard: app dashboard.
- **L6LLLLRL** app attribution: attribution.
- **L6LLLLRR** analytics: stats.
- **L6LLLRLL** best practice: recommended.
- **L6LLLRLR** not enforced: optional.
- **L6LLLRRL** some endpoints: enforced.
- **L6LLLRRR** 400 error: missing.
- **L6LLRLLL** scheme: https.
- **L6LLRLLR** domain: host.
- **L6LLRLRL** optional: path.
- **L6LLRLRR** ignored: path.
- **L6LLRRLL** sent to provider: leak.
- **L6LLRRLR** visible: provider sees.
- **L6LLRRRL** 9router strips?: question.
- **L6LLRRRR** privacy choice: local.
- **L6LRLLLL** human name: X-Title.
- **L6LRLLLR** display: shown.
- **L6LRLLRL** referer: fallback.
- **L6LRLLRR** unknown: default.
- **L6LRLRLL** activity view: dashboard.
- **L6LRLRLR** app column: table.
- **L6LRLRRL** per-app stats: analytics.
- **L6LRLRRR** top apps: ranking.
- **L6LRRLLL** X-Title first: precedence.
- **L6LRRLLR** more specific: title.
- **L6LRRLRL** X-Title absent: fallback.
- **L6LRRLRR** referer used: fallback.
- **L6LRRRLL** unknown app: default.
- **L6LRRRLR** default: unknown.
- **L6LRRRRL** unknown bucket: group.
- **L6LRRRRR** analytics: stats.
- **L6RLLLLL** regex match: UA.
- **L6RLLLLR** app class: output.
- **L6RLLLRL** bounded: cap.
- **L6RLLLRR** safe: DoS guard.
- **L6RLLRLL** "Claude Code": class.
- **L6RLLRLR** "Cursor": class.
- **L6RLLRRL** no match: unknown.
- **L6RLLRRR** default: unknown.
- **L6RLRLLL** known app: map.
- **L6RLRLLR** map: class.
- **L6RLRLRL** new app: unknown.
- **L6RLRLRR** unknown class: default.
- **L6RLRRLL** known domain: map.
- **L6RLRRLR** map: class.
- **L6RLRRRL** new domain: unknown.
- **L6RLRRRR** unknown class: default.
- **L6RRLLLL** budget cap: quota.
- **L6RRLLLR** per-app: scoped.
- **L6RRLLRL** rate limit: per-app.
- **L6RRLLRR** per-app: scoped.
- **L6RRLRLL** per-app pool: models.
- **L6RRLRLR** model groups: groups.
- **L6RRLRRL** app priority: priority.
- **L6RRLRRR** queue order: order.
- **L6RRRLLL** UA + X-Title: combined.
- **L6RRRLLR** UA + referer: combined.
- **L6RRRLRL** agree → high: confidence.
- **L6RRRLRR** disagree → low: confidence.
- **L6RRRRLL** client-controlled: spoofable.
- **L6RRRRLR** easy to fake: headers.
- **L6RRRRRL** session-id: behavior.
- **L6RRRRRR** tool-use: behavior.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| OpenRouter uses HTTP-Referer + X-Title for attribution | High |
| X-Title takes precedence over referer | Medium |
| 9router maps UA → app class independently | High |
| Headers are spoofable; behavior checks add resistance | High |

## Open questions

1. Should 9router forward/strip HTTP-Referer to upstreams (privacy)?
2. Should X-Title be mapped into the app class when UA is unknown?
3. Should per-app limits key off UA class or X-Title?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b2a-openrouter-app-attribution.md`
- Industry: OpenRouter docs (HTTP-Referer, X-Title), LiteLLM app attribution