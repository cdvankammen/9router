# PR #4692 — feat(cursor): resolve Auto (Server Picks) to the account's default agent model

- **Author:** mannnrachman
- **Merged:** 2026-10-15 (v0.5.104)
- **Files changed:** 3
- **Status:** Closed / Merged

## Problem
`"default"` / `"auto"` is a picker alias, not an AgentService model id. Client requesting `model: "default"` sends literal string → AgentService accepts and streams empty turn.

## What's added
1. `parseCursorAvailableModels()` — decode response field 2 (agent.v1.AvailableModels), flags: defaultOn(2), isChatOnly(4), supportsAgent(5), isHidden(35)
2. `mergeCursorModelFlags()` — attach flags onto usable-models list
3. `resolveAutoModelSelection()` — pick defaultOn agent-capable model, else first usable agent model
4. Executor wiring — `model === "default" || model === "auto"` resolves through `resolveCursorModels()` (5-min cache) before buildAgentRunFrame

## Tests
9 passed in cursor-auto-model (new). Regression: cursor-agent-exec-request, cursor-agent-proto, cursor-composer-thinking — 58 passed.

## Limitations
- Fail-open when catalog unavailable
- Exact tie-breaking beyond defaultOn not observable

## Relevance to our branch
- **HIGH**: Cursor model resolution changes. Our branch's cursor-models test mocks global.fetch but source uses http2PostProto — this PR may have changed the test contract.
