# Routing Exponential Expansion R39 — Virtual Models & Routing Groups

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #virtual-models #routing-groups #litellm #model-names #aliases

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Virtual models & routing groups (group callable as virtual model)"** from `44-branch-gateways-and-serving.md` L1-A + L3-AAA.

## L1 — sub-phrases discovered in the root

1. Routing groups (model_names binding)
2. Virtual models (group as single name)
3. Per-group strategies
4. Group fallback (deployment ordering)
5. Model aliases (user-facing names)

## L2 — expansion of each L1 node

### 1. Routing groups
- **1a. model_names** — bound list.
- **1b. Strategy** — per group.
- **1c. Deployments** — members.
- **1d. Config** — YAML.

### 2. Virtual models
- **2a. Single name** — group alias.
- **2b. Callable** — like model.
- **2c. Hidden** — members.
- **2d. 9Router** — model combos.

### 3. Per-group strategies
- **3a. simple-shuffle** — default.
- **3b. weighted** — custom.
- **3c. usage-based** — rate-aware.
- **3d. latency** — fastest.

### 4. Group fallback
- **4a. Order param** — priority.
- **4b. Lower first** — higher priority.
- **4c. Per-order retries** — each level.
- **4d. Exhaustion** — all failed.

### 5. Model aliases
- **5a. User names** — friendly.
- **5b. Mapping** — to real.
- **5c. 9Router** — alias registry.
- **5d. Compat** — OpenAI names.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → model_names
- **1a-i. List** — deployment ids.
- **1a-ii. Order** — priority.
- **1a-iii. Dedup** — unique.
- **1a-iv. Validation** — exists.

### 2a → single name
- **2a-i. Example** — gpt-4-group.
- **2a-ii. Resolution** — group lookup.
- **2a-iii. Fallback** — member.
- **2a-iv. Transparency** — hidden.

### 3a → simple-shuffle
- **3a-i. Default** — group.
- **3a-ii. Even** — distribution.
- **3a-iii. Simple** — implementation.
- **3a-iv. Limitation** — no awareness.

### 4a → order param
- **4a-i. Integer** — priority.
- **4a-ii. Lower** — first.
- **4a-iii. Ties** — shuffle.
- **4a-iv. Missing** — default.

### 5a → user names
- **5a-i. Friendly** — readable.
- **5a-ii. Stable** — across providers.
- **5a-iii. 9Router** — dashboard.
- **5a-iv. Docs** — list.

## L4 — expansion of selected L3 nodes

### 1a-i → list
- **1a-i-a. Members** — deployments.
- **1a-i-b. Order** — priority.
- **1a-i-c. Size** — 1–N.
- **1a-i-d. Config** — YAML.

### 2a-i → example
- **2a-i-a. gpt-4-group** — virtual.
- **2a-i-b. Members** — azure, openai.
- **2a-i-c. Strategy** — weighted.
- **2a-i-d. Call** — by name.

### 3a-i → default
- **3a-i-a. Fallback** — strategy.
- **3a-i-b. Safe** — works.
- **3a-i-c. Predictable** — behavior.
- **3a-i-d. Documented** — docs.

### 4a-i → integer
- **4a-i-a. Range** — 0–N.
- **4a-i-b. Default** — 0.
- **4a-i-c. Sort** — ascending.
- **4a-i-d. Use** — priority.

### 5a-i → friendly
- **5a-i-a. Readable** — names.
- **5a-i-b. Memorable** — users.
- **5a-i-c. Stable** — API.
- **5a-i-d. 9Router** — UI.

## L5 — expansion of selected L4 nodes

### 1a-i-a → members
- **1a-i-a-1. Deployment** — id.
- **1a-i-a-2. Provider** — upstream.
- **1a-i-a-3. Model** — real name.
- **1a-i-a-4. Config** — params.

### 2a-i-a → gpt-4-group
- **2a-i-a-1. Azure** — member.
- **2a-i-a-2. OpenAI** — member.
- **2a-i-a-3. Weight** — split.
- **2a-i-a-4. Failover** — automatic.

### 3a-i-a → fallback
- **3a-i-a-1. Strategy error** — degrade.
- **3a-i-a-2. Simple** — shuffle.
- **3a-i-a-3. Log** — warning.
- **3a-i-a-4. Continue** — service.

### 4a-i-a → range
- **4a-i-a-1. 0** — highest.
- **4a-i-a-2. 1** — second.
- **4a-i-a-3. N** — lowest.
- **4a-i-a-4. Negative** — invalid.

### 5a-i-a → readable
- **5a-i-a-1. Lowercase** — convention.
- **5a-i-a-2. Hyphens** — separators.
- **5a-i-a-3. Length** — short.
- **5a-i-a-4. Unique** — registry.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → deployment id
- **1a-i-a-1-i. Unique** — identifier.
- **1a-i-a-1-ii. Config** — defined.
- **1a-i-a-1-iii. Reference** — group.
- **1a-i-a-1-iv. Logs** — trace.

### 2a-i-a-1 → Azure member
- **2a-i-a-1-i. Endpoint** — azure.
- **2a-i-a-1-ii. Key** — api-key.
- **2a-i-a-1-iii. Model** — deployment.
- **2a-i-a-1-iv. Region** — geo.

### 3a-i-a-1 → strategy error
- **3a-i-a-1-i. Exception** — caught.
- **3a-i-a-1-ii. Degrade** — shuffle.
- **3a-i-a-1-iii. Log** — error.
- **3a-i-a-1-iv. Alert** — optional.

### 4a-i-a-1 → 0 highest
- **4a-i-a-1-i. Priority** — first.
- **4a-i-a-1-ii. Retries** — own.
- **4a-i-a-1-iii. Failover** — next.
- **4a-i-a-1-iv. Config** — order.

### 5a-i-a-1 → lowercase
- **5a-i-a-1-i. Convention** — style.
- **5a-i-a-1-ii. Consistency** — names.
- **5a-i-a-1-iii. Case-insensitive** — lookup.
- **5a-i-a-1-iv. 9Router** — registry.

## Confidence & open questions

- **High confidence:** LiteLLM routing groups / virtual models from branch 44 + docs.
- **Open questions:**
  - How do 9Router model combos map to routing groups?
  - Should 9Router expose virtual model names to clients?
  - What per-group strategies fit 9Router's provider set?

## Sources

- LiteLLM docs (BerriAI/litellm)
- `docs/plans-and-prompts/research/9router/44-branch-gateways-and-serving.md` L1-A + L3-AAA
- `docs/plans-and-prompts/research/9router/01-open-sse-engine.md` (combo expansion)