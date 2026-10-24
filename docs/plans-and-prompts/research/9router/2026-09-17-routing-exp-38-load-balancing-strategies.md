# Routing Exponential Expansion R38 — Load Balancing Strategies

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #load-balancing #strategies #litellm #usage-based #latency-based #cost-based

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Load balancing strategies (simple-shuffle, weighted, usage-based, latency, least-busy, cost)"** from `44-branch-gateways-and-serving.md` L2-AA.

## L1 — sub-phrases discovered in the root

1. simple-shuffle (random rotation)
2. weighted pick (probability)
3. usage-based-routing-v2 (rate-limit aware)
4. latency-based (fastest)
5. least-busy (least loaded)
6. cost-based (cheapest)

## L2 — expansion of each L1 node

### 1. simple-shuffle
- **1a. Random** — rotation.
- **1b. Default** — LiteLLM.
- **1c. Uniform** — distribution.
- **1d. Stateless** — no memory.

### 2. weighted pick
- **2a. Weights** — config.
- **2b. Probability** — proportional.
- **2c. Sum** — normalized.
- **2d. Use** — capacity split.

### 3. usage-based-v2
- **3a. Rate limits** — aware.
- **3b. Usage** — tracked.
- **3c. Avoid** — limited deployments.
- **3d. Prefer** — available.

### 4. latency-based
- **4a. Measure** — response time.
- **4b. Rank** — fastest.
- **4c. Prefer** — low latency.
- **4d. Update** — rolling.

### 5. least-busy
- **5a. Load** — active requests.
- **5b. Rank** — least.
- **5c. Prefer** — idle.
- **5d. Update** — per request.

### 6. cost-based
- **6a. Price** — per token.
- **6b. Rank** — cheapest.
- **6c. Prefer** — low cost.
- **6d. Quality** — floor.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → random
- **1a-i. Fisher-Yates** — shuffle.
- **1a-ii. Seed** — random.
- **1a-iii. Fairness** — uniform.
- **1a-iv. Simple** — O(n).

### 2a → weights
- **2a-i. Source** — config.
- **2a-ii. Range** — 0–100.
- **2a-iii. Default** — equal.
- **2a-iv. Dynamic** — update.

### 3a → rate limits
- **3a-i. RPM** — per-minute.
- **3a-ii. TPM** — per-token.
- **3a-iii. Remaining** — tracked.
- **3a-iv. Reset** — window.

### 4a → measure
- **4a-i. TTFB** — first byte.
- **4a-ii. Total** — full response.
- **4a-iii. Rolling** — window.
- **4a-iv. EWMA** — smoothing.

### 5a → load
- **5a-i. Active** — in-flight.
- **5a-ii. Queued** — waiting.
- **5a-iii. Capacity** — max.
- **5a-iv. Ratio** — load/capacity.

### 6a → price
- **6a-i. Input** — $/M.
- **6a-ii. Output** — $/M.
- **6a-iii. Total** — estimate.
- **6a-iv. Update** — pricing changes.

## L4 — expansion of selected L3 nodes

### 1a-i → Fisher-Yates
- **1a-i-a. Algorithm** — in-place.
- **1a-i-b. O(n)** — efficient.
- **1a-i-c. Uniform** — unbiased.
- **1a-i-d. Use** — per request.

### 2a-i → config source
- **2a-i-a. File** — YAML.
- **2a-i-b. Env** — override.
- **2a-i-c. API** — dynamic.
- **2a-i-d. UI** — dashboard.

### 3a-i → RPM
- **3a-i-a. Limit** — provider.
- **3a-i-b. Used** — counted.
- **3a-i-c. Remaining** — limit − used.
- **3a-i-d. Reset** — window.

### 4a-i → TTFB
- **4a-i-a. Measure** — start→first.
- **4a-i-b. Network** — dominated.
- **4a-i-c. Server** — processing.
- **4a-i-d. Cache** — warm.

### 5a-i → active
- **5a-i-a. Count** — in-flight.
- **5a-i-b. Increment** — start.
- **5a-i-c. Decrement** — end.
- **5a-i-d. Atomic** — safe.

### 6a-i → input price
- **6a-i-a. Per M** — tokens.
- **6a-i-b. Model** — specific.
- **6a-i-c. Provider** — specific.
- **6a-i-d. Update** — registry.

## L5 — expansion of selected L4 nodes

### 1a-i-a → in-place
- **1a-i-a-1. Swap** — elements.
- **1a-i-a-2. Loop** — n−1.
- **1a-i-a-3. Random** — index.
- **1a-i-a-4. Result** — permutation.

### 2a-i-a → YAML
- **2a-i-a-1. Format** — human.
- **2a-i-a-2. Comments** — docs.
- **2a-i-a-3. Validation** — schema.
- **2a-i-a-4. Reload** — hot.

### 3a-i-a → limit
- **3a-i-a-1. Provider** — publishes.
- **3a-i-a-2. Tier** — plan.
- **3a-i-a-3. Header** — x-ratelimit.
- **3a-i-a-4. Config** — manual.

### 4a-i-a → measure
- **4a-i-a-1. Timestamp** — start.
- **4a-i-a-2. Timestamp** — first byte.
- **4a-i-a-3. Delta** — TTFB.
- **4a-i-a-4. Store** — rolling.

### 5a-i-a → count
- **5a-i-a-1. Map** — per deployment.
- **5a-i-a-2. Key** — deployment id.
- **5a-i-a-3. Value** — count.
- **5a-i-a-4. Update** — atomic.

### 6a-i-a → per M
- **6a-i-a-1. Unit** — 1M tokens.
- **6a-i-a-2. Price** — dollars.
- **6a-i-a-3. Model** — lookup.
- **6a-i-a-4. Provider** — lookup.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → swap
- **1a-i-a-1-i. i** — current.
- **1a-i-a-1-ii. j** — random ≥ i.
- **1a-i-a-1-iii. Swap** — values.
- **1a-i-a-1-iv. Next** — i+1.

### 2a-i-a-1 → human format
- **2a-i-a-1-i. Readable** — YAML.
- **2a-i-a-1-ii. Diffable** — git.
- **2a-i-a-1-iii. Reviewable** — PR.
- **2a-i-a-1-iv. Editable** — editor.

### 3a-i-a-1 → publishes
- **3a-i-a-1-i. Docs** — API reference.
- **3a-i-a-1-ii. Headers** — responses.
- **3a-i-a-1-iii. Portal** — dashboard.
- **3a-i-a-1-iv. Support** — contact.

### 4a-i-a-1 → start timestamp
- **4a-i-a-1-i. Before** — fetch.
- **4a-i-a-1-ii. After** — response.
- **4a-i-a-1-iii. Date.now()** — ms.
- **4a-i-a-1-iv. Precision** — ms.

### 5a-i-a-1 → map
- **5a-i-a-1-i. JS Map** — structure.
- **5a-i-a-1-ii. Key** — string.
- **5a-i-a-1-iii. Value** — number.
- **5a-i-a-1-iv. GC** — cleanup.

### 6a-i-a-1 → unit
- **6a-i-a-1-i. Standard** — industry.
- **6a-i-a-1-ii. Compare** — providers.
- **6a-i-a-1-iii. Estimate** — cost.
- **6a-i-a-1-iv. Bill** — actual.

## Confidence & open questions

- **High confidence:** LiteLLM load-balancing strategies from branch 44 + docs.
- **Open questions:**
  - Which strategy should be 9Router's default?
  - Should 9Router implement usage-based-routing-v2 (rate-limit aware)?
  - How to combine strategies (e.g., cost + latency)?

## Sources

- LiteLLM docs (BerriAI/litellm)
- `docs/plans-and-prompts/research/9router/44-branch-gateways-and-serving.md` L2-AA