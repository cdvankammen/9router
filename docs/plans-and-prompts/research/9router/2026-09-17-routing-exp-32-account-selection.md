# Routing Exponential Expansion R32 — Account Selection

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #account-selection #fill-first #round-robin #sticky #multi-account

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Account selection (fill-first, round-robin, sticky 3)"** from `42-branch-cascades-and-fallbacks.md` L2-BB.

## L1 — sub-phrases discovered in the root

1. Fill-first strategy (fill accounts before opening new)
2. Round-robin strategy (rotate accounts)
3. Sticky-3 strategy (pin account for 3 requests)
4. Account pool (multi-account credentials)
5. Account health (quota, rate limits, errors)

## L2 — expansion of each L1 node

### 1. Fill-first
- **1a. Definition** — use existing accounts.
- **1b. Goal** — minimize account count.
- **1c. Tradeoff** — uneven load.
- **1d. Use case** — quota-limited accounts.

### 2. Round-robin
- **2a. Definition** — rotate accounts.
- **2b. Goal** — even load.
- **2c. Tradeoff** — no locality.
- **2d. Use case** — equal accounts.

### 3. Sticky-3
- **3a. Definition** — pin 3 requests.
- **3b. Goal** — balance locality.
- **3c. Tradeoff** — complexity.
- **3d. Use case** — conversation locality.

### 4. Account pool
- **4a. Credentials** — API keys.
- **4b. OAuth tokens** — refresh.
- **4c. Quota tracking** — per-account.
- **4d. Priority** — account order.

### 5. Account health
- **5a. Quota** — remaining.
- **5b. Rate limit** — current usage.
- **5c. Errors** — recent failures.
- **5d. Cooldown** — temporary skip.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → definition
- **1a-i. First account** — until exhausted.
- **1a-ii. Next account** — after quota.
- **1a-iii. Order** — priority.
- **1a-iv. Reset** — quota refresh.

### 2a → definition
- **2a-i. Index** — increment.
- **2a-ii. Modulo** — pool size.
- **2a-iii. Skip** — unhealthy.
- **2a-iv. Reset** — wrap.

### 3a → definition
- **3a-i. Pin** — account per session.
- **3a-ii. Count** — 3 requests.
- **3a-iii. Release** — after 3.
- **3a-iv. Re-pin** — next account.

### 4a → credentials
- **4a-i. Storage** — encrypted.
- **4a-ii. Rotation** — periodic.
- **4a-iii. Validation** — test call.
- **4a-iv. 9Router** — OAuth service.

### 5a → quota
- **5a-i. Tracking** — usage logs.
- **5a-ii. Prediction** — remaining.
- **5a-iii. Threshold** — low quota.
- **5a-iv. Action** — switch account.

## L4 — expansion of selected L3 nodes

### 1a-i → first account
- **1a-i-a. Selection** — highest priority.
- **1a-i-b. Usage** — until limit.
- **1a-i-c. Limit** — quota or rate.
- **1a-i-d. Switch** — next.

### 2a-i → index
- **2a-i-a. Counter** — atomic.
- **2a-i-b. Increment** — per request.
- **2a-i-c. Concurrency** — safe.
- **2a-i-d. Persistence** — memory.

### 3a-i → pin
- **3a-i-a. Key** — session id.
- **3a-i-b. Value** — account id.
- **3a-i-c. TTL** — 3 requests.
- **3a-i-d. Storage** — map.

### 4a-i → storage
- **4a-i-a. DB** — encrypted.
- **4a-i-b. Env** — secrets.
- **4a-i-c. Vault** — external.
- **4a-i-d. 9Router** — SQLite.

### 5a-i → tracking
- **5a-i-a. Source** — usageDb.
- **5a-i-b. Granularity** — per-account.
- **5a-i-c. Update** — per request.
- **5a-i-d. Persistence** — disk.

## L5 — expansion of selected L4 nodes

### 1a-i-a → highest priority
- **1a-i-a-1. Order** — config.
- **1a-i-a-2. Manual** — user set.
- **1a-i-a-3. Auto** — health-based.
- **1a-i-a-4. Default** — insertion.

### 2a-i-a → atomic counter
- **2a-i-a-1. Implementation** — increment.
- **2a-i-a-2. Race** — safe.
- **2a-i-a-3. Overflow** — wrap.
- **2a-i-a-4. Reset** — pool change.

### 3a-i-a → session key
- **3a-i-a-1. Source** — request header.
- **3a-i-a-2. Fallback** — IP hash.
- **3a-i-a-3. Missing** — no stickiness.
- **3a-i-a-4. 9Router** — session id.

### 4a-i-a → DB
- **4a-i-a-1. Table** — accounts.
- **4a-i-a-2. Column** — encrypted key.
- **4a-i-a-3. Access** — service layer.
- **4a-i-a-4. Backup** — included.

### 5a-i-a → usageDb
- **5a-i-a-1. File** — usage.json.
- **5a-i-a-2. Format** — JSON.
- **5a-i-a-3. Update** — append.
- **5a-i-a-4. Read** — aggregate.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → config order
- **1a-i-a-1-i. File** — settings.
- **1a-i-a-1-ii. UI** — dashboard.
- **1a-i-a-1-iii. API** — endpoint.
- **1a-i-a-1-iv. Priority** — numeric.

### 2a-i-a-1 → increment
- **2a-i-a-1-i. JS** — ++.
- **2a-i-a-1-ii. Atomic** — single-thread.
- **2a-i-a-1-iii. Async** — event loop.
- **2a-i-a-1-iv. Safe** — no locks.

### 3a-i-a-1 → header
- **3a-i-a-1-i. Name** — x-session-id.
- **3a-i-a-1-ii. Client** — sets.
- **3a-i-a-1-iii. Sanitize** — length.
- **3a-i-a-1-iv. Hash** — privacy.

### 4a-i-a-1 → accounts table
- **4a-i-a-1-i. Schema** — id, provider.
- **4a-i-a-1-ii. Secret** — encrypted.
- **4a-i-a-1-iii. Status** — active.
- **4a-i-a-1-iv. Quota** — counters.

### 5a-i-a-1 → usage.json
- **5a-i-a-1-i. Location** — ~/.9router.
- **5a-i-a-1-ii. Size** — bounded.
- **5a-i-a-1-iii. Rotation** — daily.
- **5a-i-a-1-iv. Privacy** — local.

## Confidence & open questions

- **High confidence:** 9Router implements fill-first/round-robin/sticky-3 account selection (branch 42 + code).
- **Open questions:**
  - What is the optimal sticky count (3 vs 5 vs 10)?
  - Should account selection be health-aware (quota prediction)?
  - How does account selection interact with model fallback?

## Sources

- `docs/plans-and-prompts/research/9router/42-branch-cascades-and-fallbacks.md` L2-BB
- `docs/plans-and-prompts/research/9router/01-open-sse-engine.md` (account-selection loop)
- `src/sse/handlers/chat.js` (combo expansion, account-selection loop)