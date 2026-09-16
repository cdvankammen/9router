# Exponential Expansion E15 — Queue Management

**Date:** 2026-09-15
**Root phrase:** "Queue management (token bucket, queueing, spend caps, allowlists, fallback combos)" — from `2026-08-31-message-origin-and-destination-research.md` §B.5
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Token-bucket rate limiting (Anthropic, OpenAI, LiteLLM)
2. Per-key/per-model RPM/TPM
3. 429 + retry-after
4. SDK backoff
5. Queueing (LiteLLM supports; OpenAI/Anthropic don't)
6. Bounded queue with per-key priority and TTL
7. Spend caps (per-key/per-team/per-workspace budgets)
8. Model/provider allowlists
9. Fallback combos (9router already has this)

## L2 — expansion of each L1 node

### 1. Token-bucket rate limiting
- **1a. Algorithm** — bucket with tokens.
- **1b. Refill** — continuous.
- **1c. Burst** — bucket size.
- **1d. Providers** — Anthropic, OpenAI, LiteLLM.

### 2. Per-key/per-model RPM/TPM
- **2a. Per-key** — key-level limits.
- **2b. Per-model** — model-level limits.
- **2c. Combination** — both apply.

### 3. 429 + retry-after
- **3a. Response** — 429.
- **3b. Retry-After** — seconds.
- **3c. Semantics** — when to retry.

### 4. SDK backoff
- **4a. Exponential** — doubling.
- **4b. Jitter** — randomization.
- **4c. Max** — cap.

### 5. Queueing
- **5a. LiteLLM** — supports with priority.
- **5b. OpenAI/Anthropic** — reject, don't queue.
- **5c. Gateway value** — queue at gateway.

### 6. Bounded queue
- **6a. Bound** — max items.
- **6b. Per-key priority** — priority per key.
- **6c. TTL** — expiry per item.

### 7. Spend caps
- **7a. Per-key** — key budget.
- **7b. Per-team** — team budget.
- **7c. Per-workspace** — workspace budget.
- **7d. Soft/hard** — warn/block.

### 8. Model/provider allowlists
- **8a. Per-key** — key restrictions.
- **8b. OpenRouter guardrails** — precedent.
- **8c. LiteLLM model access groups** — precedent.

### 9. Fallback combos
- **9a. Combo engine** — 9router has it.
- **9b. Smart router** — task-based selection.
- **9c. Multi-account fallback** — account-level.

## L3 — expansion of selected L2 nodes

### 1b → refill
- **1b-i. Rate** — tokens/sec.
- **1b-ii. Capacity** — max tokens.
- **1b-iii. Continuous** — no reset.

### 2c → combination
- **2c-i. Key limit** — first check.
- **2c-ii. Model limit** — second check.
- **2c-iii. Lower wins** — most restrictive.

### 5a → LiteLLM queueing
- **5a-i. Priority** — important requests first.
- **5a-ii. Config** — queue settings.
- **5a-iii. Failure** — queue full → reject.

### 6b → per-key priority
- **6b-i. Priority class** — 0-5.
- **6b-ii. Dequeue** — highest first.
- **6b-iii. Starvation** — aging prevents.

### 7d → soft/hard
- **7d-i. Soft** — warning.
- **7d-ii. Hard** — block.
- **7d-iii. Reset** — period.

### 9a → combo engine
- **9a-i. Ordered list** — try A then B.
- **9a-ii. Fallback** — on failure.
- **9a-iii. Queueing** — fallback attempts queued.

## L4 → expansion of selected L3 nodes

### 1b-i → tokens/sec
- **1b-i-a. Formula** — limit/60.
- **1b-i-b. Example** — 60 RPM → 1 token/s.
- **1b-i-c. Burst** — bucket size.

### 5a-i → priority
- **5a-i-a. High priority** — dequeued first.
- **5a-i-b. Low priority** — may wait.
- **5a-i-c. Aging** — priority rises with wait.

### 6b-i → priority class
- **6b-i-a. Range** — 0-5.
- **6b-i-b. Default** — 0.
- **6b-i-c. Tags** — tag → priority (see E22).

### 9a-i → ordered list
- **9a-i-a. First** — primary.
- **9a-i-b. Second** — fallback.
- **9a-i-c. Nth** — last resort.

## L5 → expansion of selected L4 nodes

### 1b-i-a → formula
- **1b-i-a-1. RPM** — requests/min.
- **1b-i-a-2. TPM** — tokens/min.
- **1b-i-a-3. Per model** — model-specific.

### 5a-i-a → high priority
- **5a-i-a-1. Use** — critical traffic.
- **5a-i-a-2. Source** — tag match.
- **5a-i-a-3. Config** — per-tag priority.

### 9a-i-a → primary
- **9a-i-a-1. Preferred** — best model.
- **9a-i-a-2. Health** — checked.
- **9a-i-a-3. Fail** — move to fallback.

## L6 → expansion of selected L5 nodes

### 1b-i-a-1 → RPM
- **1b-i-a-1-1. Definition** — requests/min.
- **1b-i-a-1-2. Enforcement** — per second.
- **1b-i-a-1-3. Headers** — x-ratelimit-*.

### 5a-i-a-1 → critical traffic
- **5a-i-a-1-1. Examples** — production incidents.
- **5a-i-a-1-2. Tag** — "urgent".
- **5a-i-a-1-3. Priority** — 5.

## Confidence & open questions

- **Confidence: high** — industry patterns documented.
- **Open:** should 9router add a bounded queue with priority?
- **Open:** should queue TTL default to 60s?

## Sources

- LiteLLM queueing docs
- Anthropic/OpenAI rate limit docs
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §B.5