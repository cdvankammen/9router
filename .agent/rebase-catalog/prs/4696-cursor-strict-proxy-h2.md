# PR #4696 — fix(cursor): hold strictProxy on the AgentService h2 path

- **Author:** mannnrachman
- **Merged:** 2026-10-15 (v0.5.104)
- **Files changed:** 4
- **Status:** Closed / Merged

## Problem
Cursor AgentService h2 path (executeAgent) uses raw `http2.connect` — never enters `proxyAwareFetch`. Strict-proxy users' Cursor agent traffic silently left over direct IP.

## What's added
- `cursor.js`: `proxyIntentFailed(proxyOptions)` guard at top of executeAgent — throws connection_error when strict + proxy intent + no vercel relay
- `chatCore.js`: forwards proxyPoolId + strictProxy into proxyOptions
- `auth.js`: surfaces resolvedProxy.strictProxy on both credential-enrichment paths

## Tests
9 passed in cursor-agent-strict-proxy (new). Sibling suites: 58/58 pass.

## Limitations
- Not an h2 proxy transport — strict users get hard error instead of silent leak
- Complements open PR #3276 (h2-over-proxy transport)

## Relevance to our branch
- **MEDIUM**: Cursor executor proxy guard. If our branch touched proxy handling, must integrate.
