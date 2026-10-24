# Implementation Plan 16: Analytics & Insights

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, analytics, insights, dashboards

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-v-analytics-insights.md` (primary — unified stats, leaderboard, error analytics, anomalies)
- `../2026-09-17-hermes-import-branch-d-cost-calculation.md` (cost columns feeding the spend views)
- `../2026-09-17-hermes-import-branch-c-error-reconstruction.md` (error categories feeding error analytics)

## Goal

Unified analytics across native + imported traffic: usage trends, provider comparison, error analysis, cost breakdowns. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| Real usage repo | `src/lib/db/repos/usageRepo.js` — **`src/lib/usageDb.js` does NOT exist** (original plan was wrong) |
| Real exports | `getUsageHistory(filter)`, `getUsageStats(period)`, `getChartData(period)`, `appendRequestLog()` (no-op), `getRecentLogs(limit)` |
| Live table | `usageHistory` — columns: `timestamp, provider, model, connectionId, apiKey, endpoint, cost, status, tokens, promptTokens, completionTokens` |
| Daily rollup | `usageDaily(dateKey, data)` — `data` is JSON blob with `promptTokens`, `completionTokens`, `cost` |
| `getChartData` periods | `"today"` (24 hourly buckets), `"24h"`, `"7d"`, `"30d"`, `"60d"` — returns `[{label, tokens, cost}]` |
| Adapter API | `db.run/get/all/exec` positional params — **no `.prepare()`** |
| `requestDetails` | Has NO `prompt_tokens`/`cost`/`latency_ms` columns — those live in the `data` JSON blob. **UNION against `usageHistory`, not `requestDetails`** |
| Imported table | Plan 01: `imported_messages` with real columns `prompt_tokens, completion_tokens, total_tokens, cost, latency_ms, status, error_category, provider, model, imported_at` |

## Scope

- Unified usage queries (native `usageHistory` + imported `imported_messages`)
- Provider leaderboard
- Error dashboard
- Cost anomaly detection

## Design

### 1. Unified Usage Repo — `src/lib/db/repos/importAnalyticsRepo.js` (NEW file)

**Purpose:** Analytics queries that UNION native + imported traffic. **Do NOT extend `usageRepo.js`** — keep import analytics separate so the existing dashboard is untouched.

**⚠️ GROUNDING FIXES (original plan was wrong):**
1. File was `src/lib/usageDb.js` — doesn't exist. New file: `src/lib/db/repos/importAnalyticsRepo.js`.
2. Used `db.prepare(sql).all(params)` — no `.prepare()`. Use `db.all(sql, params)`.
3. Used named `@param` objects — use positional `?` params.
4. UNIONed against `requestDetails` with non-existent columns — UNION against `usageHistory` (real columns) + `imported_messages`.

```javascript
// src/lib/db/repos/importAnalyticsRepo.js
// SUGGESTION ONLY — review against actual codebase before implementing
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
      SELECT provider, prompt_tokens, completion_tokens, cost, latency_ms, status, imported_at AS ts
      FROM imported_messages
    )
    ${where}
    GROUP BY provider
    ORDER BY total_cost DESC
    LIMIT ?
  `;
  return db.all(sql, params);
}

export async function getErrorAnalytics(filter = {}) {
  const db = await getAdapter();
  const conds = [];
  const params = [];
  if (filter.startDate) { conds.push("ts >= ?"); params.push(new Date(filter.startDate).toISOString()); }
  if (filter.endDate) { conds.push("ts <= ?"); params.push(new Date(filter.endDate).toISOString()); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const sql = `
    SELECT error_category, provider, model, COUNT(*) AS count, SUM(cost) AS wasted_cost
    FROM (
      SELECT 'unknown' AS error_category, provider, model, cost, timestamp AS ts
      FROM usageHistory WHERE status = 'error'
      UNION ALL
      SELECT error_category, provider, model, cost, imported_at AS ts
      FROM imported_messages WHERE status = 'error'
    )
    ${where}
    GROUP BY error_category, provider, model
    ORDER BY count DESC
    LIMIT 50
  `;
  return db.all(sql, params);
}

export async function getCostAnomalies(filter = {}) {
  const db = await getAdapter();
  const days = parseInt(filter.days || "7", 10);
  const threshold = parseFloat(filter.threshold || "2.0");

  const sql = `
    WITH daily AS (
      SELECT date(ts) AS day, SUM(cost) AS cost
      FROM (
        SELECT timestamp AS ts, cost FROM usageHistory
        UNION ALL
        SELECT imported_at AS ts, cost FROM imported_messages
      )
      WHERE ts >= datetime('now', ?)
      GROUP BY day
    ),
    stats AS (SELECT AVG(cost) AS avg_cost FROM daily)
    SELECT d.day, d.cost, s.avg_cost, ROUND(d.cost / s.avg_cost, 2) AS ratio
    FROM daily d, stats s
    WHERE d.cost > s.avg_cost * ?
    ORDER BY d.day DESC
  `;
  return db.all(sql, [`-${days} days`, threshold]);
}
```

### 2. Analytics API — `src/app/api/analytics/route.js`

**Purpose:** Query endpoint for the four analytics types.

```javascript
// src/app/api/analytics/route.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { NextResponse } from "next/server";
import {
  getUnifiedUsageStats,
  getProviderLeaderboard,
  getErrorAnalytics,
  getCostAnomalies,
} from "@/lib/db/repos/importAnalyticsRepo.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "usage"; // usage | providers | errors | anomalies
  const filter = {
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    groupBy: searchParams.get("groupBy"),
    source: searchParams.get("source"),
    limit: searchParams.get("limit") || "20",
    days: searchParams.get("days") || "7",
    threshold: searchParams.get("threshold") || "2.0",
  };

  let data;
  switch (type) {
    case "usage": data = await getUnifiedUsageStats(filter); break;
    case "providers": data = await getProviderLeaderboard(filter); break;
    case "errors": data = await getErrorAnalytics(filter); break;
    case "anomalies": data = await getCostAnomalies(filter); break;
    default: return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  return NextResponse.json({ type, data });
}
```

### 3. Dashboard Components — `src/app/(dashboard)/dashboard/analytics/`

**Purpose:** UI for the analytics. Follow the existing dashboard route group pattern (`(dashboard)/dashboard/...`).

```jsx
// src/app/(dashboard)/dashboard/analytics/components/ProviderLeaderboard.jsx
// SUGGESTION ONLY — review against actual codebase before implementing
"use client";
import { useEffect, useState } from "react";

export function ProviderLeaderboard({ days = 7 }) {
  const [data, setData] = useState([]);
  useEffect(() => {
    fetch(`/api/analytics?type=providers&startDate=${new Date(Date.now() - days * 86400000).toISOString()}`)
      .then((r) => r.json())
      .then((j) => setData(j.data));
  }, [days]);
  return (
    <table className="w-full">
      <thead><tr><th>Provider</th><th>Requests</th><th>Tokens</th><th>Cost</th><th>Avg Latency</th><th>Error Rate</th></tr></thead>
      <tbody>
        {data.map((p) => (
          <tr key={p.provider}>
            <td>{p.provider}</td>
            <td>{Number(p.requests).toLocaleString()}</td>
            <td>{Number(p.total_tokens).toLocaleString()}</td>
            <td>${Number(p.total_cost || 0).toFixed(4)}</td>
            <td>{p.avg_latency ? `${Number(p.avg_latency).toFixed(0)}ms` : "—"}</td>
            <td>{p.error_rate || 0}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Steps (per-part instructions)

### Step 1 — `importAnalyticsRepo.js` — unified queries
1. Create the repo with the four functions above.
2. **Verify:** `node -e "import('./src/lib/db/repos/importAnalyticsRepo.js').then(async m => console.log(await m.getProviderLeaderboard({})))"` returns rows.

### Step 2 — `/api/analytics` route
1. Create the route.
2. **Verify:** `curl 'http://localhost:20128/api/analytics?type=providers'` returns `{ type, data }`.

### Step 3 — Dashboard page with tabs
1. Create `src/app/(dashboard)/dashboard/analytics/page.js` with tabs (Usage, Providers, Errors, Anomalies).
2. **Verify:** each tab fetches its type and renders.

### Step 4 — Charts
1. Use the existing chart approach in the dashboard (check what the current dashboard uses before adding a dependency).
2. **Verify:** trend chart renders for `type=usage&groupBy=day`.

### Step 5 — Anomaly alerts
1. Fetch `type=anomalies` on load; show a banner when rows exist.
2. **Verify:** banner appears when a day exceeds 2x average.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| UNION queries | Performance on large tables | Indexes on `usageHistory(timestamp)`, `imported_messages(imported_at)` |
| Cost accuracy | Imported cost may be estimated | Show confidence badge from `model_match_confidence` |
| Chart library | Bundle size | Reuse existing dashboard chart code; lazy load |

## Verification (commands)

```bash
# Provider leaderboard
curl 'http://localhost:20128/api/analytics?type=providers'
# Expect: { "type": "providers", "data": [ { "provider": "...", "requests": N, ... } ] }

# Usage trend
curl 'http://localhost:20128/api/analytics?type=usage&groupBy=day&startDate=2026-09-01'
# Expect: rows with period, source, requests, cost, errors
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.