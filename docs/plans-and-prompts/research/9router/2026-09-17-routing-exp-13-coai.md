# Routing Exponential Expansion R13 — coai Channel Management

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #coai #channel-management #priority #weight #load-balancing #caching

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"coai channel management (priority, weight, caching)"** from `37-ai-model-routing-deep-research.md` §6.

## L1 — sub-phrases discovered in the root

1. Channel management (priority sets call order)
2. Weight (load-balancing probability distribution)
3. User grouping
4. Automatic retry on failure
5. Model redirection
6. Built-in upstream hiding
7. Channel status management
8. Model caching (request-parameter hash)

## L2 — expansion of each L1 node

### 1. Channel management
- **1a. Definition** — channels = upstream providers.
- **1b. Priority** — sets call order.
- **1c. Source** — coaidev/coai README (9.3k★, Go).
- **1d. Status** — per-channel.

### 2. Weight
- **2a. Definition** — load-balancing probability distribution.
- **2b. Scope** — among channels at the same priority.
- **2c. Mechanism** — weighted random.
- **2d. Config** — per-channel weight.

### 3. User grouping
- **3a. Definition** — group users.
- **3b. Use** — per-group routing.
- **3c. Quota** — per-group limits.
- **3d. Priority** — per-group.

### 4. Automatic retry
- **4a. Trigger** — failure.
- **4b. Next channel** — by priority.
- **4c. Count** — bounded.
- **4d. Log** — retry events.

### 5. Model redirection
- **5a. Definition** — map model names.
- **5b. Use** — alias to real model.
- **5c. Fallback** — redirect on failure.
- **5d. Config** — per-model.

### 6. Upstream hiding
- **6a. Definition** — hide real upstream.
- **6b. Mechanism** — proxy layer.
- **6c. Benefit** — key protection.
- **6d. Config** — per-channel.

### 7. Channel status
- **7a. Enable/disable** — manual.
- **7b. Auto-disable** — on failure.
- **7c. Recovery** — manual/auto.
- **7d. Health** — status checks.

### 8. Model caching
- **8a. Mechanism** — same request-parameter hash → cached result.
- **8b. Not billed** — cache hit not billed.
- **8c. Key** — request-parameter hash.
- **8d. TTL** — cache lifetime.

## L3 — expansion of selected L2 nodes (variable branching)

### 1b → priority
- **1b-i. Order** — lower number first.
- **1b-ii. Same priority** — weight decides.
- **1b-iii. Failover** — next priority.
- **1b-iv. Config** — per-channel.

### 2b → same priority
- **2b-i. Weighted random** — probability.
- **2b-ii. Equal weights** — uniform.
- **2b-iii. Skewed** — capacity.
- **2b-iv. Health-aware** — skip down channels.

### 3b → per-group routing
- **3b-i. Group definition** — user attribute.
- **3b-ii. Channel set** — per group.
- **3b-iii. Priority** — per group.
- **3b-iv. Quota** — per group.

### 5b → alias
- **5b-i. Alias name** — client-facing.
- **5b-ii. Real model** — upstream.
- **5b-iii. Mapping** — config.
- **5b-iv. Transparency** — hidden.

### 8b → not billed
- **8b-i. Cache hit** — no upstream call.
- **8b-ii. Cost** — zero.
- **8b-iii. Usage** — not counted.
- **8b-iv. Caveat** — stale results.

## L4 — expansion of selected L3 nodes

### 1b-i → order
- **1b-i-a. Ascending** — priority 1 first.
- **1b-i-b. Descending** — priority 10 last.
- **1b-i-c. Ties** — weight.
- **1b-i-d. Skip** — disabled channels.

### 2b-i → weighted random
- **2b-i-a. Weight sum** — total.
- **2b-i-b. Random draw** — 0–sum.
- **2b-i-c. Selection** — cumulative.
- **2b-i-d. Repeat** — per request.

### 8b-iii → usage
- **8b-iii-a. Quota** — not consumed.
- **8b-iii-b. Logs** — cache hit marker.
- **8b-iii-c. Billing** — no charge.
- **8b-iii-d. Analytics** — cache rate.

## L5 — expansion of selected L4 nodes

### 1b-i-a → ascending
- **1b-i-a-1. Primary** — priority 1.
- **1b-i-a-2. Secondary** — priority 2.
- **1b-i-a-3. Tertiary** — priority 3.
- **1b-i-a-4. Last resort** — highest.

### 2b-i-a → weight sum
- **2b-i-a-1. Compute** — sum weights.
- **2b-i-a-2. Normalize** — divide.
- **2b-i-a-3. Distribution** — proportional.
- **2b-i-a-4. Update** — config change.

## L6 — expansion of selected L5 nodes

### 1b-i-a-1 → primary
- **1b-i-a-1-i. Preferred** — first choice.
- **1b-i-a-1-ii. Health** — must be up.
- **1b-i-a-1-iii. Fallback** — next priority.
- **1b-i-a-1-iv. Weight** — among peers.

## Confidence & open questions

- **High confidence:** README (coaidev/coai, 9.3k★).
- **Open questions:**
  - How is the request-parameter hash computed?
  - What is the cache TTL?
  - How does user grouping interact with quotas?

## Sources

- github.com/coaidev/coai (9.3k★, Go) — README
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §6