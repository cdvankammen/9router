# PR #4789 — fix(translator): return Claude messages for forced SSE JSON responses
- **Author:** duongloc216, **Merged:** 2026-10-15 (v0.5.104), **Files:** 4
- Claude Code Auto mode blocked when using custom GPT models through forced-stream upstreams. Classifier request completes at transport layer but Claude client gets OpenAI Chat Completion envelope instead of Anthropic Message JSON → `undefined is not an object (evaluating 'e.filter')`.
- Fix: extract Chat→Claude converter into shared helper, reuse in both forced SSE-to-JSON branches (Responses SSE + Chat Completions SSE).
- 18 tests. Restores Claude Code Auto workflow.
- Relevance: **HIGH** — touches translator + sseToJsonHandler.js (both in our 53 overlap files). Our branch had sseToJsonHandler.js changes (empty-choices fix).
