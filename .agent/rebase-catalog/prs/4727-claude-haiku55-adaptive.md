# PR #4727 — fix(opencode-go): route claude-haiku-5-5 to /messages with adaptive thinking

- **Author:** Spoon94
- **Merged:** 2026-10-15 (v0.5.104)
- **Commits:** 7 (cascade of defects)
- **Files changed:** 14
- **Status:** Closed / Merged

## 7 cascading defects fixed
1. Wrong endpoint for non-Claude clients — `/chat/completions` returns 400 ModelProtocolUnsupported
2. Thinking shape rejected — `thinking.type.enabled` not supported, needs `adaptive` + `output_config.effort`
3. Context window shown as 200k — upstream catalog says 1M
4. 400 "each thinking block must contain non-whitespace thinking" — blank thinking blocks need dropping
5. 400 "context_management: Extra inputs are not permitted" — Claude Code field rejected by opencode-go
6. Limits correct only by accident — opencode-go set 1M but no maxOutput, commandcode had no haiku entry
7. Dashboard still showed ctx 200k — shadow custom-model rows overwriting real entries

## Fix
- capabilities.js: provider-scoped overrides for opencode-go + commandcode claude-haiku-5-5 (thinkingFormat: "claude-adaptive", 1M/128k)
- registry/opencode-go.js: declare model with targetFormat: "claude" / supportedFormats: ["claude"]
- translator/formats/claude.js: drop blank thinking blocks + strip context_management for non-Anthropic providers
- /api/models: drop alias-shadow custom models colliding with routedModels
- useModelCaps: resolveCaps alias-fallback via ALIAS_TO_ID

## Tests
Extensive: capability overrides, emitted thinking shape, routing matrix (claude/openai/openai-responses × claude-haiku-5-5), blank-thinking sanitizer, context_management scoping, shadow-dedupe.

## Relevance to our branch
- **HIGH OVERLAP**: Our branch touched capabilities.js (GLM entries), translator/formats/claude.js, useModelCaps. Must verify we have all 7 fixes.
- The context_management strip is a new concept our branch likely doesn't have.
