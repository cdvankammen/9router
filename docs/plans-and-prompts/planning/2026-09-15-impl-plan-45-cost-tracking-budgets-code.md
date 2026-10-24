# Implementation Plan 45 — Cost Tracking & Budget Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cost-tracking #budgets #billing #forecast #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`src/lib/usageDb.js` usage tracking; the regex-heuristic cost estimation from impl-plan-04; `src/lib/db/repos/settingsRepo.js` for budget settings; webhook alerts from plan 37 for notification integration).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run cost calc against known usage; trigger budget thresholds; check forecast sanity.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-45-cost-tracking-budgets.md`, `../research/9router/46-branch-evaluation-and-cost-quality.md`, `../research/9router/impl-plan-04-cost-quality-optimizer.md`.

## Scope

**In scope:** per-model pricing table (input/output/cache tokens); per-request cost from usage; aggregation (model/provider/user/day); budgets (total/per-model/per-user/per-period) with 80%/100% alerts + configurable hard-stop; trend-based forecasting; cost dashboard + exportable reports.
**Out of scope:** billing/invoicing; payment processing; multi-currency FX.

## Milestones

### M1 — Cost model + pricing table

**Reference code (`src/lib/cost/pricing.js`):**

```js
// Per-model pricing: USD per 1M tokens. Overridable via settings (costPricingOverrides).
export const DEFAULT_PRICING = {
  "gpt-4o": { input: 2.5, output: 10, cacheRead: 1.25 },
  "gpt-4o-mini": { input: 0.15, output: 0.6, cacheRead: 0.075 },
  "gpt-4.1": { input: 2, output: 8, cacheRead: 0.5 },
  "claude-sonnet-4-20250514": { input: 3, output: 15, cacheRead: 0.3 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5, cacheRead: 0.1 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4, cacheRead: 0.025 },
};

export function getPricing(model, overrides = {}) {
  return overrides[model] ?? DEFAULT_PRICING[model] ?? null;
}

// usage: { prompt_tokens, completion_tokens, prompt_tokens_details?: { cached_tokens } }
export function calcCost(model, usage, overrides = {}) {
  const p = getPricing(model, overrides);
  if (!p) return null; // unknown model — no cost
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const freshInput = Math.max(0, usage.prompt_tokens - cached);
  return {
    input: (freshInput / 1_000_000) * p.input,
    cacheRead: (cached / 1_000_000) * (p.cacheRead ?? p.input),
    output: (usage.completion_tokens / 1_000_000) * p.output,
    total: ((freshInput / 1_000_000) * p.input) + ((cached / 1_000_000) * (p.cacheRead ?? p.input)) + ((usage.completion_tokens / 1_000_000) * p.output),
  };
}
```

**Acceptance criteria:** cost computed per token type; unknown models return null (no false cost); overrides supported.

### M2 — Cost aggregation

**Reference code (migration `src/lib/db/migrations/20260915-costs.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cost_daily (
      day TEXT NOT NULL,
      model TEXT NOT NULL,
      provider TEXT,
      user_id TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      PRIMARY KEY (day, model, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_cost_daily_day ON cost_daily (day);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS cost_daily"); };
```

```js
// src/lib/db/repos/costRepo.js
export async function recordCost(db, { day, model, provider, userId, usage, cost }) {
  db.run(`
    INSERT INTO cost_daily (day, model, provider, user_id, input_tokens, output_tokens, cost)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(day, model, user_id) DO UPDATE SET
      input_tokens = input_tokens + excluded.input_tokens,
      output_tokens = output_tokens + excluded.output_tokens,
      cost = cost + excluded.cost
  `, [day, model, provider ?? null, userId ?? null, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0, cost]);
}

export async function aggregateByDay(db, { from, to } = {}) {
  const where = from && to ? "WHERE day >= ? AND day <= ?" : "";
  const params = from && to ? [from, to] : [];
  return db.all(`SELECT day, SUM(cost) AS cost, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens
                 FROM cost_daily ${where} GROUP BY day ORDER BY day`, params);
}
```

**Acceptance criteria:** per-request cost recorded; daily aggregation by model/user works.

### M3 — Budgets + alerts + enforcement

**Reference code (`src/lib/cost/budgets.js`):**

```js
// Budgets from settings: { totalMonthly, perModel: { "gpt-4o": 10 }, perUser: { "u1": 5 } }
export async function evaluateBudgets(db, { periodCost, modelCosts, userCosts, settings }) {
  const alerts = [];
  const enforce = [];

  const check = (label, spent, limit) => {
    if (!limit) return;
    const pct = spent / limit;
    if (pct >= 1) { alerts.push({ level: "critical", label, spent, limit, pct }); enforce.push(label); }
    else if (pct >= 0.8) alerts.push({ level: "warning", label, spent, limit, pct });
  };

  check("total", periodCost, settings.budgetTotalMonthly);
  for (const [model, limit] of Object.entries(settings.budgetPerModel ?? {})) check(`model:${model}`, modelCosts[model] ?? 0, limit);
  for (const [user, limit] of Object.entries(settings.budgetPerUser ?? {})) check(`user:${user}`, userCosts[user] ?? 0, limit);

  return { alerts, enforce };
}

// Enforcement: hard-stop returns a 429-style refusal for new requests when configured.
export function shouldBlockRequest(enforceLabels, settings) {
  if (settings.budgetEnforcement !== "hard-stop") return false;
  return enforceLabels.length > 0;
}
```

**Acceptance criteria:** 80% warning + 100% critical alerts; hard-stop blocks when configured; alerts feed webhook system (plan 37).

### M4 — Forecasting + cost UI + tests

**Reference code (`src/lib/cost/forecast.js`):**

```js
// Simple trend forecast: linear regression over daily totals.
export function forecastNextDays(dailyTotals, days = 30) {
  const n = dailyTotals.length;
  if (n < 2) return null;
  const xs = dailyTotals.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = dailyTotals.reduce((a, b) => a + b, 0) / n;
  const slope = xs.reduce((acc, x, i) => acc + (x - meanX) * (dailyTotals[i] - meanY), 0)
    / xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0);
  const intercept = meanY - slope * meanX;
  const lastX = n - 1;
  return Array.from({ length: days }, (_, i) => ({
    dayOffset: i + 1,
    projected: Math.max(0, slope * (lastX + i + 1) + intercept),
  }));
}
```

**Files touched:** `src/lib/cost/` (new: pricing, budgets, forecast), `src/lib/db/migrations/20260915-costs.js` (new), `src/lib/db/repos/costRepo.js` (new), `src/lib/usageDb.js` (cost integration), `src/app/api/v1/costs/route.js` (new), dashboard cost page (new), `tests/unit/cost-tracking.test.js` (new).

**Acceptance criteria:** forecast produced from ≥2 days of data; cost API returns aggregates; dashboard shows spend + budgets + forecast.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Pricing drift | Wrong costs | Overrides + pricing update process |
| Budget enforcement gaps | Overspend | Hard-stop option |
| Forecast inaccuracy | Misleading | Tracked accuracy + disclaimer |
| Cost data volume | Table growth | Daily aggregation + retention |

## Verification

- Unit: pricing, calcCost, budgets, forecast
- Manual: known usage → cost matches; budget threshold → alert fires
- Regression: `tests/__baseline__/verify-no-regression.mjs`