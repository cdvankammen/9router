# Routing Exponential Expansion R37 — Gateway Architecture

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #gateway #architecture #litellm #openrouter #coai #9router

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Gateway architecture (LiteLLM / OpenRouter / coai / 9Router)"** from `44-branch-gateways-and-serving.md` Root + L1-A.

## L1 — sub-phrases discovered in the root

1. LiteLLM production-gateway pattern
2. OpenRouter market-driven routing
3. coai channel management
4. 9Router as gateway
5. Gateway reliability layers

## L2 — expansion of each L1 node

### 1. LiteLLM pattern
- **1a. Strategy-based LB** — load balancing.
- **1b. Routing groups** — virtual models.
- **1c. Session affinity** — pinning.
- **1d. Reliability layers** — retries/cooldowns.

### 2. OpenRouter pattern
- **2a. Auto Router** — classifier + ranking.
- **2b. Spend share** — market signal.
- **2c. Cost tiers** — bands.
- **2d. Session stickiness** — memory.

### 3. coai pattern
- **3a. Channel management** — multi-channel.
- **3b. Priority** — call order.
- **3c. Weight** — probability.
- **3d. Model caching** — hash-based.

### 4. 9Router as gateway
- **4a. /v1 endpoint** — OpenAI-compat.
- **4b. 40+ providers** — upstreams.
- **4c. Translation** — format conversion.
- **4d. Dashboard** — management UI.

### 5. Reliability layers
- **5a. Retries** — bounded.
- **5b. Fallbacks** — model chains.
- **5c. Cooldowns** — failure isolation.
- **5d. Health checks** — status.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → strategy-based LB
- **1a-i. simple-shuffle** — default.
- **1a-ii. weighted pick** — weights.
- **1a-iii. usage-based** — rate-aware.
- **1a-iv. latency-based** — fastest.

### 2a → Auto Router
- **2a-i. Classifier** — ~30 task types.
- **2a-ii. Ranking** — spend share.
- **2a-iii. Cost tier** — band.
- **2a-iv. Fallbacks** — top survivors.

### 3a → channel management
- **3a-i. Channels** — providers.
- **3a-ii. Priority** — order.
- **3a-iii. Weight** — probability.
- **3a-iv. Groups** — user grouping.

### 4a → /v1 endpoint
- **4a-i. Chat completions** — /v1/chat.
- **4a-ii. Embeddings** — /v1/embeddings.
- **4a-iii. Compat** — OpenAI SDK.
- **4a-iv. 9Router** — rewrite.

### 5a → retries
- **5a-i. Count** — num_retries.
- **5a-ii. Precedence** — header → body.
- **5a-iii. Backoff** — exponential.
- **5a-iv. Pin** — max_retries:0.

## L4 — expansion of selected L3 nodes

### 1a-i → simple-shuffle
- **1a-i-a. Random** — rotation.
- **1a-i-b. Default** — LiteLLM.
- **1a-i-c. Even** — distribution.
- **1a-i-d. Simple** — implementation.

### 2a-i → classifier
- **2a-i-a. Fast** — lightweight.
- **2a-i-b. Task types** — ~30.
- **2a-i-c. Accuracy** — good enough.
- **2a-i-d. Fallback** — default set.

### 3a-i → channels
- **3a-i-a. Providers** — upstreams.
- **3a-i-b. Status** — active/dead.
- **3a-i-c. Priority** — order.
- **3a-i-d. Weight** — probability.

### 4a-i → chat completions
- **4a-i-a. Endpoint** — /v1/chat/completions.
- **4a-i-b. Format** — OpenAI.
- **4a-i-c. Stream** — SSE.
- **4a-i-d. 9Router** — translates.

### 5a-i → count
- **5a-i-a. Default** — 3.
- **5a-i-b. Config** — per-deployment.
- **5a-i-c. Cap** — bounded.
- **5a-i-d. Monitor** — rate.

## L5 — expansion of selected L4 nodes

### 1a-i-a → random rotation
- **1a-i-a-1. Shuffle** — list.
- **1a-i-a-2. Round** — cycle.
- **1a-i-a-3. Uniform** — distribution.
- **1a-i-a-4. Stateless** — no memory.

### 2a-i-a → fast classifier
- **2a-i-a-1. Model** — small.
- **2a-i-a-2. Latency** — ms.
- **2a-i-a-3. Cost** — negligible.
- **2a-i-a-4. Cache** — per prompt.

### 3a-i-a → providers
- **3a-i-a-1. List** — config.
- **3a-i-a-2. Health** — checks.
- **3a-i-a-3. Priority** — order.
- **3a-i-a-4. Weight** — probability.

### 4a-i-a → endpoint
- **4a-i-a-1. Path** — /v1/chat/completions.
- **4a-i-a-2. Method** — POST.
- **4a-i-a-3. Body** — OpenAI schema.
- **4a-i-a-4. Response** — OpenAI schema.

### 5a-i-a → default 3
- **5a-i-a-1. Attempts** — 3.
- **5a-i-a-2. Latency** — 3×.
- **5a-i-a-3. Reliability** — 3 chances.
- **5a-i-a-4. Tuning** — per-provider.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → shuffle
- **1a-i-a-1-i. Fisher-Yates** — algorithm.
- **1a-i-a-1-ii. Seed** — random.
- **1a-i-a-1-iii. Order** — per request.
- **1a-i-a-1-iv. Fairness** — uniform.

### 2a-i-a-1 → small model
- **2a-i-a-1-i. Size** — 100M–1B.
- **2a-i-a-1-ii. Quality** — adequate.
- **2a-i-a-1-iii. Speed** — fast.
- **2a-i-a-1-iv. Cost** — low.

### 3a-i-a-1 → config list
- **3a-i-a-1-i. File** — YAML.
- **3a-i-a-1-ii. Env** — secrets.
- **3a-i-a-1-iii. UI** — dashboard.
- **3a-i-a-1-iv. API** — dynamic.

### 4a-i-a-1 → path
- **4a-i-a-1-i. Version** — v1.
- **4a-i-a-1-ii. Resource** — chat.
- **4a-i-a-1-iii. Action** — completions.
- **4a-i-a-1-iv. Compat** — OpenAI.

### 5a-i-a-1 → attempts
- **5a-i-a-1-i. First** — immediate.
- **5a-i-a-1-ii. Second** — backoff.
- **5a-i-a-1-iii. Third** — backoff.
- **5a-i-a-1-iv. Fail** — error.

## Confidence & open questions

- **High confidence:** gateway architecture facts from branch 44 (LiteLLM/OpenRouter/coai/9Router).
- **Open questions:**
  - Which LiteLLM strategies should 9Router adopt?
  - Should 9Router implement OpenRouter-style spend-share ranking?
  - Does 9Router need coai-style model caching?

## Sources

- LiteLLM docs (BerriAI/litellm)
- OpenRouter docs
- coai (GitHub)
- `docs/plans-and-prompts/research/9router/44-branch-gateways-and-serving.md` Root + L1-A