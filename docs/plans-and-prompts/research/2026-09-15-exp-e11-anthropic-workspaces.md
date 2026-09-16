# Exponential Expansion E11 — Anthropic Workspaces

**Date:** 2026-09-15
**Root phrase:** "Anthropic workspaces (wrkspc_ IDs, per-workspace limits, Claude Code workspace, header)" — from `2026-08-31-message-origin-and-destination-research.md` §B.2
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Workspace concept (organize keys, team access, cost control)
2. `wrkspc_`-prefixed IDs
3. Max 100/org
4. Per-workspace rate limits (RPM/ITPM/OTPM per model tier)
5. Per-workspace spend limits (monthly cap + alerts)
6. `anthropic-workspace-id` request header
7. `anthropic-workspace-id` response header
8. Claude Code workspace (auto-created, per-user keys, separate limits)
9. Default workspace (no limits settable)

## L2 — expansion of each L1 node

### 1. Workspace concept
- **1a. Organization** — keys grouped under org.
- **1b. Team access** — members with roles.
- **1c. Cost control** — per-workspace budgets.
- **1d. Isolation** — workspaces isolate usage.

### 2. wrkspc_ IDs
- **2a. Format** — `wrkspc_01JwQvzr7rXLA5AGx3HKfFUJ`.
- **2b. Uniqueness** — per workspace.
- **2c. Header use** — sent in anthropic-workspace-id.

### 3. Max 100/org
- **3a. Cap** — 100 workspaces per org.
- **3b. Planning** — workspace strategy within cap.

### 4. Per-workspace rate limits
- **4a. Per limiter** — RPM, ITPM, OTPM separately.
- **4b. Per model tier** — limits per model class.
- **4c. Lower than org** — can only set lower.
- **4d. Default workspace** — can't set.
- **4e. Unused capacity** — available to other workspaces.

### 5. Per-workspace spend limits
- **5a. Monthly cap** — USD.
- **5b. Alerts** — notifications near cap.
- **5c. Reached** — 400 invalid_request_error ("workspace API usage limits").

### 6. anthropic-workspace-id request header
- **6a. Required** — for multi-workspace keys.
- **6b. Omitted** — single-workspace keys can omit.
- **6c. Invalid** — 400 invalid_request_error.
- **6d. Unknown workspace** — 404 not_found_error.
- **6e. No access** — 404 (same as unknown).

### 7. Response header
- **7a. Purpose** — identifies workspace behind response.
- **7b. Default workspace** — ID from response header.

### 8. Claude Code workspace
- **8a. Auto-created** — at sign-in.
- **8b. Per-user keys** — minted at sign-in.
- **8c. Owner removal** — keys stop working.
- **8d. Separate rate limits** — own limits.
- **8e. Per-user monthly spend limits** — only workspace supporting this.
- **8f. 429 with retry-after** — Claude Code workspace limits can return 429 with retry-after.

### 9. Default workspace
- **9a. No limits settable** — matches org limits.
- **9b. ID** — from response header.
- **9c. Omitted from List Workspaces**.

## L3 — expansion of selected L2 nodes

### 1a → organization
- **1a-i. Org limits** — always apply.
- **1a-ii. Workspace limits** — subset.
- **1a-iii. Sum** — workspace limits can exceed org; org wins.

### 4c → lower than org
- **4c-i. Example** — org 40k ITPM; workspace limited to 30k.
- **4c-ii. Protection** — other workspaces protected.
- **4c-iii. Remaining** — unused tokens available elsewhere.

### 6a → multi-workspace keys
- **6a-i. Key type** — personal/service account key not scoped.
- **6a-ii. Header required** — every request.
- **6a-iii. SDK support** — extra_headers/default_headers.

### 8b → per-user keys
- **8b-i. Minted** — at sign-in.
- **8b-ii. Identity-backed** — personal keys.
- **8b-iii. Removal** — key stops working.

## L4 — expansion of selected L3 nodes

### 1a-i → org limits
- **1a-i-a. Tier-based** — Start/Build/Scale.
- **1a-i-b. Always enforced** — even with workspace limits.
- **1a-i-c. Rate Limits API** — read programmatically.

### 6a-iii → SDK support
- **6a-iii-a. Python** — extra_headers={"anthropic-workspace-id": ...}.
- **6a-iii-b. TypeScript** — defaultHeaders.
- **6a-iii-c. Go** — option.WithHeader.
- **6a-iii-d. Java** — putAdditionalHeader.

### 8b-ii → identity-backed
- **8b-ii-a. Personal key** — acts as user.
- **8b-ii-b. Service account** — acts as service account.
- **8b-ii-c. Workspace key (legacy)** — belongs to workspace.

## L5 — expansion of selected L4 nodes

### 1a-i-a → tier-based
- **1a-i-a-1. Start** — $500/mo.
- **1a-i-a-2. Build** — $1,000/mo.
- **1a-i-a-3. Scale** — $200,000/mo.

### 6a-iii-a → Python SDK
- **6a-iii-a-1. Per-request** — extra_headers.
- **6a-iii-a-2. Client-wide** — default_headers.
- **6a-iii-a-3. CLI** — --workspace-id.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → Start tier
- **1a-i-a-1-1. Cap** — $500.
- **1a-i-a-1-2. Limits** — lower RPM/ITPM/OTPM.
- **1a-i-a-1-3. Upgrade** — request increase.

### 6a-iii-a-1 → per-request header
- **6a-iii-a-1-1. Use** — multi-workspace key.
- **6a-iii-a-1-2. Omit** — single-workspace key.
- **6a-iii-a-1-3. Error** — 400 if required and missing.

## Confidence & open questions

- **Confidence: high** — fetched live from platform.claude.com/docs/en/manage-claude/workspaces + authentication.
- **Open:** should 9router adopt workspace-style grouping (see E26)?
- **Open:** should 9router support per-workspace limits like Anthropic?

## Sources

- https://platform.claude.com/docs/en/manage-claude/workspaces
- https://platform.claude.com/docs/en/manage-claude/authentication (fetched 2026-09-15)
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §B.2