# Implementation Plan Import-16 — Analytics & Insights — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #analytics #insights #dashboards #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (**real usage repo is `src/lib/db/repos/usageRepo.js`** — **`src/lib/usageDb.js` does NOT exist**; real exports `getUsageHistory(filter)`, `getUsageStats(period)`, `getChartData(period)`, `appendRequestLog()` (no-op), `getRecentLogs(limit)`; live table `usageHistory` — columns `timestamp, provider, model, connectionId, apiKey, endpoint, cost, status, tokens, promptTokens, completionTokens`; daily rollup `usageDaily(dateKey, data)`; `getChartData` periods `"today"`, `"24h"`, `"7d"`, `"30d"`, `"60d"`; adapter API positional params — **no `.prepare()`**; `requestDetails` has NO `prompt_tokens`/`cost`/`latency_ms` columns — **UNION against `usageHistory`, not `requestDetails`**).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — unified queries; leaderboard; anomalies.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-16-analytics-insights.md`, `../research/9router/impl-plan-import-01-db-schema.md`, `../research/9router/impl-plan-import-07-cost-calculation.md`.

## Scope

**In scope:** unified usage queries (native `usageHistory` + imported `imported_messages`); provider leaderboard; error dashboard; cost anomaly detection.
**Out of scope:** observability export (import-09); messages UI (import-08).

## Milestones

### M1 — Unified usage repo

**Reference code (`src/lib/db/repos/importAnalyticsRepo.js` — NEW file):**

```js
// Do NOT extend usageRepo.js — keep import analytics separate so the existing dashboard is untouched.
import { getAdapter } from "../driver.js";

// Native usageHistory columns: timestamp, provider, model, cost, status, promptTokens, completionTokens
// Imported imported_messages columns: imported_at, provider, model, cost, status, prompt_tokens, completion_tokens

export async function getUnifiedUsageStats(filter = {}) {
  const db = await getAdapter();
  const conds = [];
  const params = [];
  if (filter.startDate) { conds.push("ts >= ?"); params.push(new Date(filter.startDate).toISOString()); }
  if (filter.endDate) { conds.push("ts <= ?"); params.push(new Date(filter.endDate).toISOString()); }
  if (filter.source) { conds.push("src = ?"); params.push(filter.source); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const groupSql = filter.groupBy === "hour" ? "strftime('%Y-%m-%d %H:00', ts)"
    : filter.groupBy === "month" ? "strftime('%Y-%m', ts)"
    : "date(ts)"; // day default

  const sql = `
    SELECT ${groupSql} AS period, src AS source,
      COUNT(*) AS requests,
      SUM(prompt_tokens) AS prompt_tokens,
      SUM(completion_tokens) AS completion_tokens,
      SUM(prompt_tokens + completion_tokens) AS total_tokens,
      SUM(cost) AS cost,
      AVG(latency_ms) AS avg_latency,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
    FROM (
      SELECT timestamp AS ts, 'native' AS src, provider, model,
        promptTokens AS prompt_tokens, completionTokens AS completion_tokens,
        cost, NULL AS latency_ms, status
      FROM usageHistory
      UNION ALL
      SELECT imported_at AS ts, source AS src, provider, model,
        prompt_tokens, completion_tokens, cost, latency_ms, status
      FROM imported_messages
    )
    ${where}
    GROUP BY period, source
    ORDER BY period DESC
  `;
  return db.all(sql, params);
}
```

**Acceptance criteria:** UNION query; grouping; filters.

### M2 — Provider leaderboard

**Reference code (`src/lib/db/repos/importAnalyticsRepo.js`):**

```js
export async function getProviderLeaderboard(filter = {}) {
  const db = await getAdapter();
  const conds = [];
  const params = [];
  if (filter.startDate) { conds.push("ts >= ?"); params.push(new Date(filter.startDate).toISOString()); }
  if (filter.endDate) { conds.push("ts <= ?"); params.push(new Date(filter.endDate).toISOString()); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const limit = Math.min(parseInt(filter.limit || "20", 10), 100);
  params.push(limit);

  const sql = `
    SELECT provider,
      COUNT(*) AS requests,
      SUM(prompt_tokens + completion_tokens) AS total_tokens,
      SUM(cost) AS total_cost,
      AVG(cost) AS avg_cost,
      AVG(latency_ms) AS avg_latency,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors,
      ROUND(100.0 * SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) / COUNT(*), 2) AS error_rate
    FROM (
      SELECT provider, promptTokens AS prompt_tokens, completionTokens AS completion_tokens,
        cost, NULL AS latency_ms, status, timestamp AS ts
      FROM usageHistory
      UNION ALL
      SELECT provider, prompt_tokens, completion_tokens,
        cost, latency_ms, status, imported_at AS ts
      FROM imported_messages
    )
    ${where}
    GROUP BY provider
    ORDER BY total_cost DESC
    LIMIT ?
  `;
  return db.all(sql, params);
}
```

**Acceptance criteria:** leaderboard; error rate; ordering.

### M3 — Cost anomaly detection

**Reference code (`src/lib/import/anomalies.js`):**

```js
// Simple z-score anomaly detection on cost.
export function detectCostAnomalies({ rows = [], threshold = 2.5 } = {}) {
  const costs = rows.map((r) => r.cost ?? 0);
  if (costs.length < 5) return [];
  const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
  const variance = costs.reduce((a, b) => a + (b - mean) ** 2, 0) / costs.length;
  const std = Math.sqrt(variance) || 1;
  return rows
    .map((r, i) => ({ ...r, z: (r.cost ?? 0 - mean) / std }))
    .filter((r) => r.z >= threshold)
    .sort((a, b) => b.z - a.z);
}
```

**Acceptance criteria:** z-score; threshold; ranking.

### M4 — Tests

**Reference code (`tests/unit/import-analytics.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { detectCostAnomalies } from "@/lib/import/anomalies.js";

describe("detectCostAnomalies", () => {
  it("flags outliers", () => {
    const rows = [{ cost: 0.01 }, { cost: 0.01 }, { cost: 0.01 }, { cost: 0.01 }, { cost: 0.01 }, { cost: 5.0 }];
    const anomalies = detectCostAnomalies({ rows });
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].cost).toBe(5.0);
  });
});
```

**Files touched:** `src/lib/db/repos/importAnalyticsRepo.js` (new), `src/lib/import/anomalies.js` (new), dashboard analytics page (new), `tests/unit/import-analytics.test.js` (new).

**Acceptance criteria:** tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Wrong table | Broken queries | UNION usageHistory |
| Column drift | Missing fields | Verify schema |
| Anomaly noise | False alerts | Threshold tuning |
| Query cost | Slow dashboards | Indexes + limits |

## Verification

- Unit: getUnifiedUsageStats, getProviderLeaderboard, detectCostAnomalies
- Manual: import → view analytics
- Regression: `tests/__baseline__/verify-no-regression.mjs`