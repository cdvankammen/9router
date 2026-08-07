# Architecture: Smart Router + Fallback + Observability

**Date:** 2026-08-06
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #architecture #diagram #smart-router #observability

## Request Flow (Smart Router Interception)

```
Client POST /v1/chat/completions {model: "modelRouter"}
  → src/app/api/v1/chat/completions/route.js
  → src/sse/handlers/chat.js :: handleChat()
      ├─ detectRequiredCapabilities(body)
      ├─ ★ resolveSmartRouter(modelStr, body, settings)   ← PRE-COMBO HOOK
      │     ├─ classifyTask(messages) → "code:generation"
      │     ├─ score PROVIDER_MODELS (alias→id) + custom nodes (live /models, 5-min cache)
      │     ├─ filter by allowedProviders / allowedModels (wildcards)
      │     ├─ getOrCreateSmartCombo("sr-modelRouter-code-generation", top-N)
      │     └─ setSticky (5-min TTL, conversation fingerprint)
      ├─ getComboModels(sr-...) → combo path
      │     └─ handleComboChat: rotation → capability reorder → per-model retries → fallback
      └─ handleSingleModelChat → handleChatCore → executor → upstream
```

## Fallback Layers (compose)

1. **Smart router** selects top-N candidates → dynamic combo
2. **Combo engine** (`handleComboChat`) tries each in order; `retriesPerModel`/`perModelRetries` retry same model N times on retryable errors
3. **Multi-account** — credential loop rotates accounts per provider
4. **Capacity adapter** — injects capable models when required modality missing
5. **Per-model/provider fallbacks** (`settings.modelFallbacks`) — intercept single-model requests, route through combo engine

## Observability Pipeline

```
handleChat → handleChatCore(sharedCtx: {conversationId, taskType})
  → sub-handlers (streaming / nonStreaming / sseToJson)
  → buildRequestDetail({provider, model, conversationId, errorCategory, ...})
  → saveRequestDetail (buffered, batch 20 / 5s, fire-and-forget)
  → requestDetails table (SQLite)
  → saveUsageStats → usageHistory (+ meta.taskType)
UI: /dashboard/usage?tab=details (filters, drawer, AI analysis)
Export: /api/export/requests?format=json|markdown
Auto-flush: src/lib/markdownLog.js → ~/.9router/logs/YYYY-MM-DD.md
```

## Key Files

| File | Role |
|------|------|
| `src/sse/services/smartRouter.js` | Task classify + score + dynamic combo + node fetch |
| `src/sse/handlers/chat.js` | Pre-combo hook + modelFallbacks interception |
| `open-sse/services/combo.js` | Combo engine + retriesPerModel + fallback chain |
| `open-sse/handlers/chatCore.js` | sharedCtx threading (conversationId, taskType) |
| `open-sse/utils/errorCategorizer.js` | categorizeError(status, text) |
| `src/lib/markdownLog.js` | Auto-flush timer |
| `src/lib/markdownReport.js` | Shared markdown renderer |
| `src/app/api/analyze-error/route.js` | AI error analysis |
| `src/app/api/export/requests/route.js` | Manual export |
