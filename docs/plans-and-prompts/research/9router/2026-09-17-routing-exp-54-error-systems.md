# Routing Exponential Expansion R54 — Error Systems

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #error-systems #error-registry #unified-errors #categorization #9router

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Error systems (categorization, programmatic registry, unified v2)"** from `47-branch-9router-internal-threads.md` L2-AA + `21/22/26/29` docs.

## L1 — sub-phrases discovered in the root

1. Error categorization (rate_limit, auth, billing, timeout)
2. Programmatic error registry
3. Unified error system v2
4. Error propagation (executor → client)
5. Error recovery (retry, fallback)

## L2 — expansion of each L1 node

### 1. Error categorization
- **1a. rate_limit** — 429.
- **1b. auth** — 401/403.
- **1c. billing** — 402.
- **1d. timeout** — network.

### 2. Programmatic registry
- **2a. Codes** — stable.
- **2b. Messages** — user-facing.
- **2c. Metadata** — context.
- **2d. Lookup** — central.

### 3. Unified v2
- **3a. Schema** — standard.
- **3b. Fields** — code, message.
- **3c. Compat** — OpenAI errors.
- **3d. Migration** — from v1.

### 4. Error propagation
- **4a. Executor** — catches.
- **4b. Normalize** — format.
- **4c. SSE** — sends.
- **4d. Client** — receives.

### 5. Error recovery
- **5a. Retry** — transient.
- **5b. Fallback** — next model.
- **5c. Account switch** — quota.
- **5d. User message** — final.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → rate_limit
- **1a-i. 429** — status.
- **1a-ii. Retry-After** — header.
- **1a-iii. Quota** — exhausted.
- **1a-iv. Action** — switch.

### 2a → codes
- **2a-i. Stable** — API.
- **2a-ii. Unique** — registry.
- **2a-iii. Documented** — docs.
- **2a-iv. Versioned** — changes.

### 3a → schema
- **3a-i. Code** — string.
- **3a-ii. Message** — string.
- **3a-iii. Type** — category.
- **3a-iv. Details** — object.

### 4a → executor catches
- **4a-i. Try** — call.
- **4a-ii. Catch** — error.
- **4a-iii. Classify** — type.
- **4a-iv. Wrap** — standard.

### 5a → retry
- **5a-i. Transient** — retryable.
- **5a-ii. Count** — bounded.
- **5a-iii. Delay** — config.
- **5a-iv. Exhaust** — fallback.

## L4 — expansion of selected L3 nodes

### 1a-i → 429
- **1a-i-a. Meaning** — rate limited.
- **1a-i-b. Provider** — specific.
- **1a-i-c. Retry** — after.
- **1a-i-d. Action** — switch.

### 2a-i → stable
- **2a-i-a. Contract** — API.
- **2a-i-b. Clients** — depend.
- **2a-i-c. Changes** — versioned.
- **2a-i-d. Docs** — updated.

### 3a-i → code
- **3a-i-a. Format** — string.
- **3a-i-b. Example** — "rate_limit".
- **3a-i-c. Unique** — registry.
- **3a-i-d. Stable** — contract.

### 4a-i → try
- **4a-i-a. Call** — upstream.
- **4a-i-b. Await** — response.
- **4a-i-c. Success** — return.
- **4a-i-d. Failure** — catch.

### 5a-i → transient
- **5a-i-a. 429** — retryable.
- **5a-i-b. 5xx** — retryable.
- **5a-i-c. Timeout** — retryable.
- **5a-i-d. 4xx** — not.

## L5 — expansion of selected L4 nodes

### 1a-i-a → meaning
- **1a-i-a-1. Too many** — requests.
- **1a-i-a-2. Window** — per-minute.
- **1a-i-a-3. Limit** — provider.
- **1a-i-a-4. Action** — back off.

### 2a-i-a → contract
- **2a-i-a-1. Public** — API.
- **2a-i-a-2. Stable** — promise.
- **2a-i-a-3. Tested** — suite.
- **2a-i-a-4. Documented** — docs.

### 3a-i-a → format
- **3a-i-a-1. String** — code.
- **3a-i-a-2. Lowercase** — convention.
- **3a-i-a-3. Underscores** — separators.
- **3a-i-a-4. Readable** — names.

### 4a-i-a → call
- **4a-i-a-1. Fetch** — upstream.
- **4a-i-a-2. Timeout** — bounded.
- **4a-i-a-3. Response** — parsed.
- **4a-i-a-4. Error** — thrown.

### 5a-i-a → 429 retryable
- **5a-i-a-1. Retry** — after wait.
- **5a-i-a-2. Count** — bounded.
- **5a-i-a-3. Backoff** — exponential.
- **5a-i-a-4. Exhaust** — fallback.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → too many
- **1a-i-a-1-i. RPM** — limit.
- **1a-i-a-1-ii. TPM** — limit.
- **1a-i-a-1-iii. Concurrency** — limit.
- **1a-i-a-1-iv. Response** — 429.

### 2a-i-a-1 → public API
- **2a-i-a-1-i. Exposed** — /v1.
- **2a-i-a-1-ii. Clients** — SDKs.
- **2a-i-a-1-iii. Errors** — standard.
- **2a-i-a-1-iv. Compat** — OpenAI.

### 3a-i-a-1 → string code
- **3a-i-a-1-i. "rate_limit"** — example.
- **3a-i-a-1-ii. "auth_error"** — example.
- **3a-i-a-1-iii. "timeout"** — example.
- **3a-i-a-1-iv. "billing"** — example.

### 4a-i-a-1 → fetch
- **4a-i-a-1-i. undici** — client.
- **4a-i-a-1-ii. Timeout** — abort.
- **4a-i-a-1-iii. Status** — check.
- **4a-i-a-1-iv. Body** — parse.

### 5a-i-a-1 → retry after wait
- **5a-i-a-1-i. Delay** — seconds.
- **5a-i-a-1-ii. Timer** — sleep.
- **5a-i-a-1-iii. Retry** — call.
- **5a-i-a-1-iv. Count** — increment.

## Confidence & open questions

- **High confidence:** error systems architecture from branch 47 + docs 21/22/26/29.
- **Open questions:**
  - What is the full error code list in the registry?
  - How does unified v2 map to OpenAI error format?
  - Which errors trigger fallback vs user message?

## Sources

- `docs/plans-and-prompts/research/9router/47-branch-9router-internal-threads.md` L2-AA
- `docs/plans-and-prompts/research/9router/21-audit-no-more-bugs.md`
- `docs/plans-and-prompts/research/9router/22-error-sweep.md`
- `docs/plans-and-prompts/research/9router/26-programmatic-error-registry.md`
- `docs/plans-and-prompts/research/9router/29-unified-error-system-v2.md`