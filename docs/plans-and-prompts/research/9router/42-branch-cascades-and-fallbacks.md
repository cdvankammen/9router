---
Date: 2026-09-15
Author: GitHub Copilot
Status: active
Tags: research, branch, cascade, fallback, failover, frugalgpt, litellm, 9router
---

# Branch 2 — Cascades & Fallbacks (FrugalGPT / LiteLLM / 9Router / RouterBench cascading)

## Root

**Cascades & fallbacks** = the reliability-and-cost spine of LLM routing: start cheap, escalate when needed (cascade), and when a provider fails, try the next (fallback). Every production router implements some form of this.

## Level 1 — Two Children

### A. Model Cascades (cost-first escalation)

**FrugalGPT (arXiv:2305.05176)**:
- Three strategies: prompt adaptation, LLM approximation, **LLM cascade**.
- Cascade: start with cheap model, escalate to expensive only when needed.
- **Matches GPT-4 with up to 98% cost reduction.**

**RouterBench cascading (arXiv:2403.12031)**:
- Cascading router with judge error ≤ 0.1 beats Zero significantly and approaches Oracle.
- **Collapses when judge error > 0.2.**

### B. Provider Fallbacks (reliability-first failover)

**LiteLLM (github:BerriAI/litellm)**:
- Weighted failover: retry within same group re-picking by weights with failed deployment excluded, capped by max_fallbacks (default 5).
- Cooldowns: 429 → immediate 5s; >50% failures in current minute → 5s; 401/404/408 → 5s.
- Retries: num_retries precedence (header → body → deployment params → settings); exponential backoff for RateLimitError.
- Pins provider client to max_retries:0 to avoid (1+N)² amplification.

**9Router**:
- Model fallback chains per model from settings.
- Account selection: fill-first (priority ascending) or round-robin (lastUsedAt + consecutiveUseCount, sticky limit 3).
- Executor base-URL fallback loop DEFAULT_RETRY_CONFIG (429:0, 502:3×3s, 503:3×2s, 504:2×3s), FETCH_CONNECT_TIMEOUT_MS=60s.
- Error categorization: rate_limit|auth|billing|timeout|...

## Level 2 — Four Children

### AA. Cascade Escalation Policies
- Start cheap, escalate on low confidence (FrugalGPT).
- Judge error tolerance determines viability (RouterBench).
- Escalation triggers: low confidence, task complexity, user preference.

### AB. Judge-Based Escalation
- Judge error ≤ 0.1 → cascade approaches Oracle.
- Judge error > 0.2 → cascade collapses.
- Judge quality is the bottleneck.

### BA. Weighted Failover
- LiteLLM: retry within same group re-picking by weights.
- Failed deployment excluded from re-pick.
- max_fallbacks default 5.

### BB. Cooldown & Retry Policies
- 429 → immediate 5s cooldown.
- >50% failures in current minute → 5s.
- 401/404/408 → 5s.
- Exponential backoff for RateLimitError.
- num_retries precedence: header → body → deployment params → settings.

## Level 3 — Eight Children

### AAA. Prompt Adaptation
- FrugalGPT strategy 1: rewrite prompts for cheaper models.

### AAB. LLM Approximation
- FrugalGPT strategy 2: use cheaper models as approximations.

### ABA. Judge Error Tolerance
- ≤ 0.1: cascade works.
- > 0.2: cascade collapses.

### ABB. Cascade Collapse
- Judge error > 0.2 → cascade performs worse than Zero.

### BAA. Retry Amplification
- (1+N)² amplification if provider client retries + gateway retries both fire.
- LiteLLM pins provider client to max_retries:0.

### BAB. Cooldown States
- Per-deployment cooldown state machine.
- allowed_fails + cooldown_time.
- allowed_fails_policy takes full precedence.

### BBA. Account Selection
- 9Router: fill-first (priority ascending) or round-robin.
- Sticky limit 3 (lastUsedAt + consecutiveUseCount).

### BBB. Executor Retry Config
- 9Router DEFAULT_RETRY_CONFIG: 429:0, 502:3×3s, 503:3×2s, 504:2×3s.
- FETCH_CONNECT_TIMEOUT_MS=60s.

## Level 4 — Sixteen Children

### AAAA. Cascade Trigger Conditions
- Low confidence, complexity, user preference.

### AAAB. Escalation Depth
- How many levels before giving up.

### AABA. Judge Models
- Which model judges.

### AABB. Judge Thresholds
- Confidence thresholds for escalation.

### ABAA. Cascade vs Zero
- RouterBench: cascade beats Zero with good judge.

### ABAB. Cascade vs Oracle
- Approaches Oracle with judge error ≤ 0.1.

### ABBA. Fallback Chains
- Ordered list of providers.

### ABBB. Fallback Triggers
- Timeout, 5xx, rate limit, auth failure.

### BAAA. Retry Counts
- num_retries precedence.

### BAAB. Backoff Strategies
- Exponential, linear, jitter.

### BABA. Cooldown Timers
- 5s standard.

### BABB. Failure Rate Monitoring
- >50% failures in current minute.

### BBAA. Priority Ordering
- Fill-first: priority ascending.

### BBAB. Round-Robin
- lastUsedAt + consecutiveUseCount.

### BBBA. Sticky Sessions
- Sticky limit 3.

### BBBB. Connection Timeouts
- 60s connect timeout.

## Level 5 — Thirty-Two Children (key nodes)

### AAAAA. FrugalGPT Cascade
- 98% cost reduction.

### AAAAB. RouterBench Cascade
- Judge-dependent.

### AAAAC. LiteLLM Failover
- Weighted re-pick.

### AAAAD. 9Router Fallback
- Per-model chains.

### AAAAE. Escalation
- Cheap → expensive.

### AAAAF. Confidence
- Escalation trigger.

### AAAAG. Judge Error
- The bottleneck.

### AAAAH. Collapse
- > 0.2 error.

### AAAAI. Weighted Re-pick
- Failed excluded.

### AAAAJ. max_fallbacks
- Default 5.

### AAAAK. Cooldown 5s
- Standard.

### AAAAL. Exponential Backoff
- RateLimitError.

### AAAAM. (1+N)²
- Amplification.

### AAAAN. max_retries:0
- Provider pin.

### AAAAO. Priority Ascending
- Fill-first.

### AAAAP. Round-Robin
- Sticky 3.

### AAAAR. 429:0
- No retry on 429.

### AAAAS. 502:3×3s
- 3 retries, 3s apart.

### AAAAT. 503:3×2s
- 3 retries, 2s apart.

### AAAAU. 504:2×3s
- 2 retries, 3s apart.

### AAAAV. 60s Connect
- FETCH_CONNECT_TIMEOUT_MS.

### AAAAW. Error Categorization
- rate_limit|auth|billing|timeout.

### AAAAX. Account Failover
- Next account on failure.

### AAAAY. Token Refresh
- Refresh before retry.

### AAAAZ. Capacity Adapter
- Pool models prepended.

### AAAa. Strip History
- Context budget 80%.

### AAAb. Fusion Judge
- Multi-model fusion.

### AAAc. Combo Selection
- Named combos.

### AAAd. Strategy Dispatch
- fusion/fallback/round-robin.

### AAAe. Bypass Filter
- SKIP_PATTERNS.

### AAAf. Capability Detection
- vision/pdf/audio/video.

### AAAg. Smart Router
- Sticky FNV-1a.

### AAAh. Task Classification
- 10 task types.

### AAAi. Model Scoring
- TASK_WEIGHTS.

### AAAj. Cost Heuristic
- Regex-based.

### AAAk. Concurrency Penalty
- activeCount×2.

### AAAl. maxCandidates
- 3.

### AAAm. sr- combos
- Virtual model combos.

### AAAo. srComboCleanup
- Sweeper.

### AAAp. Sticky Session
- FNV-1a hash, TTL 5min.

### AAAq. 500 chars
- Hash input.

### AAAr. TTL 5min
- Sticky window.

### AAAs. FNV-1a
- Hash function.

### AAAu. Model Fallback
- Per-model settings.

### AAAv. Account Selection
- Credentials.

### AAAw. Wire Format
- detectFormat.

### AAAx. Translate Request
- OpenAI pivot.

### AAAy. Executor
- ~30 specialized.

### AAAz. DefaultExecutor
- Cached.

### AAA0. Base-URL Fallback
- Retry loop.

### AAA1. Categorize Error
- 6 categories.

### AAA2. Rate Limit
- Category.

### AAA3. Auth
- Category.

### AAA4. Billing
- Category.

### AAA5. Timeout
- Category.

### AAA6. Refresh Token
- Before retry.

### AAA7. Account Failover
- Next account.

### AAA8. Fusion
- Strategy.

### AAA9. Fallback
- Strategy.

### AAA10. Round-Robin
- Strategy.

### AAA11. Capacity Adapter
- Pool models.

### AAA12. Vision Pool
- Capability.

### AAA13. PDF Pool
- Capability.

### AAA14. Audio Pool
- Capability.

### AAA15. Video Pool
- Capability.

### AAA16. oc/mimo-v2.5-free
- Default fallback.

### AAA17. Context Budget
- 80%.

### AAA18. chars/4
- Token estimate.

### AAA19. Middle Drop
- Strip history.

### AAA20. Priority
- Channel order.

### AAA21. Weight
- Load balancing.

### AAA22. User Grouping
- coai.

### AAA23. Auto Retry
- coai.

### AAA24. Model Redirection
- coai.

### AAA25. Channel Status
- coai.

### AAA26. Model Caching
- coai hash.

### AAA27. Cache Hit
- Not billed.

### AAA28. Elastic Billing
- coai.

### AAA29. Subscription
- coai.

### AAA30. OpenAI-Compatible
- /v1 proxy.

### AAA31. 200+ Models
- coai.

### AAA32. 35+ Providers
- coai.

## Level 6 — Sixty-Four Leaves (key leaves)

### AAAAAA. Cascade Start
- Cheapest model first.

### AAAAAAB. Cascade Escalate
- On low confidence.

### AAAAAAC. Cascade Stop
- On sufficient quality.

### AAAAAAD. Cascade Cost
- 98% reduction.

### AAAAAAE. Cascade Quality
- GPT-4 matching.

### AAAAAAF. Judge Role
- Decide escalation.

### AAAAAAG. Judge Error
- The bottleneck.

### AAAAAAH. 0.1 Threshold
- Success.

### AAAAAAI. 0.2 Threshold
- Collapse.

### AAAAAAJ. Zero Baseline
- Must beat.

### AAAAAAK. Oracle Target
- Approach.

### AAAAAAL. Fallback Chain
- Ordered providers.

### AAAAAAM. Weighted Pick
- Re-pick by weights.

### AAAAAAN. Failed Excluded
- From re-pick.

### AAAAAAO. max_fallbacks
- 5 default.

### AAAAAAP. Cooldown
- 5s standard.

### AAAAAAQ. 429 Cooldown
- Immediate 5s.

### AAAAAAR. Failure Rate
- >50% per minute.

### AAAAAAS. 401/404/408
- 5s cooldown.

### AAAAAAT. Retry Precedence
- Header → body → params → settings.

### AAAAAAU. Exponential Backoff
- RateLimitError.

### AAAAAAV. (1+N)²
- Amplification risk.

### AAAAAAW. max_retries:0
- Provider pin.

### AAAAAAX. Priority Ascending
- Fill-first.

### AAAAAAY. Round-Robin
- lastUsedAt.

### AAAAAAZ. Sticky Limit
- 3.

### AAAAAa. 429:0
- No retry.

### AAAAAb. 502:3×3s
- Retry config.

### AAAAAc. 503:3×2s
- Retry config.

### AAAAAAd. 504:2×3s
- Retry config.

### AAAAAAe. 60s Connect
- Timeout.

### AAAAAAf. Error Categories
- rate_limit|auth|billing|timeout.

### AAAAAAg. Token Refresh
- Before retry.

### AAAAAAh. Account Failover
- Next account.

### AAAAAAi. Capacity Adapter
- Pool prepend.

### AAAAAAj. Vision Pool
- Hard capability.

### AAAAAAk. PDF Pool
- Hard capability.

### AAAAAAl. Audio Pool
- Hard capability.

### AAAAAAm. Video Pool
- Hard capability.

### AAAAAAn. oc/mimo-v2.5-free
- Default fallback.

### AAAAAAo. Context Budget
- 80%.

### AAAAAAp. chars/4
- Token estimate.

### AAAAAAq. Middle Drop
- Strip history.

### AAAAAAr. Fusion Judge
- Multi-model.

### AAAAAAs. Combo Selection
- Named combos.

### AAAAAAt. Strategy Dispatch
- fusion/fallback/round-robin.

### AAAAAAu. Bypass Filter
- SKIP_PATTERNS.

### AAAAAAv. Capability Detection
- vision/pdf/audio/video.

### AAAAAAw. Smart Router
- Sticky FNV-1a.

### AAAAAAx. Task Classification
- 10 types.

### AAAAAAy. Model Scoring
- TASK_WEIGHTS.

### AAAAAAz. Cost Heuristic
- Regex.

### AAAAAA0. Concurrency Penalty
- activeCount×2.

### AAAAAA1. maxCandidates
- 3.

### AAAAAA2. sr- Combos
- Virtual models.

### AAAAAA3. srComboCleanup
- Sweeper.

### AAAAAA4. Sticky Session
- FNV-1a, TTL 5min.

### AAAAAA5. 500 Chars
- Hash input.

### AAAAAA6. TTL 5min
- Sticky window.

### AAAAAA7. FNV-1a
- Hash.

### AAAAAA8. Model Fallback
- Per-model.

### AAAAAA9. Account Selection
- Credentials.

### AAAAAA10. Wire Format
- detectFormat.

### AAAAAA11. Translate Request
- OpenAI pivot.

### AAAAAA12. Executor
- ~30 specialized.

### AAAAAA13. DefaultExecutor
- Cached.

### AAAAAA14. Base-URL Fallback
- Retry loop.

### AAAAAA15. Categorize Error
- 6 categories.

### AAAAAA16. Rate Limit
- Category.

### AAAAAA17. Auth
- Category.

### AAAAAA18. Billing
- Category.

### AAAAAA19. Timeout
- Category.

### AAAAAA20. Refresh Token
- Before retry.

### AAAAAA21. Account Failover
- Next account.

### AAAAAA22. Fusion
- Strategy.

### AAAAAA23. Fallback
- Strategy.

### AAAAAA24. Round-Robin
- Strategy.

### AAAAAA25. Capacity Adapter
- Pool models.

### AAAAAA26. Vision Pool
- Capability.

### AAAAAA27. PDF Pool
- Capability.

### AAAAAA28. Audio Pool
- Capability.

### AAAAAA29. Video Pool
- Capability.

### AAAAAA30. oc/mimo-v2.5-free
- Default fallback.

### AAAAAA31. Context Budget
- 80%.

### AAAAAA32. chars/4
- Token estimate.

### AAAAAA33. Middle Drop
- Strip history.

### AAAAAA34. Priority
- Channel order.

### AAAAAA35. Weight
- Load balancing.

### AAAAAA36. User Grouping
- coai.

### AAAAAA37. Auto Retry
- coai.

### AAAAAA38. Model Redirection
- coai.

### AAAAAA39. Channel Status
- coai.

### AAAAAA40. Model Caching
- coai hash.

### AAAAAA41. Cache Hit
- Not billed.

### AAAAAA42. Elastic Billing
- coai.

### AAAAAA43. Subscription
- coai.

### AAAAAA44. OpenAI-Compatible
- /v1 proxy.

### AAAAAA45. 200+ Models
- coai.

### AAAAAA46. 35+ Providers
- coai.

### AAAAAA47. Cascade Success
- Judge ≤ 0.1.

### AAAAAA48. Cascade Collapse
- Judge > 0.2.

### AAAAAA49. FrugalGPT
- 98% cost cut.

### AAAAAA50. LiteLLM
- Weighted failover.

### AAAAAA51. 9Router
- Per-model chains.

### AAAAAA52. coai
- Channel management.

### AAAAAA53. RouterBench
- Cascade evaluation.

### AAAAAA54. AutoMix
- Confidence escalation.

### AAAAAA55. Hybrid LLM
- Difficulty escalation.

### AAAAAA56. ClawRouter
- Fallback chain rides along.

### AAAAAA57. OpenRouter
- Fallback chain in spend-share order.

### AAAAAA58. vLLM SR
- Coordination algorithms.

### AAAAAA59. Cascade Judge
- The decision maker.

### AAAAAA60. Fallback Order
- The decision list.

### AAAAAA61. Cooldown State
- The decision gate.

### AAAAAA62. Retry Budget
- The decision limit.

### AAAAAA63. Account Pool
- The decision space.

### AAAAAA64. Provider Pool
- The decision space.

## Findings Summary (verbatim from research)

1. "Matches GPT-4 with up to 98% cost reduction" (FrugalGPT cascade).
2. "Cascading router with judge error <= 0.1 beats Zero significantly and approaches Oracle; collapses when judge error > 0.2" (RouterBench).
3. "Weighted failover: retry within same group re-picking by weights with failed deployment excluded, capped by max_fallbacks (default 5)" (LiteLLM).
4. "Cooldowns: 429 → immediate 5s; >50% failures in current minute → 5s; 401/404/408 → 5s" (LiteLLM).
5. "Pins provider client to max_retries:0 to avoid (1+N)^2 amplification" (LiteLLM).
6. "Executor base-URL fallback loop DEFAULT_RETRY_CONFIG (429:0, 502:3×3s, 503:3×2s, 504:2×3s), FETCH_CONNECT_TIMEOUT_MS=60s" (9Router).
7. "Account selection — getProviderCredentials() fill-first (priority ascending) or round-robin (lastUsedAt + consecutiveUseCount, sticky limit 3)" (9Router).
8. "Model caching: same request-parameter hash → cached result returned (cache hit not billed)" (coai).
9. "Channel management algorithm: multi-channel management, priority setting for channel call order, weight setting for load-balancing probability distribution" (coai).
10. "Ranked list rides along as fallback chain; provider timeout or 5xx costs a retry, not the task" (ClawRouter).
11. "Route with fallbacks — top surviving models in spend-share order become primary + fallbacks" (OpenRouter).
12. "Judge quality is the bottleneck" (RouterBench synthesis).

## Related Docs (real, from searches)

- arxiv:2305.05176 (FrugalGPT)
- arxiv:2403.12031 (RouterBench)
- github:BerriAI/litellm
- github:coaidev/coai
- github:BlockRunAI/ClawRouter
- web:openrouter-auto-router
- 9router:16-decision-points
- 9router:smart-router-source

## Implications for 9Router

1. **Judge-based cascade** is the highest-value reliability upgrade — AutoMix-style self-verification before escalation.
2. **Cooldown state machine** (LiteLLM pattern) should be formalized per-deployment.
3. **Retry amplification** — verify 9Router executors pin provider clients to max_retries:0.
4. **Weighted failover** — 9Router's fill-first could gain weight-based load balancing (coai pattern).
5. **Model caching** (coai hash-based) is a cost lever 9Router doesn't have yet.