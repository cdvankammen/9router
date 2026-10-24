# Issue #4544 / PR #4561 — fix(capabilities): GLM-5.2/5.3 context is 1M, not stale 200k pin

- **Author:** rabbi696 (from issue by vfh-tech)
- **Merged:** 2026-10-08 (v0.5.99)
- **Files changed:** open-sse/providers/capabilities.js

## Problem
*glm-5.3* and *glm-5.2* patterns pinned contextWindow to 200000. Those patterns sit ABOVE the *glm-5* catch-all, so every 5.2/5.3 id resolved to 200k. z.ai serves 1M.

## Impact (NOT cosmetic)
capacityAdapter.stripHistoryForContext() trims history at 80% of resolved window → 9router was discarding history at ~160k tokens from conversations the model can hold ~800k. ~640k tokens of context silently dropped per request.

## Fix
Drop the stale 200k pin. Only context changes; maxOutput stays at 128000.

## Verification
Verified against models.dev: z.ai/glm-5.3, z.ai/glm-5.3-highspeed, zai-coding-plan/glm-5.3-prime, opencode/glm-5.3, ollama-cloud/glm-5.3, nvidia/z-ai/glm-5.3 all list 1000000. 14 tests.

## Relevance to our branch
- **HIGH OVERLAP**: Our branch modified capabilities.js extensively (open-sse/providers/capabilities.js is in the 53 overlapping files). Must preserve this 1M context fix.
