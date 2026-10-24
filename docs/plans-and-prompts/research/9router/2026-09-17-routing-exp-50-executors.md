# Routing Exponential Expansion R50 — Executors

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #executors #open-sse #default-executor #binary-upstreams #9router

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Executors (~30 specialized + cached DefaultExecutor, base-URL fallback, binary upstreams)"** from `47-branch-9router-internal-threads.md` L1-A + `06-executors-deep-dive.md`.

## L1 — sub-phrases discovered in the root

1. Specialized executors (~30)
2. Cached DefaultExecutor
3. Base-URL fallback loop
4. Binary/protobuf upstreams (kiro, cursor, commandcode)
5. Executor dispatch (per-provider upstream call)

## L2 — expansion of each L1 node

### 1. Specialized executors
- **1a. Per-provider** — custom logic.
- **1b. Non-OpenAI** — formats.
- **1c. Auth flows** — special.
- **1d. Streaming** — custom.

### 2. Cached DefaultExecutor
- **2a. OpenAI-compatible** — standard.
- **2b. Cached** — instance reuse.
- **2c. Generic** — any provider.
- **2d. Fallback** — default.

### 3. Base-URL fallback loop
- **3a. Multiple URLs** — per provider.
- **3b. Order** — priority.
- **3c. Failover** — next URL.
- **3d. Exhaustion** — all failed.

### 4. Binary upstreams
- **4a. kiro EventStream** — binary.
- **4b. cursor protobuf** — protobuf.
- **4c. commandcode NDJSON** — NDJSON.
- **4d. Own executor** — no translation.

### 5. Executor dispatch
- **5a. Selection** — by provider.
- **5b. Request** — translated.
- **5c. Call** — upstream.
- **5d. Response** — SSE back.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → per-provider
- **1a-i. Anthropic** — custom.
- **1a-ii. Google** — custom.
- **1a-iii. xAI** — custom.
- **1a-iv. Others** — default.

### 2a → OpenAI-compatible
- **2a-i. /v1/chat** — endpoint.
- **2a-ii. SSE** — streaming.
- **2a-iii. Auth** — Bearer.
- **2a-iv. Errors** — standard.

### 3a → multiple URLs
- **3a-i. Mirror** — same provider.
- **3a-ii. Region** — geo.
- **3a-iii. Priority** — order.
- **3a-iv. Health** — skip.

### 4a → kiro EventStream
- **4a-i. Binary** — format.
- **4a-ii. Parse** — custom.
- **4a-iii. Translate** — internal.
- **4a-iv. SSE** — output.

### 5a → selection
- **5a-i. Registry** — provider → executor.
- **5a-ii. Lookup** — by name.
- **5a-iii. Default** — fallback.
- **5a-iv. Cache** — instances.

## L4 — expansion of selected L3 nodes

### 1a-i → Anthropic
- **1a-i-a. API** — /v1/messages.
- **1a-i-b. Format** — Anthropic.
- **1a-i-c. Auth** — x-api-key.
- **1a-i-d. Stream** — SSE.

### 2a-i → /v1/chat
- **2a-i-a. Path** — /v1/chat/completions.
- **2a-i-b. Method** — POST.
- **2a-i-c. Body** — OpenAI.
- **2a-i-d. Response** — OpenAI.

### 3a-i → mirror
- **3a-i-a. Same API** — compatible.
- **3a-i-b. Load** — split.
- **3a-i-c. Failover** — automatic.
- **3a-i-d. Config** — list.

### 4a-i → binary format
- **4a-i-a. EventStream** — kiro.
- **4a-i-b. Protobuf** — cursor.
- **4a-i-c. NDJSON** — commandcode.
- **4a-i-d. Custom** — parse.

### 5a-i → registry
- **5a-i-a. Map** — provider → executor.
- **5a-i-b. Keys** — provider names.
- **5a-i-c. Values** — executor classes.
- **5a-i-d. Lookup** — O(1).

## L5 — expansion of selected L4 nodes

### 1a-i-a → /v1/messages
- **1a-i-a-1. Endpoint** — Anthropic.
- **1a-i-a-2. Schema** — messages.
- **1a-i-a-3. Roles** — user/assistant.
- **1a-i-a-4. Tools** — supported.

### 2a-i-a → path
- **2a-i-a-1. Version** — v1.
- **2a-i-a-2. Resource** — chat.
- **2a-i-a-3. Action** — completions.
- **2a-i-a-4. Compat** — OpenAI.

### 3a-i-a → same API
- **3a-i-a-1. OpenAI-compat** — standard.
- **3a-i-a-2. Auth** — same key.
- **3a-i-a-3. Models** — same names.
- **3a-i-a-4. 9Router** — default.

### 4a-i-a → EventStream
- **4a-i-a-1. Binary** — encoding.
- **4a-i-a-2. Chunks** — framed.
- **4a-i-a-3. Parse** — decoder.
- **4a-i-a-4. Convert** — SSE.

### 5a-i-a → map
- **5a-i-a-1. JS Map** — structure.
- **5a-i-a-2. Key** — string.
- **5a-i-a-3. Value** — class.
- **5a-i-a-4. Lookup** — fast.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → endpoint
- **1a-i-a-1-i. Host** — api.anthropic.com.
- **1a-i-a-1-ii. Path** — /v1/messages.
- **1a-i-a-1-iii. Method** — POST.
- **1a-i-a-1-iv. Version** — header.

### 2a-i-a-1 → version
- **2a-i-a-1-i. v1** — stable.
- **2a-i-a-1-ii. Compat** — OpenAI.
- **2a-i-a-1-iii. Clients** — SDKs.
- **2a-i-a-1-iv. 9Router** — exposes.

### 3a-i-a-1 → OpenAI-compat
- **3a-i-a-1-i. Standard** — de facto.
- **3a-i-a-1-ii. Adopted** — providers.
- **3a-i-a-1-iii. Simple** — integration.
- **3a-i-a-1-iv. 9Router** — default.

### 4a-i-a-1 → binary encoding
- **4a-i-a-1-i. Bytes** — raw.
- **4a-i-a-1-ii. Frames** — length-prefixed.
- **4a-i-a-1-iii. Decode** — parse.
- **4a-i-a-1-iv. Errors** — malformed.

### 5a-i-a-1 → JS Map
- **5a-i-a-1-i. Insert** — set().
- **5a-i-a-1-ii. Lookup** — get().
- **5a-i-a-1-iii. Delete** — delete().
- **5a-i-a-1-iv. Iterate** — forEach.

## Confidence & open questions

- **High confidence:** executor architecture from branch 47 + 06-executors-deep-dive.
- **Open questions:**
  - How many executors exist today (~30)?
  - Should new non-OpenAI providers get custom executors?
  - How to test binary upstream executors?

## Sources

- `docs/plans-and-prompts/research/9router/47-branch-9router-internal-threads.md` L1-A
- `docs/plans-and-prompts/research/9router/06-executors-deep-dive.md`
- `open-sse/executors/`