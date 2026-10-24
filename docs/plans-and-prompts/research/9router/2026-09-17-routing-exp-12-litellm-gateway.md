# Routing Exponential Expansion R12 — LiteLLM Gateway Routing

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #litellm #gateway #load-balancing #strategies #routing-groups #session-affinity #failover #cooldowns

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"LiteLLM gateway routing (strategies, groups, affinity, failover, cooldowns)"** from `37-ai-model-routing-deep-research.md` §6.

## L1 — sub-phrases discovered in the root

1. Strategy-based load balancing
2. Routing groups (virtual models)
3. Session affinity (deployment_affinity_ttl_seconds)
4. Deployment ordering (order param)
5. Weighted failover (max_fallbacks)
6. Cooldowns (429/5s, allowed_fails)
7. Retries (num_retries precedence, backoff)
8. Pre-call checks (context window, EU region)
9. Max parallel requests (semaphore)
10. Caching (Redis, traffic mirroring)

## L2 — expansion of each L1 node

### 1. Strategy-based load balancing
- **1a. simple-shuffle** — default, recommended.
- **1b. Weighted pick** — probability by weight.
- **1c. usage-based-routing-v2** — rate-limit-aware.
- **1d. Latency-based** — fastest.
- **1e. Least-busy** — lowest load.
- **1f. Cost-based** — cheapest.

### 2. Routing groups
- **2a. Definition** — bind model_names to per-group strategy + args.
- **2b. Virtual model** — group callable as a model.
- **2c. Spend logs** — model_group recorded.
- **2d. Config** — per-group.

### 3. Session affinity
- **3a. Pre-call check** — pins deployment per session id.
- **3b. Keys** — x-litellm-session-id, vendor header, metadata.session_id.
- **3c. TTL** — deployment_affinity_ttl_seconds default 3600.
- **3d. Storage** — router cache, Redis-shared across proxy instances.
- **3e. Cooldown** — pinned deployment in cooldown → falls through to strategy, pin kept.

### 4. Deployment ordering
- **4a. order param** — lower = higher priority.
- **4b. Failover** — order=1 fails → order=2.
- **4c. Retries** — each order level gets its own retries.

### 5. Weighted failover
- **5a. Same group** — retry re-picking by weights.
- **5b. Exclusions** — failed deployment excluded (accumulate).
- **5c. Escalation** — cross-group fallbacks only after all peers tried.
- **5d. Cap** — max_fallbacks default 5.
- **5e. Async-only** — not for sync.
- **5f. Exceptions** — not triggered for ContextWindowExceededError/ContentPolicyViolationError.

### 6. Cooldowns
- **6a. 429** — immediate 5s.
- **6b. >50% failures in current minute** — 5s.
- **6c. 401/404/408** — 5s.
- **6d. allowed_fails + cooldown_time** — configurable.
- **6e. allowed_fails_policy** — per-deployment, takes full precedence.

### 7. Retries
- **7a. num_retries precedence** — header → body → deployment params → settings.
- **7b. Exponential backoff** — RateLimitError.
- **7c. Immediate** — generic errors.
- **7d. retry_after** — min wait.
- **7e. RetryPolicy** — per exception type.
- **7f. max_retries:0** — pins provider client to avoid (1+N)² amplification.

### 8. Pre-call checks
- **8a. Context window filter** — model_prices_and_context_window.json.
- **8b. EU-region filter** — region_name.
- **8c. Auto-inferred** — Vertex AI, Bedrock, Watsonx.

### 9. Max parallel requests
- **9a. Semaphore** — concurrency limit.
- **9b. Default** — from rpm or tpm/1000/6.

### 10. Caching
- **10a. Redis recommended** — shared cache.
- **10b. Caching groups** — across model groups.
- **10c. Traffic mirroring** — silent experiments for A/B evaluation.
- **10d. Alerting** — Slack/webhook for exceptions + slow responses.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → simple-shuffle
- **1a-i. Mechanism** — random shuffle per request.
- **1a-ii. Why default** — even distribution.
- **1a-iii. Recommended** — official guidance.
- **1a-iv. Alternative** — weighted.

### 2b → virtual model
- **2b-i. Name** — group name.
- **2b-ii. Resolution** — strategy picks deployment.
- **2b-iii. Client** — sees one model.
- **2b-iv. Transparency** — spend logs show group.

### 3c → TTL
- **3c-i. 3600s** — 1 hour default.
- **3c-ii. Config** — per-deployment.
- **3c-iii. Expiry** — affinity released.
- **3c-iv. Renewal** — on reuse.

### 5b → exclusions
- **5b-i. Accumulate** — failed deployments stay excluded.
- **5b-ii. Scope** — per-request.
- **5b-iii. Reset** — next request.
- **5b-iv. Weights** — re-pick among remaining.

### 6e → allowed_fails_policy
- **6e-i. Per-deployment** — override.
- **6e-ii. Precedence** — full.
- **6e-iii. Fields** — allowed_fails, cooldown_time.
- **6e-iv. Use** — custom cooldown.

### 7f → max_retries:0
- **7f-i. Provider client** — pinned.
- **7f-ii. Why** — avoid (1+N)² amplification.
- **7f-iii. Gateway retries** — sole retry layer.
- **7f-iv. Tradeoff** — no client-level retry.

## L4 — expansion of selected L3 nodes

### 1a-i → random shuffle
- **1a-i-a. Uniform** — equal probability.
- **1a-i-b. Stateless** — no tracking.
- **1a-i-c. Simple** — O(1).
- **1a-i-d. Limitation** — ignores load.

### 3c-ii → per-deployment config
- **3c-ii-a. YAML** — deployment config.
- **3c-ii-b. Field** — deployment_affinity_ttl_seconds.
- **3c-ii-c. Override** — per deployment.
- **3c-ii-d. Default** — 3600.

### 5b-i → accumulate
- **5b-i-a. First fail** — excluded.
- **5b-i-b. Second fail** — another excluded.
- **5b-i-c. All fail** — escalate cross-group.
- **5b-i-d. Cap** — max_fallbacks.

### 7f-iii → gateway retries
- **7f-iii-a. Sole layer** — gateway controls retries.
- **7f-iii-b. Config** — num_retries.
- **7f-iii-c. Backoff** — exponential.
- **7f-iii-d. Observability** — retry logs.

## L5 — expansion of selected L4 nodes

### 1a-i-a → uniform probability
- **1a-i-a-1. Fairness** — no bias.
- **1a-i-a-2. Variance** — high.
- **1a-i-a-3. Improvement** — weighted.
- **1a-i-a-4. Use** — default.

### 5b-i-a → first fail
- **5b-i-a-1. Detection** — error.
- **5b-i-a-2. Exclusion** — remove from pool.
- **5b-i-a-3. Re-pick** — weighted.
- **5b-i-a-4. Log** — failover event.

## L6 — expansion of selected L5 nodes

### 1a-i-a-3 → weighted
- **1a-i-a-3-i. Weights** — per deployment.
- **1a-i-a-3-ii. Probability** — weight/total.
- **1a-i-a-3-iii. Use** — capacity skew.
- **1a-i-a-3-iv. Config** — weight field.

## Confidence & open questions

- **High confidence:** routing docs + repo (BerriAI/litellm, 58.7k★).
- **Open questions:**
  - How does usage-based-routing-v2 compute rate-limit awareness?
  - What is the exact (1+N)² amplification math?
  - How does Redis sharing work across proxy instances?

## Sources

- github.com/BerriAI/litellm (58.7k★) — routing docs
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §6
- `docs/plans-and-prompts/research/9router/42-branch-cascades-and-fallbacks.md`