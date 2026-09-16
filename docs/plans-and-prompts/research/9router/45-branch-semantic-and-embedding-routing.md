---
Date: 2026-09-15
Author: GitHub Copilot
Status: active
Tags: research, branch, semantic-routing, embedding-routing, semantic-router, prompt-routing, vector-space
---

# Branch 5 — Semantic & Embedding Routing (semantic-router / vLLM Semantic Router / prompt routing)

> Part of the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`).
> This branch covers every node whose topic descends from semantic/embedding-based routing research.

## Root

**Semantic & embedding routing** = using vector-space similarity (embeddings) to decide where a prompt should go. Instead of learned classifiers or market signals, the router embeds the query and finds the nearest route/domain in embedding space. This is the "zero-training" middle ground between heuristic and learned routing.

## Level 1 — Two Children

### A. Vector-Space Decision Layers (aurelio-labs semantic-router lineage)

**semantic-router (aurelio-labs, 3.9k stars)**:
- Superfast decision layer using semantic vector space.
- Routes defined as **name + utterance examples**.
- Encoder (Cohere, OpenAI, HF, FastEmbed) embeds the query.
- **Nearest route wins** or returns None.
- Pure classification — no cost or capability awareness.
- MIT license.

**Key concepts:**
- **Route objects** — name + utterance examples.
- **Encoders** — Cohere, OpenAI, HF, FastEmbed.
- **Vector space** — embedding similarity.
- **Decision layer** — nearest-route classification.

### B. Programmable Mixture-of-Models (vLLM Semantic Router lineage)

**vLLM Semantic Router (v0.3.0 "Themis")** — "Make your Mixture-of-Models programmable":
- Six-layer routing pipeline:
  1. **Signals** — extract facts (deterministic: keyword, metadata predicate, context-length band; learned: embeddings/classifiers for intent, domain, complexity, PII, jailbreak). Signals describe facts; they do not choose the backend.
  2. **Projections** — combine signals into reusable results (partition picks coherent winner among overlapping matches; score combines weighted inputs; mapping converts score to named routing bands).
  3. **Decisions** — boolean rules over signals + projections; priority + recipe strategy decide which matching route wins. Hard requirements (authorization, modality, context capacity, tool compatibility) make a route eligible/ineligible BEFORE an optimizer compares cost or latency.
  4. **Algorithms** — selection (fixed order, semantic fit, latency, feedback) or coordination (cascade, panel, multi-round, workflow).
  5. **Plugins** — route-specific behavior (parameter changes, context compression, retrieval, memory, replay, caching, response controls). Detection ≠ enforcement (PII signal reports; policy decides block/reroute/transform/observe).
  6. **Model pools** — providers bind logical names to physical endpoints; capability/runtime metadata only useful within policy boundaries.
- Three-view model: **Workload** (what is needed) × **Router policy** (what is allowed and preferred) × **Model pool** (what is currently available).
- Concrete backend model names bypass routing; virtual entrypoints resolve to recipes.
- Does not replace gateway/model servers — Envoy carries traffic, Router coordinates semantic work.

## Level 2 — Four Children

### AA. Embedding-Based Classification
- **Route objects** — name + utterance examples.
- **Encoders** — Cohere, OpenAI, HF, FastEmbed.
- **Nearest-neighbor** — cosine similarity to route centroids.
- **Thresholds** — minimum similarity to match a route.

### AB. Signal Extraction
- **Deterministic signals** — keyword, metadata predicate, context-length band.
- **Learned signals** — embeddings/classifiers for intent, domain, complexity, PII, jailbreak.
- **Signal fusion** — combining multiple signals.
- **Signal confidence** — per-signal confidence scores.

### BA. Decision Rules
- **Boolean rules** — AND/OR/NOT over signals.
- **Priority** — rule priority ordering.
- **Recipe strategy** — which matching route wins.
- **Hard requirements** — authorization, modality, context capacity, tool compatibility.

### BB. Routing Algorithms
- **Selection algorithms** — fixed order, semantic fit, latency, feedback.
- **Coordination algorithms** — cascade, panel, multi-round, workflow.
- **Algorithm selection** — per-route algorithm choice.
- **Algorithm evaluation** — per-algorithm metrics.

## Level 3 — Eight Children (selected nodes)

### AAA. Encoder Selection
- **Cohere embed** — commercial embedding API.
- **OpenAI embeddings** — text-embedding-3-small/large.
- **HF sentence-transformers** — all-MiniLM-L12-v2, etc.
- **FastEmbed** — ONNX-optimized local embeddings.

### AAB. Similarity Metrics
- **Cosine similarity** — standard for embeddings.
- **Dot product** — unnormalized similarity.
- **Euclidean distance** — alternative metric.
- **Angular distance** — normalized cosine.

### ABA. Route Design
- **Utterance examples** — 5–20 examples per route.
- **Route granularity** — coarse (chat/code) vs fine (code:debugging).
- **Route overlap** — overlapping utterance sets.
- **Route evolution** — adding examples over time.

### ABB. Signal Types
- **Intent signals** — what the user wants.
- **Domain signals** — what topic.
- **Complexity signals** — how hard.
- **Safety signals** — PII, jailbreak, toxicity.

### BAA. Rule Composition
- **AND rules** — all signals must match.
- **OR rules** — any signal matches.
- **NOT rules** — exclusion.
- **Nested rules** — rule trees.

### BAB. Hard Requirements
- **Authorization** — who can use which route.
- **Modality** — vision/audio/video requirements.
- **Context capacity** — context window fit.
- **Tool compatibility** — function-calling support.

### BBA. Selection Algorithms
- **Fixed order** — priority-ordered selection.
- **Semantic fit** — embedding similarity selection.
- **Latency** — lowest-latency selection.
- **Feedback** — learned from past outcomes.

### BBB. Coordination Algorithms
- **Cascade** — cheap first, escalate on failure.
- **Panel** — multiple models, judge picks.
- **Multi-round** — iterative refinement.
- **Workflow** — multi-step pipelines.

## Level 4–6 — Leaf Findings (verbatim from tree searches)

### AAA-A: Encoder tradeoffs
- **Commercial encoders** — highest quality, API cost.
- **Local encoders** — free, lower quality, privacy-preserving.
- **Encoder size** — small (MiniLM) vs large (BGE-large).
- **Encoder latency** — ms-level for small encoders.

### AAA-B: Embedding quality
- **Embedding dimension** — 384 (MiniLM) to 3072 (OpenAI large).
- **Domain-specific embeddings** — fine-tuned for code/math.
- **Multilingual embeddings** — cross-language routing.
- **Embedding staleness** — model updates change space.

### AAB-A: Similarity thresholds
- **Threshold tuning** — per-route minimum similarity.
- **No-match behavior** — return None / default route.
- **Multi-match** — top-k routes.
- **Threshold vs precision** — higher threshold = fewer false matches.

### AAB-B: Nearest-neighbor search
- **Brute force** — O(n) over routes.
- **ANN indexes** — HNSW, IVF for scale.
- **Centroid vs exemplar** — mean vector vs stored examples.
- **Dynamic routes** — add/remove routes at runtime.

### ABA-A: Route granularity
- **Coarse routes** — chat, code, math.
- **Fine routes** — code:debugging, code:generation.
- **Hierarchical routes** — coarse → fine.
- **Route count** — 5–30 typical.

### ABA-B: Utterance engineering
- **Example quality** — representative utterances.
- **Example diversity** — cover edge cases.
- **Example count** — 5–20 per route.
- **Example drift** — update as usage evolves.

### ABB-A: Intent classification
- **Intent taxonomy** — task-type taxonomies.
- **Intent confidence** — classifier confidence.
- **Intent fallback** — unknown intent → default.
- **Intent evolution** — new intents over time.

### ABB-B: Safety signals
- **PII detection** — embeddings/classifiers for PII.
- **Jailbreak detection** — adversarial prompt detection.
- **Toxicity detection** — harmful content.
- **Detection ≠ enforcement** — signal reports, policy decides.

### BAA-A: Rule evaluation
- **Rule ordering** — priority evaluation.
- **Rule short-circuit** — stop at first match.
- **Rule conflicts** — overlapping rules.
- **Rule debugging** — explainability of decisions.

### BAA-B: Rule-based vs learned
- **Rules are transparent** — explainable decisions.
- **Rules are brittle** — need maintenance.
- **Learned are adaptive** — but opaque.
- **Hybrid** — rules for hard requirements, learned for preferences.

### BAB-A: Authorization rules
- **Route-level auth** — per-route access control.
- **User groups** — role-based routing.
- **Budget limits** — per-user routing budgets.
- **Audit trails** — routing decision logs.

### BAB-B: Capability matching
- **Modality matching** — vision/audio/video.
- **Context matching** — context window fit.
- **Tool matching** — function-calling support.
- **Output matching** — structured output support.

### BBA-A: Feedback-based selection
- **Outcome tracking** — success/failure per route.
- **Bandit algorithms** — explore/exploit.
- **Contextual bandits** — feature-based exploration.
- **Feedback loops** — route updates from outcomes.

### BBA-B: Latency-based selection
- **Latency measurement** — per-deployment latency.
- **Latency prediction** — predicted latency per route.
- **Latency thresholds** — max acceptable latency.
- **Latency-cost tradeoff** — faster vs cheaper.

### BBB-A: Cascade coordination
- **Cascade order** — cheap → expensive.
- **Cascade judge** — when to escalate.
- **Cascade depth** — 2–3 levels typical.
- **Cascade collapse** — judge error > 0.2.

### BBB-B: Panel coordination
- **Panel size** — 2–5 models.
- **Judge selection** — which model judges.
- **Voting schemes** — majority, weighted.
- **Panel cost** — N× single-model cost.

## Key Insights for 9Router

1. **Semantic routing is a zero-training option** — 9Router could add embedding-based routing as a strategy without training data.
2. **vLLM SR's six-layer pipeline** — signals → projections → decisions → algorithms → plugins → model pools is a clean architecture for 9Router's smart router.
3. **Detection ≠ enforcement** — 9Router's bypass filter and capability detection align with this principle.
4. **Hard requirements before scoring** — vLLM SR's eligibility-first approach matches ClawRouter and 9Router's constraint-first philosophy.
5. **Hybrid rules + learned** — rules for hard requirements, learned for preferences.
6. **Semantic routing complements, not replaces** — it's a classification layer, not a cost optimizer.

## Related Docs
- `37-ai-model-routing-deep-research.md`
- `41-branch-learned-routing.md`
- `44-branch-gateways-and-serving.md`
- `39-binary-tree-expansion-master-plan.md`