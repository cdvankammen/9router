# Upstream Provider Risks — Failure Modes & Resilience Gaps

**Date:** 2026-08-07
**Author:** GitHub Copilot agent (main session; subagent spawns attempted but model API was rate-limited/network-failing — recovery rationale documented in earlier sessions)
**Status:** draft
**Tags:** #research #providers #upstream #risks #resilience

## Purpose

Catalog the failure modes that upstream providers can inflict on 9Router, what
the app does today, and what it should do. Grounded in the live code + observed
log evidence from this session.

## Observed evidence this session (from in-app Console Log)

```
[TOKEN_REFRESH] xai refresh failed: xAI token refresh failed: {"error":"invalid_grant","error_description":"Invalid or unknown refresh token"}
[CHAT] Capacity adapter for [vision] on "openrouter/deepseek/deepseek-chat" → trying openrouter/openai/gpt-4o-mini, oc/mimo-v2.5-free
✗ ERROR 404 · openrouter/openai/gpt-4o-mini · "No endpoints available matching your guardrail restrictions and data policy"
[FALLBACK] ⇄ UNAVAILABLE (404) → NEXT ACCOUNT
```

Both failures were **handled correctly** (fail-open + fallback) — but they expose
the risk surface below.

## Risk table

| # | Risk | Likelihood | Impact | Current handling | Recommended action |
|---|------|-----------|--------|------------------|--------------------|
| 1 | **xAI refresh-token revocation** (invalid_grant) | High (seen) | OAuth provider dead until re-auth | Fail-open: refresh attempted, error logged, connection stays but unusable | UI badge on provider row "token expired — re-auth"; auto-disable connection after N consecutive refresh failures |
| 2 | **OpenRouter guardrail/privacy 404s** (model blocked by account settings) | Medium (seen) | Model unusable; every request burns a fallback slot | Locked 120s + fallback to next model | Surface the guardrail message to the user in the error body (it IS surfaced in error detail); hint "check provider privacy settings" when 404 code present |
| 3 | **Catalog drift** (TokenRouter 120-model snapshot vs live /v1/models) | Medium | Unlisted models still work (passthroughModels) but pricing/thinking config missing → wrong cost estimates | modelsFetcher refreshes list; pricing falls back to canonical | Re-validate pricing entries against /api/pricing periodically; flag "pricing estimate" vs "exact" in usage UI |
| 4 | **reasoning_effort enum drift** (TokenRouter low/medium/high/xhigh/max) | Low-Med | 400s if enum changes | Omit field when "none"/auto; pass through otherwise | Centralize enum per provider; on 400 mentioning reasoning_effort, retry without it |
| 5 | **Self-hosted STT/TTS/Embedding baseUrl misconfig** | Medium | 400 with reason (fail-visible design) — good | Throws with reason, surfaced to user | Add connection "Test" button that hits /v1/models on the configured baseUrl |
| 6 | **Self-hosted endpoint format drift** (whisper.cpp vs OpenAI compat) | Low | 4xx/parse errors | Multipart OpenAI-compatible body | Document known-good versions; accept configurable format override |
| 7 | **mimo default unreachable** (oc/mimo-v2.5-free used as adapter default) | Low-Med | Adapter chain's last resort fails → request fails | Falls through the chain then errors | Health-check mimo at startup; if unreachable, prefer a configured pool model with a warning |
| 8 | **OAuth provider header/endpoint drift** (Antigravity, gemini-cli, codex) | Medium | Auth failures | Per-provider oauth services with refresh + lead-time | Version-pin endpoint configs; periodic smoke test; alert on auth error category spikes |
| 9 | **All-provider simultaneous refresh failure** | Low | All OAuth creds stale at once | Fail-open per connection; no global signal | Aggregate health endpoint (/api/health/providers) showing per-provider credential status |
| 10 | **Rate limits (429) across providers** | High (normal) | Retry storms | Retry-after honored + model lock + account fallback | Add exponential backoff jitter; surface retry-after in usage UI |
| 11 | **Custom node /models discovery failure** (dial) | Medium | Empty candidate list → smart router passes through silently | Fail-open, silent | Badge in picker "models failed to load"; retry with backoff |
| 12 | **Pricing API availability** (TokenRouter /api/pricing) | Low | Estimates wrong if rates change without notice | Static snapshot + formula | Re-fetch on interval; changelog of rate updates |

## Cross-cutting recommendations

1. **Provider health dashboard**: per-provider status (auth valid?, last error, rate-limit state, credential expiry) — `/api/health/providers` + UI section. This directly addresses risks 1, 2, 8, 9.
2. **Error-category telemetry**: we already categorize errors (9 stable categories) — surface category counts per provider in usage UI to spot "auth spike" or "429 spike" early.
3. **Degraded-mode banner**: when ≥2 providers are in auth-failure state, banner on dashboard "N providers need attention".
4. **Escape hatches**: per-request header `x-9r-skip-adapter` etc. already exist in spirit via fallbacks; document provider-specific overrides.

## Open questions for user
- Should a provider with repeated refresh failures auto-disable (with UI re-enable), or stay enabled-but-flagged?
- Should the app auto-re-fetch TokenRouter pricing on an interval (privacy/ToS considerations) or stay snapshot-based?
- mimo default: keep as universal adapter fallback, or require an explicit pool model when mimo is unreachable?

## Related docs
- `18-feature-gap-review.md` (app-side gaps)
- `17-code-review-user-commits.md` (verified provider integrations)
