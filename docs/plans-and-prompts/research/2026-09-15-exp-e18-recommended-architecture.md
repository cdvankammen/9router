# Exponential Expansion E18 — Recommended Architecture (Phases)

**Date:** 2026-09-15
**Root phrase:** "Recommended architecture (Phase 1 attribution, Phase 2 control, Phase 3 teams)" — from `2026-08-31-message-origin-and-destination-research.md` §C.3
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Phase 1 — Attribution & observability
2. Phase 1.1 — Extend sourceApps.js with more agent rules
3. Phase 1.2 — Optional client identity headers (X-9R-App/User/Session)
4. Phase 1.3 — API-key metadata (name, owner, tags)
5. Phase 1.4 — Dashboard "Sources" view
6. Phase 2 — Control plane
7. Phase 2.1 — Per-key rate limits + per-model limits
8. Phase 2.2 — Per-key budgets (USD)
9. Phase 2.3 — Per-key model/provider allowlists
10. Phase 2.4 — Optional queueing + guardrails
11. Phase 3 — Teams/workspaces (optional)

## L2 — expansion of each L1 node

### 1. Phase 1 — Attribution
- **1a. Goal** — answer "where from".
- **1b. Scope** — observability only.
- **1c. Deliverables** — rules, headers, metadata, view.

### 2. Phase 1.1 — Extend sourceApps
- **2a. New agents** — Codex, Gemini CLI, Aider, Cline, Roo, Windsurf.
- **2b. Rules** — regex per agent.
- **2c. Ordering** — most-specific-first.

### 3. Phase 1.2 — Identity headers
- **3a. X-9R-App** — app name.
- **3b. X-9R-User** — user id.
- **3c. X-9R-Session** — session id.
- **3d. Trust** — post-auth only.
- **3e. Storage** — usage meta.

### 4. Phase 1.3 — Key metadata
- **4a. Name** — label.
- **4b. Owner** — user.
- **4c. Tags** — grouping.
- **4d. DB** — keys table.
- **4e. Attribution** — per-key usage.

### 5. Phase 1.4 — Sources view
- **5a. Per-app** — counts.
- **5b. Per-key** — counts.
- **5c. Per-user** — counts.
- **5d. Task breakdown** — task types.
- **5e. Upstream breakdown** — provider/model.

### 6. Phase 2 — Control
- **6a. Goal** — answer "where to".
- **6b. Scope** — limits/budgets/allowlists.
- **6c. Deliverables** — rate limits, budgets, allowlists.

### 7. Phase 2.1 — Rate limits
- **7a. Per-key RPM/TPM** — token bucket.
- **7b. Per-model limits** — model-level.
- **7c. Headers** — x-ratelimit-*.
- **7d. 429** — retry-after.

### 8. Phase 2.2 — Budgets
- **8a. USD** — per key.
- **8b. Soft/hard** — warn/block.
- **8c. Reset** — daily/weekly/monthly.

### 9. Phase 2.3 — Allowlists
- **9a. Models** — per key.
- **9b. Providers** — per key.
- **9c. Intersection** — with global.

### 10. Phase 2.4 — Queueing + guardrails
- **10a. Queueing** — priority.
- **10b. Guardrails** — PII/content.
- **10c. Later phase** — optional.

### 11. Phase 3 — Teams
- **11a. Group keys** — teams.
- **11b. Shared budgets** — team-level.
- **11c. Workspace defaults** — workspace-level.
- **11d. Mirrors** — Anthropic workspaces + OpenRouter guardrails + LiteLLM teams.

## L3 — expansion of selected L2 nodes

### 2a → new agents
- **2a-i. Codex** — codex-cli.
- **2a-ii. Gemini CLI** — gemini-cli.
- **2a-iii. Aider** — aider.
- **2a-iv. Cline** — cline.
- **2a-v. Roo** — roo.
- **2a-vi. Windsurf** — windsurf.

### 3d → post-auth trust
- **3d-i. Key auth** — then trust.
- **3d-ii. Trusted subnet** — also trust.
- **3d-iii. Otherwise** — claim.

### 4d → DB
- **4d-i. Table** — api_keys.
- **4d-ii. Columns** — id, name, owner, tags, created_at.
- **4d-iii. Migration** — new migration.

### 5a → per-app counts
- **5a-i. Source** — sourceApp class.
- **5a-ii. Filter** — dashboard.
- **5a-iii. Export** — CSV.

### 7a → per-key RPM/TPM
- **7a-i. Token bucket** — refill.
- **7a-ii. Burst** — capacity.
- **7a-iii. Per key** — independent.

### 8b → soft/hard
- **8b-i. Soft** — warning.
- **8b-ii. Hard** — block.
- **8b-iii. Config** — per key.

### 11d → mirrors
- **11d-i. Anthropic workspaces** — wrkspc_.
- **11d-ii. OpenRouter guardrails** — member/key.
- **11d-iii. LiteLLM teams** — shared budgets.

## L4 → expansion of selected L3 nodes

### 2a-i → Codex
- **2a-i-a. UA** — codex-cli/.
- **2a-i-b. Rule** — /codex-cli|codex\//i.
- **2a-i-c. Already exists** — in sourceApps.

### 3d-i → key auth
- **3d-i-a. Bearer** — Authorization.
- **3d-i-b. Verify** — API_KEY_SECRET.
- **3d-i-c. Then headers** — honored.

### 4d-i → api_keys table
- **4d-i-a. Schema** — id TEXT PK, name TEXT, owner TEXT, tags TEXT, created_at INTEGER.
- **4d-i-b. Hash** — key_hash TEXT.
- **4d-i-c. Status** — active/disabled.

### 7a-i → token bucket
- **7a-i-a. Refill** — continuous.
- **7a-i-b. Capacity** — burst.
- **7a-i-c. Per key** — independent.

### 11d-i → Anthropic workspaces
- **11d-i-a. wrkspc_** — prefix.
- **11d-i-b. Limits** — per workspace.
- **11d-i-c. Header** — anthropic-workspace-id.

## L5 → expansion of selected L4 nodes

### 2a-i-a → Codex UA
- **2a-i-a-1. Format** — codex-cli/0.x.
- **2a-i-a-2. Android** — CodexDroid.
- **2a-i-a-3. Rule** — adjacency guard.

### 4d-i-a → schema
- **4d-i-a-1. id** — sk- prefix.
- **4d-i-a-2. name** — label.
- **4d-i-a-3. owner** — user.
- **4d-i-a-4. tags** — JSON array.

### 7a-i-a → refill
- **7a-i-a-1. Rate** — tokens/sec.
- **7a-i-a-2. Formula** — limit/60.
- **7a-i-a-3. Example** — 60 RPM → 1/s.

### 11d-i-b → per-workspace limits
- **11d-i-b-1. RPM** — per workspace.
- **11d-i-b-2. ITPM** — per workspace.
- **11d-i-b-3. OTPM** — per workspace.

## L6 → expansion of selected L5 nodes

### 2a-i-a-1 → codex-cli format
- **2a-i-a-1-1. Version** — 0.x.
- **2a-i-a-1-2. Slash** — codex-cli/.
- **2a-i-a-1-3. Match** — regex.

### 4d-i-a-1 → sk- prefix
- **4d-i-a-1-1. Format** — sk-<random>.
- **4d-i-a-1-2. Length** — 32+.
- **4d-i-a-1-3. Hash** — stored.

### 7a-i-a-1 → tokens/sec
- **7a-i-a-1-1. RPM** — requests.
- **7a-i-a-1-2. TPM** — tokens.
- **7a-i-a-1-3. Per model** — model-specific.

## Confidence & open questions

- **Confidence: high** — synthesis of codebase + industry research.
- **Open:** which phase ships first?
- **Open:** are teams/workspaces in scope?

## Sources

- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §C.3
- `docs/plans-and-prompts/planning/2026-08-31-source-app-governance-plan.md` (M1–M7)