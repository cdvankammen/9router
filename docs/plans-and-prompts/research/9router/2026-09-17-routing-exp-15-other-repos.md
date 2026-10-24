# Routing Exponential Expansion R15 — Other Repos Surveyed

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #switchyard #freellmapi #gomodel #wayfinderrouter #llm-router #relayfreellm #deeix-chat #wesight

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Other repos surveyed (Switchyard, freellmapi, GoModel, WayfinderRouter, llm-router, RelayFreeLLM, DEEIX-Chat, wesight)"** from `37-ai-model-routing-deep-research.md` §8.

## L1 — sub-phrases discovered in the root

1. GitHub search (2,727 results)
2. NVIDIA-NeMo/Switchyard (3,068★, Python)
3. tashfeenahmed/freellmapi (26,205★, TypeScript)
4. ENTERPILOT/GoModel (1,155★, Go)
5. asdecided/WayfinderRouter (414★, Rust)
6. kcolemangt/llm-router (383★, Go)
7. msmarkgu/RelayFreeLLM (181★, Python)
8. NVIDIA-AI-Blueprints/llm-router (348★, Jupyter)
9. DEEIX-AI/DEEIX-Chat (1,462★, Go)
10. freestylefly/wesight (923★, TypeScript)

## L2 — expansion of each L1 node

### 1. GitHub search
- **1a. Query** — LLM routing.
- **1b. Results** — 2,727.
- **1c. Review** — top 12 repos.
- **1d. Selection** — diverse languages.

### 2. Switchyard
- **2a. Purpose** — native OpenAI/Anthropic compat.
- **2b. Feature** — benchmarking.
- **2c. Language** — Python.
- **2d. Stars** — 3,068.

### 3. freellmapi
- **3a. Purpose** — 34 free providers/635 endpoints.
- **3b. Feature** — smart routing + failover.
- **3c. Language** — TypeScript.
- **3d. Stars** — 26,205.

### 4. GoModel
- **4a. Purpose** — LiteLLM alternative.
- **4b. Features** — sticky sessions, failover, observability.
- **4c. Language** — Go.
- **4d. Stars** — 1,155.

### 5. WayfinderRouter
- **5a. Purpose** — deterministic local/hosted routing.
- **5b. Language** — Rust.
- **5c. Stars** — 414.

### 6. kcolemangt/llm-router
- **6a. Purpose** — Cursor base-URL router.
- **6b. Language** — Go.
- **6c. Stars** — 383.

### 7. RelayFreeLLM
- **7a. Features** — quota tracking, session affinity.
- **7b. Language** — Python.
- **7c. Stars** — 181.

### 8. NVIDIA llm-router
- **8a. Format** — notebook-based router.
- **8b. Language** — Jupyter.
- **8c. Stars** — 348.

### 9. DEEIX-Chat
- **9a. Purpose** — chat frontend with routing backend.
- **9b. Language** — Go.
- **9c. Stars** — 1,462.

### 10. wesight
- **10a. Purpose** — chat frontend with routing backend.
- **10b. Language** — TypeScript.
- **10c. Stars** — 923.

## L3 — expansion of selected L2 nodes (variable branching)

### 2a → OpenAI/Anthropic compat
- **2a-i. OpenAI format** — /v1/chat/completions.
- **2a-ii. Anthropic format** — /v1/messages.
- **2a-iii. Translation** — between formats.
- **2a-iv. Use** — drop-in replacement.

### 3a → free providers
- **3a-i. 34 providers** — free tiers.
- **3a-ii. 635 endpoints** — model endpoints.
- **3a-iii. Aggregation** — one API.
- **3a-iv. Reliability** — failover.

### 4b → sticky sessions
- **4b-i. Session key** — conversation.
- **4b-ii. Pin** — same model.
- **4b-iii. TTL** — expiry.
- **4b-iv. Fallback** — on failure.

### 5a → deterministic routing
- **5a-i. Rules** — explicit.
- **5a-ii. No learning** — no ML.
- **5a-iii. Predictable** — same input → same route.
- **5a-iv. Local** — no cloud.

### 6a → Cursor base-URL router
- **6a-i. Cursor** — IDE.
- **6a-ii. Base URL** — gateway endpoint.
- **6a-iii. Routing** — per-request.
- **6a-iv. Config** — simple.

### 7a → quota tracking
- **7a-i. Per-user** — quota.
- **7a-ii. Per-model** — quota.
- **7a-iii. Enforcement** — limit.
- **7a-iv. Reset** — period.

## L4 — expansion of selected L3 nodes

### 2a-i → OpenAI format
- **2a-i-a. Endpoint** — /v1/chat/completions.
- **2a-i-b. Schema** — messages, model, temperature.
- **2a-i-c. Streaming** — SSE.
- **2a-i-d. Compat** — universal.

### 3a-i → 34 providers
- **3a-i-a. Free tiers** — limited.
- **3a-i-b. Rate limits** — per provider.
- **3a-i-c. Reliability** — variable.
- **3a-i-d. Aggregation** — unified.

### 4b-i → session key
- **4b-i-a. Source** — conversation ID.
- **4b-i-b. Hash** — stable.
- **4b-i-c. Storage** — memory.
- **4b-i-d. Expiry** — TTL.

### 5a-i → rules
- **5a-i-a. Model match** — name.
- **5a-i-b. Header match** — metadata.
- **5a-i-c. Priority** — order.
- **5a-i-d. Default** — fallback.

## L5 — expansion of selected L4 nodes

### 2a-i-a → endpoint
- **2a-i-a-1. POST** — method.
- **2a-i-a-2. JSON** — body.
- **2a-i-a-3. Auth** — bearer.
- **2a-i-a-4. Response** — completion.

### 3a-i-a → free tiers
- **3a-i-a-1. Limits** — requests/day.
- **3a-i-a-2. Models** — restricted.
- **3a-i-a-3. Quality** — variable.
- **3a-i-a-4. Rotation** — across providers.

### 4b-i-a → conversation ID
- **4b-i-a-1. Client-provided** — explicit.
- **4b-i-a-2. Derived** — fingerprint.
- **4b-i-a-3. Sticky** — reuse.
- **4b-i-a-4. Reset** — new conversation.

## L6 — expansion of selected L5 nodes

### 2a-i-a-1 → POST
- **2a-i-a-1-i. Method** — POST.
- **2a-i-a-1-ii. Content-Type** — application/json.
- **2a-i-a-1-iii. Idempotency** — no.
- **2a-i-a-1-iv. Streaming** — SSE.

## Confidence & open questions

- **Low confidence:** Switchyard/freellmapi/GoModel internals (names/descriptions only).
- **Open questions:**
  - Which of these repos have active maintenance?
  - How does freellmapi's smart routing work internally?
  - Are any of these suitable for 9Router integration?

## Sources

- GitHub search (2,727 results, top 12 reviewed)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §8