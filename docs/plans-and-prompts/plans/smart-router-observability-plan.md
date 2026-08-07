# Plan: Smart Router + Fallbacks + Observability (Session Plan)

**Date:** 2026-08-05 → 2026-08-06
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #plan #smart-router #observability #fallbacks

## Goal

Give the user: (1) a virtual "modelRouter" model that picks the best model per task with auto-fallback, (2) fallback chains configurable per model/provider with retry counts, (3) full per-conversation observability with export + AI error analysis, (4) visual UI for managing all of it.

## Milestones

### M1: Smart Router Core (DONE — commits 9f4c1631, 4627a299, 8990a3b4)
- [x] Pre-combo interception in `handleChat` (ADR-001)
- [x] Task classifier (16 types) + model scorer (capability-weighted + cost dial)
- [x] Dynamic combo creation (`sr-*` names)
- [x] Session stickiness (5-min TTL)
- [x] Custom provider node support (live /models fetch, 5-min cache)
- [x] allowedProviders + allowedModels (wildcard) filters

### M2: Observability (DONE — commits 6f00d23f, a954b88f, 1c921ce2, d9415807, 5932879f, 57e87729, 3e7d1c7c, 40168739, 3f678deb)
- [x] conversationId tracking (schema v2)
- [x] Request export (JSON + markdown, conversation-grouped)
- [x] taskType in usageHistory.meta
- [x] Conversation filter + column UI
- [x] Fallback chain logging (header + body)
- [x] Markdown auto-flush to ~/.9router/logs
- [x] Error categorization (9 categories)
- [x] AI Error Analyst

### M3: Fallback Configuration (PARTIAL — commits 99ac899f, 8990a3b4)
- [x] Per-model/per-provider fallback rules (settings.modelFallbacks)
- [x] Retry counts (universal + per-model override)
- [x] Full model catalog in pickers
- [ ] **Visual Fallback Rule Builder UI** (form modal + rules table) ← NEXT
- [ ] Advanced/alternative rule UI concepts

### M4: Polish (PENDING)
- [ ] Markdown log flush explanation (overwrite vs append)
- [ ] Fix `[DONE]` SSE leak in combo streaming path (root cause identified)
- [ ] Rebuild + E2E verify all
- [ ] Full test suite + commit

## Risks / Open Items

- `[DONE]` leak: chatCore.js line 105 `stream = body.stream !== false` forces streaming when client omits stream; combo path returns streaming Response without SSE→JSON conversion
- Dynamic `sr-*` combos accumulate (TTL cleanup planned)
- Markdown flush currently OVERWRITES the daily file (semantics to clarify/decide with user)

## References

- ADRs: `../decisions/ADR-001..004`
- Learnings: `../learnings/2026-08-06-*.md`
- Session history: `../SESSION-HISTORY.md`
