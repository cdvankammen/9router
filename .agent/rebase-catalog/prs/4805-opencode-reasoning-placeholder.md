# PR #4805 — fix(opencode): inject reasoning_content placeholder for Zen multi-turn chats
- **Author:** ErfanBagheri404, **Merged:** last week (v0.5.104), **Files:** 1, **Fixes:** #4804
- oc/ models on Zen require reasoning_content on every assistant message in request history, but 9router deletes that field from responses (nonStreamingHandler.js). Reasoning injector had no rule for opencode → Zen rejected history with assistant turns: `[400] Missing required parameter: 'messages[36].reasoning_content'`.
- Fix: reuse existing deepseek/kimi mechanism (transport.reasoningInject + reasoningContentInjector.js). Add `reasoningInject: { scope: "all" }` to open-sse/providers/registry/opencode.js transport. Placeholder injected only into assistant messages lacking reasoning_content; real values preserved.
- Verified: multi-turn 41-message streaming requests went from 400→200 on oc/cat-jam-free.
- Relevance: **LOW** — registry/opencode.js is not in our 53-file overlap. Likely no branch conflict.
