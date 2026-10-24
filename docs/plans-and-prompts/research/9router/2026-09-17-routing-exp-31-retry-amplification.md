# Routing Exponential Expansion R31 — Retry Amplification (1+N)²

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #retry-amplification #max-retries-0 #litellm #backoff #storm

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Retry amplification (1+N)² and max_retries:0 pinning"** from `42-branch-cascades-and-fallbacks.md` L2-AB.

## L1 — sub-phrases discovered in the root

1. (1+N)² amplification (client × gateway retries)
2. max_retries:0 pinning (provider client)
3. Exponential backoff (RateLimitError)
4. Retry on idempotent errors only
5. Retry budget (total attempts)

## L2 — expansion of each L1 node

### 1. (1+N)² amplification
- **1a. Client retries** — N per request.
- **1b. Gateway retries** — N per client attempt.
- **1c. Product** — (1+N)² total.
- **1d. Example** — 3×3 = 9 calls.

### 2. max_retries:0 pinning
- **2a. Provider client** — SDK retries.
- **2b. Pinned to 0** — disable.
- **2c. Reason** — avoid amplification.
- **2d. Gateway owns retries** — single layer.

### 3. Exponential backoff
- **3a. Trigger** — RateLimitError.
- **3b. Base** — initial delay.
- **3c. Factor** — 2× per attempt.
- **3d. Cap** — max delay.

### 4. Idempotent errors only
- **4a. Safe** — 429, 5xx.
- **4b. Unsafe** — 4xx client errors.
- **4c. Reason** — double-execution.
- **4d. Non-idempotent** — generation.

### 5. Retry budget
- **5a. Max attempts** — N.
- **5b. Time budget** — max duration.
- **5c. Cost budget** — max spend.
- **5d. Exhaustion** — fail fast.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → client retries
- **1a-i. SDK default** — 2–3.
- **1a-ii. User config** — per-client.
- **1a-iii. Hidden** — surprising.
- **1a-iv. Detection** — logs.

### 2a → provider client
- **2a-i. OpenAI SDK** — max_retries.
- **2a-ii. Anthropic SDK** — max_retries.
- **2a-iii. Custom** — fetch-based.
- **2a-iv. 9Router** — undici fetch.

### 3a → RateLimitError
- **3a-i. 429** — status.
- **3a-ii. Retry-After** — header.
- **3a-iii. Backoff** — exponential.
- **3a-iv. Jitter** — randomization.

### 4a → safe errors
- **4a-i. 429** — rate limit.
- **4a-ii. 5xx** — server.
- **4a-iii. Timeout** — network.
- **4a-iv. Connection** — refused.

### 5a → max attempts
- **5a-i. Default** — 3.
- **5a-ii. Config** — per-provider.
- **5a-iii. Cap** — 5.
- **5a-iv. Monitoring** — retry rate.

## L4 — expansion of selected L3 nodes

### 1a-i → SDK default
- **1a-i-a. OpenAI** — 2 retries.
- **1a-i-b. Anthropic** — 2 retries.
- **1a-i-c. Azure** — 3 retries.
- **1a-i-d. Hidden** — undocumented.

### 2a-i → OpenAI SDK
- **2a-i-a. max_retries** — param.
- **2a-i-b. Default** — 2.
- **2a-i-c. Backoff** — exponential.
- **2a-i-d. Pin** — set 0.

### 3a-i → 429
- **3a-i-a. Meaning** — rate limited.
- **3a-i-b. Retry-After** — seconds.
- **3a-i-c. Backoff** — respect header.
- **3a-i-d. Fallback** — exponential.

### 4a-i → 429 safe
- **4a-i-a. Idempotent** — safe to retry.
- **4a-i-b. No side effect** — generation.
- **4a-i-c. Cost** — wasted tokens.
- **4a-i-d. Cap** — bounded.

### 5a-i → default 3
- **5a-i-a. Rationale** — balance.
- **5a-i-b. Latency** — 3 × timeout.
- **5a-i-c. Reliability** — 3 chances.
- **5a-i-d. Tuning** — per-provider.

## L5 — expansion of selected L4 nodes

### 1a-i-a → OpenAI 2 retries
- **1a-i-a-1. Total** — 3 attempts.
- **1a-i-a-2. Backoff** — 0.5s, 1s.
- **1a-i-a-3. Jitter** — random.
- **1a-i-a-4. Amplification** — 3× gateway.

### 2a-i-a → max_retries param
- **2a-i-a-1. Location** — client init.
- **2a-i-a-2. Per-request** — override.
- **2a-i-a-3. Value** — 0 disables.
- **2a-i-a-4. 9Router** — fetch, no SDK.

### 3a-i-a → meaning
- **3a-i-a-1. RPM** — per-minute.
- **3a-i-a-2. TPM** — per-token.
- **3a-i-a-3. Concurrency** — parallel.
- **3a-i-a-4. Window** — rolling.

### 4a-i-a → idempotent
- **4a-i-a-1. Definition** — safe repeat.
- **4a-i-a-2. Generation** — stateless.
- **4a-i-a-3. Billing** — double charge.
- **4a-i-a-4. Accept** — bounded.

### 5a-i-a → rationale
- **5a-i-a-1. Transient** — most failures.
- **5a-i-a-2. Persistent** — rare.
- **5a-i-a-3. Balance** — 3 attempts.
- **5a-i-a-4. Fail fast** — after.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → 3 attempts
- **1a-i-a-1-i. First** — immediate.
- **1a-i-a-1-ii. Second** — 0.5s.
- **1a-i-a-1-iii. Third** — 1s.
- **1a-i-a-1-iv. Total** — ~1.5s overhead.

### 2a-i-a-1 → client init
- **2a-i-a-1-i. OpenAI()** — constructor.
- **2a-i-a-1-ii. maxRetries** — option.
- **2a-i-a-1-iii. Timeout** — separate.
- **2a-i-a-1-iv. 9Router** — undici.

### 3a-i-a-1 → RPM
- **3a-i-a-1-i. Limit** — provider.
- **3a-i-a-1-ii. Burst** — allowed.
- **3a-i-a-1-iii. Reset** — window.
- **3a-i-a-1-iv. Header** — x-ratelimit.

### 4a-i-a-1 → definition
- **4a-i-a-1-i. Repeat** — same result.
- **4a-i-a-1-ii. No side effects** — safe.
- **4a-i-a-1-iii. Cost** — tokens.
- **4a-i-a-1-iv. Policy** — retry.

### 5a-i-a-1 → transient
- **5a-i-a-1-i. Network** — flaky.
- **5a-i-a-1-ii. Overload** — provider.
- **5a-i-a-1-iii. Rate** — limits.
- **5a-i-a-1-iv. Recovery** — automatic.

## Confidence & open questions

- **High confidence:** (1+N)² amplification is a documented LiteLLM concern; max_retries:0 pinning is their fix.
- **Open questions:**
  - Does 9Router's executor retry config (429:0, 502:3×3s, 503:3×2s, 504:2×3s) fully avoid amplification?
  - Should 9Router document retry budgets for clients?
  - How to measure amplification in production logs?

## Sources

- LiteLLM docs (BerriAI/litellm)
- `docs/plans-and-prompts/research/9router/42-branch-cascades-and-fallbacks.md` L2-AB
- `docs/plans-and-prompts/research/9router/06-executors-deep-dive.md` (DEFAULT_RETRY_CONFIG)