# ADR-004: Fallback Configuration — combos + per-model/provider + retries

**Date:** 2026-08-06
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #decision #fallbacks #routing

## Context

User wanted fallback options: per-model (model→model), per-provider (provider→provider), model→provider, and retry counts (universal + per-model override). Combos already existed; the ask was to ALSO configure fallbacks directly on models/providers, plus a visual rule builder UI (in progress).

## Decision

- **Keep combos** as-is (named virtual models with strategies: fallback/round-robin/fusion)
- **Add `settings.modelFallbacks`** map:
  - Simple: `{ "openai/gpt-4o": ["anthropic/claude-sonnet-4.6", "deepseek/chat"] }`
  - Provider-level: `{ "openai": ["deepseek/chat"] }` (applies to all openai/* models)
  - Advanced (with retries): `{ "openai/gpt-4o": { models: [...], retries: 3, perModelRetries: { "deepseek/chat": 5 } } }`
- `handleComboChat` gains `retriesPerModel` + `perModelRetries` — retry same model N times on retryable errors before moving on; exceptions fail-fast
- `handleSingleModelChat` intercepts when a fallback config matches; recursion guard via `skipModelFallback` flag

## Why

The combo engine already handles ordered fallback + transient cooldown; reusing it gives identical semantics for plain model requests without duplicating logic. The advanced shape is backward compatible with the simple array.

## Consequences

- One retry engine (combo) powers both combos and per-model fallbacks
- Fallback chain visibility (header/body) works for both
- Guard prevents infinite recursion when fallbacks point back at the same model

## Commits

- `99ac899f` — per-model fallbacks (simple shape) + full catalog pickers + allowedModels
- `8990a3b4` — retries + custom node support in smart router
- UI rule builder: pending
