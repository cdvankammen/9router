# Routing Exponential Expansion R30 — Cooldown & Retry Policies

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #cooldown #retry #litellm #allowed-fails #backoff

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Cooldown & retry policies (429/5xx, allowed_fails, backoff)"** from `42-branch-cascades-and-fallbacks.md` L2-AB.

## L1 — sub-phrases discovered in the root

1. 429 cooldown (immediate 5s)
2. Failure-rate cooldown (>50% in minute)
3. Auth cooldown (401/404/408 → 5s)
4. allowed_fails_policy (per-deployment precedence)
5. Retry precedence chain (header → body → deployment → settings)

## L2 — expansion of each L1 node

### 1. 429 cooldown
- **1a. Trigger** — rate limit response.
- **1b. Duration** — 5s immediate.
- **1c. Effect** — deployment skipped.
- **1d. Reset** — after cooldown.

### 2. Failure-rate cooldown
- **2a. Trigger** — >50% failures in minute.
- **2b. Window** — rolling 60s.
- **2c. Duration** — 5s.
- **2d. Effect** — deployment cooled.

### 3. Auth cooldown
- **3a. 401** — unauthorized.
- **3b. 404** — not found.
- **3c. 408** — timeout.
- **3d. Duration** — 5s.

### 4. allowed_fails_policy
- **4a. Per-deployment** — override.
- **4b. Precedence** — full precedence.
- **4c. Fields** — allowed_fails + cooldown_time.
- **4d. Default** — global settings.

### 5. Retry precedence chain
- **5a. Header** — per-request.
- **5b. Body** — per-request body.
- **5c. Deployment params** — per-deployment.
- **5d. Settings** — global.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → trigger
- **1a-i. Status** — 429.
- **1a-ii. Retry-After** — header.
- **1a-iii. Rate limit** — provider policy.
- **1a-iv. Detection** — response code.

### 2a → >50% failures
- **2a-i. Window** — 60s rolling.
- **2a-ii. Count** — requests in window.
- **2a-iii. Failures** — errors.
- **2a-iv. Ratio** — failures/requests.

### 3a → 401
- **3a-i. Cause** — bad key.
- **3a-ii. Retry useless** — same key.
- **3a-iii. Fix** — rotate key.
- **3a-iv. 9Router** — OAuth refresh.

### 4a → per-deployment
- **4a-i. Scope** — one deployment.
- **4a-ii. Isolation** — no cross-deployment.
- **4a-iii. Config** — deployment params.
- **4a-iv. Precedence** — overrides global.

### 5a → header
- **5a-i. Name** — x-litellm-num-retries.
- **5a-ii. Scope** — single request.
- **5a-iii. Priority** — highest.
- **5a-iv. Use** — client control.

## L4 — expansion of selected L3 nodes

### 1a-i → status 429
- **1a-i-a. Meaning** — rate limited.
- **1a-i-b. Provider** — per-provider.
- **1a-i-c. Retry-After** — seconds.
- **1a-i-d. Cooldown** — 5s default.

### 2a-i → 60s window
- **2a-i-a. Rolling** — sliding window.
- **2a-i-b. Memory** — per-deployment.
- **2a-i-c. Reset** — continuous.
- **2a-i-d. Implementation** — ring buffer.

### 3a-i → bad key
- **3a-i-a. Invalid** — typo.
- **3a-i-b. Expired** — revoked.
- **3a-i-c. Quota** — exhausted.
- **3a-i-d. Fix** — new key.

### 4a-i → scope
- **4a-i-a. One deployment** — isolated.
- **4a-i-b. Group** — shared config.
- **4a-i-c. Global** — default.
- **4a-i-d. Hierarchy** — precedence.

### 5a-i → header name
- **5a-i-a. Standard** — litellm convention.
- **5a-i-b. Custom** — 9Router equivalent.
- **5a-i-c. Forwarding** — pass-through.
- **5a-i-d. Security** — sanitize.

## L5 — expansion of selected L4 nodes

### 1a-i-a → meaning
- **1a-i-a-1. Rate limit** — too many requests.
- **1a-i-a-2. Quota** — token limit.
- **1a-i-a-3. Concurrency** — parallel limit.
- **1a-i-a-4. Action** — back off.

### 2a-i-a → rolling window
- **2a-i-a-1. Definition** — sliding.
- **2a-i-a-2. Precision** — per-second.
- **2a-i-a-3. Memory** — bounded.
- **2a-i-a-4. Alternative** — fixed window.

### 3a-i-a → invalid key
- **3a-i-a-1. Detection** — 401.
- **3a-i-a-2. Retry** — pointless.
- **3a-i-a-3. Alert** — operator.
- **3a-i-a-4. Rotation** — automated.

### 4a-i-a → one deployment
- **4a-i-a-1. Isolation** — failure contained.
- **4a-i-a-2. Config** — per-deployment.
- **4a-i-a-3. Default** — global.
- **4a-i-a-4. Override** — precedence.

### 5a-i-a → standard
- **5a-i-a-1. Convention** — litellm.
- **5a-i-a-2. Docs** — documented.
- **5a-i-a-3. Compat** — clients.
- **5a-i-a-4. 9Router** — adopt or map.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → too many requests
- **1a-i-a-1-i. Per-minute** — RPM limit.
- **1a-i-a-1-ii. Per-token** — TPM limit.
- **1a-i-a-1-iii. Per-day** — daily quota.
- **1a-i-a-1-iv. Response** — 429 + Retry-After.

### 2a-i-a-1 → sliding window
- **2a-i-a-1-i. Implementation** — deque.
- **2a-i-a-1-ii. Timestamps** — epoch ms.
- **2a-i-a-1-iii. Eviction** — old entries.
- **2a-i-a-1-iv. Count** — window size.

### 3a-i-a-1 → detection
- **3a-i-a-1-i. Status code** — 401.
- **3a-i-a-1-ii. Body** — error message.
- **3a-i-a-1-iii. Header** — WWW-Authenticate.
- **3a-i-a-1-iv. Logging** — structured.

### 4a-i-a-1 → isolation
- **4a-i-a-1-i. Benefit** — no blast radius.
- **4a-i-a-1-ii. Cost** — repeated failures.
- **4a-i-a-1-iii. Cooldown** — mitigates.
- **4a-i-a-1-iv. Design** — per-deployment state.

### 5a-i-a-1 → convention
- **5a-i-a-1-i. Adoption** — ecosystem.
- **5a-i-a-1-ii. Familiarity** — users.
- **5a-i-a-1-iii. Docs** — litellm.
- **5a-i-a-1-iv. 9Router** — compatibility.

## Confidence & open questions

- **High confidence:** LiteLLM cooldown/retry semantics (docs + code).
- **Open questions:**
  - Should 9Router adopt allowed_fails_policy per deployment?
  - What cooldown durations fit 9Router's provider set?
  - How to surface cooldown state in the dashboard?

## Sources

- LiteLLM docs (BerriAI/litellm)
- `docs/plans-and-prompts/research/9router/42-branch-cascades-and-fallbacks.md` L2-AB