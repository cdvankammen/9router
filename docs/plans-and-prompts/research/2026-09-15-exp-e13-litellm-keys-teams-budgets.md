# Exponential Expansion E13 — LiteLLM Virtual Keys / Teams / Budgets

**Date:** 2026-09-15
**Root phrase:** "LiteLLM virtual keys/teams/budgets (key CRUD, budgets, rate limits, metadata, model access groups)" — from `2026-08-31-message-origin-and-destination-research.md` §B.3
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Virtual keys (`sk-...`)
2. Per-key budgets (USD)
3. Per-key rate limits (RPM/TPM)
4. Model restrictions
5. Metadata (user, team, tags)
6. Spend tracking
7. Key rotation/regeneration
8. Soft/hard limits
9. Teams (shared budgets/limits)
10. Users (per-user budgets/limits, `user` field)
11. Budget resets (daily/weekly/monthly)
12. Management API (`/key/generate`, `/key/info`, `/key/update`, `/key/delete`, `/team/*`, `/user/*`)
13. Model access groups

## L2 — expansion of each L1 node

### 1. Virtual keys
- **1a. Format** — `sk-...`.
- **1b. Concept** — keys are virtual; map to upstream keys.
- **1c. Isolation** — per-key limits/budgets.
- **1d. Revocation** — delete without touching upstream.

### 2. Per-key budgets
- **2a. USD** — dollar amount.
- **2b. Soft limit** — warning.
- **2c. Hard limit** — block.
- **2d. Reset** — daily/weekly/monthly.

### 3. Per-key rate limits
- **3a. RPM** — requests/min.
- **3b. TPM** — tokens/min.
- **3c. 429** — with retry info.

### 4. Model restrictions
- **4a. Allowlist** — models a key can use.
- **4b. Empty** — allow all.
- **4c. Model access groups** — named groups.

### 5. Metadata
- **5a. Arbitrary KV** — e.g. `{"app": "claude-code", "user": "alice"}`.
- **5b. Attribution** — per-key usage attribution.
- **5c. Search** — filter keys by metadata.

### 6. Spend tracking
- **6a. Per-key** — spend per key.
- **6b. Per-team** — spend per team.
- **6c. Per-user** — spend per user.

### 7. Key rotation/regeneration
- **7a. Regenerate** — new key value, same config.
- **7b. Rotation** — periodic.
- **7c. Old key** — invalidated.

### 8. Soft/hard limits
- **8a. Soft** — warning at threshold.
- **8b. Hard** — block at limit.
- **8c. Config** — per-key or per-team.

### 9. Teams
- **9a. Group keys** — under a team.
- **9b. Shared budgets** — team-level.
- **9c. Shared rate limits** — team-level.
- **9d. Spend tracking** — team-level.

### 10. Users
- **10a. Per-user budgets** — user-level.
- **10b. Per-user rate limits** — user-level.
- **10c. `user` field** — in requests.

### 11. Budget resets
- **11a. Daily** — 24h cycle.
- **11b. Weekly** — 7d cycle.
- **11c. Monthly** — calendar month.

### 12. Management API
- **12a. /key/generate** — create key.
- **12b. /key/info** — key details.
- **12c. /key/update** — modify key.
- **12d. /key/delete** — revoke key.
- **12e. /team/*** — team CRUD.
- **12f. /user/*** — user CRUD.

### 13. Model access groups
- **13a. Named groups** — e.g. "gpt4-group".
- **13b. Restrict** — keys limited to group models.
- **13c. Reuse** — groups shared across keys.

## L3 — expansion of selected L2 nodes

### 1c → isolation
- **1c-i. Per-key limits** — independent.
- **1c-ii. Per-key budgets** — independent.
- **1c-iii. Per-key models** — independent.

### 2b → soft limit
- **2b-i. Warning** — at 80% (configurable).
- **2b-ii. Notification** — dashboard/email.
- **2b-iii. Continue** — requests still work.

### 2c → hard limit
- **2c-i. Block** — requests rejected.
- **2c-ii. Response** — 429/403.
- **2c-iii. Reset** — after period.

### 5a → metadata KV
- **5a-i. app** — application name.
- **5a-ii. user** — user id.
- **5a-iii. team** — team id.
- **5a-iv. tags** — arbitrary tags.

### 9b → shared budgets
- **9b-i. Team cap** — total across keys.
- **9b-ii. Per-key caps** — still apply.
- **9b-iii. Lower wins** — most restrictive.

### 12a → /key/generate
- **12a-i. Params** — budget, rate limits, models, metadata.
- **12a-ii. Response** — key value (shown once).
- **12a-iii. Storage** — hashed.

## L4 — expansion of selected L3 nodes

### 2b-i → 80% warning
- **2b-i-a. Threshold** — configurable.
- **2b-i-b. Alert channel** — dashboard.
- **2b-i-c. Action** — raise budget or warn user.

### 5a-i → app metadata
- **5a-i-a. Value** — "claude-code".
- **5a-i-b. Use** — attribution.
- **5a-i-c. Filter** — per-app usage.

### 9b-iii → lower wins
- **9b-iii-a. Team $100** — cap.
- **9b-iii-b. Key $30** — key cap.
- **9b-iii-c. Effective** — min($30, remaining team).

### 12a-i → generate params
- **12a-i-a. budget** — USD.
- **12a-i-b. rate_limit** — RPM/TPM.
- **12a-i-c. model** — allowlist.
- **12a-i-d. metadata** — KV.

## L5 — expansion of selected L4 nodes

### 2b-i-a → threshold config
- **2b-i-a-1. Default** — 80%.
- **2b-i-a-2. Per-key** — override.
- **2b-i-a-3. Per-team** — override.

### 5a-i-a → claude-code value
- **5a-i-a-1. Source** — client app.
- **5a-i-a-2. 9router analog** — sourceApp class.
- **5a-i-a-3. Cross-ref** — E01.

### 12a-i-a → budget param
- **12a-i-a-1. Amount** — USD.
- **12a-i-a-2. Period** — daily/weekly/monthly.
- **12a-i-a-3. Soft/hard** — both.

## L6 — expansion of selected L5 nodes

### 2b-i-a-1 → default 80%
- **2b-i-a-1-1. Rationale** — early warning.
- **2b-i-a-1-2. Config** — settings.
- **2b-i-a-1-3. Edge** — small budgets warn often.

### 5a-i-a-2 → sourceApp analog
- **5a-i-a-2-1. 9router** — sourceApps.js class.
- **5a-i-a-2-2. LiteLLM** — metadata app field.
- **5a-i-a-2-3. OpenRouter** — referer/title.

## Confidence & open questions

- **Confidence: high** — LiteLLM docs (official).
- **Open:** should 9router adopt virtual keys with metadata?
- **Open:** should 9router support teams with shared budgets?

## Sources

- LiteLLM virtual keys/teams/budgets docs
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §B.3