---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, semantic-routing, embeddings, semantic-router, vector-space
---

# Implementation Plan 3 — Semantic Routing (embedding-based routing strategy)

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `45-branch-semantic-and-embedding-routing.md`).
> This plan covers the "semantic routing" option: embedding-based routing as a zero-training strategy.

## 1. Goal

Add **semantic routing** as a routing strategy in 9Router: embed the query, find the nearest route/domain in vector space, and route accordingly. Zero-training (no preference data needed), complements the existing heuristic and learned strategies.

## 2. Background (from research)

- **semantic-router (aurelio-labs, 3.9k stars)**: routes defined as name + utterance examples; encoder (Cohere, OpenAI, HF, FastEmbed) embeds query; nearest route wins or None. Pure classification — no cost/capability awareness. MIT license.
- **vLLM Semantic Router (v0.3.0 "Themis")**: six-layer pipeline — Signals (deterministic + learned) → Projections (partition/score/mapping) → Decisions (boolean rules, priority, recipe) → Algorithms (selection: fixed/semantic/latency/feedback; coordination: cascade/panel/multi-round/workflow) → Plugins (route-specific behavior) → Model pools. Three-view model: Workload × Router policy × Model pool. Hard requirements (authorization, modality, context capacity, tool compatibility) make a route eligible BEFORE cost/latency comparison. Detection ≠ enforcement.
- **9Router current state**: `classifyTask()` uses keyword-based classification (code:generation, code:debugging, agent:multi_step, math, reasoning, research_report, creative_writing, summarization, translation, general_chat). No embedding-based classification.

## 3. Design

### 3.1 Semantic Classifier (aurelio-labs pattern)

- **Routes**: reuse 9Router's task taxonomy (10 task types) as routes.
- **Utterance examples**: seed each route with 10–20 example prompts (from usageDb's real prompts + curated examples).
- **Encoder**: local FastEmbed (ONNX, free, privacy-preserving) or OpenAI embeddings (higher quality, API cost). Configurable.
- **Classification**: embed query → cosine similarity to route centroids → nearest route wins or general_chat fallback.

### 3.2 vLLM SR-style Pipeline (optional phase 2)

- **Signals**: deterministic (keyword, metadata predicate, context-length band) + learned (embedding classifier for intent/domain/complexity).
- **Projections**: partition (coherent winner among overlapping matches), score (weighted combination), mapping (score → named bands).
- **Decisions**: boolean rules over signals; hard requirements (authorization, modality, context capacity, tool compatibility) BEFORE cost/latency comparison.
- **Algorithms**: selection (semantic fit, latency, feedback) or coordination (cascade, panel).
- **Plugins**: route-specific behavior (context compression, retrieval, caching).
- **Model pools**: logical names → physical endpoints.

### 3.3 Integration Points

- **`open-sse/services/smartRouter.js`** (recreate): add `semanticRouter` option to `classifyTask()` — embedding-based classification replaces/augments keyword classification.
- **`src/sse/handlers/chat.js`** — decision point 4 (task classification): use semantic classifier when enabled.
- **New**: `open-sse/services/semanticRouter.js` — encoder wrapper + route store + classifier.
- **DB**: `src/lib/db/repos/semanticRouteRepo.js` — route definitions + utterance examples.

## 4. Implementation Steps

1. Create `open-sse/services/semanticRouter.js` (encoder abstraction: FastEmbed/OpenAI).
2. Create route store (task taxonomy + utterance examples).
3. Implement cosine-similarity classifier with threshold + fallback.
4. Wire into `classifyTask()` (config-gated).
5. Phase 2: vLLM SR-style signals/projections/decisions pipeline.
6. Add route management UI (dashboard: add/remove routes, edit utterances).
7. Tests: classification accuracy, threshold behavior, fallback.

## 5. Files Touched

- `open-sse/services/semanticRouter.js` (new)
- `open-sse/services/smartRouter.js` (recreate/wire)
- `src/sse/handlers/chat.js`
- `src/lib/db/repos/semanticRouteRepo.js` (new)
- Dashboard route-management page (new)
- `tests/unit/semantic-router.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Encoder cost (OpenAI) | FastEmbed local default; OpenAI optional |
| Classification accuracy | Threshold tuning; utterance engineering; fallback to keyword |
| Route drift | Route management UI; usage-based utterance suggestions |
| Embedding staleness | Re-embed on route changes; versioned embeddings |

## 7. Success Criteria

- Semantic classification accuracy ≥ 90% on eval set (vs keyword baseline).
- Classification latency < 10ms (FastEmbed).
- Graceful fallback to keyword classification on encoder failure.
- Route management UI functional.

## 8. Related Plans
- Plan 1 (Learned Routing) — learned classifier alternative.
- Plan 7 (Eval Harness) — classification evaluation.
- Plan 5 (Gateway Interop) — vLLM SR-style pipeline integration.