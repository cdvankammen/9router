# PR #4689 — feat(usage): Cursor IDE quota via DashboardService (spend + request buckets)

- **Author:** mannnrachman
- **Merged:** 2026-10-15 (v0.5.104) by decolua
- **Files changed:** 5
- **Status:** Closed / Merged

## What's added
`open-sse/services/usage/cursor.js` — `getCursorUsage(accessToken, providerSpecificData, proxyOptions)`:
1. Plan spend via `POST /aiserver.v1.DashboardService/GetCurrentPeriodUsage` (Connect JSON headers)
2. On-demand buckets from spendLimitUsage
3. `/auth/usage` fallback for teams/enterprise
4. Plan label via `POST GetPlanInfo` (fail-open)
5. Registry wiring: `transport.usage.{url,planInfoUrl,authUsageUrl}` + `features.usage: true`
6. Dashboard `parseQuotaData` case "cursor"

## Tests
6 passed (unit/cursor-usage.test.js). Regression: zed-usage, deepseek-usage, groq-usage, dashboard-guard — 47 passed.

## Limitations
- Bonus-credit spend not surfaced separately
- `/auth/usage` fallback assumes standard bucket shape
- `GetPlanInfo` failure silently degrades to "Cursor" label

## Relevance to our branch
- **MEDIUM**: New cursor usage handler. If our branch touched cursor registry or usage, must integrate.
- Live validation from Cursor Pro+ account on Linux/WSL provided in PR comments.
