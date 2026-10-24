# Routing Exponential Expansion R14 — 9Router 16 Decision Points

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #9router #decision-points #request-lifecycle #smart-router #capacity-adapter #fusion

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"9Router 16 decision points (bypass→fusion judge)"** from `37-ai-model-routing-deep-research.md` §7.

## L1 — sub-phrases discovered in the root

1. Bypass filter (handleBypassRequest, SKIP_PATTERNS)
2. Capability detection (detectRequiredCapabilities)
3. Smart router (resolveSmartRouter, sticky session)
4. Task classification (classifyTask)
5. Model scoring (scoreModel)
6. Combo selection (getComboModels)
7. Strategy dispatch (fusion/fallback/round-robin)
8. Capacity adapter (augmentModelsWithCapacityAdapter, stripHistoryForContext)
9. Model fallback chains
10. Account selection (getProviderCredentials)
11. Wire format (detectFormat, translateRequest)
12. Executor (30+ specialized + DefaultExecutor)
13. Error categorization (categorizeError)
14. Token refresh (refreshWithRetry)
15. Account failover (markAccountUnavailable)
16. Fusion judge (handleFusionChat)

## L2 — expansion of each L1 node

### 1. Bypass filter
- **1a. Function** — handleBypassRequest().
- **1b. Config** — SKIP_PATTERNS in open-sse/config/runtimeConfig.js.
- **1c. Effect** — short-circuit routing entirely.
- **1d. Use** — direct passthrough.

### 2. Capability detection
- **2a. Function** — detectRequiredCapabilities(body).
- **2b. Signals** — vision/pdf/audioInput/videoInput.
- **2c. Source** — request body.
- **2d. Use** — capacity adapter.

### 3. Smart router
- **3a. Function** — resolveSmartRouter().
- **3b. Enable** — config.names (default ["modelRouter"]).
- **3c. Sticky session** — FNV-1a hash of first system+user 500 chars, TTL 5min.
- **3d. Missing file** — open-sse/services/smartRouter.js imported but MISSING from checkout.

### 4. Task classification
- **4a. Function** — classifyTask().
- **4b. Types** — code:generation | code:debugging | agent:multi_step | math | reasoning | research_report | creative_writing | summarization | translation | general_chat.

### 5. Model scoring
- **5a. Function** — scoreModel().
- **5b. TASK_WEIGHTS** — tools/reasoning/search/contextWindow.
- **5c. Capability fit** — weight×10.
- **5d. Context window** — min(ctx/20000, 20)×weight.
- **5e. Cost heuristic regex** — expensive: /opus|pro|max|ultra/; cheap: /mini|flash|lite|free|cheap/.
- **5f. costQualityTradeoff** — default 5, shifts ±(tradeoff−5)×5/×3.
- **5g. Concurrency penalty** — activeCount×2 via trackRequestStart/End.
- **5h. maxCandidates** — 3.

### 6. Combo selection
- **6a. Function** — getComboModels().
- **6b. Source** — named combos from DB.

### 7. Strategy dispatch
- **7a. Fusion** — handleFusionChat.
- **7b. Fallback** — handleComboChat.
- **7c. Round-robin** — handleComboChat.

### 8. Capacity adapter
- **8a. Function** — augmentModelsWithCapacityAdapter().
- **8b. Pools** — vision/pdf/audioInput/videoInput pools.
- **8c. Default fallback** — oc/mimo-v2.5-free.
- **8d. Trigger** — no original model satisfies a hard capability.
- **8e. stripHistoryForContext** — drops middle of conversation (80% budget, chars/4 per token).

### 9. Model fallback chains
- **9a. Source** — per-model fallbacks from settings.

### 10. Account selection
- **10a. Function** — getProviderCredentials().
- **10b. Fill-first** — priority ascending.
- **10c. Round-robin** — lastUsedAt + consecutiveUseCount, sticky limit 3.

### 11. Wire format
- **11a. detectFormat()** — OpenAI Responses/Antigravity/Gemini/OpenAI/Claude.
- **11b. translateRequest()** — pivots through OpenAI intermediate format.

### 12. Executor
- **12a. Count** — ~30 specialized executors + cached DefaultExecutor.
- **12b. Base-URL fallback loop** — DEFAULT_RETRY_CONFIG (429:0, 502:3×3s, 503:3×2s, 504:2×3s).
- **12c. FETCH_CONNECT_TIMEOUT_MS** — 60s.

### 13. Error categorization
- **13a. Function** — categorizeError().
- **13b. Types** — rate_limit|auth|billing|timeout|overloaded|content_filter|invalid_request|network|empty_response|unknown.

### 14. Token refresh
- **14a. Function** — refreshWithRetry().
- **14b. Trigger** — 401/403.
- **14c. Retries** — 3.
- **14d. REFRESH_LEAD_MS** — 5min.

### 15. Account failover
- **15a. Function** — markAccountUnavailable().
- **15b. GitHub 402** — monthly lock.
- **15c. resetsAtMs** — capped MAX_RATE_LIMIT_COOLDOWN_MS=30min.
- **15d. modelLock_${model}/modelLock___all** + backoffLevel.
- **15e. ERROR_RULES** — "no credentials"=2min, "request not allowed"=5s, "improperly formed request"=2min, rate-limit family=exponential backoff (base 2s, ×2, max 4min, 15 levels), 401/402/403/404=2min, 429=exponential, no match=TRANSIENT_COOLDOWN_MS=30s.

### 16. Fusion judge
- **16a. Function** — handleFusionChat().
- **16b. Parallel panel** — minPanel=2, stragglerGraceMs=8s, panelHardTimeoutMs=90s.
- **16c. judgeModel** — default panel[0].
- **16d. Output** — ONE final answer.

## L3 — expansion of selected L2 nodes (variable branching)

### 3c → sticky session
- **3c-i. FNV-1a hash** — of first system+user 500 chars.
- **3c-ii. TTL** — 5min.
- **3c-iii. Purpose** — conversation continuity.
- **3c-iv. Collision** — hash collision.

### 5b → TASK_WEIGHTS
- **5b-i. tools** — weight per task.
- **5b-ii. reasoning** — weight per task.
- **5b-iii. search** — weight per task.
- **5b-iv. contextWindow** — weight per task.

### 5e → cost heuristic regex
- **5e-i. Expensive** — /opus|pro|max|ultra/.
- **5e-ii. Cheap** — /mini|flash|lite|free|cheap/.
- **5e-iii. Weakness** — name-based, not price-based.
- **5e-iv. Better** — price table like LiteLLM's model_prices_and_context_window.json.

### 8e → stripHistoryForContext
- **8e-i. Middle drop** — conversation middle.
- **8e-ii. 80% budget** — keeps 20% headroom.
- **8e-iii. chars/4 per token** — token estimate.
- **8e-iv. Trigger** — context overflow.

### 10c → round-robin
- **10c-i. lastUsedAt** — last use timestamp.
- **10c-ii. consecutiveUseCount** — streak.
- **10c-iii. Sticky limit 3** — max consecutive.
- **10c-iv. Rotation** — after limit.

### 12b → DEFAULT_RETRY_CONFIG
- **12b-i. 429:0** — no retry.
- **12b-ii. 502:3×3s** — 3 retries, 3s apart.
- **12b-iii. 503:3×2s** — 3 retries, 2s apart.
- **12b-iv. 504:2×3s** — 2 retries, 3s apart.

### 15e → ERROR_RULES
- **15e-i. "no credentials"** — 2min.
- **15e-ii. "request not allowed"** — 5s.
- **15e-iii. "improperly formed request"** — 2min.
- **15e-iv. Rate-limit family** — exponential backoff (base 2s, ×2, max 4min, 15 levels).
- **15e-v. 401/402/403/404** — 2min.
- **15e-vi. 429** — exponential.
- **15e-vii. No match** — TRANSIENT_COOLDOWN_MS=30s.

### 16b → parallel panel
- **16b-i. minPanel=2** — at least 2 models.
- **16b-ii. stragglerGraceMs=8s** — wait for slow.
- **16b-iii. panelHardTimeoutMs=90s** — hard cap.
- **16b-iv. Parallel** — concurrent calls.

## L4 — expansion of selected L3 nodes

### 3c-i → FNV-1a hash
- **3c-i-a. Algorithm** — FNV-1a 32-bit.
- **3c-i-b. Input** — first 500 chars.
- **3c-i-c. Output** — session key.
- **3c-i-d. Stability** — same conversation.

### 5b-i → tools weight
- **5b-i-a. code:generation** — high.
- **5b-i-b. agent:multi_step** — high.
- **5b-i-c. general_chat** — low.
- **5b-i-d. Impact** — model choice.

### 8e-ii → 80% budget
- **8e-ii-a. Keep** — 20% headroom.
- **8e-ii-b. Drop** — middle 80%.
- **8e-ii-c. Head** — system + recent.
- **8e-ii-d. Tail** — latest turns.

### 12b-ii → 502 retry
- **12b-ii-a. 3 retries** — count.
- **12b-ii-b. 3s apart** — interval.
- **12b-ii-c. Total** — 9s.
- **12b-ii-d. After** — failover.

### 15e-iv → exponential backoff
- **15e-iv-a. Base 2s** — start.
- **15e-iv-b. ×2** — multiplier.
- **15e-iv-c. Max 4min** — cap.
- **15e-iv-d. 15 levels** — depth.

### 16b-ii → stragglerGraceMs
- **16b-ii-a. 8s** — grace period.
- **16b-ii-b. Purpose** — wait for slow panelist.
- **16b-ii-c. After** — proceed without.
- **16b-ii-d. Tradeoff** — latency vs completeness.

## L5 — expansion of selected L4 nodes

### 3c-i-a → FNV-1a 32-bit
- **3c-i-a-1. Offset basis** — 2166136261.
- **3c-i-a-2. Prime** — 16777619.
- **3c-i-a-3. XOR-fold** — multiply.
- **3c-i-a-4. Collision** — 1/2^32.

### 8e-ii-b → drop middle 80%
- **8e-ii-b-1. Why middle** — least important.
- **8e-ii-b-2. Head** — instructions.
- **8e-ii-b-3. Tail** — recent context.
- **8e-ii-b-4. Loss** — mid-conversation facts.

### 15e-iv-a → base 2s
- **15e-iv-a-1. First retry** — 2s.
- **15e-iv-a-2. Second** — 4s.
- **15e-iv-a-3. Third** — 8s.
- **15e-iv-a-4. Cap** — 4min.

### 16b-ii-a → 8s grace
- **16b-ii-a-1. Slow model** — up to 8s.
- **16b-ii-a-2. Faster** — proceed.
- **16b-ii-a-3. Hard cap** — 90s.
- **16b-ii-a-4. Judge** — needs panel.

## L6 — expansion of selected L5 nodes

### 3c-i-a-1 → offset basis
- **3c-i-a-1-i. Constant** — 2166136261.
- **3c-i-a-1-ii. Standard** — FNV spec.
- **3c-i-a-1-iii. Deterministic** — same input.
- **3c-i-a-1-iv. Language** — JS implementation.

### 8e-ii-b-1 → why middle
- **8e-ii-b-1-i. Recency** — recent matters.
- **8e-ii-b-1-ii. Instructions** — head matters.
- **8e-ii-b-1-iii. Middle** — filler.
- **8e-ii-b-1-iv. Summary** — could replace.

## Confidence & open questions

- **High confidence:** full codebase mapping (16 decision points verified against source).
- **CRITICAL CAVEAT:** `open-sse/services/smartRouter.js` is imported but MISSING from the current checkout — source recovered from `docs/plans-and-prompts/temp/chat-logs/d4294fc8-49e9-46b3-95f5-3b1625d0acb2.md` (~lines 2440–2620). Routing code would crash on import. Needs restoration.
- **Open questions:**
  - Does 9Router's usageDb contain enough outcome signal (per-request quality) to train a RouteLLM-style router?
  - Could the fusion panel's judge error be measured?

## Sources

- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §7
- `open-sse/config/runtimeConfig.js` (SKIP_PATTERNS)
- `docs/plans-and-prompts/temp/chat-logs/d4294fc8-49e9-46b3-95f5-3b1625d0acb2.md` (recovered smartRouter.js)