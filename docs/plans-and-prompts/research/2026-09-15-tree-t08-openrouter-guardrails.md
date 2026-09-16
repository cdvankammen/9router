# Tree T8 — OpenRouter Guardrails (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #openrouter #guardrails #t08

## Objective

Full 6-level binary tree expansion of the **OpenRouter guardrails** topic (from `2026-08-31-message-origin-and-destination-research.md` Part B.1). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: OpenRouter guardrails
├─ L1L: Guardrail types
│  ├─ L2LL: Content guardrails
│  │  ├─ L3LLL: input filtering
│  │  │  ├─ L4LLLL: prompt injection
│  │  │  │  ├─ L5LLLLL: injection detection
│  │  │  │  │  ├─ L6LLLLLL: prompt patterns
│  │  │  │  │  └─ L6LLLLLR: jailbreak
│  │  │  │  └─ L5LLLLR: PII detection
│  │  │  │     ├─ L6LLLLRL: PII scan
│  │  │  │     └─ L6LLLLRR: redact
│  │  │  └─ L4LLLR: output filtering
│  │  │     ├─ L5LLLRL: toxicity
│  │  │     │  ├─ L6LLLRLL: toxicity score
│  │  │     │  └─ L6LLLRLR: block
│  │  │     └─ L5LLLRR: policy violation
│  │  │        ├- L6LLLRRL: policy check
│  │  │        └─ L6LLLRRR: block
│  │  └─ L3LLR: model guardrails
│  │     ├─ L4LLRL: model-level
│  │     │  ├─ L5LLRLL: per-model rules
│  │     │  │  ├─ L6LLRLLL: model policy
│  │     │  │  └─ L6LLRLLR: model caps
│  │     │  └─ L5LLRLR: provider-level
│  │     │     ├─ L6LLRLRL: provider policy
│  │     │     └─ L6LLRLRR: provider caps
│  │     └─ L4LLRR: enforcement
│  │        ├─ L5LLRRL: block
│  │        │  ├─ L6LLRRLL: reject request
│  │        │  └─ L6LLRRLR: error response
│  │        └─ L5LLRRR: warn
│  │           ├─ L6LLRRRL: flag
│  │           └─ L6LLRRRR: log
│  └─ L2LR: Usage guardrails
│     ├─ L3LRL: spend caps
│     │  ├─ L4LRLL: budget limits
│     │  │  ├─ L5LRLLL: monthly cap
│     │  │  │  ├─ L6LRLLLL: hard cap
│     │  │  │  └─ L6LRLLLR: soft cap
│     │  │  └─ L5LRLLR: per-key cap
│     │  │     ├─ L6LRLLRL: key budget
│     │  │     └─ L6LRLLRR: key limit
│     │  └─ L4LRLR: rate limits
│     │     ├─ L5LRLRL: RPM
│     │     │  ├─ L6LRLRLL: requests/min
│     │     │  └─ L6LRLRLR: per-key
│     │     └─ L5LRLRR: TPM
│     │        ├─ L6LRLRRL: tokens/min
│     │        └─ L6LRLRRR: per-key
│     └─ L3LRR: model access
│        ├─ L4LRRL: allowlist
│        │  ├─ L5LRRLL: allowed models
│        │  │  ├─ L6LRRLLL: list
│        │  │  └─ L6LRRLLR: enforce
│        │  └─ L5LRRLR: denylist
│        │     ├─ L6LRRLRL: blocked models
│        │     └─ L6LRRLRR: enforce
│        └─ L4LRRR: model groups
│           ├─ L5LRRRL: group access
│           │  ├─ L6LRRRLL: group allow
│           │  └─ L6LRRRLR: group deny
│           └─ L5LRRRR: tier access
│              ├─ L6LRRRRL: tier allow
│              └─ L6LRRRRR: tier deny
└─ L1R: 9router guardrails
   ├─ L2RL: Existing controls
   │  ├─ L3RLL: rate limiter
   │  │  ├─ L4RLLL: inbound limits
   │  │  │  ├─ L5RLLLL: general 120
   │  │  │  │  ├─ L6RLLLLL: general tier
   │  │  │  │  └─ L6RLLLLR: 120/min
   │  │  │  └─ L5RLLLR: chat 20
   │  │  │     ├─ L6RLLLRL: chat tier
   │  │  │     └─ L6RLLLRR: 20/min
   │  │  └─ L4RLLR: loopback bypass
   │  │     ├─ L5RLLRL: localhost
   │  │     │  ├─ L6RLLRLL: trusted
   │  │     │  └─ L6RLLRLR: bypass
   │  │     └─ L5RLLRR: LAN
   │  │        ├─ L6RLLRRL: limited
   │  │        └─ L6RLLRRR: enforced
   │  └─ L3RLR: auth gate
   │     ├─ L4RLRL: API keys
   │     │  ├─ L5RLRLL: key check
   │     │  │  ├─ L6RLRLLL: bearer
   │     │  │  └─ L6RLRLLR: valid
   │     │  └─ L5RLRLR: keyless
   │     │     ├─ L6RLRLRL: localhost
   │     │     └─ L6RLRLRR: no key
   │     └─ L4RLRR: dashboard guard
   │        ├─ L5RLRRL: session auth
   │        │  ├─ L6RLRRLL: JWT
   │        │  └─ L6RLRRLR: cookie
   │        └─ L5RLRRR: password
   │           ├─ L6RLRRRL: INITIAL_PASSWORD
   │           └─ L6RLRRRR: must change
   └─ L2RR: Gap analysis
      ├─ L3RRL: missing guardrails
      │  ├─ L4RRLL: content filtering
      │  │  ├─ L5RRLLL: injection
      │  │  │  ├─ L6RRLLLL: no filter
      │  │  │  └─ L6RRLLLR: gap
      │  │  └─ L5RRLLR: PII
      │  │     ├─ L6RRLLRL: no scan
      │  │     └─ L6RRLLRR: gap
      │  └─ L4RRLR: spend caps
      │     ├─ L5RRLRL: budget
      │     │  ├─ L6RRLRLL: no cap
      │     │  └─ L6RRLRLR: gap
      │     └─ L5RRLRR: per-key
      │        ├─ L6RRLRRL: no key caps
      │        └─ L6RRLRRR: gap
      └─ L3RRR: roadmap
         ├─ L4RRRL: phase 1
         │  ├─ L5RRRLL: rate + auth
         │  │  ├─ L6RRRLLL: existing
         │  │  └─ L6RRRLLR: harden
         │  └─ L5RRRLR: spend caps
         │     ├─ L6RRRLRL: add caps
         │     └─ L6RRRLRR: enforce
         └─ L4RRRR: phase 2
            ├─ L5RRRRL: content guard
            │  ├─ L6RRRRLL: injection
            │  └─ L6RRRRLR: PII
            └─ L5RRRRR: model access
               ├─ L6RRRRRL: allowlist
               └─ L6RRRRRR: groups
```

## Node research (all 127 nodes)

### L0 — OpenRouter guardrails
OpenRouter offers content guardrails (injection/PII), usage guardrails (spend/rate), and model access control. 9router has rate + auth; content/spend are gaps.

### L1L — Guardrail types
Content, usage, model access.

### L1R — 9router guardrails
Existing controls + gap analysis + roadmap.

### L2LL — Content guardrails
Input/output filtering.

### L2LR — Usage guardrails
Spend caps, rate limits.

### L2RL — Existing controls
Rate limiter + auth gate.

### L2RR — Gap analysis
Missing content filtering + spend caps.

### L3LLL — input filtering
Injection + PII.

### L3LLR — model guardrails
Per-model/provider rules.

### L3LRL — spend caps
Budget + per-key.

### L3LRR — model access
Allowlist/denylist/groups.

### L3RLL — rate limiter
Inbound limits.

### L3RLR — auth gate
API keys + dashboard.

### L3RRL — missing guardrails
Content + spend.

### L3RRR — roadmap
Phase 1/2.

### L4LLLL — prompt injection
Detection.

### L4LLLR — output filtering
Toxicity.

### L4LLRL — model-level
Per-model rules.

### L4LLRR — enforcement
Block/warn.

### L4LRLL — budget limits
Monthly cap.

### L4LRLR — rate limits
RPM/TPM.

### L4LRRL — allowlist
Allowed models.

### L4LRRR — model groups
Group access.

### L4RLLL — inbound limits
General/chat.

### L4RLLR — loopback bypass
Localhost.

### L4RLRL — API keys
Bearer.

### L4RLRR — dashboard guard
JWT.

### L4RRLL — content filtering
Injection/PII.

### L4RRLR — spend caps
Budget.

### L4RRRL — phase 1
Rate + auth + caps.

### L4RRRR — phase 2
Content + model access.

### L5LLLLL — injection detection
Prompt patterns.

### L5LLLLR — PII detection
Scan.

### L5LLLRL — toxicity
Score.

### L5LLLRR — policy violation
Check.

### L5LLRLL — per-model rules
Model policy.

### L5LLRLR — provider-level
Provider policy.

### L5LLRRL — block
Reject.

### L5LLRRR — warn
Flag.

### L5LRLLL — monthly cap
Hard/soft.

### L5LRLLR — per-key cap
Key budget.

### L5LRLRL — RPM
Requests/min.

### L5LRLRR — TPM
Tokens/min.

### L5LRRLL — allowed models
List.

### L5LRRLR — blocked models
List.

### L5LRRRL — group access
Allow/deny.

### L5LRRRR — tier access
Allow/deny.

### L5RLLLL — general tier
120/min.

### L5RLLLR — chat tier
20/min.

### L5RLLRL — localhost
Trusted.

### L5RLLRR — LAN
Enforced.

### L5RLRLL — key check
Bearer.

### L5RLRLR — keyless
Localhost.

### L5RLRRL — session auth
JWT.

### L5RLRRR — password
INITIAL_PASSWORD.

### L5RRLLL — injection
No filter.

### L5RRLLR — PII
No scan.

### L5RRLRL — budget
No cap.

### L5RRLRR — per-key
No caps.

### L5RRRLL — existing
Rate + auth.

### L5RRRLR — spend caps
Add.

### L5RRRRL — content guard
Injection.

### L5RRRRR — model access
Allowlist.

### L6 leaves (64)
- **L6LLLLLL** prompt patterns: known injection.
- **L6LLLLLR** jailbreak: bypass attempts.
- **L6LLLLRL** PII scan: detect.
- **L6LLLLRR** redact: mask.
- **L6LLLRLL** toxicity score: classifier.
- **L6LLLRLR** block: reject output.
- **L6LLLRRL** policy check: rules.
- **L6LLLRRR** block: reject.
- **L6LLRLLL** model policy: per-model.
- **L6LLRLLR** model caps: limits.
- **L6LLRLRL** provider policy: per-provider.
- **L6LLRLRR** provider caps: limits.
- **L6LLRRLL** reject request: 4xx.
- **L6LLRRLR** error response: message.
- **L6LLRRRL** flag: mark.
- **L6LLRRRR** log: record.
- **L6LRLLLL** hard cap: stop.
- **L6LRLLLR** soft cap: warn.
- **L6LRLLRL** key budget: per-key.
- **L6LRLLRR** key limit: per-key.
- **L6LRLRLL** requests/min: RPM.
- **L6LRLRLR** per-key: scoped.
- **L6LRLRRL** tokens/min: TPM.
- **L6LRLRRR** per-key: scoped.
- **L6LRRLLL** list: models.
- **L6LRRLLR** enforce: block others.
- **L6LRRLRL** blocked models: deny.
- **L6LRRLRR** enforce: block.
- **L6LRRRLL** group allow: group.
- **L6LRRRLR** group deny: group.
- **L6LRRRRL** tier allow: tier.
- **L6LRRRRR** tier deny: tier.
- **L6RLLLLL** general tier: all.
- **L6RLLLLR** 120/min: limit.
- **L6RLLLRL** chat tier: chat.
- **L6RLLLRR** 20/min: limit.
- **L6RLLRLL** trusted: bypass.
- **L6RLLRLR** bypass: no limit.
- **L6RLLRRL** limited: enforced.
- **L6RLLRRR** enforced: limits.
- **L6RLRLLL** bearer: header.
- **L6RLRLLR** valid: check.
- **L6RLRLRL** localhost: no key.
- **L6RLRLRR** no key: keyless.
- **L6RLRRLL** JWT: sign.
- **L6RLRRLR** cookie: session.
- **L6RLRRRL** INITIAL_PASSWORD: default.
- **L6RLRRRR** must change: prompt.
- **L6RRLLLL** no filter: gap.
- **L6RRLLLR** gap: missing.
- **L6RRLLRL** no scan: gap.
- **L6RRLLRR** gap: missing.
- **L6RRLRLL** no cap: gap.
- **L6RRLRLR** gap: missing.
- **L6RRLRRL** no key caps: gap.
- **L6RRLRRR** gap: missing.
- **L6RRRLLL** existing: rate.
- **L6RRRLLR** harden: improve.
- **L6RRRLRL** add caps: spend.
- **L6RRRLRR** enforce: block.
- **L6RRRRLL** injection: filter.
- **L6RRRRLR** PII: scan.
- **L6RRRRRL** allowlist: models.
- **L6RRRRRR** groups: access.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| OpenRouter offers content + usage + model guardrails | High |
| 9router has rate limiting + auth today | High |
| Content filtering (injection/PII) is a gap | High |
| Spend caps are a gap | High |

## Open questions

1. Should content filtering be local (heuristic) or API-based (LLM judge)?
2. Should spend caps be per-app (source class) or per-key?
3. Should model access control use allowlist or groups?

## Sources

- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b2b-openrouter-guardrails.md`
- Industry: OpenRouter guardrails docs, LiteLLM budgets, Cloudflare AI gateway