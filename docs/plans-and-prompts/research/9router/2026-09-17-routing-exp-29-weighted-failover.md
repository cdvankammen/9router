# Routing Exponential Expansion R29 — Weighted Failover

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #weighted-failover #litellm #max-fallbacks #reliability

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Weighted failover (LiteLLM exclusions, max_fallbacks)"** from `42-branch-cascades-and-fallbacks.md` L2-BA.

## L1 — sub-phrases discovered in the root

1. Weighted re-pick (retry within same group)
2. Failed deployment exclusion
3. max_fallbacks cap (default 5)
4. Async-only failover
5. Non-triggering errors (ContextWindowExceeded, ContentPolicyViolation)

## L2 — expansion of each L1 node

### 1. Weighted re-pick
- **1a. Weights** — probability distribution.
- **1b. Same group** — retry within routing group.
- **1c. Re-pick** — new deployment chosen.
- **1d. Weight normalization** — after exclusion.

### 2. Failed deployment exclusion
- **2a. Exclusion** — failed deployment removed.
- **2b. Re-pick** — among remaining.
- **2c. Weight renormalization** — remaining weights scaled.
- **2d. Cooldown** — excluded deployment cools down.

### 3. max_fallbacks cap
- **3a. Default 5** — max failover attempts.
- **3b. Configurable** — per-group setting.
- **3c. Cap effect** — bounded retry storm.
- **3d. Exhaustion** — all fallbacks failed.

### 4. Async-only
- **4a. Streaming** — async responses only.
- **4b. Sync limitation** — no failover for sync.
- **4c. Reason** — response already started.
- **4d. Alternative** — client-side retry.

### 5. Non-triggering errors
- **5a. ContextWindowExceeded** — no failover.
- **5b. ContentPolicyViolation** — no failover.
- **5c. Reason** — retry won't help.
- **5d. User action** — different request needed.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → weights
- **1a-i. Source** — deployment config.
- **1a-ii. Range** — 0–100.
- **1a-iii. Default** — equal weights.
- **1a-iv. Dynamic** — usage-based weights.

### 2a → exclusion
- **2a-i. Scope** — per-request.
- **2a-ii. Duration** — request lifetime.
- **2a-iii. Persistence** — cooldown state.
- **2a-iv. Reset** — after cooldown.

### 3a → default 5
- **3a-i. Rationale** — bounded retries.
- **3a-ii. Tradeoff** — reliability vs latency.
- **3a-iii. Tuning** — per-group.
- **3a-iv. Monitoring** — failover rate.

### 4a → streaming
- **4a-i. SSE** — streamed responses.
- **4a-ii. Chunked** — partial output.
- **4a-iii. Failover window** — before first chunk.
- **4a-iv. After first chunk** — no failover.

### 5a → ContextWindowExceeded
- **5a-i. Cause** — input too long.
- **5a-ii. Retry useless** — same input.
- **5a-iii. Fix** — truncate or different model.
- **5a-iv. 9Router** — context budget stripping.

## L4 — expansion of selected L3 nodes

### 1a-i → source
- **1a-i-a. Config file** — deployment params.
- **1a-i-b. Env var** — runtime override.
- **1a-i-c. API** — dynamic update.
- **1a-i-d. Default** — equal.

### 2a-i → per-request scope
- **2a-i-a. Isolation** — one request's failure.
- **2a-i-b. No cross-request** — state.
- **2a-i-c. Cooldown** — shared state.
- **2a-i-d. Design** — stateless + cooldown.

### 3a-i → rationale
- **3a-i-a. Retry storm** — bounded.
- **3a-i-b. Latency** — max 5 × timeout.
- **3a-i-c. Reliability** — 5 chances.
- **3a-i-d. Default** — sane baseline.

### 4a-i → SSE
- **4a-i-a. First chunk** — failover point.
- **4a-i-b. Heartbeat** — liveness.
- **4a-i-c. Reconnect** — client-side.
- **4a-i-d. 9Router** — SSE layer.

### 5a-i → cause
- **5a-i-a. Long prompt** — > context.
- **5a-i-b. Long history** — conversation.
- **5a-i-c. Large tools** — tool results.
- **5a-i-d. Detection** — error code.

## L5 — expansion of selected L4 nodes

### 1a-i-a → config file
- **1a-i-a-1. Format** — YAML/JSON.
- **1a-i-a-2. Location** — deployment config.
- **1a-i-a-3. Validation** — schema.
- **1a-i-a-4. Reload** — hot reload.

### 2a-i-a → isolation
- **2a-i-a-1. Benefit** — no cascading state.
- **2a-i-a-2. Cost** — repeated failures.
- **2a-i-a-3. Cooldown** — mitigates.
- **2a-i-a-4. Design** — hybrid.

### 3a-i-a → retry storm
- **3a-i-a-1. Definition** — many retries.
- **3a-i-a-2. Cause** — provider down.
- **3a-i-a-3. Effect** — load spike.
- **3a-i-a-4. Fix** — cap + cooldown.

### 4a-i-a → first chunk
- **4a-i-a-1. Timing** — after headers.
- **4a-i-a-2. Failover** — before chunk.
- **4a-i-a-3. No failover** — after chunk.
- **4a-i-a-4. Client** — handles partial.

### 5a-i-a → long prompt
- **5a-i-a-1. Token count** — measured.
- **5a-i-a-2. Limit** — model context.
- **5a-i-a-3. Truncation** — option.
- **5a-i-a-4. Alternative** — larger model.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → YAML format
- **1a-i-a-1-i. Human-readable** — config.
- **1a-i-a-1-ii. Comments** — documentation.
- **1a-i-a-1-iii. Validation** — schema check.
- **1a-i-a-1-iv. Versioning** — git.

### 2a-i-a-1 → benefit
- **2a-i-a-1-i. Predictability** — per-request.
- **2a-i-a-1-ii. Debugging** — isolated.
- **2a-i-a-1-iii. Testing** — deterministic.
- **2a-i-a-1-iv. Scale** — no shared state.

### 3a-i-a-1 → definition
- **3a-i-a-1-i. Amplification** — (1+N)².
- **3a-i-a-1-ii. Provider load** — spike.
- **3a-i-a-1-iii. Gateway load** — CPU.
- **3a-i-a-1-iv. Cost** — wasted calls.

### 4a-i-a-1 → timing
- **4a-i-a-1-i. Headers** — first bytes.
- **4a-i-a-1-ii. Body** — content.
- **4a-i-a-1-iii. Window** — seconds.
- **4a-i-a-1-iv. Config** — timeout.

### 5a-i-a-1 → token count
- **5a-i-a-1-i. Counting** — tokenizer.
- **5a-i-a-1-ii. Accuracy** — approximate.
- **5a-i-a-1-iii. Limit** — model-specific.
- **5a-i-a-1-iv. Action** — truncate/route.

## Confidence & open questions

- **High confidence:** LiteLLM weighted failover semantics (docs + code).
- **Open questions:**
  - Should 9Router implement weighted failover within model groups?
  - What is the right max_fallbacks for 9Router's provider set?
  - Should sync (non-streaming) requests get failover?

## Sources

- LiteLLM docs (BerriAI/litellm)
- `docs/plans-and-prompts/research/9router/42-branch-cascades-and-fallbacks.md` L2-BA