# Exponential Expansion E09 — OpenRouter BYOK + Management Keys

**Date:** 2026-09-15
**Root phrase:** "OpenRouter BYOK + management keys" — from `2026-08-31-message-origin-and-destination-research.md` §B.1
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. BYOK (bring-your-own-key)
2. Guardrail budgets can count BYOK spend
3. Management keys (org-level API access)
4. BYOK filters (allowed_models, allowed_api_key_hashes, allowed_user_ids)
5. Key priority
6. ZDR/region declarations
7. include_byok_in_budgets

## L2 — expansion of each L1 node

### 1. BYOK
- **1a. Concept** — use your own provider key through OpenRouter.
- **1b. Routing** — requests route to your key's provider.
- **1c. Billing** — provider bills you directly (or OpenRouter tracks).
- **1d. is_byok flag** — metadata marks BYOK requests.

### 2. BYOK in budgets
- **2a. Default** — BYOK spend NOT counted.
- **2b. Opt-in** — `include_byok_in_budgets: true`.
- **2c. Amount** — what OpenRouter would have charged.
- **2d. Dashboard toggle** — "Include BYOK spend".

### 3. Management keys
- **3a. Purpose** — org-level API access.
- **3b. Scope** — guardrails, keys, members.
- **3c. Distinct** — from inference keys.
- **3d. Auth** — Bearer management key.

### 4. BYOK filters
- **4a. allowed_models** — restrict models.
- **4b. allowed_api_key_hashes** — restrict provider keys by hash.
- **4c. allowed_user_ids** — restrict users.
- **4d. Evaluation** — before routing.

### 5. Key priority
- **5a. Concept** — multiple keys for same provider; priority order.
- **5b. Fallback** — primary key fails → next priority.
- **5c. Load balancing** — distribute across keys.

### 6. ZDR/region declarations
- **6a. ZDR** — zero data retention per provider.
- **6b. Region** — data region declarations.
- **6c. BYOK interplay** — your key, your data policies.

### 7. include_byok_in_budgets
- **7a. Field** — boolean.
- **7b. Effect** — BYOK spend counts toward guardrail budget.
- **7c. Amount** — OpenRouter's would-have-charged price.

## L3 — expansion of selected L2 nodes

### 1b → routing
- **1b-i. Key selection** — pick the right provider key.
- **1b-ii. Model mapping** — OpenRouter model → provider model.
- **1b-iii. Failure** — key invalid → error or fallback.

### 3a → org-level access
- **3a-i. Guardrails API** — manage guardrails.
- **3a-ii. Keys API** — manage keys.
- **3a-iii. Members API** — manage members.

### 4a → allowed_models
- **4a-i. Format** — model list.
- **4a-ii. Empty** — allow all.
- **4a-iii. Intersection** — with other filters.

### 5a → key priority
- **5a-i. Order** — priority list.
- **5a-ii. Primary** — first key.
- **5a-iii. Fallback** — subsequent keys.

## L4 — expansion of selected L3 nodes

### 1b-i → key selection
- **1b-i-a. Provider match** — key must match provider.
- **1b-i-b. Model match** — key must support model.
- **1b-i-c. Hash check** — allowed_api_key_hashes.

### 3a-i → guardrails API
- **3a-i-a. List** — GET /api/v1/guardrails.
- **3a-i-b. Update** — PATCH /api/v1/guardrails/{id}.
- **3a-i-c. Workspace default** — named default.

### 5a-i → priority order
- **5a-i-a. First** — highest priority.
- **5a-i-b. Last** — lowest priority.
- **5a-i-c. Exhausted** — all fail → error.

## L5 — expansion of selected L4 nodes

### 1b-i-a → provider match
- **1b-i-a-1. Provider id** — openai, anthropic, etc.
- **1b-i-a-2. Key type** — sk-... format.
- **1b-i-a-3. Mismatch** — error.

### 5a-i-c → all fail
- **5a-i-c-1. Response** — error.
- **5a-i-c-2. Retry** — client retries.
- **5a-i-c-3. Alert** — notify owner.

## L6 — expansion of selected L5 nodes

### 1b-i-a-1 → provider id
- **1b-i-a-1-1. openai** — OpenAI keys.
- **1b-i-a-1-2. anthropic** — Anthropic keys.
- **1b-i-a-1-3. google** — Google keys.
- **1b-i-a-1-4. custom** — custom providers.

### 5a-i-c-1 → error response
- **5a-i-c-1-1. Code** — 4xx/5xx.
- **5a-i-c-1-2. Message** — key failure.
- **5a-i-c-1-3. Metadata** — is_byok, endpoints.

## Confidence & open questions

- **Confidence: high** — from OpenRouter BYOK docs (fetched in prior research).
- **Open:** should 9router support BYOK-style key priority?
- **Open:** should 9router support key hashes for attribution?

## Sources

- https://openrouter.ai/docs/guides/overview/auth/byok
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §B.1