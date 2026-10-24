# Routing Exponential Expansion R27 — Provider Fallbacks

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #provider-fallbacks #reliability #failover #litellm #9router #fallback-chains

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Provider fallbacks (reliability-first failover)"** from `42-branch-cascades-and-fallbacks.md` L1-B.

## L1 — sub-phrases discovered in the root

1. LiteLLM weighted failover
2. 9Router model fallback chains
3. Account selection (fill-first / round-robin)
4. Executor base-URL fallback loop
5. Error categorization
6. Cooldowns & retries

## L2 — expansion of each L1 node

### 1. LiteLLM weighted failover
- **1a. Mechanism** — retry within same group.
- **1b. Re-pick** — by weights.
- **1c. Exclusion** — failed deployment.
- **1d. Cap** — max_fallbacks (default 5).

### 2. 9Router fallback chains
- **2a. Per model** — from settings.
- **2b. Ordered** — list of providers.
- **2c. Trigger** — failure.
- **2d. Next** — try next provider.

### 3. Account selection
- **3a. Fill-first** — priority ascending.
- **3b. Round-robin** — lastUsedAt + consecutiveUseCount.
- **3c. Sticky limit** — 3.
- **3d. Failover** — next account on failure.

### 4. Executor fallback loop
- **4a. DEFAULT_RETRY_CONFIG** — 429:0, 502:3×3s, 503:3×2s, 504:2×3s.
- **4b. FETCH_CONNECT_TIMEOUT_MS** — 60s.
- **4c. Base-URL loop** — try next URL.
- **4d. Token refresh** — before retry.

### 5. Error categorization
- **5a. rate_limit** — 429.
- **5b. auth** — 401.
- **5c. billing** — 402.
- **5d. timeout** — 408/504.

### 6. Cooldowns & retries
- **6a. 429** — immediate 5s.
- **6b. >50% failures** — 5s.
- **6c. 401/404/408** — 5s.
- **6d. Exponential backoff** — RateLimitError.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → mechanism
- **1a-i. Same group** — deployments.
- **1a-ii. Retry** — on failure.
- **1a-iii. Re-pick** — weighted.
- **1a-iv. Exclude** — failed.

### 1d → max_fallbacks
- **1d-i. Default** — 5.
- **1d-ii. Cap** — attempts.
- **1d-iii. Config** — per deployment.
- **1d-iv. Tradeoff** — latency vs reliability.

### 2a → per model
- **2a-i. Settings** — config.
- **2a-ii. Chain** — ordered.
- **2a-iii. Length** — variable.
- **2a-iv. Update** — runtime.

### 3a → fill-first
- **3a-i. Priority** — ascending.
- **3a-ii. Fill** — lowest first.
- **3a-iii. Balance** — usage.
- **3a-iv. Fallback** — next.

### 3b → round-robin
- **3b-i. lastUsedAt** — timestamp.
- **3b-ii. consecutiveUseCount** — counter.
- **3b-iii. Sticky** — limit 3.
- **3b-iv. Rotation** — even.

### 4a → retry config
- **4a-i. 429:0** — no retry.
- **4a-ii. 502:3×3s** — 3 retries, 3s apart.
- **4a-iii. 503:3×2s** — 3 retries, 2s apart.
- **4a-iv. 504:2×3s** — 2 retries, 3s apart.

### 5a → rate_limit
- **5a-i. Code** — 429.
- **5a-ii. Action** — cooldown.
- **5a-iii. Retry** — after wait.
- **5a-iv. Fallback** — next provider.

## L4 — expansion of selected L3 nodes

### 1a-iii → re-pick
- **1a-iii-a. Weights** — configured.
- **1a-iii-b. Random** — weighted.
- **1a-iii-c. Exclude** — failed.
- **1a-iii-d. Repeat** — until success.

### 2a-ii → chain
- **2a-ii-a. Primary** — first.
- **2a-ii-b. Backup** — second.
- **2a-ii-c. Last resort** — final.
- **2a-ii-d. Order** — matters.

### 3a-i → priority
- **3a-i-a. Ascending** — low first.
- **3a-i-b. Config** — per account.
- **3a-i-c. Fill** — usage.
- **3a-i-d. Balance** — even.

### 4a-ii → 502:3×3s
- **4a-ii-a. 502** — bad gateway.
- **4a-ii-b. 3 retries** — attempts.
- **4a-ii-c. 3s apart** — spacing.
- **4a-ii-d. Total** — ~9s.

### 5a-ii → cooldown
- **5a-ii-a. Immediate** — 5s.
- **5a-ii-b. Per deployment** — state.
- **5a-ii-c. allowed_fails** — counter.
- **5a-ii-d. cooldown_time** — duration.

## L5 — expansion of selected L4 nodes

### 1a-iii-a → weights
- **1a-iii-a-1. Config** — per deployment.
- **1a-iii-a-2. Sum** — normalize.
- **1a-iii-a-3. Default** — equal.
- **1a-iii-a-4. Update** — runtime.

### 2a-ii-a → primary
- **2a-ii-a-1. Best** — quality.
- **2a-ii-a-2. Cheapest** — cost.
- **2a-ii-a-3. Fastest** — latency.
- **2a-ii-a-4. Choice** — policy.

### 3a-i-a → ascending
- **3a-i-a-1. Low priority** — first.
- **3a-i-a-2. High priority** — last.
- **3a-i-a-3. Fill** — usage.
- **3a-i-a-4. Balance** — even.

### 4a-ii-b → 3 retries
- **4a-ii-b-1. Attempts** — 4 total.
- **4a-ii-b-2. Spacing** — 3s.
- **4a-ii-b-3. Total** — ~9s.
- **4a-ii-b-4. Tradeoff** — latency.

### 5a-ii-b → per deployment
- **5a-ii-b-1. State** — isolated.
- **5a-ii-b-2. Reset** — after success.
- **5a-ii-b-3. Count** — failures.
- **5a-ii-b-4. Trigger** — cooldown.

## L6 — expansion of selected L5 nodes

### 1a-iii-a-1 → config
- **1a-iii-a-1-i. File** — settings.
- **1a-iii-a-1-ii. Env** — variables.
- **1a-iii-a-1-iii. API** — runtime.
- **1a-iii-a-1-iv. Default** — equal.

### 2a-ii-a-1 → best quality
- **2a-ii-a-1-i. Strong model** — primary.
- **2a-ii-a-1-ii. Cost** — higher.
- **2a-ii-a-1-iii. Fallback** — cheaper.
- **2a-ii-a-1-iv. Policy** — quality-first.

## Confidence & open questions

- **High confidence:** LiteLLM docs + 9Router code (verified in repo).
- **Open questions:**
  - How does 9Router's fallback chain interact with account selection?
  - What is the exact cooldown state machine?
  - How are weights configured in LiteLLM?

## Sources

- github.com/BerriAI/litellm
- `docs/plans-and-prompts/research/9router/42-branch-cascades-and-fallbacks.md` L1-B
- 9Router `src/sse/handlers/chat.js`, `open-sse/executors/default.js`