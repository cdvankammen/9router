# Tree T14 — Agent Identity & Attribution Headers (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #agent-identity #headers #t14

## Objective

Full 6-level binary tree expansion of the **agent identity & attribution headers** topic (from `2026-08-31-message-origin-and-destination-research.md` Part B.4). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Agent identity & attribution headers
├─ L1L: Header inventory
│  ├─ L2LL: Standard headers
│  │  ├─ L3LLL: User-Agent
│  │  │  ├─ L4LLLL: UA format
│  │  │  │  ├─ L5LLLLL: app/version
│  │  │  │  │  ├─ L6LLLLLL: app name
│  │  │  │  │  └─ L6LLLLLR: version
│  │  │  │  └─ L5LLLLR: UA spoofing
│  │  │  │     ├─ L6LLLLRL: client-controlled
│  │  │  │     └─ L6LLLLRR: easy to fake
│  │  │  └─ L4LLLR: UA parsing
│  │  │     ├─ L5LLLRL: regex rules
│  │  │     │  ├─ L6LLLRLL: sourceApps
│  │  │     │  └─ L6LLLRLR: match
│  │  │     └─ L5LLLRR: cap 300
│  │  │        ├─ L6LLLRRL: bounded
│  │  │        └─ L6LLLRRR: safe
│  │  └─ L3LLR: X-Title
│  │     ├─ L4LLRL: app name
│  │     │  ├─ L5LLRLL: human name
│  │     │  │  ├─ L6LLRLLL: display
│  │     │  │  └─ L6LLRLLR: attribution
│  │     │  └─ L5LLRLR: fallback
│  │     │     ├─ L6LLRLRL: referer
│  │     │     └─ L6LLRLRR: unknown
│  │     └─ L4LLRR: precedence
│  │        ├─ L5LLRRL: X-Title wins
│  │        │  ├─ L6LLRRLL: explicit
│  │        │  └─ L6LLRRLR: specific
│  │        └─ L5LLRRR: UA fallback
│  │           ├─ L6LLRRRL: no title
│  │           └─ L6LLRRRR: UA used
│  └─ L2LR: Agent headers
│     ├─ L3LRL: session headers
│     │  ├─ L4LRLL: x-claude-code-session-id
│     │  │  ├─ L5LRLLL: session id
│     │  │  │  ├─ L6LRLLLL: unique
│     │  │  │  └─ L6LRLLLR: per-session
│     │  │  └─ L5LRLLR: usage
│     │  │     ├─ L6LRLLRL: grouping
│     │  │     └─ L6LRLLRR: spend
│     │  └─ L4LRLR: other session headers
│     │     ├─ L5LRLRL: cursor session
│     │     │  ├─ L6LRLRLL: cursor id
│     │     │  └─ L6LRLRLR: grouping
│     │     └─ L5LRLRR: copilot session
│     │        ├─ L6LRLRRL: copilot id
│     │        └─ L6LRLRRR: grouping
│     └─ L3LRR: custom headers
│        ├─ L4LRRL: x-9router-*
│        │  ├─ L5LRRLL: app class
│        │  │  ├─ L6LRRLLL: explicit
│        │  │  └─ L6LRRLLR: override
│        │  └─ L5LRRLR: task type
│        │     ├─ L6LRRLRL: explicit
│        │     └─ L6LRRLRR: override
│        └─ L4LRRR: x-agent-*
│           ├─ L5LRRRL: agent name
│           │  ├─ L6LRRRLL: name
│           │  └─ L6LRRRLR: version
│           └─ L5LRRRR: agent id
│              ├─ L6LRRRRL: id
│              └─ L6LRRRRR: profile
└─ L1R: Attribution pipeline
   ├─ L2RL: Signal fusion
   │  ├─ L3RLL: combine signals
   │  │  ├─ L4RLLL: UA + headers
   │  │  │  ├─ L5RLLLL: UA + X-Title
   │  │  │  │  ├─ L6RLLLLL: agree
   │  │  │  │  └─ L6RLLLLR: disagree
   │  │  │  └─ L5RLLLR: UA + session
   │  │  │     ├─ L6RLLLRL: session id
   │  │  │     └─ L6RLLLRR: confirm
   │  │  └─ L4RLLR: confidence score
   │  │     ├─ L5RLLRL: weighted
   │  │     │  ├─ L6RLLRLL: weights
   │  │     │  └─ L6RLLRLR: score
   │  │     └─ L5RLLRR: threshold
   │  │        ├─ L6RLLRRL: accept
   │  │        └─ L6RLLRRR: reject
   │  └─ L3RLR: spoof resistance
   │     ├─ L4RLRL: header spoofing
   │     │  ├─ L5RLRLL: easy
   │     │  │  ├─ L6RLRLLL: curl -H
   │     │  │  └─ L6RLRLLR: fake
   │     │  └─ L5RLRLR: behavior
   │     │     ├─ L6RLRLRL: tool-use
   │     │     └─ L6RLRLRR: streaming
   │     └─ L4RLRR: trust tiers
   │        ├─ L5RLRRL: untrusted
   │        │  ├─ L6RLRRLL: headers
   │        │  └─ L6RLRRLR: low trust
   │        └─ L5RLRRR: trusted
   │           ├─ L6RLRRRL: key
   │           └─ L6RLRRRR: high trust
   └─ L2RR: Governance use
      ├─ L3RRL: per-agent limits
      │  ├─ L4RRLL: agent quotas
      │  │  ├─ L5RRLLL: per-agent
      │  │  │  ├─ L6RRLLLL: quota
      │  │  │  └─ L6RRLLLR: cap
      │  │  └─ L5RRLLR: agent rates
      │  │     ├─ L6RRLLRL: rate
      │  │     └─ L6RRLLRR: cap
      │  └─ L4RRLR: per-session limits
      │     ├─ L5RRLRL: session quota
      │     │  ├─ L6RRLRLL: quota
      │     │  └─ L6RRLRLR: cap
      │     └─ L5RRLRR: session rate
      │        ├─ L6RRLRRL: rate
      │        └─ L6RRLRRR: cap
      └─ L3RRR: attribution output
         ├─ L4RRRL: usage meta
         │  ├─ L5RRRLL: app class
         │  │  ├─ L6RRRLLL: stored
         │  │  └─ L6RRRLLR: usage
         │  └─ L5RRRLR: session id
         │     ├─ L6RRRLRL: stored
         │     └─ L6RRRLRR: usage
         └─ L4RRRR: dashboard
            ├─ L5RRRRL: per-app view
            │  ├─ L6RRRRLL: view
            │  └─ L6RRRRLR: filter
            └─ L5RRRRR: per-session view
               ├─ L6RRRRRL: view
               └─ L6RRRRRR: filter
```

## Node research (all 127 nodes)

### L0 — Agent identity & attribution headers
Headers that identify the calling agent: UA, X-Title, session ids, custom headers. 9router fuses signals into attribution for governance.

### L1L — Header inventory
Standard + agent + custom headers.

### L1R — Attribution pipeline
Signal fusion + governance use.

### L2LL — Standard headers
UA + X-Title.

### L2LR — Agent headers
Session ids + custom.

### L2RL — Signal fusion
Combine + confidence.

### L2RR — Governance use
Per-agent/session limits.

### L3LLL — User-Agent
App/version.

### L3LLR — X-Title
App name.

### L3LRL — session headers
Session ids.

### L3LRR — custom headers
x-9router-*.

### L3RLL — combine signals
UA + headers.

### L3RLR — spoof resistance
Behavior.

### L3RRL — per-agent limits
Quotas.

### L3RRR — attribution output
Usage meta.

### L4LLLL — UA format
App/version.

### L4LLLR — UA parsing
Regex.

### L4LLRL — app name
X-Title.

### L4LLRR — precedence
X-Title wins.

### L4LRLL — x-claude-code-session-id
Session.

### L4LRLR — other session headers
Cursor/copilot.

### L4LRRL — x-9router-*
Custom.

### L4LRRR — x-agent-*
Custom.

### L4RLLL — UA + headers
Combine.

### L4RLLR — confidence score
Weighted.

### L4RLRL — header spoofing
Easy.

### L4RLRR — trust tiers
Untrusted/trusted.

### L4RRLL — agent quotas
Per-agent.

### L4RRLR — per-session limits
Quotas.

### L4RRRL — usage meta
App class.

### L4RRRR — dashboard
Views.

### L5LLLLL — app name
UA.

### L5LLLLR — version
UA.

### L5LLLRL — regex rules
sourceApps.

### L5LLLRR — cap 300
Bounded.

### L5LLRLL — human name
X-Title.

### L5LLRLR — fallback
Referer.

### L5LLRRL — X-Title wins
Explicit.

### L5LLRRR — UA fallback
No title.

### L5LRLLL — session id
Unique.

### L5LRLLR — usage
Grouping.

### L5LRLRL — cursor session
Cursor id.

### L5LRLRR — copilot session
Copilot id.

### L5LRRLL — app class
Explicit.

### L5LRRLR — task type
Explicit.

### L5LRRRL — agent name
Name.

### L5LRRRR — agent id
Id.

### L5RLLLL — agree
UA + title.

### L5RLLLR — disagree
Mismatch.

### L5RLLLRL — session id
Confirm.

### L5RLLLRR — confirm
Agent.

### L5RLLRL — weighted
Weights.

### L5RLLRR — threshold
Accept.

### L5RLRLL — curl -H
Spoof.

### L5RLRLR — behavior
Tool-use.

### L5RLRRL — untrusted
Headers.

### L5RLRRR — trusted
Key.

### L5RRLLL — per-agent
Quota.

### L5RRLLR — agent rates
Rate.

### L5RRLRL — session quota
Quota.

### L5RRLRR — session rate
Rate.

### L5RRRLL — app class
Stored.

### L5RRRLR — session id
Stored.

### L5RRRRL — per-app view
View.

### L5RRRRR — per-session view
View.

### L6 leaves (64)
- **L6LLLLLL** app name: UA.
- **L6LLLLLR** version: UA.
- **L6LLLLRL** client-controlled: spoofable.
- **L6LLLLRR** easy to fake: UA.
- **L6LLLRLL** sourceApps: rules.
- **L6LLLRLR** match: class.
- **L6LLLRRL** bounded: cap.
- **L6LLLRRR** safe: DoS.
- **L6LLRLLL** display: title.
- **L6LLRLLR** attribution: title.
- **L6LLRLRL** referer: fallback.
- **L6LLRLRR** unknown: default.
- **L6LLRRLL** explicit: title.
- **L6LLRRLR** specific: title.
- **L6LLRRRL** no title: fallback.
- **L6LLRRRR** UA used: fallback.
- **L6LRLLLL** unique: session.
- **L6LRLLLR** per-session: id.
- **L6LRLLRL** grouping: usage.
- **L6LRLLRR** spend: grouping.
- **L6LRLRLL** cursor id: session.
- **L6LRLRLR** grouping: usage.
- **L6LRLRRL** copilot id: session.
- **L6LRLRRR** grouping: usage.
- **L6LRRLLL** explicit: class.
- **L6LRRLLR** override: class.
- **L6LRRLRL** explicit: task.
- **L6LRRLRR** override: task.
- **L6LRRRLL** name: agent.
- **L6LRRRLR** version: agent.
- **L6LRRRRL** id: agent.
- **L6LRRRRR** profile: agent.
- **L6RLLLLL** agree: high.
- **L6RLLLLR** disagree: low.
- **L6RLLLRL** session id: confirm.
- **L6RLLLRR** confirm: agent.
- **L6RLLRLL** weights: signals.
- **L6RLLRLR** score: 0-1.
- **L6RLLRRL** accept: pass.
- **L6RLLRRR** reject: flag.
- **L6RLRLLL** curl -H: spoof.
- **L6RLRLLR** fake: headers.
- **L6RLRLRL** tool-use: behavior.
- **L6RLRLRR** streaming: behavior.
- **L6RLRRLL** headers: low trust.
- **L6RLRRLR** low trust: spoofable.
- **L6RLRRRL** key: high trust.
- **L6RLRRRR** high trust: keyed.
- **L6RRLLLL** quota: per-agent.
- **L6RRLLLR** cap: limit.
- **L6RRLLRL** rate: per-agent.
- **L6RRLLRR** cap: limit.
- **L6RRLRLL** quota: per-session.
- **L6RRLRLR** cap: limit.
- **L6RRLRRL** rate: per-session.
- **L6RRLRRR** cap: limit.
- **L6RRRLLL** stored: usage.
- **L6RRRLLR** usage: meta.
- **L6RRRLRL** stored: usage.
- **L6RRRLRR** usage: meta.
- **L6RRRRLL** view: dashboard.
- **L6RRRRLR** filter: app.
- **L6RRRRRL** view: dashboard.
- **L6RRRRRR** filter: session.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| UA + X-Title are the standard attribution headers | High |
| Session-id headers exist per agent (claude-code, cursor, copilot) | High |
| Custom x-9router-* headers are a design proposal | Medium |
| Signal fusion with confidence score is a design proposal | Medium |

## Open questions

1. Should 9router define x-9router-app-class / x-9router-task-type headers?
2. Should session-id headers be normalized into a single session key?
3. Should trust tiers gate which signals count toward limits?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b5b-agent-identity-headers.md`
- Industry: OpenRouter X-Title, LiteLLM user/session tracking, Claude Code session headers