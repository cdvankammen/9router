# ADR-001: Smart Router — Pre-Combo Interception (not executor)

**Date:** 2026-08-05
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #decision #architecture #smart-router

## Context

The user wanted a virtual "modelRouter" model: any app selects it, 9Router classifies the task and picks the best model from configured options, with automatic error fallback. Two implementation paths were considered:

1. **Virtual provider + executor** — register `9router` as a provider (`open-sse/providers/registry/9router.js`), with a `NineRouterExecutor` that classifies and re-dispatches to real providers.
2. **Pre-combo interception** — hook in `src/sse/handlers/chat.js` before combo resolution and translation.

## Decision

**Pre-combo interception (Option 2).** Insert at line ~91 of `src/sse/handlers/chat.js` — after `detectRequiredCapabilities(body)`, before `getComboModels(modelStr)`. The router classifies the task, scores models, creates/reuses a dynamic `sr-*` combo, and the existing combo engine handles fallback.

## Why (evidence)

The executor approach has a **fatal double-translation flaw**: `handleChatCore` translates the body BEFORE the executor runs (line ~178 in `chatCore.js`). A `9router` executor receives an already-OpenAI-format body; re-dispatching to Anthropic/Gemini would double-translate or require lossy reverse-translation. The pre-combo hook runs while the body is still in the client's original format — the same pattern the capacity adapter already uses (`augmentModelsWithCapacityAdapter` at lines 140-152 of `chat.js`).

## Consequences

- Zero changes to chatCore, translators, or executors
- Model swap happens pre-translation; body untouched
- Dynamic combos (`sr-<virtual>-<task>`) accumulate in the DB (TTL cleanup planned)
- The scaffolded `open-sse/executors/9router.js` was **disabled** with an early-return guard (never reached in the chosen architecture)

## Alternatives Rejected

- **Executor approach** — double-translation flaw (above)
- **Combo `kind:"smart"`** — combos are static lists; content-aware selection fights the abstraction
- **Capacity-adapter extension** — wrong axis (modality vs task semantics); would confuse the API

## Commits

- `9f4c1631` — initial implementation
- `4627a299` — 4 E2E-caught bugs fixed (see ../learnings/2026-08-05-smart-router-bugs.md)
