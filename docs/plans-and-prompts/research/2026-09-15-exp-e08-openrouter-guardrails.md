# Exponential Expansion E08 — OpenRouter Guardrails

**Date:** 2026-09-15
**Root phrase:** "OpenRouter guardrails (budget, allowlists, ZDR, data regions, security, sensitive info, custom filters, hierarchy)" — from `2026-08-31-message-origin-and-destination-research.md` §B.1
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Budget limit (USD, resets daily/weekly/monthly, include_byok_in_budgets)
2. Model allowlist
3. Provider allowlist
4. Zero Data Retention (ZDR) per model group
5. Data regions (global/europe/us)
6. Security (regex prompt-injection/jailbreak detection)
7. Sensitive info (PII detection/redaction)
8. Custom content filters (JS regex, redact/block, limits)
9. Assignment levels (member + API key)
10. Guardrail hierarchy (intersection/OR/union rules)
11. Blocked requests → 403 + openrouter_metadata
12. API access (GET/PATCH guardrails, workspace default)

## L2 — expansion of each L1 node

### 1. Budget limit
- **1a. USD cap** — spending cap.
- **1b. Reset** — daily, weekly, or monthly.
- **1c. Rejection** — requests rejected when limit reached.
- **1d. BYOK** — `include_byok_in_budgets` counts BYOK spend.
- **1e. Default** — only OpenRouter credit spend counts.
- **1f. Per-user/per-key** — enforced per-user and per-key, not shared.

### 2. Model allowlist
- **2a. Restrict** — specific models only.
- **2b. Empty** — allow all.
- **2c. Intersection** — across guardrails.

### 3. Provider allowlist
- **3a. Restrict** — specific providers.
- **3b. Empty** — allow all.
- **3c. Intersection** — across guardrails.

### 4. ZDR per model group
- **4a. Scope** — Anthropic, OpenAI, Google, SpaceXAI, all other models.
- **4b. OR logic** — if any guardrail enforces ZDR for a scope, enforced.
- **4c. Effect** — no data retention by provider.

### 5. Data regions
- **5a. Values** — global (openrouter.ai), europe (eu.openrouter.ai), us (us.openrouter.ai).
- **5b. Rejection** — requests through other domains rejected.
- **5c. Plan** — requires Business or Enterprise.
- **5d. Intersection** — across guardrails that set it.
- **5e. Narrowing** — member/key guardrail can only narrow workspace default.

### 6. Security (prompt injection)
- **6a. Detection** — regex-based.
- **6b. Patterns** — e.g. "ignore all previous instructions".
- **6c. Action** — block with 403.

### 7. Sensitive info (PII)
- **7a. Detection** — built-in presets + NLP-based.
- **7b. Actions** — redact or block.
- **7c. Union** — filters from all guardrails combined.
- **7d. Precedence** — block > redact.

### 8. Custom content filters
- **8a. Regex** — JavaScript-flavoured.
- **8b. Supported** — char classes, quantifiers, alternation, non-capturing groups, named groups, anchors, escapes.
- **8c. Unsupported** — lookaheads, lookbehinds, backreferences, excessive backtracking.
- **8d. Error** — `invalid_regex_pattern` on create/update.
- **8e. Limits** — 100k chars per pattern; multiple patterns per guardrail.
- **8f. Actions** — redact (replace with placeholder) or block (403).
- **8g. Latency** — evaluated locally, negligible.

### 9. Assignment levels
- **9a. Member assignments** — baseline for all their keys.
- **9b. API key assignments** — granular, layered.
- **9c. One per user/key** — only one guardrail directly assigned.
- **9d. Implicit** — member's keys follow member guardrail.

### 10. Guardrail hierarchy
- **10a. Provider allowlists** — intersection.
- **10b. Model allowlists** — intersection.
- **10c. ZDR** — OR per model group.
- **10d. Data regions** — intersection.
- **10e. Sensitive info** — union; block > redact.
- **10f. Budgets** — checked independently per key and per member; lower limit wins.
- **10g. Stricter wins** — stricter rules always win.

### 11. Blocked requests → 403
- **11a. Status** — 403 Forbidden.
- **11b. Budget/allowlist/region** — 403 without metadata.
- **11c. Runtime content checks** — include openrouter_metadata stage details.
- **11d. Opt-in** — `X-OpenRouter-Experimental-Metadata: enabled`.

### 12. API access
- **12a. List** — `GET /api/v1/guardrails?workspace_id=...`.
- **12b. Update** — `PATCH /api/v1/guardrails/{id}`.
- **12c. Workspace default** — named `Workspace <id> Default`.
- **12d. Auth** — management key.

## L3 — expansion of selected L2 nodes

### 1f → per-user/per-key budgets
- **1f-i. Example 1** — member guardrail $50/day to 3 members: each gets own $50.
- **1f-ii. Example 2** — key usage accumulates to member usage.
- **1f-iii. Example 3** — layered: key $30/day + member $100/day; both checked.

### 5a → data region values
- **5a-i. global** — https://openrouter.ai.
- **5a-ii. europe** — https://eu.openrouter.ai.
- **5a-iii. us** — https://us.openrouter.ai.
- **5a-iv. Models API** — region filter uses `region=eu` (different from guardrail value).

### 8b → supported regex
- **8b-i. Character classes** — `[a-z]`, `\d`, `\w`, `\s`.
- **8b-ii. Quantifiers** — `*`, `+`, `?`, `{n,m}`.
- **8b-iii. Alternation** — `foo|bar`.
- **8b-iv. Groups** — `(?:…)`, `(?<name>…)`.
- **8b-v. Anchors** — `^`, `$`, `\b`.
- **8b-vi. Escapes** — `\.`, `\(`, `\\`.

### 8c → unsupported regex
- **8c-i. Lookaheads** — `(?=…)`, `(?!…)`.
- **8c-ii. Lookbehinds** — `(?<=…)`, `(?<!…)`.
- **8c-iii. Backreferences** — `\1`, `\k<name>`.
- **8c-iv. Catastrophic backtracking** — `(a+)+`.

### 11c → openrouter_metadata
- **11c-i. Structure** — requested, strategy, region, summary, attempt, is_byok, endpoints, pipeline.
- **11c-ii. Pipeline** — array of guardrail stages that ran.
- **11c-iii. Stage fields** — type, name, guardrail_id, guardrail_scope, summary, data.

## L4 — expansion of selected L3 nodes

### 1f-i → Example 1 detail
- **1f-i-a. Alice spends $50** — blocked.
- **1f-i-b. Bob/Carol** — can still spend up to $50 each.

### 1f-ii → Example 2 detail
- **1f-ii-a. Key A $15 + Key B $10** — each within own $20.
- **1f-ii-b. Member total $25** — exceeds member $20 → blocked.

### 11c-i → metadata fields
- **11c-i-a. requested** — model requested.
- **11c-i-b. strategy** — direct/fallback.
- **11c-i-c. region** — data center.
- **11c-i-d. is_byok** — BYOK flag.
- **11c-i-e. endpoints** — available endpoints.

### 11c-ii → pipeline stages
- **11c-ii-a. type** — guardrail.
- **11c-ii-b. name** — regex_pi_detection.
- **11c-ii-c. guardrail_scope** — api-key/member/workspace.
- **11c-ii-d. summary** — "Blocked: prompt injection detected (1 pattern matched)".
- **11c-ii-e. data** — action, detected, engines, patterns.

## L5 — expansion of selected L4 nodes

### 1f-i-a → Alice blocked
- **1f-i-a-1. Response** — 403.
- **1f-i-a-2. Reset** — next day.
- **1f-i-a-3. Alert** — dashboard notification.

### 11c-ii-b → regex_pi_detection
- **11c-ii-b-1. Engine** — regex.
- **11c-ii-b-2. Patterns** — "ignore all previous instructions".
- **11c-ii-b-3. Action** — blocked.

### 11c-ii-c → guardrail_scope
- **11c-ii-c-1. api-key** — key-level guardrail.
- **11c-ii-c-2. member** — member-level.
- **11c-ii-c-3. workspace** — workspace default.

## L6 — expansion of selected L5 nodes

### 1f-i-a-1 → 403 response
- **1f-i-a-1-1. Body** — error code + message.
- **1f-i-a-1-2. Metadata** — only for runtime content checks.
- **1f-i-a-1-3. Retry** — after reset.

### 11c-ii-b-2 → prompt injection patterns
- **11c-ii-b-2-1. Classic** — "ignore all previous instructions".
- **11c-ii-b-2-2. Variants** — "you are now", "DAN", "jailbreak".
- **11c-ii-b-2-3. Custom** — user-defined patterns.

## Confidence & open questions

- **Confidence: high** — fetched live from openrouter.ai/docs/guides/features/guardrails.
- **Open:** should 9router implement guardrails as a policy layer (see E26)?
- **Open:** should 9router support custom content filters with the same regex constraints?

## Sources

- https://openrouter.ai/docs/guides/features/guardrails (fetched 2026-09-15)
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §B.1