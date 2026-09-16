# Tree T2 — Smart Router Task Classification (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #smart-router #task-classification #t02

## Objective

Full 6-level binary tree expansion of the **smart router task classification** topic (`open-sse/services/smartRouter.js`, from `2026-08-31-message-origin-and-destination-research.md` Part A.2). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Task classification
├─ L1L: Classifier (classifyTask)
│  ├─ L2LL: Task taxonomy
│  │  ├─ L3LLL: 16 task types
│  │  │  ├─ L4LLLL: code tasks
│  │  │  │  ├─ L5LLLLL: code:debugging
│  │  │  │  │  ├─ L6LLLLLL: debug keywords
│  │  │  │  │  └─ L6LLLLLR: error traces
│  │  │  │  └─ L5LLLLR: code:review
│  │  │  │     ├─ L6LLLLRL: review keywords
│  │  │  │     └─ L6LLLLRR: diff context
│  │  │  └─ L4LLLR: non-code tasks
│  │  │     ├─ L5LLLRL: math/reasoning
│  │  │     │  ├─ L6LLLRLL: math keywords
│  │  │     │  └─ L6LLLRLR: reasoning chains
│  │  │     └─ L5LLLRR: creative/research
│  │  │        ├─ L6LLLRRL: research_report
│  │  │        └─ L6LLLRRR: creative_writing
│  │  └─ L3LLR: Classification inputs
│  │     ├─ L4LLRL: message content
│  │     │  ├─ L5LLRLL: system prompt
│  │     │  │  ├─ L6LLRLLL: system keywords
│  │     │  │  └─ L6LLRLLR: system length
│  │     │  └─ L5LLRLR: user message
│  │     │     ├─ L6LLRLRL: user keywords
│  │     │     └─ L6LLRLRR: message length
│  │     └─ L4LLRR: metadata
│  │        ├─ L5LLRRL: model requested
│  │        │  ├─ L6LLRRLL: model hint
│  │        │  └─ L6LLRRLR: model family
│  │        └─ L5LLRRR: conversation state
│  │           ├─ L6LLRRRL: turn count
│  │           └─ L6LLRRRR: prior tasks
│  └─ L2LR: Scoring (scoreModel)
│     ├─ L3LRL: Score dimensions
│     │  ├─ L4LRLL: capability fit
│     │  │  ├─ L5LRLLL: task-type fit
│     │  │  │  ├─ L6LRLLLL: per-type scores
│     │  │  │  └─ L6LRLLLR: model strengths
│     │  │  └─ L5LRLLR: cost weight
│     │  │     ├─ L6LRLLRL: cost per token
│     │  │     └─ L6LRLLRR: budget tier
│     │  └─ L4LRLR: latency/quality
│     │     ├─ L5LRLRL: latency weight
│     │     │  ├─ L6LRLRLL: p50 latency
│     │     │  └─ L6LRLRLR: interactive vs batch
│     │     └─ L5LRLRR: quality weight
│     │        ├─ L6LRLRRL: benchmark score
│     │        └─ L6LRLRRR: user preference
│     └─ L3LRR: Selection (selectModels)
│        ├─ L4LRRL: top-N selection
│        │  ├─ L5LRRLL: sort by score
│        │  │  ├─ L6LRRLLL: descending
│        │  │  └─ L6LRRLLR: tie-break
│        │  └─ L5LRRLR: fallback chain
│        │     ├─ L6LRRLRL: primary + fallback
│        │     └─ L6LRRLRR: combo expansion
│        └─ L4LRRR: constraints
│           ├─ L5LRRRL: availability
│           │  ├─ L6LRRRLL: provider up
│           │  └─ L6LRRRLR: quota left
│           └─ L5LRRRR: policy
│              ├─ L6LRRRRL: user override
│              └─ L6LRRRRR: admin policy
└─ L1R: Session stickiness
   ├─ L2RL: Fingerprint (conversationFingerprint)
   │  ├─ L3RLL: FNV-1a hash
   │  │  ├─ L4RLLL: hash inputs
   │  │  │  ├─ L5RLLLL: first system message
   │  │  │  │  ├─ L6RLLLLL: system text
   │  │  │  │  └─ L6RLLLLR: system hash
   │  │  │  └─ L5RLLLR: first user message
   │  │  │     ├─ L6RLLLRL: user text
   │  │  │     └─ L6RLLLRR: user hash
   │  │  └─ L4RLLR: hash properties
   │  │     ├─ L5RLLRL: deterministic
   │  │     │  ├─ L6RLLRLL: same input
   │  │     │  └─ L6RLLRLR: same output
   │  │     └─ L5RLLRR: collision risk
   │  │        ├─ L6RLLRRL: 32-bit space
   │  │        └─ L6RLLRRR: acceptable
   │  └─ L3RLR: Sticky session store
   │     ├─ L4RLRL: getStickySession
   │     │  ├─ L5RLRLL: lookup by fingerprint
   │     │  │  ├─ L6RLRLLL: TTL check
   │     │  │  └─ L6RLRLLR: miss → null
   │     │  └─ L5RLRLR: TTL 5 min
   │     │     ├─ L6RLRLRL: DEFAULT_SESSION_TTL_MS
   │     │     └─ L6RLRLRR: expiry
   │     └─ L4RLRR: setStickySession
   │        ├─ L5RLRRL: write path
   │        │  ├─ L6RLRRLL: upsert
   │        │  └─ L6RLRRLR: overwrite
   │        └─ L5RLRRR: capacity
   │           ├─ L6RLRRRL: MAX_SESSION_ENTRIES
   │           └─ L6RLRRRR: eviction
   └─ L2RR: App-layer interception
      ├─ L3RRL: Pre-combo hook
      │  ├─ L4RRLL: runs before translation
      │  │  ├─ L5RRLLL: chat.js call site
      │  │  │  ├─ L6RRLLLL: handler order
      │  │  │  └─ L6RRLLLR: before combo
      │  │  └─ L5RRLLR: task type threading
      │  │     ├─ L6RRLLRL: smartRouterTaskType
      │  │     └─ L6RRLLRR: usage meta
      │  └─ L4RRLR: dynamic sr-* combos
      │     ├─ L5RRLRL: ALIAS_TO_PROVIDER_ID
      │     │  ├─ L6RRLRLL: alias map
      │     │  └─ L6RRLRLR: provider ids
      │     └─ L5RRLRR: concurrency tracking
      │        ├─ L6RRLRRL: per-model count
      │        └─ L6RRLRRR: load-aware
      └─ L3RRR: Sticky session risks
         ├─ L4RRRL: stale sessions
         │  ├─ L5RRRLL: TTL expiry
         │  │  ├─ L6RRRLLL: 5-min window
         │  │  └─ L6RRRLLR: re-fingerprint
         │  └─ L5RRRLR: fingerprint drift
         │     ├─ L6RRRLRL: first-msg change
         │     └─ L6RRRLRR: new session
         └─ L4RRRR: privacy
            ├─ L5RRRRL: hash only
            │  ├─ L6RRRRLL: no raw text
            │  └─ L6RRRRLR: no PII
            └─ L5RRRRR: in-memory only
               ├─ L6RRRRRL: no persistence
               └─ L6RRRRRR: restart clears
```

## Node research (all 127 nodes)

### L0 — Task classification
Classify each request into a task type; score models; select best; keep sessions sticky. Runs pre-combo in the app layer.

### L1L — Classifier (classifyTask)
`classifyTask` in `open-sse/services/smartRouter.js`; 16 task types; input = messages + metadata.

### L1R — Session stickiness
`conversationFingerprint` (FNV-1a of first system+user messages) → sticky session store (5-min TTL, 500 entries).

### L2LL — Task taxonomy
16 types: code:debugging, code:review, code:generation, agent:multi_step, math, reasoning, research_report, creative_writing, summarization, translation, data_analysis, document_processing, image_analysis, web_search, planning, general_chat.

### L2LR — Scoring (scoreModel)
Per-model score = weighted capability fit + cost + latency + quality.

### L2RL — Fingerprint (conversationFingerprint)
FNV-1a hash of first system + first user message → stable per-conversation key.

### L2RR — App-layer interception
`src/sse/services/smartRouter.js` runs BEFORE translation; creates dynamic `sr-*` combos; tracks concurrency per model.

### L3LLL — 16 task types
The taxonomy; each maps to model strengths (e.g. math → reasoning models).

### L3LLR — Classification inputs
Messages (system + user) and metadata (model requested, conversation state).

### L3LRL — Score dimensions
Capability fit, cost weight, latency weight, quality weight.

### L3LRR — Selection (selectModels)
Sort by score, top-N, fallback chain, constraints (availability, policy).

### L3RLL — FNV-1a hash
32-bit non-cryptographic hash; fast, deterministic.

### L3RLR — Sticky session store
In-memory map fingerprint → session; TTL 5 min; max 500 entries.

### L3RRL — Pre-combo hook
App-layer smartRouter runs before combo expansion in chat.js.

### L3RRR — Sticky session risks
Stale sessions (TTL), fingerprint drift, privacy (hash only, in-memory).

### L4LLLL — code tasks
debugging, review, generation — the agent-heavy categories.

### L4LLLR — non-code tasks
math, reasoning, research, creative, summarization, translation, data, docs, image, web, planning, general.

### L4LLRL — message content
System prompt + user message text are the primary classification inputs.

### L4LLRR — metadata
Requested model, turn count, prior tasks.

### L4LRLL — capability fit
Per-task-type model scores (e.g. `math` → high for o-series).

### L4LRLR — latency/quality
Interactive tasks weight latency; batch tasks weight quality.

### L4LRRL — top-N selection
`selectModels` returns ordered candidates.

### L4LRRR — constraints
Availability (provider up, quota) and policy (user override, admin).

### L4RLLL — hash inputs
First system message + first user message.

### L4RLLR — hash properties
Deterministic; 32-bit collision risk acceptable for session stickiness.

### L4RLRL — getStickySession
Lookup by fingerprint; TTL check; miss → null.

### L4RLRR — setStickySession
Upsert; capacity-capped with eviction.

### L4RRLL — runs before translation
App-layer interception point — before combo expansion, before translation.

### L4RRLR — dynamic sr-* combos
`ALIAS_TO_PROVIDER_ID` maps aliases; dynamic combos named `sr-*`.

### L4RRRL — stale sessions
TTL expiry → re-fingerprint.

### L4RRRR — privacy
Hash only; no raw text; in-memory only.

### L5LLLLL — code:debugging
Keywords: debug, error, trace, stack, fix, bug.

### L5LLLLR — code:review
Keywords: review, critique, improve, diff, PR.

### L5LLLRL — math/reasoning
Keywords: solve, calculate, prove, derive, logic.

### L5LLLRR — creative/research
research_report: research, report, summarize sources; creative_writing: write, draft, story.

### L5LLRLL — system prompt
System text contributes keywords (e.g. "You are a code reviewer").

### L5LLRLR — user message
User text is the strongest signal.

### L5LLRRL — model requested
Client-requested model hints at task (e.g. `o3` → reasoning).

### L5LLRRR — conversation state
Turn count, prior task types — multi-turn drift.

### L5LRLLL — task-type fit
Per-type score tables (model × task).

### L5LRLLR — cost weight
Cost per token; budget tiers.

### L5LRLRL — latency weight
p50 latency; interactive vs batch.

### L5LRLRR — quality weight
Benchmark scores; user preference.

### L5LRRLL — sort by score
Descending; tie-break by cost.

### L5LRRLR — fallback chain
Primary + fallback; combo expansion.

### L5LRRRL — availability
Provider up; quota left.

### L5LRRRR — policy
User override; admin policy.

### L5RLLLL — first system message
Text of first system message.

### L5RLLLR — first user message
Text of first user message.

### L5RLLRL — deterministic
Same input → same hash.

### L5RLLRR — collision risk
32-bit space; collisions possible but acceptable.

### L5RLRLL — lookup by fingerprint
Map lookup; TTL check.

### L5RLRLR — TTL 5 min
`DEFAULT_SESSION_TTL_MS = 5*60*1000`.

### L5RLRRL — write path
Upsert on new fingerprint.

### L5RLRRR — capacity
`MAX_SESSION_ENTRIES = 500`; eviction (oldest).

### L5RRLLL — chat.js call site
`src/sse/handlers/chat.js` calls app-layer smartRouter.

### L5RRLLR — task type threading
`smartRouterTaskType` threaded into usage meta (lines 57, 102–103).

### L5RRLRL — ALIAS_TO_PROVIDER_ID
Alias → provider id map for dynamic combos.

### L5RRLRR — concurrency tracking
Per-model in-flight count; load-aware selection.

### L5RRRLL — TTL expiry
5-min window; expired → new fingerprint.

### L5RRRLR — fingerprint drift
First-msg change → new fingerprint → new session.

### L5RRRRL — hash only
No raw text stored.

### L5RRRRR — in-memory only
No persistence; restart clears.

### L6 leaves (64)
- **L6LLLLLL** debug keywords: "debug", "error", "trace", "stack".
- **L6LLLLLR** error traces: stack traces in message → debugging.
- **L6LLLLRL** review keywords: "review", "critique", "improve".
- **L6LLLLRR** diff context: diffs/PRs → review.
- **L6LLLRLL** math keywords: "solve", "calculate", "prove".
- **L6LLLRLR** reasoning chains: multi-step logic → reasoning.
- **L6LLLRRL** research_report: "research", "report", "sources".
- **L6LLLRRR** creative_writing: "write", "draft", "story".
- **L6LLRLLL** system keywords: system prompt contributes.
- **L6LLRLLR** system length: long system prompts → agent tasks.
- **L6LLRLRL** user keywords: user text strongest signal.
- **L6LLRLRR** message length: long messages → document processing.
- **L6LLRRLL** model hint: requested model family.
- **L6LLRRLR** model family: o-series → reasoning.
- **L6LLRRRL** turn count: multi-turn → agent:multi_step.
- **L6LLRRRR** prior tasks: conversation history.
- **L6LRLLLL** per-type scores: model × task score table.
- **L6LRLLLR** model strengths: e.g. claude for code, gpt for general.
- **L6LRLLRL** cost per token: $/1K tokens.
- **L6LRLLRR** budget tier: cheap tier for high volume.
- **L6LRLRLL** p50 latency: median latency per model.
- **L6LRLRLR** interactive vs batch: chat weights latency.
- **L6LRLRRL** benchmark score: evals per task type.
- **L6LRLRRR** user preference: user-set model priority.
- **L6LRRLLL** descending: highest score first.
- **L6LRRLLR** tie-break: cost, then availability.
- **L6LRRLRL** primary + fallback: ordered candidates.
- **L6LRRLRR** combo expansion: fallback combos expand to chains.
- **L6LRRRLL** provider up: health check.
- **L6LRRRLR** quota left: usage limits.
- **L6LRRRRL** user override: explicit model request wins.
- **L6LRRRRR** admin policy: org-level constraints.
- **L6RLLLLL** system text: first system message content.
- **L6RLLLLR** system hash: FNV-1a of system text.
- **L6RLLLRL** user text: first user message content.
- **L6RLLLRR** user hash: FNV-1a of user text.
- **L6RLLRLL** same input: identical messages.
- **L6RLLRLR** same output: identical hash.
- **L6RLLRRL** 32-bit space: 4B possible hashes.
- **L6RLLRRR** acceptable: collision → wrong stickiness, rare.
- **L6RLRLLL** TTL check: expiry check on read.
- **L6RLRLLR** miss → null: no session → fresh selection.
- **L6RLRLRL** DEFAULT_SESSION_TTL_MS: 5 min constant.
- **L6RLRLRR** expiry: stale entry removed.
- **L6RLRRLL** upsert: insert or update.
- **L6RLRRLR** overwrite: new model choice replaces.
- **L6RLRRRL** MAX_SESSION_ENTRIES: 500 cap.
- **L6RLRRRR** eviction: oldest evicted.
- **L6RRLLLL** handler order: smartRouter before combo.
- **L6RRLLLR** before combo: interception point.
- **L6RRLLRL** smartRouterTaskType: variable in chat.js.
- **L6RRLLRR** usage meta: taskType + scores in usage.json.
- **L6RRLRLL** alias map: alias → provider id.
- **L6RRLRLR** provider ids: resolved ids.
- **L6RRLRRL** per-model count: in-flight per model.
- **L6RRLRRR** load-aware: skip overloaded models.
- **L6RRRLLL** 5-min window: stickiness window.
- **L6RRRLLR** re-fingerprint: new hash after expiry.
- **L6RRRLRL** first-msg change: system prompt change.
- **L6RRRLRR** new session: drift → new session.
- **L6RRRRLL** no raw text: hash only.
- **L6RRRRLR** no PII: content never stored.
- **L6RRRRRL** no persistence: memory only.
- **L6RRRRRR** restart clears: process restart resets.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| 16 task types + classifyTask/scoreModel/selectModels exist | High |
| FNV-1a fingerprint of first system+user messages | High |
| 5-min TTL, 500-entry cap | High |
| App-layer pre-combo interception + sr-* combos | High |
| Task type threaded into usage meta | High |

## Open questions

1. Should classification use embeddings (semantic) instead of keywords?
2. Should sticky sessions persist across restarts (SQLite)?
3. Should task type influence rate limits (per-task limits)?

## Sources

- Code: `open-sse/services/smartRouter.js`, `src/sse/services/smartRouter.js`, `src/sse/handlers/chat.js`, `src/lib/usageDb.js`
- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-15-branch-a1b-smart-router-task-classification.md`
- Industry: LiteLLM routing, OpenRouter model routing, RouteLLM (Berkeley)