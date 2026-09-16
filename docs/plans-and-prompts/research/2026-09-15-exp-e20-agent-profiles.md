# Exponential Expansion E20 — Agent Profiles

**Date:** 2026-09-15
**Root phrase:** "Agent profiles (profile JSON structure, LiteLLM/Anthropic/OpenRouter precedents, resolution order, profile→routing)" — from `2026-09-14-keyless-governance-research.md` §B
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Profile JSON structure
2. LiteLLM precedents (proxy config, teams)
3. Anthropic precedents (workspaces, API keys)
4. OpenRouter precedents (app attribution, guardrails)
5. Resolution order (UA → profile)
6. Profile → routing (model defaults, tags)
7. Profile fields (name, UA pattern, defaults)
8. Profile storage (JSON files, DB)
9. Profile inheritance (base → derived)
10. Profile overrides (header, key)

## L2 — expansion of each L1 node

### 1. Profile JSON structure
- **1a. name** — identifier.
- **1b. uaPattern** — regex.
- **1c. defaults** — model, provider.
- **1d. tags** — allowance.
- **1e. limits** — RPM/TPM.
- **1f. budget** — USD.

### 2. LiteLLM precedents
- **2a. config.yaml** — model list.
- **2b. teams** — shared budgets.
- **2c. keys** — per-key limits.
- **2d. routing** — model groups.

### 3. Anthropic precedents
- **3a. workspaces** — wrkspc_.
- **3b. API keys** — sk-ant-.
- **3c. limits** — per workspace.
- **3d. headers** — anthropic-workspace-id.

### 4. OpenRouter precedents
- **4a. app attribution** — X-App header.
- **4b. guardrails** — member/key level.
- **4c. budgets** — per key.
- **4d. models** — per key allowlist.

### 5. Resolution order
- **5a. UA match** — first.
- **5b. Header override** — second.
- **5c. Key-linked profile** — third.
- **5d. Default profile** — last.

### 6. Profile → routing
- **6a. Model defaults** — per profile.
- **6b. Provider defaults** — per profile.
- **6c. Tags** — allowance.
- **6d. Priority** — queue class.

### 7. Profile fields
- **7a. name** — string.
- **7b. uaPattern** — regex string.
- **7c. defaults** — object.
- **7d. tags** — array.
- **7e. limits** — object.
- **7f. budget** — number.

### 8. Profile storage
- **8a. JSON files** — profiles/ dir.
- **8b. DB table** — profiles.
- **8c. Hot reload** — watch.
- **8d. Validation** — schema.

### 9. Profile inheritance
- **9a. Base** — default profile.
- **9b. Derived** — extends base.
- **9c. Merge** — deep merge.

### 10. Profile overrides
- **10a. Header** — X-9R-Profile.
- **10b. Key** — key-linked.
- **10c. Subnet** — subnet-linked.

## L3 — expansion of selected L2 nodes

### 1c → defaults
- **1c-i. model** — default model.
- **1c-ii. provider** — default provider.
- **1c-iii. temperature** — default.

### 2a → config.yaml
- **2a-i. model_list** — providers.
- **2a-ii. router_settings** — routing.
- **2a-iii. general_settings** — global.

### 3a → workspaces
- **3a-i. wrkspc_** — prefix.
- **3a-ii. Limits** — per workspace.
- **3a-iii. Header** — anthropic-workspace-id.

### 4a → app attribution
- **4a-i. X-App** — header.
- **4a-ii. openrouter_metadata** — response.
- **4a-iii. App ID** — attribution.

### 5a → UA match
- **5a-i. Regex** — per profile.
- **5a-ii. Order** — most-specific-first.
- **5a-iii. Cache** — fingerprint.

### 6c → tags
- **6c-i. Allowance** — tags → models.
- **6c-ii. Wildcards** — claude-*.
- **6c-iii. Empty** — allow all.

### 8a → JSON files
- **8a-i. Dir** — profiles/.
- **8a-ii. Naming** — <name>.json.
- **8a-iii. Example** — claude-code.json.

### 9c → merge
- **9c-i. Deep** — nested objects.
- **9c-ii. Arrays** — replace.
- **9c-iii. Precedence** — derived wins.

## L4 → expansion of selected L3 nodes

### 1c-i → default model
- **1c-i-a. Value** — model id.
- **1c-i-b. Fallback** — auto.
- **1c-i-c. Override** — per request.

### 2a-i → model_list
- **2a-i-a. Entries** — provider + model.
- **2a-i-b. api_key** — per entry.
- **2a-i-c. rpm** — per entry.

### 3a-ii → per-workspace limits
- **3a-ii-a. RPM** — requests.
- **3a-ii-b. ITPM** — input tokens.
- **3a-ii-c. OTPM** — output tokens.

### 4a-i → X-App
- **4a-i-a. Format** — app id.
- **4a-i-b. Trust** — client-set.
- **4a-i-c. Fallback** — UA.

### 5a-i → regex
- **5a-i-a. Pattern** — UA fragment.
- **5a-i-b. Flags** — i.
- **5a-i-c. Test** — regex.test.

### 6c-i → allowance
- **6c-i-a. Tag match** — model tag.
- **6c-i-b. Deny** — non-matching.
- **6c-i-c. Log** — denied.

### 8a-iii → example
- **8a-iii-a. claude-code.json** — profile.
- **8a-iii-b. cursor.json** — profile.
- **8a-iii-c. default.json** — base.

## L5 → expansion of selected L4 nodes

### 1c-i-a → model id
- **1c-i-a-1. Format** — provider/model.
- **1c-i-a-2. Virtual** — auto.
- **1c-i-a-3. Resolve** — smartRouter.

### 2a-i-a → entries
- **2a-i-a-1. Provider** — upstream.
- **2a-i-a-2. Model** — upstream model.
- **2a-i-a-3. Params** — extra.

### 3a-ii-a → RPM
- **3a-ii-a-1. Limit** — per workspace.
- **3a-ii-a-2. Bucket** — token bucket.
- **3a-ii-a-3. 429** — retry-after.

### 4a-i-a → app id
- **4a-i-a-1. Format** — slug.
- **4a-i-a-2. Length** — ≤64.
- **4a-i-a-3. Sanitize** — alnum.

### 5a-i-a → pattern
- **5a-i-a-1. Fragment** — "claude-code".
- **5a-i-a-2. Escaping** — regex-safe.
- **5a-i-a-3. Case** — insensitive.

### 6c-i-a → tag match
- **6c-i-a-1. Model tags** — config.
- **6c-i-a-2. Profile tags** — allowance.
- **6c-i-a-3. Intersection** — allowed.

## L6 → expansion of selected L5 nodes

### 1c-i-a-1 → provider/model format
- **1c-i-a-1-1. Slash** — separator.
- **1c-i-a-1-2. Provider** — registry id.
- **1c-i-a-1-3. Model** — upstream id.

### 2a-i-a-1 → provider
- **2a-i-a-1-1. Name** — anthropic.
- **2a-i-a-1-2. Base URL** — endpoint.
- **2a-i-a-1-3. Key** — account.

### 3a-ii-a-1 → limit
- **3a-ii-a-1-1. Value** — integer.
- **3a-ii-a-1-2. Window** — 60s.
- **3a-ii-a-1-3. Config** — workspace.

### 4a-i-a-1 → slug
- **4a-i-a-1-1. Lowercase** — normalize.
- **4a-i-a-1-2. Hyphens** — separators.
- **4a-i-a-1-3. Unique** — per app.

## Confidence & open questions

- **Confidence: high** — precedents verified (LiteLLM, Anthropic, OpenRouter).
- **Open:** should profiles be user-editable JSON or DB-backed?
- **Open:** inheritance depth limit?

## Sources

- `docs/plans-and-prompts/research/2026-09-14-keyless-governance-research.md` §B
- LiteLLM proxy docs (config.yaml, teams)
- Anthropic workspaces docs
- OpenRouter app-attribution docs