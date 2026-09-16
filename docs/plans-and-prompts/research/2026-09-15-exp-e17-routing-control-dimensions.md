# Exponential Expansion E17 — Routing/Control Dimensions ("Where To")

**Date:** 2026-09-15
**Root phrase:** "Routing/control dimensions ('where to' — provider, model, allowlists, budgets, limits, queueing, guardrails, headers)" — from `2026-08-31-message-origin-and-destination-research.md` §C.2
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Upstream provider/model (request details logged) — ✅ partial, Low
2. Per-key model/provider allowlist (key metadata) — ❌, Medium
3. Per-key budgets (USD) (key metadata + usageDb) — ❌, Medium
4. Per-key rate limits (RPM/TPM) (rate limiter extension) — ❌, Medium
5. Per-model rate limits (rate limiter extension) — ❌, Medium
6. Queueing with priority (new module) — ❌, High
7. Guardrails (PII, prompt-injection, content filters) (new module) — ❌, High
8. Response headers (x-ratelimit-*, x-9r-*) (rate limiter extension) — ❌, Low

## L2 — expansion of each L1 node

### 1. Upstream provider/model
- **1a. Signal** — request details.
- **1b. Status** — partial.
- **1c. Effort** — low.
- **1d. Value** — drill-down.

### 2. Per-key allowlist
- **2a. Signal** — key metadata.
- **2b. Status** — missing.
- **2c. Effort** — medium.
- **2d. Value** — per-key control.

### 3. Per-key budgets
- **3a. Signal** — key metadata + usageDb.
- **3b. Status** — missing.
- **3c. Effort** — medium.
- **3d. Value** — cost control.

### 4. Per-key rate limits
- **4a. Signal** — rate limiter extension.
- **4b. Status** — missing.
- **4c. Effort** — medium.
- **4d. Value** — per-key fairness.

### 5. Per-model rate limits
- **5a. Signal** — rate limiter extension.
- **5b. Status** — missing.
- **5c. Effort** — medium.
- **5d. Value** — per-model protection.

### 6. Queueing with priority
- **6a. Signal** — new module.
- **6b. Status** — missing.
- **6c. Effort** — high.
- **6d. Value** — prioritization.

### 7. Guardrails
- **7a. Signal** — new module.
- **7b. Status** — missing.
- **7c. Effort** — high.
- **7d. Value** — safety.

### 8. Response headers
- **8a. Signal** — rate limiter extension.
- **8b. Status** — missing.
- **8c. Effort** — low.
- **8d. Value** — client visibility.

## L3 — expansion of selected L2 nodes

### 1d → drill-down
- **1d-i. Request details** — per-request.
- **1d-ii. Rollup** — per provider/model.
- **1d-iii. Dashboard** — usage view.

### 2d → per-key control
- **2d-i. Models** — allowlist.
- **2d-ii. Providers** — allowlist.
- **2d-iii. Intersection** — with global.

### 3d → cost control
- **3d-i. Soft limit** — warning.
- **3d-ii. Hard limit** — block.
- **3d-iii. Reset** — period.

### 4d → per-key fairness
- **4d-i. RPM** — per key.
- **4d-ii. TPM** — per key.
- **4d-iii. 429** — with retry.

### 5d → per-model protection
- **5d-i. RPM** — per model.
- **5d-ii. TPM** — per model.
- **5d-iii. Group** — model groups (see E23).

### 6d → prioritization
- **6d-i. Priority classes** — 0-5.
- **6d-ii. Tags** — keyword → priority.
- **6d-iii. Aging** — starvation prevention.

### 7d → safety
- **7d-i. PII** — redact/block.
- **7d-ii. Prompt injection** — detect/block.
- **7d-iii. Content filters** — regex.

### 8d → client visibility
- **8d-i. x-ratelimit-limit** — limit.
- **8d-ii. x-ratelimit-remaining** — remaining.
- **8d-iii. x-ratelimit-reset** — reset.
- **8d-iv. x-9r-*** — custom.

## L4 → expansion of selected L3 nodes

### 1d-i → per-request
- **1d-i-a. Provider** — upstream.
- **1d-i-b. Model** — upstream model.
- **1d-i-c. Tokens** — usage.

### 2d-iii → intersection
- **2d-iii-a. Key allowlist** — per key.
- **2d-iii-b. Global settings** — global.
- **2d-iii-c. Effective** — intersection.

### 3d-i → soft limit
- **3d-i-a. Threshold** — 80%.
- **3d-i-b. Alert** — dashboard.
- **3d-i-c. Continue** — requests work.

### 6d-i → priority classes
- **6d-i-a. Range** — 0-5.
- **6d-i-b. Default** — 0.
- **6d-i-c. Config** — per profile/tag.

### 8d-i → x-ratelimit-limit
- **8d-i-a. Value** — max.
- **8d-i-b. Format** — integer.
- **8d-i-c. Standard** — IETF draft.

## L5 → expansion of selected L4 nodes

### 1d-i-a → provider
- **1d-i-a-1. Name** — anthropic.
- **1d-i-a-2. Base URL** — endpoint.
- **1d-i-a-3. Key** — account.

### 2d-iii-a → key allowlist
- **2d-iii-a-1. Models** — list.
- **2d-iii-a-2. Wildcards** — claude-*.
- **2d-iii-a-3. Empty** — allow all.

### 3d-i-a → threshold
- **3d-i-a-1. Default** — 80%.
- **3d-i-a-2. Config** — per key.
- **3d-i-a-3. Edge** — small budgets.

### 8d-i-a → max value
- **8d-i-a-1. Source** — limiter config.
- **8d-i-a-2. Per key** — key limit.
- **8d-i-a-3. Per model** — model limit.

## L6 → expansion of selected L5 nodes

### 1d-i-a-1 → provider name
- **1d-i-a-1-1. Registry** — providers/registry.
- **1d-i-a-1-2. Display** — dashboard.
- **1d-i-a-1-3. Group** — model groups.

### 2d-iii-a-2 → wildcards
- **2d-iii-a-2-1. Prefix** — claude-*.
- **2d-iii-a-2-2. Suffix** — *-turbo.
- **2d-iii-a-2-3. Exact** — qwen-max.

## Confidence & open questions

- **Confidence: high** — codebase + industry patterns.
- **Open:** which control dimensions ship first?
- **Open:** should response headers be IETF-standard?

## Sources

- `custom-server.rate-limiter.js`
- `src/lib/usageDb.js`
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §C.2