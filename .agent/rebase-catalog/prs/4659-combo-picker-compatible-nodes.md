# PR #4659 — fix(combo): show compatible node models in picker without a connection

- **Author:** Wnghao
- **Merged:** 2026-10-08 (v0.5.99)
- **Files changed:** src/shared/components/ModelSelectModal.js (1 file)
- **Fixes:** #4177, #2113, #2119, #1988

## Problem
Custom (OpenAI/Anthropic Compatible) provider nodes whose models were added via "Add Model" never appeared in Combo model selector unless the node also had an API-key connection. Local/self-hosted endpoints (Ollama, internal relays) don't always need a stored key.

## Root cause
ModelSelectModal's providerIdsToShow only included (a) providers with a connection and (b) no-auth providers. Compatible node ids (under /api/models/custom as providerAlias) were never added.

## Fix
Add compatible node ids (providerAlias starting with openai-compatible- / anthropic-compatible-) to providerIdsToShow, restricted to LLM picker (no kindFilter).

## Verification
eslint clean, npm run build passes.

## Relevance to our branch
- **DIRECT CONFLICT**: Our branch step 15 (commit 27168608 "feat(routing): full model catalog in pickers, smart-router model subset, per-model fallbacks") ALSO modifies ModelSelectModal.js. Both touch providerIdsToShow logic. Must carefully merge: keep upstream's compatible-node inclusion AND our branch's full-catalog + smart-router-subset features.
