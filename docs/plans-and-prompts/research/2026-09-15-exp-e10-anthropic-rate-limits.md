# Exponential Expansion E10 — Anthropic Rate Limits

**Date:** 2026-09-15
**Root phrase:** "Anthropic rate limits (token bucket, RPM/ITPM/OTPM, cache-aware ITPM, spend limits, tiers, headers)" — from `2026-08-31-message-origin-and-destination-research.md` §B.2
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Token bucket algorithm
2. RPM (requests/min)
3. ITPM (input tokens/min)
4. OTPM (output tokens/min)
5. Cache-aware ITPM
6. Usage tiers (Start/Build/Scale/Custom)
7. Spend limits (monthly caps)
8. Response headers (anthropic-ratelimit-*)
9. 429 + retry-after-ms
10. Rate Limits API
11. Workspace-level caps
12. Acceleration limits

## L2 — expansion of each L1 node

### 1. Token bucket algorithm
- **1a. Continuous refill** — capacity replenished continuously.
- **1b. Burst capacity** — bucket size = burst.
- **1c. Not fixed intervals** — no reset at fixed times.
- **1d. Per-model** — limits per model class.

### 2. RPM
- **2a. Definition** — requests per minute.
- **2b. Enforcement** — may be 1 req/sec for 60 RPM.
- **2c. Bursts** — short bursts can exceed and trigger errors.

### 3. ITPM
- **3a. Definition** — input tokens per minute.
- **3b. Estimated at start** — adjusted during request.
- **3c. Cache-aware** — only uncached input counts for most models.

### 4. OTPM
- **4a. Definition** — output tokens per minute.
- **4b. Real-time** — evaluated as tokens produced.
- **4c. max_tokens** — does NOT factor into OTPM.

### 5. Cache-aware ITPM
- **5a. input_tokens** — tokens after last cache breakpoint ✓ count.
- **5b. cache_creation_input_tokens** — tokens written to cache ✓ count.
- **5c. cache_read_input_tokens** — tokens read from cache ✗ don't count (most models).
- **5d. Haiku 3.5 exception** — counts cache_read toward ITPM.
- **5e. Effective throughput** — 80% cache hit → 10M effective from 2M ITPM.

### 6. Usage tiers
- **6a. Start** — $500/mo cap; lower limits.
- **6b. Build** — $1,000/mo cap.
- **6c. Scale** — $200,000/mo cap.
- **6d. Custom** — no cap; arranged with account team.
- **6e. Evaluation tier** — new orgs start here.

### 7. Spend limits
- **7a. Tier cap** — monthly max.
- **7b. Own limit** — set below tier cap.
- **7c. Reached cap** — 429 with `enforced_spend_limit_reached`.
- **7d. No retry-after** — spend-cap 429 has no retry-after.
- **7e. Own limit reached** — 400 invalid_request_error.
- **7f. Resume** — 00:00 UTC first of next month.

### 8. Response headers
- **8a. retry-after** — seconds to wait.
- **8b. anthropic-ratelimit-requests-limit/remaining/reset** — request limits.
- **8c. anthropic-ratelimit-tokens-limit/remaining/reset** — token limits.
- **8d. anthropic-ratelimit-input-tokens-* / output-tokens-*** — per-type.
- **8e. anthropic-priority-*** — Priority Tier only.
- **8f. anthropic-workspace-id** — which workspace counted.

### 9. 429 + retry-after-ms
- **9a. Response** — 429 rate_limit_error.
- **9b. retry-after-ms** — SDKs auto-retry with exponential backoff.
- **9c. Which limit** — error describes which was exceeded.

### 10. Rate Limits API
- **10a. Org-level** — GET /v1/organizations/rate_limits.
- **10b. Workspace-level** — GET /v1/organizations/workspaces/{id}/rate_limits.

### 11. Workspace-level caps
- **11a. Purpose** — protect workspaces from overuse.
- **11b. Per limiter** — RPM/ITPM/OTPM separately.
- **11c. Default workspace** — can't set limits.
- **11d. Org limits always apply** — even if workspace limits sum higher.

### 12. Acceleration limits
- **12a. Sharp increase** — 429 from acceleration limits.
- **12b. Avoid** — ramp gradually, consistent patterns.

## L3 — expansion of selected L2 nodes

### 1d → per-model limits
- **1d-i. Model classes** — Opus, Sonnet, Haiku, Fable.
- **1d-ii. Combined buckets** — Opus 4.x share a limit; Sonnet 4.x share.
- **1d-iii. Separate** — Opus 5 separate from Opus 4.x.

### 5e → effective throughput
- **5e-i. Formula** — 2M ITPM + 8M cached = 10M effective.
- **5e-ii. Cache strategy** — cache system prompts, docs, tools.
- **5e-iii. Monitor** — cache hit rate on Usage page.

### 6a → Start tier limits
- **6a-i. Opus 5** — 1,000 RPM / 2,000,000 ITPM / 400,000 OTPM.
- **6a-ii. Sonnet 5** — 1,000 RPM / 2,000,000 ITPM / 400,000 OTPM.
- **6a-iii. Haiku 4.5** — 1,000 RPM / 2,000,000 ITPM / 400,000 OTPM.

### 6b → Build tier limits
- **6b-i. Opus 5** — 5,000 RPM / 5,000,000 ITPM / 1,000,000 OTPM.
- **6b-ii. Sonnet 5** — 5,000 RPM / 5,000,000 ITPM / 1,000,000 OTPM.

### 6c → Scale tier limits
- **6c-i. Opus 5** — 10,000 RPM / 10,000,000 ITPM / 2,000,000 OTPM.
- **6c-ii. Sonnet 5** — 10,000 RPM / 10,000,000 ITPM / 2,000,000 OTPM.

### 8b → requests headers
- **8b-i. limit** — max requests per period.
- **8b-ii. remaining** — requests left.
- **8b-iii. reset** — RFC 3339 replenish time.

### 8c → tokens headers
- **8c-i. limit** — max tokens.
- **8c-ii. remaining** — rounded to nearest thousand.
- **8c-iii. reset** — RFC 3339.

### 9b → SDK backoff
- **9b-i. Exponential** — doubling delays.
- **9b-ii. Retry-after honored** — SDKs wait.
- **9b-iii. Spend-cap** — SDK retries fail until resume.

## L4 — expansion of selected L3 nodes

### 1d-i → model classes
- **1d-i-a. Opus** — largest, reasoning.
- **1d-i-b. Sonnet** — balanced.
- **1d-i-c. Haiku** — fast/cheap.
- **1d-i-d. Fable** — combined limit across Fable 5.1 + 5.

### 5e-i → formula
- **5e-i-a. Uncached** — 2M.
- **5e-i-b. Cached** — 8M.
- **5e-i-c. Total** — 10M effective.

### 6a-i → Opus 5 Start
- **6a-i-a. RPM** — 1,000.
- **6a-i-b. ITPM** — 2,000,000.
- **6a-i-c. OTPM** — 400,000.

### 8b-iii → reset format
- **8b-iii-a. RFC 3339** — ISO 8601 timestamp.
- **8b-iii-b. Example** — 2026-09-15T12:00:00Z.

## L5 — expansion of selected L4 nodes

### 1d-i-a → Opus
- **1d-i-a-1. Use** — complex reasoning.
- **1d-i-a-2. Cost** — highest.
- **1d-i-a-3. Rate limits** — shared across 4.x.

### 5e-i-a → uncached
- **5e-i-a-1. input_tokens** — after last breakpoint.
- **5e-i-a-2. cache_creation** — writes.
- **5e-i-a-3. Total uncached** — sum.

### 8b-iii-a → RFC 3339
- **8b-iii-a-1. Format** — YYYY-MM-DDTHH:MM:SSZ.
- **8b-iii-a-2. Parse** — Date.parse.
- **8b-iii-a-3. Display** — local time.

## L6 — expansion of selected L5 nodes

### 1d-i-a-3 → shared 4.x limits
- **1d-i-a-3-1. Opus 4.8/4.7/4.6/4.5** — combined.
- **1d-i-a-3-2. Opus 5** — separate.
- **1d-i-a-3-3. Impact** — one model can exhaust the bucket for all.

### 5e-i-a-1 → after last breakpoint
- **5e-i-a-1-1. Breakpoint** — cache boundary.
- **5e-i-a-1-2. Example** — 200k cached doc + 50 token question → input_tokens: 50.
- **5e-i-a-1-3. Total** — 200,050.

## Confidence & open questions

- **Confidence: high** — fetched live from platform.claude.com/docs/en/api/rate-limits.
- **Open:** should 9router surface anthropic-ratelimit-* headers in usage?
- **Open:** should 9router implement token-bucket semantics per model?

## Sources

- https://platform.claude.com/docs/en/api/rate-limits (fetched 2026-09-15)
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §B.2