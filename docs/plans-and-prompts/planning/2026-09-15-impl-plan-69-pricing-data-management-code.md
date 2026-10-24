# Implementation Plan 69 — Model Pricing Data Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #pricing #cost-model #registry #verification #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cost estimation in `open-sse/` per plan 4 research; cost tables from plan 45 (`src/lib/cost/`); provider registry in `open-sse/providers/registry/*`; `open-sse/config/providerModels.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — update a price, confirm cost calc changes; run sanity checks; confirm history recorded.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-69-pricing-data-management.md`, `../research/9router/impl-plan-45-cost-tracking-budgets.md`, `../research/9router/impl-plan-34-provider-registry.md`.

## Scope

**In scope:** pricing registry (per-model input/output/cache pricing with source/updated/confidence metadata); update workflow (review → update → verify) with change history; verification (sanity ranges, input/output ratio, cache ≤ input, alerts on suspicious values); integration with cost calculation and cost-based routing.
**Out of scope:** automatic scraping of provider pricing pages (semi-auto import only); currency conversion.

## Milestones

### M1 — Pricing registry

**Reference code (`src/lib/pricing/registry.js`):**

```js
// Pricing registry: per-model input/output/cache USD per 1M tokens.
// Seeded from open-sse/config/pricing.js; overrides stored in DB.
export const DEFAULT_PRICING = {
  "gpt-4o": { input: 2.5, output: 10, cacheInput: 1.25, source: "openai-docs", updated: "2026-09-01", confidence: 1 },
  "claude-sonnet-4-5": { input: 3, output: 15, cacheInput: 0.3, source: "anthropic-docs", updated: "2026-09-01", confidence: 1 },
  // ...extend from open-sse/config/pricing.js
};

export function getPrice(model, pricing = DEFAULT_PRICING) {
  return pricing[model] ?? null;
}

export function setPrice(model, entry, pricing) {
  pricing[model] = { ...entry, updated: new Date().toISOString().slice(0, 10) };
  return pricing[model];
}
```

**Acceptance criteria:** defaults seeded; get/set work; metadata tracked.

### M2 — Update workflow + history

**Reference code (migration `src/lib/db/migrations/20260915-pricing.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_overrides (
      model TEXT PRIMARY KEY,
      input REAL NOT NULL,
      output REAL NOT NULL,
      cache_input REAL,
      source TEXT,
      confidence REAL NOT NULL DEFAULT 0.5,
      updated TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pricing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      field TEXT NOT NULL,
      old_value REAL,
      new_value REAL NOT NULL,
      changed_at TEXT NOT NULL,
      changed_by TEXT
    );
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS pricing_overrides; DROP TABLE IF EXISTS pricing_history"); };
```

```js
// src/lib/db/repos/pricingRepo.js
export async function upsertOverride(db, { model, input, output, cacheInput, source, confidence }) {
  const prev = db.get("SELECT * FROM pricing_overrides WHERE model = ?", [model]);
  db.run(`INSERT INTO pricing_overrides (model, input, output, cache_input, source, confidence, updated)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(model) DO UPDATE SET input = excluded.input, output = excluded.output,
            cache_input = excluded.cache_input, source = excluded.source, confidence = excluded.confidence, updated = excluded.updated`,
    [model, input, output, cacheInput ?? null, source ?? "manual", confidence, new Date().toISOString()]);
  if (prev) {
    for (const field of ["input", "output", "cache_input"]) {
      const oldV = prev[field]; const newV = { input, output, cacheInput }[field] ?? null;
      if (oldV !== newV) db.run(`INSERT INTO pricing_history (model, field, old_value, new_value, changed_at) VALUES (?, ?, ?, ?, ?)`,
        [model, field, oldV, newV, new Date().toISOString()]);
    }
  }
}
export async function listHistory(db, { model, limit = 50 } = {}) {
  const where = model ? "WHERE model = ?" : "";
  const params = model ? [model] : [];
  return db.all(`SELECT * FROM pricing_history ${where} ORDER BY id DESC LIMIT ?`, [...params, limit]);
}
```

**Acceptance criteria:** overrides upserted; history records field-level diffs; list works.

### M3 — Verification

**Reference code (`src/lib/pricing/verify.js`):**

```js
// Sanity checks on a pricing entry. Returns list of issues.
export function verifyPricing(entry, { maxInput = 100, maxOutput = 300 } = {}) {
  const issues = [];
  if (!entry || typeof entry.input !== "number" || typeof entry.output !== "number") {
    issues.push({ severity: "error", message: "input/output must be numbers" });
    return issues;
  }
  if (entry.input < 0 || entry.output < 0) issues.push({ severity: "error", message: "negative price" });
  if (entry.input > maxInput) issues.push({ severity: "warning", message: `input ${entry.input} exceeds ${maxInput}` });
  if (entry.output > maxOutput) issues.push({ severity: "warning", message: `output ${entry.output} exceeds ${maxOutput}` });
  if (entry.output < entry.input) issues.push({ severity: "warning", message: "output cheaper than input — unusual" });
  if (entry.cacheInput != null && entry.cacheInput > entry.input) issues.push({ severity: "warning", message: "cache price above input price" });
  return issues;
}

export function verifyAll(pricing) {
  return Object.entries(pricing).map(([model, entry]) => ({ model, issues: verifyPricing(entry) }));
}
```

**Acceptance criteria:** sanity checks catch negative/out-of-range/ratio issues; verifyAll covers registry.

### M4 — Integration + API + tests

**Reference code (`src/app/api/v1/pricing/route.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { DEFAULT_PRICING, getPrice } from "@/lib/pricing/registry.js";
import { upsertOverride, listHistory } from "@/lib/db/repos/pricingRepo.js";
import { verifyPricing } from "@/lib/pricing/verify.js";

export async function GET(req) {
  const db = getAdapter();
  const url = new URL(req.url);
  const model = url.searchParams.get("model");
  if (model) return Response.json({ model, price: getPrice(model), issues: verifyPricing(getPrice(model) ?? {}) });
  return Response.json({ pricing: DEFAULT_PRICING, history: await listHistory(db) });
}

export async function POST(req) {
  const db = getAdapter();
  const body = await req.json();
  const issues = verifyPricing(body);
  if (issues.some((i) => i.severity === "error")) return Response.json({ error: "invalid pricing", issues }, { status: 400 });
  await upsertOverride(db, body);
  return Response.json({ ok: true, issues });
}
```

**Files touched:** `src/lib/pricing/` (new: registry, verify), `src/lib/db/migrations/20260915-pricing.js` (new), `src/lib/db/repos/pricingRepo.js` (new), `open-sse/config/pricing.js` (extend), `src/lib/cost/` (integration), `src/app/api/v1/pricing/route.js` (new), `tests/unit/pricing.test.js` (new).

**Acceptance criteria:** API reads/writes pricing; cost calc consumes registry; verification gates writes.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Stale pricing | Wrong cost estimates | Update workflow + history |
| Pricing errors | Distorted routing | Verification + alerts |
| Source ambiguity | Wrong numbers | Confidence metadata |
| Integration drift | Cost calc diverges | Tests pinning cost↔pricing |

## Verification

- Unit: registry, verify, history
- Manual: POST a price → GET reflects it → cost calc uses it
- Regression: `tests/__baseline__/verify-no-regression.mjs`