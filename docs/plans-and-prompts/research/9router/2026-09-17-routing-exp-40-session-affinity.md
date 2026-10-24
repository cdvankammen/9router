# Routing Exponential Expansion R40 — Session Affinity

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #session-affinity #stickiness #litellm #ttl #redis

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Session affinity (pre-call pinning, deployment_affinity_ttl_seconds, Redis)"** from `44-branch-gateways-and-serving.md` L1-A.

## L1 — sub-phrases discovered in the root

1. Pre-call check (pin deployment)
2. Session id header (x-litellm-session-id)
3. deployment_affinity_ttl_seconds (3600)
4. Redis sharing (across proxy instances)
5. Session stickiness (OpenRouter variant)

## L2 — expansion of each L1 node

### 1. Pre-call check
- **1a. Lookup** — session → deployment.
- **1b. Pin** — same deployment.
- **1c. Miss** — no pin.
- **1d. Expired** — re-pin.

### 2. Session id header
- **2a. Name** — x-litellm-session-id.
- **2b. Client** — sets.
- **2c. Value** — conversation id.
- **2d. Missing** — no affinity.

### 3. TTL
- **3a. Default** — 3600s.
- **3b. Config** — per-deployment.
- **3c. Expiry** — re-pin.
- **3d. Purpose** — bounded memory.

### 4. Redis sharing
- **4a. Shared state** — across instances.
- **4b. Key** — session id.
- **4c. Value** — deployment.
- **4d. TTL** — Redis expiry.

### 5. OpenRouter stickiness
- **5a. Memory** — per conversation.
- **5b. Reuse** — while top candidate.
- **5c. Fingerprint** — message hash.
- **5d. Release** — when not top.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → lookup
- **1a-i. Key** — session id.
- **1a-ii. Store** — Redis/map.
- **1a-iii. Hit** — pinned.
- **1a-iv. Miss** — fresh.

### 2a → name
- **2a-i. Standard** — litellm.
- **2a-ii. Forward** — pass-through.
- **2a-iii. Sanitize** — length.
- **2a-iv. 9Router** — session id.

### 3a → default
- **3a-i. 3600s** — 1 hour.
- **3a-ii. Rationale** — conversation.
- **3a-iii. Tuning** — per-use.
- **3a-iv. Zero** — disable.

### 4a → shared state
- **4a-i. Multi-instance** — scale.
- **4a-ii. Consistency** — same pin.
- **4a-iii. Redis** — external.
- **4a-iv. Fallback** — local.

### 5a → memory
- **5a-i. Per conversation** — key.
- **5a-ii. Model** — remembered.
- **5a-iii. Top candidate** — check.
- **5a-iv. Release** — condition.

## L4 — expansion of selected L3 nodes

### 1a-i → key
- **1a-i-a. Session id** — string.
- **1a-i-b. Hash** — privacy.
- **1a-i-c. Length** — bounded.
- **1a-i-d. Format** — uuid.

### 2a-i → standard
- **2a-i-a. Adoption** — ecosystem.
- **2a-i-b. Docs** — litellm.
- **2a-i-c. Clients** — compatible.
- **2a-i-d. 9Router** — adopt.

### 3a-i → 3600s
- **3a-i-a. 1 hour** — duration.
- **3a-i-b. Conversation** — typical.
- **3a-i-c. Long sessions** — re-pin.
- **3a-i-d. Config** — override.

### 4a-i → multi-instance
- **4a-i-a. Scale** — horizontal.
- **4a-i-b. Load balancer** — front.
- **4a-i-c. Any instance** — handles.
- **4a-i-d. Shared state** — needed.

### 5a-i → per conversation
- **5a-i-a. Key** — session id.
- **5a-i-b. Value** — model.
- **5a-i-c. TTL** — conversation.
- **5a-i-d. Store** — memory.

## L5 — expansion of selected L4 nodes

### 1a-i-a → session id
- **1a-i-a-1. Client** — generates.
- **1a-i-a-2. Stable** — conversation.
- **1a-i-a-3. Unique** — per conversation.
- **1a-i-a-4. Passed** — each request.

### 2a-i-a → adoption
- **2a-i-a-1. Ecosystem** — litellm users.
- **2a-i-a-2. Familiar** — pattern.
- **2a-i-a-3. Compat** — tools.
- **2a-i-a-4. 9Router** — support.

### 3a-i-a → 1 hour
- **3a-i-a-1. Short chats** — covered.
- **3a-i-a-2. Long chats** — re-pin.
- **3a-i-a-3. Re-pin cost** — new model.
- **3a-i-a-4. Acceptable** — tradeoff.

### 4a-i-a → horizontal scale
- **4a-i-a-1. Instances** — N.
- **4a-i-a-2. Requests** — distributed.
- **4a-i-a-3. State** — shared.
- **4a-i-a-4. Redis** — solution.

### 5a-i-a → key
- **5a-i-a-1. Session id** — from header.
- **5a-i-a-2. Fingerprint** — fallback.
- **5a-i-a-3. IP hash** — last resort.
- **5a-i-a-4. Missing** — no stickiness.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → client generates
- **1a-i-a-1-i. UUID** — v4.
- **1a-i-a-1-ii. First request** — create.
- **1a-i-a-1-iii. Store** — client.
- **1a-i-a-1-iv. Reuse** — conversation.

### 2a-i-a-1 → litellm users
- **2a-i-a-1-i. Many** — adopters.
- **2a-i-a-1-ii. Pattern** — proven.
- **2a-i-a-1-iii. Docs** — available.
- **2a-i-a-1-iv. Support** — community.

### 3a-i-a-1 → short chats
- **3a-i-a-1-i. Minutes** — typical.
- **3a-i-a-1-ii. Covered** — TTL.
- **3a-i-a-1-iii. No re-pin** — stable.
- **3a-i-a-1-iv. Good** — UX.

### 4a-i-a-1 → N instances
- **4a-i-a-1-i. Scale out** — more.
- **4a-i-a-1-ii. Scale in** — fewer.
- **4a-i-a-1-iii. Stateless** — app.
- **4a-i-a-1-iv. Stateful** — Redis.

### 5a-i-a-1 → session id
- **5a-i-a-1-i. Header** — x-session-id.
- **5a-i-a-1-ii. Value** — string.
- **5a-i-a-1-iii. Sanitize** — regex.
- **5a-i-a-1-iv. Hash** — storage.

## Confidence & open questions

- **High confidence:** LiteLLM session affinity semantics from branch 44 + docs.
- **Open questions:**
  - Should 9Router implement session affinity (sticky accounts/models)?
  - What TTL fits 9Router's usage patterns?
  - Does 9Router need Redis for multi-instance affinity?

## Sources

- LiteLLM docs (BerriAI/litellm)
- `docs/plans-and-prompts/research/9router/44-branch-gateways-and-serving.md` L1-A
- `docs/plans-and-prompts/research/9router/42-branch-cascades-and-fallbacks.md` (sticky-3 account selection)