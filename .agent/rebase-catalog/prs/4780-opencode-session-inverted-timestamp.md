# Issue #4780 — Free tier 403 FreeTierError for all non-OpenCode clients
- **Fix merged:** 2026-10-15 (v0.5.104), multiple commits
- Root cause: translateSessionId() put SHA-256 digest bytes in the 12-hex prefix of ses_ ids. Upstream OpenCode Zen validates that prefix decodes to ~(BigInt(Date.now()) * 4096n + counter). Digest bytes decode to bogus timestamp → every non-OpenCode client (curl/omp/pi/Claude Code) got 403 on oc/*.
- Fix: use generateSessionId() (canonical inverted-timestamp encoder) instead of digest. Add in-memory Map cache with TTL eviction for session stability.
- Related: #4777, #4778, #4781, #4101, #4127. Multiple fork maintainers hot-fixed independently.
- Relevance: **HIGH** — our branch has opencode executor work. Must verify our translateSessionId uses generateSessionId (not digest).
