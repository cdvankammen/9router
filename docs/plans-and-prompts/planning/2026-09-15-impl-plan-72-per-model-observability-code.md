# Implementation Plan 72 — Per-Model Observability — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #per-model #observability #metrics #comparison #insights #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`src/lib/usageDb.js` request tracking; analytics rollups from plan 53; anomaly detection from plan 64; comparison views from plan 36 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run traffic across two models; confirm per-model metrics, comparison, and insights.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-72-per-model-observability.md`, `../research/9router/impl-plan-53-usage-analytics-reporting.md`, `../research/9router/impl-plan-64-anomaly-detection-alerts.md`.

## Scope

**In scope:** per-model metrics (requests, tokens, cost, latency, errors, quality) with dimensions (model, provider, user, task) and time series (hourly/daily/weekly); model views (detail, side-by-side comparison, ranking); insights (trends, anomalies, recommendations); API + dashboard integration.
**Out of scope:** real-time streaming metrics (batch aggregation); per-token-level tracing.

## Milestones

### M1 — Metrics collection

**Reference code (`src/lib/modelobs/metrics.js`):**

```js
// In-memory per-model counters, flushed to DB on interval (mirrors plan 53 rollups).
const counters = new Map(); // key -> { requests, tokensIn, tokensOut, cost, latencyTotal, errors }

export function recordModelMetric({ model, provider = null, userId = null, task = null, tokensIn = 0, tokensOut = 0, cost = 0, latencyMs = 0, ok = true }) {
  const key = `${model}|${provider ?? ""}|${userId ?? ""}|${task ?? ""}`;
  const c = counters.get(key) ?? { requests: 0, tokensIn: 0, tokensOut: 0, cost: 0, latencyTotal: 0, errors: 0 };
  c.requests += 1;
  c.tokensIn += tokensIn; c.tokensOut += tokensOut; c.cost += cost;
  c.latencyTotal += latencyMs;
  if (!ok) c.errors += 1;
  counters.set(key, c);
}

export function drainCounters() {
  const out = [...counters.entries()].map(([key, c]) => {
    const [model, provider, userId, task] = key.split("|");
    return { model, provider: provider || null, userId: userId || null, task: task || null, ...c, avgLatencyMs: c.requests ? c.latencyTotal / c.requests : 0 };
  });
  counters.clear();
  return out;
}
```

**Acceptance criteria:** counters aggregate per dimension; drain returns rows; avg latency computed.

### M2 — Storage + aggregation

**Reference code (migration `src/lib/db/migrations/20260915-modelobs.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bucket TEXT NOT NULL,          -- ISO hour
      model TEXT NOT NULL,
      provider TEXT,
      user_id TEXT,
      task TEXT,
      requests INTEGER NOT NULL DEFAULT 0,
      tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      avg_latency_ms REAL,
      errors INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_model_metrics ON model_metrics (model, bucket);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS model_metrics"); };
```

```js
// src/lib/db/repos/modelMetricsRepo.js
export async function insertMetrics(db, rows, bucket) {
  const stmt = db.prepare(`INSERT INTO model_metrics (bucket, model, provider, user_id, task, requests, tokens_in, tokens_out, cost, avg_latency_ms, errors)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const r of rows) stmt.run(bucket, r.model, r.provider, r.userId, r.task, r.requests, r.tokensIn, r.tokensOut, r.cost, r.avgLatencyMs, r.errors);
}
export async function modelSummary(db, { model, sinceIso, granularity = "day" }) {
  const bucketExpr = granularity === "hour" ? "bucket" : "substr(bucket, 1, 10)";
  const where = model ? "WHERE model = ?" : "";
  const params = model ? [model] : [];
  if (sinceIso) { where += (model ? " AND" : " WHERE") + " bucket >= ?"; params.push(sinceIso); }
  return db.all(`SELECT ${bucketExpr} AS bucket, model, SUM(requests) AS requests, SUM(tokens_in) AS tokens_in,
                 SUM(tokens_out) AS tokens_out, SUM(cost) AS cost, AVG(avg_latency_ms) AS avg_latency_ms, SUM(errors) AS errors
                 FROM model_metrics ${where} GROUP BY ${bucketExpr}, model ORDER BY bucket`, params);
}
```

**Acceptance criteria:** metrics persisted per bucket; summary aggregates by granularity.

### M3 — Views + comparison

**Reference code (`src/lib/modelobs/views.js`):**

```js
// Side-by-side comparison of two models over the same buckets.
export function compareModels(rowsA, rowsB) {
  const byBucket = new Map();
  for (const r of rowsA) byBucket.set(r.bucket, { a: r });
  for (const r of rowsB) {
    const e = byBucket.get(r.bucket) ?? { a: null };
    e.b = r;
    byBucket.set(r.bucket, e);
  }
  return [...byBucket.entries()].map(([bucket, { a, b }]) => ({
    bucket,
    a: a ? { requests: a.requests, cost: a.cost, avgLatencyMs: a.avg_latency_ms, errors: a.errors } : null,
    b: b ? { requests: b.requests, cost: b.cost, avgLatencyMs: b.avg_latency_ms, errors: b.errors } : null,
  }));
}

// Ranking by a metric.
export function rankModels(rows, metric = "cost") {
  const agg = new Map();
  for (const r of rows) {
    const e = agg.get(r.model) ?? { model: r.model, requests: 0, cost: 0, errors: 0, latencySum: 0, latencyN: 0 };
    e.requests += r.requests; e.cost += r.cost; e.errors += r.errors;
    if (r.avg_latency_ms != null) { e.latencySum += r.avg_latency_ms * r.requests; e.latencyN += r.requests; }
    agg.set(r.model, e);
  }
  return [...agg.values()]
    .map((e) => ({ ...e, avgLatencyMs: e.latencyN ? e.latencySum / e.latencyN : null }))
    .sort((a, b) => (metric === "cost" ? b.cost - a.cost : b.requests - a.requests));
}
```

**Acceptance criteria:** comparison aligns buckets; ranking sorts by chosen metric.

### M4 — Insights + API + tests

**Reference code (`src/lib/modelobs/insights.js`):**

```js
// Trend: is the model's usage/cost growing?
export function trend(rows, metric = "cost") {
  if (rows.length < 2) return { direction: "flat", delta: 0 };
  const first = rows[0][metric] ?? 0;
  const last = rows[rows.length - 1][metric] ?? 0;
  const delta = first ? (last - first) / first : 0;
  return { direction: delta > 0.1 ? "up" : delta < -0.1 ? "down" : "flat", delta: Number(delta.toFixed(3)) };
}

// Recommendation: cheapest healthy model among candidates.
export function recommendCheapest(candidates) {
  const healthy = candidates.filter((c) => c.errors / Math.max(1, c.requests) < 0.05);
  if (!healthy.length) return null;
  return healthy.sort((a, b) => a.cost / Math.max(1, a.requests) - b.cost / Math.max(1, b.requests))[0];
}
```

**Reference code (`src/app/api/v1/model-metrics/route.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { modelSummary } from "@/lib/db/repos/modelMetricsRepo.js";
import { compareModels, rankModels } from "@/lib/modelobs/views.js";

export async function GET(req) {
  const db = getAdapter();
  const url = new URL(req.url);
  const model = url.searchParams.get("model") ?? undefined;
  const since = url.searchParams.get("since") ?? undefined;
  const granularity = url.searchParams.get("granularity") ?? "day";
  const rows = await modelSummary(db, { model, sinceIso: since, granularity });
  const compare = url.searchParams.get("compare");
  const comparison = compare ? compareModels(rows, await modelSummary(db, { model: compare, sinceIso: since, granularity })) : null;
  return Response.json({ rows, comparison, ranking: rankModels(rows) });
}
```

**Files touched:** `src/lib/modelobs/` (new: metrics, views, insights), `src/lib/db/migrations/20260915-modelobs.js` (new), `src/lib/db/repos/modelMetricsRepo.js` (new), `src/lib/usageDb.js` (metrics collection hook), `src/app/api/v1/model-metrics/route.js` (new), dashboard models page (extend), `tests/unit/model-observability.test.js` (new).

**Acceptance criteria:** metrics flow from usageDb; API returns summary/comparison/ranking; insights actionable.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Data volume | Slow queries | Bucketed aggregation + indexes |
| Metric noise | Misleading views | Smoothing + granularity choice |
| View complexity | Confusing UI | Progressive disclosure |
| Insight bias | Wrong recommendations | Data-driven + health filter |

## Verification

- Unit: metrics, summary, compare, rank, insights
- Manual: traffic on two models → detail + comparison + ranking
- Regression: `tests/__baseline__/verify-no-regression.mjs`