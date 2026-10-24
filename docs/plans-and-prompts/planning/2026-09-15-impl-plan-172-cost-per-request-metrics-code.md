# Implementation Plan 172 — Cost-Per-Request Metrics & Accounting — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cost #metrics #ledger #accounting #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cost tracking from plan 45 (`src/lib/usageDb.js`); request pricing from plan 165 (`src/lib/pricing/`); cost-quality plane from plan 167 (`src/lib/cost-quality/`); cost tiers from plan 153 (`src/lib/bands/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — cost metrics; ledger; reports.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-172-cost-per-request-metrics.md`, `../research/9router/impl-plan-45-cost-tracking.md`, `../research/9router/impl-plan-165-request-pricing-cost-model.md`.

## Scope

**In scope:** cost metrics (per-request, per-model, per-task, per-user); cost accounting (ledger, reconciliation, allocation); cost reporting (daily/weekly/monthly, dimensions, export); integration.
**Out of scope:** request pricing model (plan 165); cost tier bands (plan 153).

## Milestones

### M1 — Cost metrics

**Reference code (`src/lib/cost/metrics.js`):**

```js
// Cost metrics: per-request + aggregates.
export function makeCostMetrics() {
  const requests = [];
  return {
    record({ modelId, provider = null, task = "general", user = null, cost = 0, tokens = 0 } = {}) {
      requests.push({ modelId, provider, task, user, cost, tokens, at: Date.now() });
    },
    // Per-model aggregate.
    byModel() {
      return requests.reduce((acc, r) => { acc[r.modelId] = (acc[r.modelId] ?? 0) + r.cost; return acc; }, {});
    },
    // Per-task aggregate.
    byTask() {
      return requests.reduce((acc, r) => { acc[r.task] = (acc[r.task] ?? 0) + r.cost; return acc; }, {});
    },
    // Per-user aggregate.
    byUser() {
      return requests.reduce((acc, r) => { acc[r.user ?? "anonymous"] = (acc[r.user ?? "anonymous"] ?? 0) + r.cost; return acc; }, {});
    },
    total() { return requests.reduce((s, r) => s + r.cost, 0); },
    count() { return requests.length; },
  };
}
```

**Acceptance criteria:** record; aggregates; totals.

### M2 — Cost accounting

**Reference code (`src/lib/cost/ledger.js`):**

```js
// Cost ledger: immutable cost records.
export function makeLedger() {
  const entries = [];
  return {
    // Append-only.
    append(entry) { entries.push({ ...entry, id: entries.length + 1, at: Date.now() }); },
    all() { return entries; },
    // Reconciliation: verify totals match sum of entries.
    reconcile({ expected = null } = {}) {
      const sum = entries.reduce((s, e) => s + e.cost, 0);
      return { ok: expected === null || Math.abs(sum - expected) < 0.001, sum, expected };
    },
    // Allocation: allocate costs to users/orgs.
    allocate() {
      return entries.reduce((acc, e) => { acc[e.user ?? "anonymous"] = (acc[e.user ?? "anonymous"] ?? 0) + e.cost; return acc; }, {});
    },
  };
}
```

**Acceptance criteria:** append-only; reconciliation; allocation.

### M3 — Cost reporting

**Reference code (`src/lib/cost/reports.js`):**

```js
// Reports: daily/weekly/monthly.
export function reportPeriod({ entries = [], period = "daily" } = {}) {
  const buckets = new Map();
  for (const e of entries) {
    const d = new Date(e.at);
    const key = period === "daily" ? d.toISOString().slice(0, 10) : period === "weekly" ? `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}` : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(key) ?? { cost: 0, requests: 0 };
    b.cost += e.cost;
    b.requests += 1;
    buckets.set(key, b);
  }
  return Object.fromEntries(buckets);
}

// Export: CSV/JSON.
export function exportReport({ report = {}, format = "json" } = {}) {
  if (format === "csv") {
    const rows = Object.entries(report).map(([k, v]) => `${k},${v.cost},${v.requests}`);
    return `period,cost,requests\n${rows.join("\n")}`;
  }
  return JSON.stringify(report, null, 2);
}
```

**Acceptance criteria:** periods; export.

### M4 — Integration + tests

**Reference code (`src/lib/cost/integrate.js`):**

```js
// Usage DB integration: cost records.
export function recordCost({ metrics, ledger, ...entry } = {}) {
  metrics.record(entry);
  ledger.append(entry);
  return entry;
}

// Fail-open.
export function safeCost(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/cost/` (new: metrics, ledger, reports, integrate), `src/lib/usageDb.js` (integration), dashboard cost page (new), `tests/unit/cost.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Ledger drift | Wrong totals | Reconciliation |
| Metric noise | Confusing data | Aggregation |
| Report complexity | Confusion | Simple reports |
| Data volume | Slow reports | Retention policy |

## Verification

- Unit: makeCostMetrics, makeLedger, reportPeriod, exportReport, recordCost
- Manual: requests → aggregates → reports
- Regression: `tests/__baseline__/verify-no-regression.mjs`