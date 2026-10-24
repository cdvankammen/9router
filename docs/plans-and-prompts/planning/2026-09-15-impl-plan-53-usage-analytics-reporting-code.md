# Implementation Plan 53 — Usage Analytics & Reporting — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #usage-analytics #reporting #insights #aggregation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`src/lib/usageDb.js` usage tracking with `usage.json` + `log.txt`; `src/lib/db/repos/` SQLite repos; cost tables from plan 45; existing dashboard pages).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — generate traffic, run analytics queries, check pre-aggregation speed, export a report.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-53-usage-analytics-reporting.md`, `../research/9router/46-branch-evaluation-and-cost-quality.md`, `../research/9router/impl-plan-45-cost-tracking-budgets.md`.

## Scope

**In scope:** analytics dimensions (model, provider, user, task type, route, time) with metrics (requests, tokens, cost, latency, errors); query API with filters + aggregations; pre-aggregated rollup tables (hour/day/week/month); scheduled reports (daily/weekly/monthly) with CSV export; insights (trends, anomalies, recommendations).
**Out of scope:** PDF report rendering; ML-based anomaly detection (heuristics first).

## Milestones

### M1 — Analytics dimensions + rollup tables

**Reference code (migration `src/lib/db/migrations/20260915-analytics.js`):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_hourly (
      hour TEXT NOT NULL,
      model TEXT,
      provider TEXT,
      user_id TEXT,
      task_type TEXT,
      requests INTEGER DEFAULT 0,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      latency_ms_total INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      PRIMARY KEY (hour, model, provider, user_id, task_type)
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_hour ON analytics_hourly (hour);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS analytics_hourly"); };
```

```js
// src/lib/db/repos/analyticsRepo.js
export async function recordAnalytics(db, { hour, model, provider, userId, taskType, tokensIn, tokensOut, cost, latencyMs, ok }) {
  db.run(`
    INSERT INTO analytics_hourly (hour, model, provider, user_id, task_type, requests, tokens_in, tokens_out, cost, latency_ms_total, errors)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    ON CONFLICT(hour, model, provider, user_id, task_type) DO UPDATE SET
      requests = requests + 1,
      tokens_in = tokens_in + excluded.tokens_in,
      tokens_out = tokens_out + excluded.tokens_out,
      cost = cost + excluded.cost,
      latency_ms_total = latency_ms_total + excluded.latency_ms_total,
      errors = errors + excluded.errors
  `, [hour, model ?? null, provider ?? null, userId ?? null, taskType ?? null,
      tokensIn ?? 0, tokensOut ?? 0, cost ?? 0, latencyMs ?? 0, ok ? 0 : 1]);
}
```

**Acceptance criteria:** per-request analytics recorded; rollup keyed by hour + dimensions.

### M2 — Query API

**Reference code (`src/app/api/v1/analytics/route.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

export async function GET(req) {
  const db = getAdapter();
  const url = new URL(req.url);
  const { dimension = "day", model, provider, userId, taskType, from, to } = Object.fromEntries(url.searchParams);

  // Granularity: hour | day | week | month → SQLite date truncation.
  const trunc = {
    hour: "%Y-%m-%d %H:00:00",
    day: "%Y-%m-%d",
    week: "%Y-%W",
    month: "%Y-%m",
  }[dimension] ?? "%Y-%m-%d";

  const where = [];
  const params = [];
  if (model) { where.push("model = ?"); params.push(model); }
  if (provider) { where.push("provider = ?"); params.push(provider); }
  if (userId) { where.push("user_id = ?"); params.push(userId); }
  if (taskType) { where.push("task_type = ?"); params.push(taskType); }
  if (from) { where.push("hour >= ?"); params.push(from); }
  if (to) { where.push("hour <= ?"); params.push(to); }

  const rows = db.all(`
    SELECT strftime('${trunc}', hour) AS bucket,
           SUM(requests) AS requests,
           SUM(tokens_in) AS tokens_in,
           SUM(tokens_out) AS tokens_out,
           ROUND(SUM(cost), 6) AS cost,
           ROUND(SUM(latency_ms_total) * 1.0 / MAX(SUM(requests), 1), 0) AS avg_latency_ms,
           SUM(errors) AS errors
    FROM analytics_hourly
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    GROUP BY bucket ORDER BY bucket
  `, params);
  return Response.json({ dimension, rows });
}
```

**Acceptance criteria:** filters + granularity work; avg latency computed; response fast via rollups.

### M3 — Reports + export

**Reference code (`src/lib/analytics/reports.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// CSV export of a report.
export async function exportCsv({ dimension = "day", from, to } = {}) {
  const db = getAdapter();
  const rows = db.all(`
    SELECT strftime('%Y-%m-%d', hour) AS day, model, provider, user_id,
           SUM(requests) AS requests, SUM(tokens_in) AS tokens_in, SUM(tokens_out) AS tokens_out,
           ROUND(SUM(cost), 6) AS cost, SUM(errors) AS errors
    FROM analytics_hourly
    WHERE hour >= ? AND hour <= ?
    GROUP BY day, model, provider, user_id ORDER BY day
  `, [from ?? "1970-01-01", to ?? "9999-12-31"]);

  const header = ["day", "model", "provider", "user_id", "requests", "tokens_in", "tokens_out", "cost", "errors"];
  const lines = [header.join(",")];
  for (const r of rows) lines.push(header.map((h) => `"${String(r[h] ?? "")}"`).join(","));
  return lines.join("\n");
}

// Scheduled report: daily at 00:05, weekly Monday, monthly 1st — via a scheduler (plan import-12).
export async function runScheduledReports() {
  const csv = await exportCsv({ from: yesterday(), to: today() });
  // Deliver via webhooks (plan 37) or write to reports/ dir.
  return { bytes: csv.length, rows: csv.split("\n").length - 1 };
}
```

**Acceptance criteria:** CSV export works; scheduled reports deliver; retention respected.

### M4 — Insights + tests

**Reference code (`src/lib/analytics/insights.js`):**

```js
// Trend + anomaly heuristics over daily buckets.
export function detectInsights(rows) {
  const insights = [];
  const daily = rows.map((r) => ({ day: r.bucket ?? r.day, requests: r.requests ?? 0, cost: r.cost ?? 0, errors: r.errors ?? 0 }));

  // Trend: compare last 7 days vs previous 7.
  if (daily.length >= 14) {
    const recent = daily.slice(-7).reduce((a, r) => a + r.requests, 0);
    const prior = daily.slice(-14, -7).reduce((a, r) => a + r.requests, 0);
    const delta = prior > 0 ? (recent - prior) / prior : 0;
    if (delta > 0.3) insights.push({ type: "trend", level: "info", msg: `Requests up ${Math.round(delta * 100)}% vs previous week` });
    if (delta < -0.3) insights.push({ type: "trend", level: "info", msg: `Requests down ${Math.round(Math.abs(delta) * 100)}% vs previous week` });
  }

  // Anomaly: single-day spike > 3× the 14-day mean.
  if (daily.length >= 15) {
    const mean = daily.slice(0, -1).reduce((a, r) => a + r.requests, 0) / (daily.length - 1);
    const last = daily[daily.length - 1].requests;
    if (mean > 0 && last > mean * 3) insights.push({ type: "anomaly", level: "warning", msg: `Spike: ${last} requests vs mean ${Math.round(mean)}` });
  }

  // Recommendation: high error rate.
  const errRate = daily.reduce((a, r) => a + r.errors, 0) / Math.max(daily.reduce((a, r) => a + r.requests, 0), 1);
  if (errRate > 0.05) insights.push({ type: "recommendation", level: "warning", msg: `Error rate ${(errRate * 100).toFixed(1)}% — check provider health` });

  return insights;
}
```

**Files touched:** `src/lib/analytics/` (new: reports, insights), `src/lib/db/migrations/20260915-analytics.js` (new), `src/lib/db/repos/analyticsRepo.js` (new), `src/app/api/v1/analytics/route.js` (new), dashboard analytics page (new), `tests/unit/analytics.test.js` (new).

**Acceptance criteria:** insights fire on real patterns; tests cover aggregation + insights.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Query latency | Slow dashboards | Pre-aggregated rollups |
| Data volume | Table growth | Retention + rollup pruning |
| Insight noise | False alarms | Thresholds + leveling |
| Report complexity | Template sprawl | CSV-first, templates later |

## Verification

- Unit: rollup, query, insights
- Manual: traffic → analytics page → export CSV
- Regression: `tests/__baseline__/verify-no-regression.mjs`