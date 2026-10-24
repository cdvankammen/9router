# Routing Exponential Expansion R09 — Semantic Routers

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #semantic-router #vllm-semantic-router #embeddings #vector-space #signals #projections

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Semantic routers (aurelio-labs semantic-router, vLLM SR six layers)"** from `37-ai-model-routing-deep-research.md` §3.

## L1 — sub-phrases discovered in the root

1. aurelio-labs/semantic-router (3.9k★, MIT)
2. Route objects (name + utterance examples)
3. Encoders (Cohere, OpenAI, HF, FastEmbed)
4. Nearest-route-wins decision
5. vLLM Semantic Router (5.8k★, Apache-2.0, v0.3.0 "Themis")
6. Six-layer pipeline (signals, projections, decisions, algorithms, plugins, model pools)
7. Three-view model (Workload × Router policy × Model pool)
8. Virtual entrypoints → recipes

## L2 — expansion of each L1 node

### 1. aurelio-labs/semantic-router
- **1a. Purpose** — "superfast decision layer."
- **1b. License** — MIT.
- **1c. Stars** — 3.9k.
- **1d. Pure classification** — no cost/capability awareness.

### 2. Route objects
- **2a. Name** — route identifier.
- **2b. Utterance examples** — representative queries.
- **2c. Embedding** — examples embedded at init.
- **2d. Matching** — query embedding vs route embeddings.

### 3. Encoders
- **3a. Cohere** — commercial embeddings.
- **3b. OpenAI** — text-embedding-* models.
- **3c. HuggingFace** — local models.
- **3d. FastEmbed** — fast local embeddings.
- **3e. Swap** — encoder-agnostic design.

### 4. Nearest-route-wins
- **4a. Similarity** — cosine distance.
- **4b. Threshold** — below threshold → None.
- **4c. Winner** — highest similarity.
- **4d. Fallback** — None → default route.

### 5. vLLM Semantic Router
- **5a. Tagline** — "Make your Mixture-of-Models programmable."
- **5b. License** — Apache-2.0.
- **5c. Version** — v0.3.0 "Themis".
- **5d. Stars** — 5.8k.

### 6. Six-layer pipeline
- **6a. Signals** — extract facts.
- **6b. Projections** — combine signals.
- **6c. Decisions** — boolean rules.
- **6d. Algorithms** — selection/coordination.
- **6e. Plugins** — route-specific behavior.
- **6f. Model pools** — providers bind logical names.

### 7. Three-view model
- **7a. Workload** — what is needed.
- **7b. Router policy** — what is allowed/preferred.
- **7c. Model pool** — what is available.
- **7d. Interaction** — policy constrains pool.

### 8. Virtual entrypoints
- **8a. Logical names** — not concrete models.
- **8b. Recipes** — resolve to backends.
- **8c. Bypass** — concrete names bypass routing.
- **8d. Flexibility** — swap backends without client change.

## L3 — expansion of selected L2 nodes (variable branching)

### 2c → embedding at init
- **2c-i. Batch** — embed all examples.
- **2c-ii. Storage** — in-memory vectors.
- **2c-iii. Update** — re-embed on route change.
- **2c-iv. Cost** — one-time.

### 4b → threshold
- **4b-i. Default** — 0.3 (typical).
- **4b-ii. Tuning** — per-route.
- **4b-iii. Impact** — precision/recall.
- **4b-iv. None route** — unclassified.

### 6a → signals
- **6a-i. Deterministic** — keyword, metadata predicate, context-length band.
- **6a-ii. Learned** — embeddings/classifiers for intent, domain, complexity, PII, jailbreak.
- **6a-iii. Facts only** — signals describe facts; they do not choose the backend.
- **6a-iv. Reusable** — across decisions.

### 6b → projections
- **6b-i. Partition** — coherent winner among overlapping matches.
- **6b-ii. Score** — combine weighted inputs.
- **6b-iii. Mapping** — score → named routing bands.

### 6c → decisions
- **6c-i. Boolean rules** — over signals + projections.
- **6c-ii. Priority** — which matching route wins.
- **6c-iii. Recipe strategy** — fallback order.
- **6c-iv. Hard requirements** — authorization, modality, context capacity, tool compatibility gate eligibility BEFORE optimizer compares cost/latency.

### 6d → algorithms
- **6d-i. Selection** — fixed order, semantic fit, latency, feedback.
- **6d-ii. Coordination** — cascade, panel, multi-round, workflow.

### 6e → plugins
- **6e-i. Parameter changes** — per-route.
- **6e-ii. Context compression** — token reduction.
- **6e-iii. Retrieval** — RAG injection.
- **6e-iv. Memory** — conversation state.
- **6e-v. Replay** — retry semantics.
- **6e-vi. Caching** — response cache.
- **6e-vii. Response controls** — formatting.
- **6e-viii. Detection ≠ enforcement** — PII signal reports; policy decides block/reroute/transform/observe.

### 6f → model pools
- **6f-i. Logical names** — bind to physical endpoints.
- **6f-ii. Capability metadata** — only useful within policy boundaries.
- **6f-iii. Runtime metadata** — availability.

## L4 — expansion of selected L3 nodes

### 6a-i → deterministic signals
- **6a-i-a. Keyword** — regex/term match.
- **6a-i-b. Metadata predicate** — header/field checks.
- **6a-i-c. Context-length band** — token count ranges.
- **6a-i-d. Cost** — zero inference.

### 6a-ii → learned signals
- **6a-ii-a. Intent** — classifier.
- **6a-ii-b. Domain** — classifier.
- **6a-ii-c. Complexity** — classifier.
- **6a-ii-d. PII** — detector.
- **6a-ii-e. Jailbreak** — detector.

### 6c-iv → hard requirements
- **6c-iv-a. Authorization** — who may call.
- **6c-iv-b. Modality** — image/audio support.
- **6c-iv-c. Context capacity** — window fit.
- **6c-iv-d. Tool compatibility** — function calling.
- **6c-iv-e. Constraint-first** — eligibility BEFORE cost/latency optimization.

### 6e-viii → detection ≠ enforcement
- **6e-viii-a. Detect** — signal reports.
- **6e-viii-b. Decide** — policy.
- **6e-viii-c. Act** — block/reroute/transform/observe.
- **6e-viii-d. Audit** — log decisions.

## L5 — expansion of selected L4 nodes

### 6a-i-a → keyword signal
- **6a-i-a-1. Regex** — pattern match.
- **6a-i-a-2. Term list** — vocabulary.
- **6a-i-a-3. Case** — sensitivity.
- **6a-i-a-4. Negation** — exclusion.

### 6c-iv-c → context capacity
- **6c-iv-c-1. Token count** — estimate.
- **6c-iv-c-2. Window** — model limit.
- **6c-iv-c-3. Fit check** — tokens ≤ window.
- **6c-iv-c-4. Overflow** — ineligible.

### 6e-viii-b → policy
- **6e-viii-b-1. Block** — reject request.
- **6e-viii-b-2. Reroute** — different model.
- **6e-viii-b-3. Transform** — sanitize.
- **6e-viii-b-4. Observe** — allow + log.

## L6 — expansion of selected L5 nodes

### 6c-iv-c-1 → token count
- **6c-iv-c-1-i. Chars/4** — heuristic.
- **6c-iv-c-1-ii. Tokenizer** — exact.
- **6c-iv-c-1-iii. Cache** — per-message.
- **6c-iv-c-1-iv. Error** — ±10%.

## Confidence & open questions

- **High confidence:** vLLM SR (repo + docs intro + signal-driven routing pipeline), semantic-router (repo).
- **Open questions:**
  - How does vLLM SR's partition projection resolve overlapping matches?
  - What is the default threshold in semantic-router?
  - How are recipes versioned?

## Sources

- github.com/aurelio-labs/semantic-router (3.9k★, MIT)
- github.com/vllm-project/semantic-router (5.8k★, Apache-2.0, v0.3.0 "Themis")
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §3
- `docs/plans-and-prompts/research/9router/45-branch-semantic-and-embedding-routing.md`