# Exponential Expansion E23 — Model-Group Limiting

**Date:** 2026-09-15
**Root phrase:** "Model-group limiting (qwen-* group auto-derive, shared RPM/TPM budget, group queue + pacing, group cooldown on 429, model_group observability, group vs combo distinction)" — from `2026-09-14-keyless-governance-research.md` §E
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. qwen-* group auto-derive
2. Shared RPM/TPM budget
3. Group queue + pacing
4. Group cooldown on 429
5. model_group observability
6. Group vs combo distinction
7. Group definition (prefix, wildcard)
8. Group config (limits, queue)
9. Group membership (model → group)
10. Group enforcement point

## L2 — expansion of each L1 node

### 1. Auto-derive
- **1a. Prefix** — qwen-.
- **1b. Wildcard** — qwen-*.
- **1c. Derive** — from model id.
- **1d. Config** — group map.

### 2. Shared budget
- **2a. RPM** — group-level.
- **2b. TPM** — group-level.
- **2c. Shared** — across models.
- **2d. Bucket** — token bucket.

### 3. Group queue + pacing
- **3a. Queue** — per group.
- **3b. Pacing** — interval.
- **3c. Priority** — per request.
- **3d. Bounded** — capacity.

### 4. Cooldown on 429
- **4a. Trigger** — upstream 429.
- **4b. Cooldown** — 30s.
- **4c. Block** — group requests.
- **4d. Retry** — after cooldown.

### 5. Observability
- **5a. model_group** — field.
- **5b. Usage** — per group.
- **5c. 429 count** — per group.
- **5d. Dashboard** — group view.

### 6. Group vs combo
- **6a. Group** — model family.
- **6b. Combo** — fallback chain.
- **6c. Distinct** — concepts.
- **6d. Interaction** — combo within group.

### 7. Group definition
- **7a. Prefix** — qwen-.
- **7b. Wildcard** — *.
- **7c. Explicit** — list.
- **7d. Regex** — pattern.

### 8. Group config
- **8a. Limits** — RPM/TPM.
- **8b. Queue** — size.
- **8c. Cooldown** — seconds.
- **8d. Pacing** — interval.

### 9. Membership
- **9a. Model id** — match.
- **9b. Group map** — lookup.
- **9c. Default** — no group.
- **9d. Multiple** — one group.

### 10. Enforcement point
- **10a. Pre-executor** — check.
- **10b. Post-429** — cooldown.
- **10c. Pre-queue** — enqueue.
- **10d. Log** — decision.

## L3 — expansion of selected L2 nodes

### 1c → derive
- **1c-i. Split** — model id.
- **1c-ii. Prefix** — before -.
- **1c-iii. Map** — to group.

### 2a → RPM
- **2a-i. Limit** — per group.
- **2a-ii. Window** — 60s.
- **2a-iii. Shared** — models.

### 3b → pacing
- **3b-i. Interval** — ms.
- **3b-ii. Rate** — items/s.
- **3b-iii. Smooth** — upstream.

### 4b → cooldown
- **4b-i. 30s** — default.
- **4b-ii. Config** — per group.
- **4b-iii. Timer** — expiry.

### 5a → model_group field
- **5a-i. Usage meta** — stored.
- **5a-ii. Log line** — printed.
- **5a-iii. Dashboard** — filter.

### 6b → combo
- **6b-i. Fallback** — chain.
- **6b-ii. Order** — list.
- **6b-iii. Group** — per model.

### 7a → prefix
- **7a-i. qwen-** — example.
- **7a-ii. claude-** — example.
- **7a-iii. gpt-** — example.

### 8a → limits
- **8a-i. rpm** — number.
- **8a-ii. tpm** — number.
- **8a-iii. Optional** — unset = unlimited.

### 9b → group map
- **9b-i. Object** — prefix → group.
- **9b-ii. JSON** — config.
- **9b-iii. Lookup** — O(1).

### 10a → pre-executor
- **10a-i. Check** — budget.
- **10a-ii. Allow** — proceed.
- **10a-iii. Deny** — 429/queue.

## L4 → expansion of selected L3 nodes

### 1c-i → split
- **1c-i-a. Dash** — separator.
- **1c-i-b. First segment** — family.
- **1c-i-c. Example** — qwen-max → qwen.

### 2a-i → limit
- **2a-i-a. Value** — integer.
- **2a-i-b. Per group** — config.
- **2a-i-c. Enforce** — bucket.

### 3b-i → interval
- **3b-i-a. Compute** — 60000/rpm.
- **3b-i-b. Min** — 1ms.
- **3b-i-c. Config** — override.

### 4b-i → 30s
- **4b-i-a. Default** — 30s.
- **4b-i-b. Config** — per group.
- **4b-i-c. Expiry** — Date.now() + 30000.

### 5a-i → usage meta
- **5a-i-a. Field** — model_group.
- **5a-i-b. Value** — group id.
- **5a-i-c. Null** — no group.

### 6b-i → fallback
- **6b-i-a. Combo list** — models.
- **6b-i-b. Try** — in order.
- **6b-i-c. Group** — per model.

### 7a-i → qwen-
- **7a-i-a. Models** — qwen-max, qwen-plus.
- **7a-i-b. Group** — qwen.
- **7a-i-c. Budget** — shared.

### 8a-i → rpm
- **8a-i-a. Number** — 60.
- **8a-i-b. Unset** — unlimited.
- **8a-i-c. Enforce** — bucket.

### 9b-i → object
- **9b-i-a. Key** — prefix.
- **9b-i-b. Value** — group.
- **9b-i-c. Order** — longest first.

### 10a-i → check
- **10a-i-a. Bucket** — tokens.
- **10a-i-b. Enough** — allow.
- **10a-i-c. Empty** — deny.

## L5 → expansion of selected L4 nodes

### 1c-i-a → dash
- **1c-i-a-1. indexOf** — "-".
- **1c-i-a-2. Slice** — before.
- **1c-i-a-3. Lowercase** — normalize.

### 2a-i-a → value
- **2a-i-a-1. Integer** — RPM.
- **2a-i-a-2. Config** — group.
- **2a-i-a-3. Default** — unlimited.

### 3b-i-a → compute
- **3b-i-a-1. 60000/rpm** — ms.
- **3b-i-a-2. Round** — ceil.
- **3b-i-a-3. Min 1** — floor.

### 4b-i-c → expiry
- **4b-i-c-1. Date.now()** — now.
- **4b-i-c-2. + 30000** — cooldown.
- **4b-i-c-3. Compare** — check.

### 5a-i-a → field
- **5a-i-a-1. Name** — model_group.
- **5a-i-a-2. Type** — string.
- **5a-i-a-3. Optional** — nullable.

### 6b-i-a → combo list
- **6b-i-a-1. Array** — models.
- **6b-i-a-2. Order** — priority.
- **6b-i-a-3. Group** — per model.

### 7a-i-a → models
- **7a-i-a-1. qwen-max** — model.
- **7a-i-a-2. qwen-plus** — model.
- **7a-i-a-3. qwen-turbo** — model.

### 8a-i-a → number
- **8a-i-a-1. 60** — RPM.
- **8a-i-a-2. 120** — RPM.
- **8a-i-a-3. Config** — per group.

### 9b-i-a → key
- **9b-i-a-1. "qwen-"** — prefix.
- **9b-i-a-2. "claude-"** — prefix.
- **9b-i-a-3. "gpt-"** — prefix.

### 10a-i-a → bucket
- **10a-i-a-1. Tokens** — remaining.
- **10a-i-a-2. Refill** — rate.
- **10a-i-a-3. Capacity** — burst.

## L6 → expansion of selected L5 nodes

### 1c-i-a-1 → indexOf
- **1c-i-a-1-1. "-"** — char.
- **1c-i-a-1-2. -1** — no dash.
- **1c-i-a-1-3. Whole** — model id.

### 2a-i-a-1 → integer
- **2a-i-a-1-1. Parse** — Number().
- **2a-i-a-1-2. NaN** — invalid.
- **2a-i-a-1-3. Default** — unlimited.

### 3b-i-a-1 → 60000/rpm
- **3b-i-a-1-1. 60s** — window.
- **3b-i-a-1-2. Divide** — rpm.
- **3b-i-a-1-3. Interval** — ms.

### 4b-i-c-1 → Date.now()
- **4b-i-c-1-1. ms** — epoch.
- **4b-i-c-1-2. Store** — cooldownUntil.
- **4b-i-c-1-3. Check** — now > until.

### 5a-i-a-1 → name
- **5a-i-a-1-1. model_group** — field.
- **5a-i-a-1-2. Consistent** — naming.
- **5a-i-a-1-3. Docs** — glossary.

### 6b-i-a-1 → array
- **6b-i-a-1-1. Order** — priority.
- **6b-i-a-1-2. Length** — 1-5.
- **6b-i-a-1-3. Group** — per model.

## Confidence & open questions

- **Confidence: high** — codebase (combo logic) + rate-limit theory.
- **Open:** auto-derive vs explicit group config?
- **Open:** cooldown duration default?

## Sources

- `docs/plans-and-prompts/research/2026-09-14-keyless-governance-research.md` §E
- `src/sse/handlers/chat.js` (combo expansion)
- `custom-server.rate-limiter.js`