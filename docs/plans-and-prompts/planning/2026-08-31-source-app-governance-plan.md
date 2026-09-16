# Plan: Source-App Governance — Attribution, Rate Limits, Queues, Identity Routing, Guardrails, Credentials, Agent Identity

**Date:** 2026-08-31
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #plan #attribution #rate-limits #queue #guardrails #credentials #identity #routing

## Goal

Turn the two questions — *"where do my messages come from?"* and *"where do my messages go?"* — into product features on 9router:

1. **Track where messages come from** — per-source-app, per-key, per-user attribution of every request.
2. **Per-source-app rate limiting** — extend the inbound limiter from per-IP to per-(IP, source-app) and per-key.
3. **Queue management** — bounded, prioritized queue with backpressure instead of hard 429s.
4. **Profile/identity-based routing** — route by key/user profile (model allowlists, budgets, task-based routing).
5. **Guardrails** — budget caps, model/provider allowlists, PII/content filters, prompt-injection detection.
6. **Credentials management** — key metadata, rotation, expiry, per-key usage attribution.
7. **Agent identity/attribution** — trusted client identity headers + UA fingerprinting + per-key identity.

Research foundation: `../research/2026-08-31-message-origin-and-destination-research.md`.

## Scope

**In scope:**
- Attribution pipeline (UA fingerprint + trusted identity headers + key metadata) persisted to usage records.
- Per-key and per-source-app rate limits (token-bucket), `x-ratelimit-*` response headers, 429 + `Retry-After`.
- Bounded priority queue with TTL and backpressure (opt-in per key).
- Key metadata CRUD (name, owner, tags, model allowlist, budget, rate limits) + dashboard management UI.
- Guardrails: per-key budgets (USD, daily/weekly/monthly reset), model/provider allowlists, regex content filters (redact/block), prompt-injection detection.
- Dashboard: Sources view (per-app/per-key/per-user), Limits & Budgets view, Guardrails view.

**Out of scope (future phases):**
- Teams/workspaces with shared budgets (Phase 4).
- Cloud-sync of guardrail config.
- MCP server for gateway management.
- Per-model upstream rate-limit mirroring (we surface upstream 429s, we don't pre-empt them).

## Milestones

### M1: Attribution & Observability (answers "where do my messages come from?")

**Files touched:**
- `src/lib/sourceApps.js` — add agent rules: Codex CLI (`codex`), Gemini CLI, Aider, Cline, Roo Code, Windsurf, Zed, Warp, Continue (already), OpenRouter SDK, `X-9R-App` header override.
- `src/lib/db/migrations/` — new migration: `api_keys` metadata columns (`name`, `owner`, `tags`, `created_at`, `last_used_at`) + `usage_attribution` table (key_id, source_app, user_id, task_type, provider, model, tokens, cost, ts).
- `src/lib/db/repos/` — `apiKeysRepo.js` (metadata CRUD), `attributionRepo.js` (write/query).
- `src/sse/handlers/chat.js` — capture `X-9R-App` / `X-9R-User` / `X-9R-Session` headers (trusted only after key auth), thread through to usage meta.
- `src/lib/usageDb.js` — persist attribution fields.
- Dashboard: `src/app/(dashboard)/dashboard/usage/` — new "Sources" tab: per-app/per-key/per-user counts, tokens, task-type breakdown, upstream provider/model breakdown.

**Acceptance:**
- Every request records source_app, key_id (if keyed), user (if provided), task_type, upstream provider/model.
- Dashboard Sources view filters by app/key/user and shows upstream destination breakdown.
- No raw UA stored (privacy preserved).

### M2: Per-Key & Per-Source-App Rate Limits (answers "where do my messages go?" — control)

**Files touched:**
- `custom-server.rate-limiter.js` — extend from per-IP sliding window to **token-bucket** with dimensions: IP, source-app class, API key. Config: `rateLimits` in settings (per-key RPM/TPM, per-app RPM, per-IP defaults preserved).
- `custom-server.js` — resolve API key from `Authorization` header before rate-limit check; pass key_id + source_app into limiter.
- `src/lib/db/repos/settingsRepo.js` — persist rate-limit config.
- Response headers: `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`, `retry-after` on 429.
- Loopback bypass preserved; per-key limits apply even on loopback (keys are explicit identities).

**Acceptance:**
- Per-key RPM/TPM enforced with token-bucket semantics; 429 + `Retry-After` + `x-ratelimit-*` headers.
- Per-source-app RPM enforced (e.g., cap a misbehaving agent).
- Existing per-IP behavior unchanged for unauthenticated traffic.

### M3: Queue Management (opt-in backpressure)

**Files touched:**
- `src/sse/handlers/chat.js` — optional queue path when key has `queue: {enabled: true, maxSize, ttlMs, priority}`.
- New `src/lib/queue.js` — bounded FIFO with priority levels, per-key TTL, head-of-line protection (per-key fairness), 503 + `Retry-After` when full.
- Dashboard: per-key queue config + live queue depth view.

**Acceptance:**
- Requests beyond rate limit are queued (not 429'd) when key opts in; queue depth visible; TTL expiry → 429.
- No queue for non-opted keys (default behavior unchanged).

### M4: Profile/Identity-Based Routing

**Files touched:**
- `src/lib/db/repos/apiKeysRepo.js` — key profile: `modelAllowlist`, `providerAllowlist`, `defaultModel`, `taskOverrides` (taskType → model).
- `src/sse/services/smartRouter.js` — apply key profile as a filter after task classification: intersect key allowlist with smart-router candidates; key `defaultModel` wins for `general_chat`.
- `src/sse/handlers/chat.js` — resolve key profile before combo expansion.

**Acceptance:**
- A key with `modelAllowlist: ["claude-*"]` can never route to non-Claude models, even via combos/fallback.
- Task-based overrides per key work (e.g., code → `best-code`, chat → `best-chat`).

### M5: Guardrails

**Files touched:**
- New `src/lib/guardrails.js` — budget tracker (USD, daily/weekly/monthly reset, soft/hard), regex content filters (redact/block, JS-flavored regex, no lookaheads), prompt-injection detection patterns, PII redaction (basic patterns: emails, phones, SSNs).
- `src/sse/handlers/chat.js` — guardrail pipeline before dispatch: budget check → allowlist check → content scan (request) → response scan (redact/block).
- `src/lib/db/repos/guardrailsRepo.js` + migration — per-key guardrail config.
- 403 responses with structured error body (mirror OpenRouter `openrouter_metadata` style stage info).
- Dashboard: Guardrails view (per-key config, budget usage bars, blocked-request log).

**Acceptance:**
- Budget hard limit blocks with 403; soft limit warns (response header `x-9r-budget-warning`).
- Allowlist intersection enforced (key ∩ global).
- Content filters redact or block per config; prompt-injection patterns flagged in logs.

### M6: Credentials Management (key lifecycle)

**Files touched:**
- `src/lib/db/repos/apiKeysRepo.js` — key rotation (regenerate with grace period), expiry (`expires_at`, presets 3h/1d/7d/30d/custom), disable/archive.
- `src/app/api/v1/*` auth path — expired/disabled keys → 401 with clear error.
- Dashboard: Keys view — create/edit/rotate/expire keys, per-key usage + budget + rate-limit summary.
- `src/lib/usageDb.js` — per-key cost attribution (already partially there via meta).

**Acceptance:**
- Full key lifecycle from dashboard; expired keys rejected; rotation keeps old key valid for grace window (configurable).

### M7: Agent Identity & Attribution (trusted identity headers)

**Files touched:**
- `src/lib/sourceApps.js` — `X-9R-App` override (validated against known app list; unknown → `unknown`).
- `src/sse/handlers/chat.js` — `X-9R-User` / `X-9R-Session` captured only when request authenticated with a key (never trusted from anonymous traffic).
- `src/lib/db/repos/attributionRepo.js` — session grouping for per-conversation attribution.
- Docs: `docs/ARCHITECTURE.md` + README — document the identity header contract for client apps.

**Acceptance:**
- Clients can self-identify via headers; spoofing from anonymous traffic is impossible (headers ignored without key auth).
- Per-session attribution visible in dashboard.

## Dependencies & Risks

- **M2 depends on M1** (key resolution + attribution needed for per-key limits).
- **M4 depends on M2** (key profiles need key metadata from M1/M6).
- **M5 depends on M4** (guardrails apply to resolved profiles).
- **Risk:** token-bucket limiter must stay zero-dependency and in-memory (custom-server runs outside Next). Keep sweep/eviction like current limiter.
- **Risk:** queue adds latency + memory; must be opt-in and bounded (maxSize + TTL).
- **Risk:** content scanning cost on large payloads — scan only text content blocks, cap scanned bytes, fail-open on scan errors (mirror RTK fail-open convention).
- **Risk:** privacy — never persist raw UA; only source-app class (existing convention).
- **Risk:** header spoofing — identity headers trusted only post-auth (documented in M7).

## References

- Research: `../research/2026-08-31-message-origin-and-destination-research.md`
- Existing: `src/lib/sourceApps.js`, `custom-server.rate-limiter.js`, `open-sse/services/smartRouter.js`, `src/sse/services/smartRouter.js`, `src/lib/usageDb.js`, `src/lib/db/`
- ADRs: `../tracking/decisions/` (new ADRs for key metadata schema, token-bucket limiter, guardrail hierarchy)
- Template: `../templates/WORK-ITEM-TEMPLATE.md`