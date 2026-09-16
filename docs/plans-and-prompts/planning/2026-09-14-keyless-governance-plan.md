# Plan: Keyless Governance — Agent Profiles, Synthetic Tracking, Tag Priority Queues, Gate Levels, Model-Group Limiting, Adaptive Rate Control

**Date:** 2026-09-14
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #plan #governance #keyless #profiles #queue #priority #gate-levels #model-groups #adaptive-rate

## Goal

Give the user a **keyless-first governance system** for 9router: control and gate requests via agent profiles, gate levels, guardrails, tag/keyword priority queues, and model-group limiting with adaptive rate control — while tracking where messages come from programmatically and synthetically, with multiple options.

Research foundation: `../research/2026-09-14-keyless-governance-research.md` (and the original `../research/2026-08-31-message-origin-and-destination-research.md`).

## Scope

**In scope:**
- Agent profiles (named identity bundles) as keyless identity + policy.
- Synthetic source labels + behavioral fingerprints for tracking without identity cooperation.
- Tag/keyword priority queues (tags = keyword groups → priority class).
- Gate levels (L0–L5 identity-confidence ladder).
- Model groups (shared RPM/TPM budget across models, e.g. 9 qwen models) with interval pacing.
- Adaptive/predictive rate control (AIMD + EWMA + 429 feedback + budget-proportional pacing).
- UI: Profiles, Gates, Tags, Model Groups, Queue depth, Adaptive-rate dashboard.

**Out of scope (future):**
- mTLS/client certs (L5) — listed in research, not built.
- Prompt-embedding clustering for synthetic sources (expensive; future).
- OAuth/device flow.
- Cloud-sync of governance config.

## Milestones

### M1: Agent Profiles (keyless identity)

**Files touched:**
- `src/lib/db/migrations/` — new migration: `agent_profiles` table (name, app, uaPatterns, allowedHeaders, allowedIps, modelAllowlist, providerAllowlist, rateLimits, budget, priority, tags, guardrails, gateLevel, enabled).
- `src/lib/db/repos/agentProfilesRepo.js` — CRUD.
- `src/sse/handlers/chat.js` — profile resolution: key → `X-9R-Profile` header (post-auth/trusted net) → UA+IP match → default profile.
- `src/lib/sourceApps.js` — expose class for profile matching.
- Dashboard: `src/app/(dashboard)/dashboard/profiles/` — Profiles page (create/edit/delete, policy editor).

**Acceptance:**
- Requests without keys resolve to a profile (or default); profile policy (limits/models/priority) applied.
- Profile matching by UA+IP works; `X-9R-Profile` header works from trusted net.
- Profiles page CRUD works; changes take effect without restart.

### M2: Synthetic Source Tracking

**Files touched:**
- New `src/lib/syntheticSource.js` — `syntheticSource(uaClass, ipPrefix, sessionId)` hash; behavioral fingerprint (arrival rate, request size, tool-use frequency → cluster).
- `src/lib/usageDb.js` — persist `meta.syntheticSource` (hash only, never inputs).
- `src/sse/handlers/chat.js` — compute + thread synthetic source.
- Dashboard: Sources view — group by synthetic source alongside app/key/user.

**Acceptance:**
- Every request gets a stable synthetic source label; dashboard groups by it.
- Behavioral fingerprint clusters requests into "agents" without identity cooperation.
- No raw inputs persisted (privacy).

### M3: Tag/Keyword Priority Queues

**Files touched:**
- New `src/lib/tags.js` — tag definitions (name, keywords, priority, action: allow/block/redact); matching scans last user message (string or array content, smartRouter pattern).
- New `src/lib/queue.js` — bounded priority queue: strict priority + WFQ + aging, per-profile fairness, TTL, backpressure (503/429 + Retry-After).
- `src/sse/handlers/chat.js` — tag match → priority class → queue.
- `src/lib/db/repos/tagsRepo.js` + migration — tag config.
- Dashboard: Tags page (keyword editor, priority, allow/block/redact action); Queue view (depth, per-class counts, TTL).

**Acceptance:**
- Prompt with "urgent" keywords gets higher priority than plain chat.
- Blocked tags → 403; redacted tags → content redacted before dispatch.
- Queue bounded; TTL expiry → 429; per-profile fairness prevents starvation.

### M4: Gate Levels

**Files touched:**
- New `src/lib/gates.js` — L0–L5 ladder evaluation; request clears highest level; per-profile gate config.
- `src/sse/handlers/chat.js` — gate evaluation before policy/queue.
- `src/lib/db/repos/gatesRepo.js` + migration — gate config.
- Dashboard: Gates page (per-level limits/models/priority editor); usage view shows "current gate" per request.

**Acceptance:**
- A request's gate level determines its policy (limits/models/priority).
- Profile with `gateLevel: 2` only activates for requests clearing L2.
- Gate config editable in UI; changes live.

### M5: Model-Group Limiting + Interval Pacing

**Files touched:**
- New `src/lib/modelGroups.js` — group definitions (provider, models, rpm, tpm, pacing {intervalMs, burst}); auto-derive by provider+family prefix or explicit list; reuse combo membership.
- `src/sse/handlers/chat.js` — group budget check before dispatch; group queue with interval pacing (leaky-bucket drain).
- `src/lib/db/repos/modelGroupsRepo.js` + migration — group config.
- `src/lib/usageDb.js` — record `model_group` (LiteLLM precedent).
- Dashboard: Model Groups page (create/edit, per-group limits, pacing, live usage); queue depth per group.

**Acceptance:**
- 9 qwen models under one group share a cap; excess requests queue and drain at paced intervals (no burst).
- Upstream 429 → group cooldown (5s default, configurable).
- `model_group` recorded in usage; dashboard shows per-group throughput.

### M6: Adaptive/Predictive Rate Control

**Files touched:**
- New `src/lib/adaptiveRate.js` — AIMD + EWMA arrival-rate tracking + 429 feedback + budget-proportional pacing; per model-group and per-profile.
- `custom-server.rate-limiter.js` — integrate adaptive rate for inbound; keep static limits as floor.
- `src/sse/handlers/chat.js` — adaptive rate check before dispatch.
- Dashboard: Adaptive Rate view — current_rate, incoming rate, 429 count, surge events per group; manual override.

**Acceptance:**
- Rate adapts: surge → multiplicative decrease; quiet → additive increase; 429 → halve + cooldown.
- EWMA predicts surges and pre-throttles.
- Budget-proportional pacing: allowed = remaining_budget / remaining_time.
- UI shows live adaptive state; manual override works.

### M7: Governance Dashboard (unified)

**Files touched:**
- Dashboard: `src/app/(dashboard)/dashboard/governance/` — unified view: Profiles, Gates, Tags, Model Groups, Queue, Adaptive Rate, Guardrails (from original M5), Keys (from original M6).
- `src/lib/db/repos/` — cross-entity queries (profile → usage, group → usage).

**Acceptance:**
- One page to see and control all governance: who (profiles), how trusted (gates), what's allowed (tags/guardrails), how fast (groups/adaptive), where it goes (routing).
- Per-profile/per-group usage drill-down.

## Dependencies & Risks

- **M1 → M2 → M3 → M4** sequential (identity → tracking → queue → gates).
- **M5 depends on M1** (profiles reference groups) and existing combo engine.
- **M6 depends on M5** (adaptive rate per group).
- **M7 depends on all.**
- **Risk:** profile matching by UA is spoofable — mitigated by gate levels (L2+ requires trusted net or key).
- **Risk:** queue adds latency/memory — bounded + TTL + opt-in per profile.
- **Risk:** adaptive rate oscillation — AIMD parameters need tuning; expose in UI.
- **Risk:** synthetic labels privacy — persist hash only (existing convention).
- **Risk:** tag scanning cost — scan only last user message, cap bytes, fail-open (RTK convention).
- **Risk:** model-group auto-derivation false positives — require explicit opt-in or prefix confirmation.

## References

- Research: `../research/2026-09-14-keyless-governance-research.md`, `../research/2026-08-31-message-origin-and-destination-research.md`
- Existing: `src/lib/sourceApps.js`, `custom-server.rate-limiter.js`, `open-sse/services/smartRouter.js`, `src/sse/services/smartRouter.js`, `src/lib/usageDb.js`, `src/lib/db/`
- ADRs: `../tracking/decisions/` (new ADRs for agent profiles, synthetic sources, model groups, adaptive rate)
- Template: `../templates/WORK-ITEM-TEMPLATE.md`