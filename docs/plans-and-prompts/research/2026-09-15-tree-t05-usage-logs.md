# Tree T5 — Usage & Logs (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #usage #logs #t05

## Objective

Full 6-level binary tree expansion of the **usage & logs** topic (`src/lib/usageDb.js`, from `2026-08-31-message-origin-and-destination-research.md` Part A.5). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Usage & logs
├─ L1L: Usage DB (usageDb.js)
│  ├─ L2LL: Storage
│  │  ├─ L3LLL: usage.json
│  │  │  ├─ L4LLLL: JSON file
│  │  │  │  ├─ L5LLLLL: append/merge
│  │  │  │  │  ├─ L6LLLLLL: read-modify-write
│  │  │  │  │  └─ L6LLLLLR: atomic write
│  │  │  │  └─ L5LLLLR: structure
│  │  │  │     ├─ L6LLLLRL: per-day
│  │  │  │     └─ L6LLLLRR: per-model
│  │  │  └─ L4LLLR: location
│  │  │     ├─ L5LLLRL: ~/.9router
│  │  │     │  ├─ L6LLLRLL: home dir
│  │  │     │  └─ L6LLLRLR: not DATA_DIR
│  │  │     └─ L5LLLRR: DATA_DIR caveat
│  │  │        ├─ L6LLLRRL: usage ignores
│  │  │        └─ L6LLLRRR: documented
│  │  └─ L3LLR: log.txt
│  │     ├─ L4LLRL: text log
│  │     │  ├─ L5LLRLL: append-only
│  │     │  │  ├─ L6LLRLLL: line per event
│  │     │  │  └─ L6LLRLLR: timestamps
│  │     │  └─ L5LLRLR: rotation
│  │     │     ├─ L6LLRLRL: size cap
│  │     │     └─ L6LLRLRR: rotation policy
│  │     └─ L4LLRR: same dir
│  │        ├─ L5LLRRL: co-located
│  │        │  ├─ L6LLRRLL: usage.json + log.txt
│  │        │  └─ L6LLRRLR: same folder
│  │        └─ L5LLRRR: backup
│  │           ├─ L6LLRRRL: copy
│  │           └─ L6LLRRRR: restore
│  └─ L2LR: Captured fields
│     ├─ L3LRL: request meta
│     │  ├─ L4LRLL: task type
│     │  │  ├─ L5LRLLL: meta.taskType
│     │  │  │  ├─ L6LRLLLL: smartRouterTaskType
│     │  │  │  └─ L6LRLLLR: threaded from chat.js
│     │  │  └─ L5LRLLR: scores
│     │  │     ├─ L6LRLLRL: meta.scores
│     │  │     └─ L6LRLLRR: model scores
│     │  └─ L4LRLR: token counts
│     │     ├─ L5LRLRL: prompt tokens
│     │     │  ├─ L6LRLRLL: input
│     │     │  └─ L6LRLRLR: usage.prompt_tokens
│     │     └─ L5LRLRR: completion tokens
│     │        ├─ L6LRLRRL: output
│     │        └─ L6LRLRRR: usage.completion_tokens
│     └─ L3LRR: cost tracking
│        ├─ L4LRRL: per-model cost
│        │  ├─ L5LRRLL: price table
│        │  │  ├─ L6LRRLLL: per-token price
│        │  │  └─ L6LRRLLR: model prices
│        │  └─ L5LRRLR: cost calc
│        │     ├─ L6LRRLRL: tokens × price
│        │     └─ L6LRRLRR: daily total
│        └─ L4LRRR: quota
│           ├─ L5LRRRL: budget caps
│           │  ├─ L6LRRRLL: monthly
│           │  └─ L6LRRRLR: per-key
│           └─ L5LRRRR: enforcement
│              ├─ L6LRRRRL: block over
│              └─ L6LRRRRR: warn
└─ L1R: Logging pipeline
   ├─ L2RL: Event capture
   │  ├─ L3RLL: request events
   │  │  ├─ L4RLLL: start
   │  │  │  ├─ L5RLLLL: request start
   │  │  │  │  ├─ L6RLLLLL: timestamp
   │  │  │  │  └─ L6RLLLLR: source app
   │  │  │  └─ L5RLLLR: end
   │  │  │     ├─ L6RLLLRL: duration
   │  │  │     └─ L6RLLLRR: status
   │  │  └─ L4RLLR: error events
   │  │     ├─ L5RLLRL: failures
   │  │     │  ├─ L6RLLRLL: error type
   │  │     │  └─ L6RLLRLR: retry count
   │  │     └─ L5RLLRR: fallbacks
   │  │        ├─ L6RLLRRL: combo switch
   │  │        └─ L6RLLRRR: account switch
   │  └─ L3RLR: aggregation
   │     ├─ L4RLRL: daily rollup
   │     │  ├─ L5RLRLL: per-day totals
   │     │  │  ├─ L6RLRLLL: tokens
   │     │  │  └─ L6RLRLLR: cost
   │     │  └─ L5RLRLR: per-model
   │     │     ├─ L6RLRLRL: model totals
   │     │     └─ L6RLRLRR: provider totals
   │     └─ L4RLRR: dashboard views
   │        ├─ L5RLRRL: usage page
   │        │  ├─ L6RLRRLL: charts
   │        │  └─ L6RLRRLR: tables
   │        └─ L5RLRRR: API
   │           ├─ L6RLRRRL: /api/usage
   │           └─ L6RLRRRR: JSON
   └─ L2RR: Privacy & retention
      ├─ L3RRL: PII minimization
      │  ├─ L4RRLL: no message content
      │  │  ├─ L5RRLLL: content excluded
      │  │  │  ├─ L6RRLLLL: no prompts
      │  │  │  └─ L6RRLLLR: no responses
      │  │  └─ L5RRLLR: metadata only
      │  │     ├─ L6RRLLRL: counts
      │  │     └─ L6RRLLRR: timestamps
      │  └─ L4RRLR: source app class
      │     ├─ L5RRLRL: class not UA
      │     │  ├─ L6RRLRLL: app class
      │     │  └─ L6RRLRLR: no raw UA
      │     └─ L5RRLRR: privacy by design
      │        ├─ L6RRLRRL: minimal
      │        └─ L6RRLRRR: documented
      └─ L3RRR: retention
         ├─ L4RRRL: retention policy
         │  ├─ L5RRRLL: time-based
         │  │  ├─ L6RRRLLL: keep N days
         │  │  └─ L6RRRLLR: purge
         │  └─ L5RRRLR: size-based
         │     ├─ L6RRRLRL: cap size
         │     └─ L6RRRLRR: truncate
         └─ L4RRRR: cloud sync
            ├─ L5RRRRL: optional sync
            │  ├─ L6RRRRLL: opt-in
            │  └─ L6RRRRLR: encrypted
            └─ L5RRRRR: local-first
               ├─ L6RRRRRL: local default
               └─ L6RRRRRR: no cloud
```

## Node research (all 127 nodes)

### L0 — Usage & logs
`src/lib/usageDb.js` writes `usage.json` + `log.txt` under `~/.9router` (does NOT follow DATA_DIR). Captures task type, scores, tokens, cost.

### L1L — Usage DB (usageDb.js)
JSON usage file + text log; captured fields include task type, scores, tokens, cost.

### L1R — Logging pipeline
Event capture (request/error), aggregation (daily rollup), privacy & retention.

### L2LL — Storage
usage.json + log.txt co-located under ~/.9router.

### L2LR — Captured fields
meta.taskType, meta.scores, token counts, cost.

### L2RL — Event capture
Request start/end, errors, fallbacks.

### L2RR — Privacy & retention
No message content; class not UA; retention policy; optional cloud sync.

### L3LLL — usage.json
JSON file; per-day per-model structure.

### L3LLR — log.txt
Append-only text log; timestamps.

### L3LRL — request meta
taskType + scores threaded from smartRouter.

### L3LRR — cost tracking
Per-model price table; cost calc; quota.

### L3RLL — request events
Start/end with duration + status.

### L3RLR — aggregation
Daily rollup; per-model totals; dashboard views.

### L3RRL — PII minimization
No content; metadata only.

### L3RRR — retention
Time/size-based; optional cloud sync.

### L4LLLL — JSON file
usage.json.

### L4LLLR — location
~/.9router.

### L4LLRL — text log
log.txt.

### L4LLRR — same dir
Co-located.

### L4LRLL — task type
meta.taskType.

### L4LRLR — token counts
prompt + completion.

### L4LRRL — per-model cost
Price table.

### L4LRRR — quota
Budget caps.

### L4RLLL — start
Request start.

### L4RLLR — error events
Failures.

### L4RLRL — daily rollup
Per-day totals.

### L4RLRR — dashboard views
Usage page.

### L4RRLL — no message content
Excluded.

### L4RRLR — source app class
Class not UA.

### L4RRRL — retention policy
Time/size.

### L4RRRR — cloud sync
Optional.

### L5LLLLL — append/merge
Read-modify-write.

### L5LLLLR — structure
Per-day per-model.

### L5LLLRL — ~/.9router
Home dir.

### L5LLLRR — DATA_DIR caveat
Usage ignores DATA_DIR.

### L5LLRLL — append-only
Line per event.

### L5LLRLR — rotation
Size cap.

### L5LLRRL — co-located
Same folder.

### L5LLRRR — backup
Copy/restore.

### L5LRLLL — meta.taskType
smartRouterTaskType.

### L5LRLLR — scores
meta.scores.

### L5LRLRL — prompt tokens
Input.

### L5LRLRR — completion tokens
Output.

### L5LRRLL — price table
Per-token price.

### L5LRRLR — cost calc
Tokens × price.

### L5LRRRL — budget caps
Monthly.

### L5LRRRR — enforcement
Block/warn.

### L5RLLLL — timestamp
Start time.

### L5RLLLR — source app
App class.

### L5RLLRL — duration
Elapsed.

### L5RLLRR — status
Result.

### L5RLLRL — error type
Failure kind.

### L5RLLRR — retry count
Attempts.

### L5RLLRRL — combo switch
Fallback.

### L5RLLRRR — account switch
Key failover.

### L5RLRLL — per-day totals
Tokens.

### L5RLRLR — per-model
Model totals.

### L5RLRRL — usage page
Charts.

### L5RLRRR — API
/api/usage.

### L5RRLLL — no prompts
Excluded.

### L5RRLLR — no responses
Excluded.

### L5RRLLRL — counts
Metadata.

### L5RRLLRR — timestamps
Metadata.

### L5RRLRL — app class
Class.

### L5RRLRR — privacy by design
Minimal.

### L5RRRLL — time-based
Keep N days.

### L5RRRLR — size-based
Cap size.

### L5RRRRL — optional sync
Opt-in.

### L5RRRRR — local-first
Local default.

### L6 leaves (64)
- **L6LLLLLL** read-modify-write: read, merge, write.
- **L6LLLLLR** atomic write: temp + rename.
- **L6LLLLRL** per-day: day key.
- **L6LLLLRR** per-model: model key.
- **L6LLLRLL** home dir: ~/.9router.
- **L6LLLRLR** not DATA_DIR: documented.
- **L6LLLRRL** usage ignores: DATA_DIR.
- **L6LLLRRR** documented: ARCHITECTURE.
- **L6LLRLLL** line per event: log line.
- **L6LLRLLR** timestamps: ISO.
- **L6LLRLRL** size cap: max bytes.
- **L6LLRLRR** rotation policy: rotate.
- **L6LLRRLL** usage.json + log.txt: pair.
- **L6LLRRLR** same folder: ~/.9router.
- **L6LLRRRL** copy: backup.
- **L6LLRRRR** restore: recover.
- **L6LRLLLL** smartRouterTaskType: threaded.
- **L6LRLLLR** threaded from chat.js: lines 57, 102–103.
- **L6LRLLRL** meta.scores: model scores.
- **L6LRLLRR** model scores: per-model.
- **L6LRLRLL** input: prompt tokens.
- **L6LRLRLR** usage.prompt_tokens: field.
- **L6LRLRRL** output: completion.
- **L6LRLRRR** usage.completion_tokens: field.
- **L6LRRLLL** per-token price: $/token.
- **L6LRRLLR** model prices: table.
- **L6LRRLRL** tokens × price: calc.
- **L6LRRLRR** daily total: sum.
- **L6LRRRLL** monthly: cap.
- **L6LRRRLR** per-key: cap.
- **L6LRRRRL** block over: 429.
- **L6LRRRRR** warn: alert.
- **L6RLLLLL** timestamp: start.
- **L6RLLLLR** source app: class.
- **L6RLLLRL** duration: ms.
- **L6RLLLRR** status: ok/error.
- **L6RLLRLL** error type: kind.
- **L6RLLRLR** retry count: n.
- **L6RLLRRL** combo switch: fallback.
- **L6RLLRRR** account switch: key.
- **L6RLRLLL** tokens: totals.
- **L6RLRLLR** cost: totals.
- **L6RLRLRL** model totals: per-model.
- **L6RLRLRR** provider totals: per-provider.
- **L6RLRRLL** charts: dashboard.
- **L6RLRRLR** tables: dashboard.
- **L6RLRRRL** /api/usage: endpoint.
- **L6RLRRRR** JSON: response.
- **L6RRLLLL** no prompts: excluded.
- **L6RRLLLR** no responses: excluded.
- **L6RRLLRL** counts: metadata.
- **L6RRLLRR** timestamps: metadata.
- **L6RRLRLL** app class: class.
- **L6RRLRLR** no raw UA: privacy.
- **L6RRLRRL** minimal: by design.
- **L6RRLRRR** documented: privacy.
- **L6RRRLLL** keep N days: policy.
- **L6RRRLLR** purge: delete.
- **L6RRRLRL** cap size: max.
- **L6RRRLRR** truncate: trim.
- **L6RRRRLL** opt-in: sync.
- **L6RRRRLR** encrypted: sync.
- **L6RRRRRL** local default: local.
- **L6RRRRRR** no cloud: default.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| usage.json + log.txt under ~/.9router, not DATA_DIR | High |
| meta.taskType + meta.scores captured | High |
| No message content stored | High |
| Source app class (not raw UA) stored | High |
| Cloud sync optional/encrypted | Medium |

## Open questions

1. Should usage.json migrate to SQLite (usage repo) for queryability?
2. Should retention be configurable (days/size)?
3. Should cost tracking include per-key (per-app) attribution?

## Sources

- Code: `src/lib/usageDb.js`, `src/sse/handlers/chat.js`, `src/lib/sourceApps.js`
- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-b1a-usage-logs.md`
- Industry: LiteLLM spend tracking, OpenRouter usage API, privacy-by-design (GDPR)