# Routing Exponential Expansion R51 — Translator Engine

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #translator #open-sse #openai-intermediate #direct-routes #self-register

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Translator engine (OpenAI intermediate format, self-registering, direct routes)"** from `47-branch-9router-internal-threads.md` L1-A + `08-translator-deep-dive.md`.

## L1 — sub-phrases discovered in the root

1. OpenAI intermediate format (pivot)
2. Self-registering translators (register(from, to, reqFn, resFn))
3. Direct routes (exact source:target pairs)
4. Fragile pairs (thinking blocks, tool ids, images, is_error)
5. Format detection (source format)

## L2 — expansion of each L1 node

### 1. OpenAI intermediate
- **1a. Pivot** — through OpenAI.
- **1b. Lossy** — double-hop.
- **1c. Universal** — all formats.
- **1d. Simple** — schema.

### 2. Self-registering
- **2a. register()** — side effect.
- **2b. Import** — index.js.
- **2c. from/to** — pair.
- **2d. reqFn/resFn** — functions.

### 3. Direct routes
- **3a. Exact pair** — source:target.
- **3b. Skip pivot** — no double-hop.
- **3c. Quality** — preserved.
- **3d. Prefer** — fragile pairs.

### 4. Fragile pairs
- **4a. Thinking blocks** — preserve.
- **4b. Tool ids** — preserve.
- **4c. Non-base64 images** — preserve.
- **4d. is_error** — preserve.

### 5. Format detection
- **5a. Source** — detect.
- **5b. Target** — provider.
- **5c. Match** — translator.
- **5d. Default** — pivot.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → pivot
- **1a-i. Client format** → OpenAI.
- **1a-ii. OpenAI** → provider.
- **1a-iii. Two hops** — lossy.
- **1a-iv. Universal** — coverage.

### 2a → register()
- **2a-i. Signature** — (from, to, req, res).
- **2a-ii. Registry** — global map.
- **2a-iii. Side effect** — import.
- **2a-iv. Duplicate** — overwrite.

### 3a → exact pair
- **3a-i. Example** — claude:kiro.
- **3a-ii. Direct** — one hop.
- **3a-iii. Quality** — best.
- **3a-iv. Coverage** — limited.

### 4a → thinking blocks
- **4a-i. Anthropic** — thinking.
- **4a-ii. OpenAI** — reasoning.
- **4a-iii. Preserve** — content.
- **4a-iv. Pivot** — loses.

### 5a → source detect
- **5a-i. Heuristics** — format.
- **5a-ii. Fields** — presence.
- **5a-iii. Roles** — names.
- **5a-iv. Content** — types.

## L4 — expansion of selected L3 nodes

### 1a-i → client format
- **1a-i-a. OpenAI** — standard.
- **1a-i-b. Anthropic** — messages.
- **1a-i-c. Google** — gemini.
- **1a-i-d. Custom** — others.

### 2a-i → signature
- **2a-i-a. from** — source.
- **2a-i-b. to** — target.
- **2a-i-c. req** — request fn.
- **2a-i-d. res** — response fn.

### 3a-i → claude:kiro
- **3a-i-a. Source** — claude.
- **3a-i-b. Target** — kiro.
- **3a-i-c. Direct** — route.
- **3a-i-d. Fragile** — pair.

### 4a-i → Anthropic thinking
- **4a-i-a. Field** — thinking.
- **4a-i-b. Content** — blocks.
- **4a-i-c. Signature** — format.
- **4a-i-d. Preserve** — direct.

### 5a-i → heuristics
- **5a-i-a. Messages** — array.
- **5a-i-b. Roles** — names.
- **5a-i-c. Content** — types.
- **5a-i-d. Fields** — markers.

## L5 — expansion of selected L4 nodes

### 1a-i-a → OpenAI standard
- **1a-i-a-1. Messages** — array.
- **1a-i-a-2. Roles** — system/user/assistant.
- **1a-i-a-3. Content** — string/array.
- **1a-i-a-4. Tools** — definitions.

### 2a-i-a → from
- **2a-i-a-1. String** — format name.
- **2a-i-a-2. Lowercase** — convention.
- **2a-i-a-3. Unique** — registry.
- **2a-i-a-4. Match** — detection.

### 3a-i-a → source claude
- **3a-i-a-1. Format** — Anthropic.
- **3a-i-a-2. Roles** — user/assistant.
- **3a-i-a-3. Blocks** — content.
- **3a-i-a-4. Tools** — definitions.

### 4a-i-a → field
- **4a-i-a-1. Name** — thinking.
- **4a-i-a-2. Type** — block.
- **4a-i-a-3. Content** — text.
- **4a-i-a-4. Signature** — preserved.

### 5a-i-a → messages array
- **5a-i-a-1. Length** — N.
- **5a-i-a-2. Order** — chronological.
- **5a-i-a-3. Roles** — alternate.
- **5a-i-a-4. Content** — varied.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → messages
- **1a-i-a-1-i. Array** — of objects.
- **1a-i-a-1-ii. Role** — field.
- **1a-i-a-1-iii. Content** — field.
- **1a-i-a-1-iv. Name** — optional.

### 2a-i-a-1 → format name
- **2a-i-a-1-i. "openai"** — standard.
- **2a-i-a-1-ii. "claude"** — anthropic.
- **2a-i-a-1-iii. "gemini"** — google.
- **2a-i-a-1-iv. "kiro"** — custom.

### 3a-i-a-1 → Anthropic format
- **3a-i-a-1-i. System** — top-level.
- **3a-i-a-1-ii. Messages** — array.
- **3a-i-a-1-iii. Blocks** — content.
- **3a-i-a-1-iv. Tools** — definitions.

### 4a-i-a-1 → thinking name
- **4a-i-a-1-i. Block type** — "thinking".
- **4a-i-a-1-ii. Content** — reasoning.
- **4a-i-a-1-iii. Signature** — preserved.
- **4a-i-a-1-iv. Pivot** — loses.

### 5a-i-a-1 → length
- **5a-i-a-1-i. 1** — single.
- **5a-i-a-1-ii. 10** — typical.
- **5a-i-a-1-iii. 100** — long.
- **5a-i-a-1-iv. 1000** — extreme.

## Confidence & open questions

- **High confidence:** translator engine architecture from branch 47 + 08-translator-deep-dive.
- **Open questions:**
  - How many direct routes exist today?
  - Which pairs still need direct routes?
  - How to test translator round-trips?

## Sources

- `docs/plans-and-prompts/research/9router/47-branch-9router-internal-threads.md` L1-A
- `docs/plans-and-prompts/research/9router/08-translator-deep-dive.md`
- `open-sse/translator/` (index.js, schema/)