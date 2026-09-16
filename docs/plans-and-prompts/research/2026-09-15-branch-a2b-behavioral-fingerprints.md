# Branch Research — A2b: Behavioral Fingerprints (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #source-tracking #behavioral-fingerprints #clustering #binary-tree #branch-a2b

## Objective

Deep-dive the **behavioral fingerprints** subtree: arrival-rate clustering (A2b1) and tool-use patterns (A2b2), down to L6 leaves.

```
A2b BEHAVIORAL FINGERPRINTS
├─ A2b1: ARRIVAL-RATE CLUSTERING
│  ├─ A2b1L: request-size distribution
│  │  ├─ A2b1LL: token-count histogram
│  │  └─ A2b1LR: burst-pattern detection
│  └─ A2b1R: inter-arrival time clustering
│     ├─ A2b1RL: EWMA of arrival rate
│     └─ A2b1RR: k-means / DBSCAN clustering
└─ A2b2: TOOL-USE PATTERNS
   ├─ A2b2L: tool-call frequency
   │  ├─ A2b2LL: tool_use block counting
   │  └─ A2b2LR: tool-result size
   └─ A2b2R: task-type distribution
      ├─ A2b2RL: classifyTask histogram
      └─ A2b2RR: "fast-tool-user" vs "slow-chat" clusters
```

## Codebase grounding

### What exists

- `classifyTask(messages)` in `open-sse/services/smartRouter.js` — 16 task types (code:debugging, code:review, code:generation, agent:multi_step, math, reasoning, research_report, creative_writing, summarization, translation, data_analysis, document_processing, image_analysis, web_search, planning, general_chat). This is the raw material for A2b2R (task-type distribution).
- `conversationFingerprint` (FNV-1a) — hashes first system/user messages; usable as a session key for accumulating behavior evidence.
- `src/lib/usageDb.js` — usage.json + log.txt under `~/.9router`; the natural home for behavioral telemetry (request timestamps, token counts, model, task type).
- `src/sse/handlers/chat.js` — threads `smartRouterTaskType` through for usage analytics (metacs). So task-type telemetry already flows into usage records.

### What doesn't exist

- No token-count histogram per source (A2b1LL).
- No inter-arrival-time tracking (A2b1R).
- No tool-use block counting (A2b2LL) — though the RTK token saver (`open-sse/rtk/`) already *parses* tool_result blocks, so the plumbing exists.
- No clustering of any kind (A2b1RR, A2b2RR).

## External research

### A2b1LL — Token-count histogram

- Industry: LLM gateways (LiteLLM, OpenRouter) track prompt/completion tokens per request; histograms of request sizes are standard observability. For *fingerprinting*, the distribution shape (median, tail) distinguishes "chat user" (small, uniform) from "agent" (bimodal: tiny tool calls + huge context dumps).
- Cost: trivial — token counts already exist in usage records.

### A2b1LR — Burst-pattern detection

- Agents produce characteristic bursts: N rapid tool-call rounds, then a long generation. Chat users produce Poisson-ish arrivals. Burstiness (variance/mean ratio of inter-arrival times) is a cheap discriminator.
- This connects to B1b (adaptive control): burst detection is the input to surge pre-throttling.

### A2b1RL — EWMA of arrival rate

- EWMA (exponential moving average) is O(1) per event, needs only one stored value (`rate = α·new + (1−α)·rate`). Standard for rate estimation (see B1b2 branch for the full treatment).
- For fingerprinting: EWMA per source label gives a "typical pace" signature; deviation from it is either a behavior change or a different actor.

### A2b1RR — k-means / DBSCAN clustering

- k-means: needs k, sensitive to outliers, fast. DBSCAN: no k, finds arbitrary shapes, handles noise — better for unknown agent types.
- Reality check: clustering *offline* (nightly job over usage DB) is cheap and useful for *discovering* agent archetypes; clustering *online* (per-request) is overkill. Recommend offline discovery → hand-tuned rules → online classification by nearest archetype.
- JS options: no deps needed for k-means (simple implementation); DBSCAN has small libs but adds a dependency — the repo is zero-dep-leaning (custom-server.rate-limiter.js is zero-dep by design).

### A2b2LL — tool_use block counting

- Tool-use frequency is THE agent discriminator: chat clients never send `tool_use` blocks; agents send them constantly. Counting `tool_use` blocks per request (or per session) is a single-pass parse — the RTK saver already walks message content.
- A2b2LR — tool-result size: agents paste file contents into `tool_result`; size distribution (e.g. >10 KB results) is a strong "this is an agent doing file work" signal.

### A2b2R — task-type distribution

- A2b2RL: histogram of `classifyTask` results per source label — already available via `smartRouterTaskType` in usage.
- A2b2RR: "fast-tool-user" vs "slow-chat" clusters — the two-mode distribution (high tool frequency + short prompts vs low tool frequency + long prompts) is the simplest useful clustering. Can be done with a 2-feature k-means (toolRate, promptTokens) or even a threshold rule.

## Synthesis — design space

1. **Feature set** (all derivable from existing telemetry, no new deps):
   - `toolRate` = tool_use blocks / request (or / session).
   - `promptTokens` distribution (median, p90).
   - `interArrivalMs` EWMA + burstiness ratio.
   - `taskType` histogram.
2. **Pipeline:** collect per-request features into usage DB → nightly offline clustering (k-means, k=3–5) → archetype table (e.g. "fast-tool-user", "chat", "batch") → online classification by nearest archetype → archetype feeds profile resolution (B6b2) and adaptive control (B1b).
3. **Governance use:** archetype is a *soft* identity signal — combine with UA class (A1a) and labels (A2a). A "chat" archetype claiming a "Claude Code" UA is the A1a2LR behavior cross-check made concrete.
4. **Privacy:** features are aggregates (counts, histograms), not content — consistent with the hash-only stance. Tool-result *sizes* are fine; tool-result *content* is never stored.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Tool-use frequency is the strongest cheap agent discriminator | High |
| Token-count + inter-arrival features are already available in usage telemetry | High |
| Offline clustering → online nearest-archetype is the right architecture | Medium |
| DBSCAN over k-means for unknown archetypes | Medium |

## Open questions

1. Is a nightly offline clustering job acceptable, or does the user want online adaptation? (Phase-2 research leaned adaptive/online for *rates*, but archetypes can be offline.)
2. Should archetype be exposed in the dashboard as a per-source "likely agent type" badge?
3. How many archetypes are actually distinguishable with these 4 features? (Needs real usage data — a corpus exists: `scripts/collect-routing-corpus.mjs`.)

## Sources

- Code: `open-sse/services/smartRouter.js` (classifyTask), `src/sse/handlers/chat.js` (smartRouterTaskType threading), `src/lib/usageDb.js`, `open-sse/rtk/` (tool_result parsing precedent)
- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-14-keyless-governance-research.md`
- Industry: standard time-series/clustering practice (EWMA, k-means, DBSCAN — established knowledge)