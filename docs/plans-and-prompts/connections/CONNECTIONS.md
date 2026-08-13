# Connections Runbook

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #connections #providers #oauth #runbook

How 9Router connects to upstream providers, and how to diagnose a broken connection. See `docs/ARCHITECTURE.md` §"OAuth Onboarding and Token Refresh Lifecycle" and §"Combo + Account Fallback Flow" for the authoritative model this runbook summarizes.

## How a connection is represented

- A **connection** is a stored credential (API key or OAuth tokens) for one provider account, managed under `/dashboard/providers`.
- `GET /api/providers` returns connections with secrets stripped — never expect (or log) raw secret values from that route.
- Multiple connections to the same provider enable multi-account fallback (see the architecture doc's fallback flow).

## Adding a new provider

1. Copy `open-sse/providers/REGISTRY_TEMPLATE.js` into `open-sse/providers/registry/<provider>.js`.
2. Add its models to `open-sse/config/providerModels.js`.
3. Only write an executor (`open-sse/executors/`) if the upstream is **not** OpenAI-compatible — `default.js` already covers OpenAI-compatible upstreams.
4. Regenerate `open-sse/providers/registry/index.js` via `scripts/migrate-registry.mjs` — never hand-edit it.
5. Run `tests/__baseline__/verify-*.mjs` regression baselines (providers/aliases) before committing.

## OAuth / token refresh

Full lifecycle is in `docs/ARCHITECTURE.md`. The practical failure mode to know: token refresh failures surface as a per-account `lastError` string ("System A" in provider-page error UI — see `../tracking/decisions/ADR-008-provider-page-observability-reuse.md`), while actual request errors go through the richer `requestDetails` history ("System B").

## Diagnosing a "stuck" or "broken" connection — diagnose live, not from static review

Curl the actual backend route the UI button calls **before** touching frontend code:

```bash
curl -s http://localhost:20128/api/providers | jq '.[] | {id, provider}'
curl -s http://localhost:20128/api/providers/<id>/models?refresh=1 | jq 'length'
```

If that returns quickly and correctly, the credential/upstream/backend route are all fine — the bug is in frontend logic (state, event loops, N-times-slower-than-it-looks call patterns), not the connection itself. This is exactly how the OpenRouter "Refresh Models" stuck-forever bug was found — see `../tracking/learnings/2026-08-13-openrouter-refresh-models-serial-import-hang.md`. Don't reach for a timeout/AbortController as a first-pass fix; it treats the symptom, not the mechanism.

## Related

- `docs/ARCHITECTURE.md` — OAuth/fallback lifecycle (authoritative)
- `open-sse/AGENTS.md` — provider/executor/translator conventions
- `../architecture/ARCHITECTURE.md` — map
- `../tracking/learnings/2026-08-13-openrouter-refresh-models-serial-import-hang.md`
