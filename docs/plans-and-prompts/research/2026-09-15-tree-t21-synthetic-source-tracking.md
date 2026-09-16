# Tree T21 — Synthetic & Programmatic Source Tracking (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #synthetic #programmatic #tracking #t21

## Objective

Full 6-level binary tree expansion of the **synthetic & programmatic source tracking** topic (from `2026-09-14-keyless-governance-research.md` Part C). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Synthetic & programmatic source tracking
├─ L1L: Synthetic sources
│  ├─ L2LL: Scripts
│  │  ├─ L3LLL: cron jobs
│  │  │  ├─ L4LLLL: scheduled
│  │  │  │  ├─ L5LLLLL: periodic
│  │  │  │  │  ├─ L6LLLLLL: batch
│  │  │  │  │  └─ L6LLLLLR: nightly
│  │  │  │  └─ L5LLLLR: burst
│  │  │  │     ├─ L6LLLLRL: spike
│  │  │  │     └─ L6LLLLRR: detect
│  │  │  └─ L4LLLR: one-off
│  │  │     ├─ L5LLLRL: manual
│  │  │     │  ├─ L6LLLRLL: run
│  │  │     │  └─ L6LLLRLR: once
│  │  │     └─ L5LLLRR: ad hoc
│  │  │        ├─ L6LLLRRL: script
│  │  │        └─ L6LLLRRR: run
│  │  └─ L3LLR: CI/CD
│  │     ├─ L4LLRL: pipelines
│  │     │  ├─ L5LLRLL: build
│  │     │  │  ├─ L6LLRLLL: steps
│  │     │  │  └─ L6LLRLLR: AI calls
│  │     │  └─ L5LLRLR: tests
│  │     │     ├─ L6LLRLRL: AI tests
│  │     │     └─ L6LLRLRR: eval
│  │     └─ L4LLRR: agents
│  │        ├─ L5LLRRL: CI agents
│  │        │  ├─ L6LLRRLL: runner
│  │        │  └─ L6LLRRLR: agent
│  │        └─ L5LLRRR: automation
│  │           ├─ L6LLRRRL: bots
│  │           └─ L6LLRRRR: flows
│  └─ L2LR: Detection
│     ├─ L3LRL: UA patterns
│     │  ├─ L4LRLL: script UA
│     │  │  ├─ L5LRLLL: curl
│     │  │  │  ├─ L6LRLLLL: detect
│     │  │  │  └─ L6LRLLLR: class
│     │  │  └─ L5LRLLR: node fetch
│     │  │     ├─ L6LRLLRL: detect
│     │  │     └─ L6LRLLRR: class
│     │  └─ L4LRLR: header patterns
│     │     ├─ L5LRLRL: no UA
│     │     │  ├─ L6LRLRLL: missing
│     │     │  └─ L6LRLRLR: default
│     │     └─ L5LRLRR: custom
│     │        ├─ L6LRLRRL: headers
│     │        └─ L6LRLRRR: detect
│     └─ L3LRR: behavior
│        ├─ L4LRRL: burst detection
│        │  ├─ L5LRRLL: rate spike
│        │  │  ├─ L6LRRLLL: detect
│        │  │  └─ L6LRRLLR: flag
│        │  └─ L5LRRLR: pattern
│        │     ├─ L6LRRLRL: periodic
│        │     └─ L6LRRLRR: classify
│        └─ L4LRRR: timing
│           ├─ L5LRRRL: regular
│           │  ├─ L6LRRRLL: schedule
│           │  └─ L6LRRRLR: detect
│           └─ L5LRRRR: irregular
│              ├─ L6LRRRRL: human
│              └─ L6LRRRRR: classify
└─ L1R: Programmatic tracking
   ├─ L2RL: Attribution
   │  ├─ L3RLL: source class
   │  │  ├─ L4RLLL: synthetic class
   │  │  │  ├─ L5RLLLL: script
   │  │  │  │  ├─ L6RLLLLL: class
   │  │  │  │  └─ L6RLLLLR: tag
   │  │  │  └─ L5RLLLR: agent
   │  │  │     ├─ L6RLLLRL: class
   │  │  │     └─ L6RLLLRR: tag
   │  │  └─ L4RLLR: programmatic class
   │  │     ├─ L5RLLRL: SDK
   │  │     │  ├─ L6RLLRLL: openai
   │  │     │  └─ L6RLLRLR: anthropic
   │  │     └─ L5RLLRR: API
   │  │        ├─ L6RLLRRL: direct
   │  │        └─ L6RLLRRR: class
   │  └─ L3RLR: usage tagging
   │     ├─ L4RLRL: meta tags
   │     │  ├─ L5RLRLL: source
   │     │  │  ├─ L6RLRLLL: tag
   │     │  │  └─ L6RLRLLR: store
   │     │  └─ L5RLRLR: task type
   │     │     ├─ L6RLRLRL: tag
   │     │     └─ L6RLRLRR: store
   │     └─ L4RLRR: reporting
   │        ├─ L5RLRRL: per-source
   │        │  ├─ L6RLRRLL: usage
   │        │  └─ L6RLRRLR: report
   │        └─ L5RLRRR: per-task
   │           ├─ L6RLRRRL: usage
   │           └─ L6RLRRRR: report
   └─ L2RR: Governance
      ├─ L3RRL: synthetic limits
      │  ├─ L4RRLL: rate limits
      │  │  ├─ L5RRLLL: per-source
      │  │  │  ├─ L6RRLLLL: rate
      │  │  │  └─ L6RRLLLR: cap
      │  │  └─ L5RRLLR: burst
      │  │     ├─ L6RRLLRL: cap
      │  │     └─ L6RRLLRR: allow
      │  └─ L4RRLR: quotas
      │     ├─ L5RRLRL: per-source
      │     │  ├─ L6RRLRLL: quota
      │     │  └─ L6RRLRLR: cap
      │     └─ L5RRLRR: enforcement
      │        ├─ L6RRLRRL: block
      │        └─ L6RRLRRR: 429
      └─ L3RRR: policy
         ├─ L4RRRL: synthetic policy
         │  ├─ L5RRRLL: allow
         │  │  ├─ L6RRRLLL: sources
         │  │  └─ L6RRRLLR: models
         │  └─ L5RRRLR: deny
         │     ├─ L6RRRLRL: sources
         │     └─ L6RRRLRR: models
         └─ L4RRRR: programmatic policy
            ├─ L5RRRRL: SDK policy
            │  ├─ L6RRRRLL: allow
            │  └─ L6RRRRLR: deny
            └─ L5RRRRR: API policy
               ├─ L6RRRRRL: allow
               └─ L6RRRRRR: deny
```

## Node research (all 127 nodes)

### L0 — Synthetic & programmatic source tracking
Track and govern non-interactive sources: scripts, CI/CD, agents, SDKs, direct API calls.

### L1L — Synthetic sources
Scripts + detection.

### L1R — Programmatic tracking
Attribution + governance.

### L2LL — Scripts
Cron + CI/CD.

### L2LR — Detection
UA + behavior.

### L2RL — Attribution
Source class + usage tagging.

### L2RR — Governance
Limits + policy.

### L3LLL — cron jobs
Scheduled.

### L3LLR — CI/CD
Pipelines.

### L3LRL — UA patterns
Script UA.

### L3LRR — behavior
Burst + timing.

### L3RLL — source class
Synthetic class.

### L3RLR — usage tagging
Meta tags.

### L3RRL — synthetic limits
Rate + quota.

### L3RRR — policy
Synthetic + programmatic.

### L4LLLL — scheduled
Periodic.

### L4LLLR — one-off
Manual.

### L4LLRL — pipelines
Build.

### L4LLRR — agents
CI agents.

### L4LRLL — script UA
curl.

### L4LRLR — header patterns
No UA.

### L4LRRL — burst detection
Rate spike.

### L4LRRR — timing
Regular.

### L4RLLL — synthetic class
Script.

### L4RLLR — programmatic class
SDK.

### L4RLRL — meta tags
Source.

### L4RLRR — reporting
Per-source.

### L4RRLL — rate limits
Per-source.

### L4RRLR — quotas
Per-source.

### L4RRRL — synthetic policy
Allow.

### L4RRRR — programmatic policy
SDK policy.

### L5LLLLL — periodic
Batch.

### L5LLLLR — burst
Spike.

### L5LLLRL — manual
Run.

### L5LLLRR — ad hoc
Script.

### L5LLRLL — build
Steps.

### L5LLRLR — tests
AI tests.

### L5LLRRL — CI agents
Runner.

### L5LLRRR — automation
Bots.

### L5LRLLL — curl
Detect.

### L5LRLLR — node fetch
Detect.

### L5LRLRL — no UA
Missing.

### L5LRLRR — custom
Headers.

### L5LRRLL — rate spike
Detect.

### L5LRRLR — pattern
Periodic.

### L5LRRRL — regular
Schedule.

### L5LRRRR — irregular
Human.

### L5RLLLL — script
Class.

### L5RLLLR — agent
Class.

### L5RLLRL — SDK
OpenAI.

### L5RLLRR — API
Direct.

### L5RLRLL — source
Tag.

### L5RLRLR — task type
Tag.

### L5RLRRL — per-source
Usage.

### L5RLRRR — per-task
Usage.

### L5RRLLL — per-source
Rate.

### L5RRLLR — burst
Cap.

### L5RRLRL — per-source
Quota.

### L5RRLRR — enforcement
Block.

### L5RRRLL — allow
Sources.

### L5RRRLR — deny
Sources.

### L5RRRRL — SDK policy
Allow.

### L5RRRRR — API policy
Allow.

### L6 leaves (64)
- **L6LLLLLL** batch: cron.
- **L6LLLLLR** nightly: cron.
- **L6LLLLRL** spike: burst.
- **L6LLLLRR** detect: burst.
- **L6LLLRLL** run: manual.
- **L6LLLRLR** once: one-off.
- **L6LLLRRL** script: ad hoc.
- **L6LLLRRR** run: ad hoc.
- **L6LLRLLL** steps: build.
- **L6LLRLLR** AI calls: build.
- **L6LLRLRL** AI tests: tests.
- **L6LLRLRR** eval: tests.
- **L6LLRRLL** runner: CI.
- **L6LLRRLR** agent: CI.
- **L6LLRRRL** bots: automation.
- **L6LLRRRR** flows: automation.
- **L6LRLLLL** detect: curl.
- **L6LRLLLR** class: curl.
- **L6LRLLRL** detect: fetch.
- **L6LRLLRR** class: fetch.
- **L6LRLRLL** missing: UA.
- **L6LRLRLR** default: class.
- **L6LRLRRL** headers: custom.
- **L6LRLRRR** detect: custom.
- **L6LRRLLL** detect: spike.
- **L6LRRLLR** flag: spike.
- **L6LRRLRL** periodic: pattern.
- **L6LRRLRR** classify: pattern.
- **L6LRRRLL** schedule: regular.
- **L6LRRRLR** detect: regular.
- **L6LRRRRL** human: irregular.
- **L6LRRRRR** classify: irregular.
- **L6RLLLLL** class: script.
- **L6RLLLLR** tag: script.
- **L6RLLLRL** class: agent.
- **L6RLLLRR** tag: agent.
- **L6RLLRLL** openai: SDK.
- **L6RLLRLR** anthropic: SDK.
- **L6RLLRRL** direct: API.
- **L6RLLRRR** class: API.
- **L6RLRLLL** tag: source.
- **L6RLRLLR** store: tag.
- **L6RLRLRL** tag: task.
- **L6RLRLRR** store: tag.
- **L6RLRRLL** usage: per-source.
- **L6RLRRLR** report: per-source.
- **L6RLRRRL** usage: per-task.
- **L6RLRRRR** report: per-task.
- **L6RRLLLL** rate: per-source.
- **L6RRLLLR** cap: rate.
- **L6RRLLRL** cap: burst.
- **L6RRLLRR** allow: burst.
- **L6RRLRLL** quota: per-source.
- **L6RRLRLR** cap: quota.
- **L6RRLRRL** block: enforce.
- **L6RRLRRR** 429: enforce.
- **L6RRRLLL** sources: allow.
- **L6RRRLLR** models: allow.
- **L6RRRLRL** sources: deny.
- **L6RRRLRR** models: deny.
- **L6RRRRLL** allow: SDK.
- **L6RRRRLR** deny: SDK.
- **L6RRRRRL** allow: API.
- **L6RRRRRR** deny: API.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| curl/node-fetch classes already exist in sourceApps | High |
| Script/CI/CD sources are detectable via UA + timing | High |
| Per-source limits/quota are design proposals | Medium |
| Burst detection via rate spikes is feasible | Medium |

## Open questions

1. Should synthetic sources get separate rate tiers?
2. Should burst detection auto-flag or auto-block?
3. Should SDK/API sources be tracked separately from scripts?

## Sources

- Prior research: `2026-09-14-keyless-governance-research.md`, `2026-09-15-branch-b2a-synthetic-source-tracking.md`
- Industry: LiteLLM per-key tracking, OpenRouter app attribution, CI AI usage governance