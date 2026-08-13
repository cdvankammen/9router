# ADR-003: AI Error Analyst — reuse the normal pipeline

**Date:** 2026-08-05
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #decision #observability #ai-error-analysis

## Context

User wanted to use the models/providers configured in 9Router to give feedback on specific errors from within the dashboard UI.

## Decision

`POST /api/analyze-error` with body `{ detailId }`:
1. Load requestDetail by id
2. Build truncated diagnostic context (provider, model, status, error, request, providerResponse — each ≤4KB)
3. Run through the REAL internal pipeline: `getModelInfo` → `getProviderCredentials` → `handleChatCore` with `settings.analyzeErrorModel` (default `oc/mimo-v2.5-free`)
4. Return analysis text + model used

UI: "Analyze error with AI" button in the request-detail drawer, shown only on failed requests.

## Why

Reusing `handleChatCore` means any connected provider works — no new auth surface, format translation handled, token refresh handled. The analysis model is configurable.

## Consequences

- Any provider with credentials can be the analyst
- Truncation keeps prompts cheap (4KB per field)
- If the analyst model has no credentials → graceful 400 (no crash)

## Commits

- `d1c1db28`
