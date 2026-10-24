# PR #4793 — fix(github): route Copilot embeddings to api.githubcopilot.com
- **Author:** tmaarcxs, **Merged:** last week (v0.5.104), **Files:** 4, **Fixes:** #4792
- GitHub Models retired 2026-07-30. models.github.ai returns 200 text/plain OK for every request. Every gh/text-embedding-* call failed with Invalid JSON.
- Fix: registry/github.js embeddingConfig.baseUrl → api.githubcopilot.com/embeddings. Replace unsupported text-embedding-3-large with text-embedding-ada-002. New embeddingProviders/github.js adapter (reuses OpenAI adapter, sends short-lived Copilot token with IDE headers). Remove github from generic OpenAI-compatible list.
- 40/40 embeddingsCore tests pass.
- Relevance: **LOW** — github provider embeddings, likely no branch conflict.
