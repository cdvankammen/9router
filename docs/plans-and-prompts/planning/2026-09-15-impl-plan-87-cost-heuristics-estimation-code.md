# Implementation Plan 87 — Cost Heuristics & Historical Cost Estimation — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cost-estimation #heuristics #tiers #budget #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cost tracking from plan 45 (`src/lib/cost/`); pricing registry from plan 69; token optimization from plan 26 research; budget checks in `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — estimate cost pre-routing; compare with actual post-hoc; confirm tier routing for budget-constrained requests.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-87-cost-heuristics-estimation.md`, `../research/9router/impl-plan-45-cost-tracking-budgets.md`, `../research/9router/impl-plan-69-pricing-data-management.md`.

## Scope

**In scope:** token estimation pre-routing (message-length heuristics, cached counts); pricing lookup (per-model from pricing data); cost formula (input×inputPrice + output×outputPrice) with confidence interval from historical variance; historical cost store (per model/route/task, daily/weekly/monthly aggregates, EWMA prediction); cost tiers (cheap/standard/premium, assignment, tier routing); pre-routing estimate attach + budget check (reject/warn) + post-hoc reconciliation + accuracy metrics.
**Out of scope:** exact token counting via provider tokenizers (heuristics first); currency conversion.

## Milestones

### M1 — Token estimation + pricing lookup

**Reference code (`src/lib/cost/tokens.js` + `pricing.js`):**

```js
// Token estimation: heuristic from message length (chars → tokens).
export function estimateTokens(text, { charsPerToken = 4 } = {}) {
  if (!text) return 0;
  return Math.ceil(String(text).length / charsPerToken);
}

export function estimateRequestTokens({ messages = [], maxTokens = 0 } = {}) {
  const input = messages.reduce((a, m) => {
    const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "");
    return a + estimateTokens(content) + 4; // per-message overhead
  }, 0);
  return { input, output: maxTokens || 1024 };
}

// Pricing lookup: per-model input/output prices (USD per 1M tokens).
export function lookupPrice(model, pricing) {
  return pricing[model] ?? null;
}

export function estimateCost({ inputTokens, outputTokens, price }) {
  if (!price) return null;
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}
```

**Acceptance criteria:** tokens estimated; cost formula correct; missing pricing → null.

### M2 — Historical cost store

**Reference code (migration `src/lib/db/migrations/20260915-cost-estimates.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cost_estimates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT,
      model TEXT NOT NULL,
      route TEXT,
      task_type TEXT,
      estimated REAL NOT NULL,
      actual REAL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cost_estimates ON cost_estimates (model, at);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS cost_estimates"); };
```

```js
// src/lib/db/repos/costRepo.js
export async function recordEstimate(db, { requestId = null, model, route = null, taskType = null, estimated, actual = null, inputTokens = null, outputTokens = null }) {
  db.run(`INSERT INTO cost_estimates (request_id, model, route, task_type, estimated, actual, input_tokens, output_tokens, at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [requestId, model, route, taskType, estimated, actual, inputTokens, outputTokens, new Date().toISOString()]);
}
export async function reconcileEstimate(db, requestId, actual) {
  return db.run("UPDATE cost_estimates SET actual = ? WHERE request_id = ?", [actual, requestId]);
}
export async function estimateAccuracy(db, { sinceIso } = {}) {
  const where = "actual IS NOT NULL" + (sinceIso ? " AND at >= ?" : "");
  const params = sinceIso ? [sinceIso] : [];
  const rows = db.all(`SELECT estimated, actual FROM cost_estimates WHERE ${where}`, params);
  if (!rows.length) return { n: 0, mape: null };
  const mape = rows.reduce((a, r) => a + Math.abs(r.actual - r.estimated) / Math.max(1e-6, r.actual), 0) / rows.length;
  return { n: rows.length, mape: Number(mape.toFixed(3)) };
}
```

**Acceptance criteria:** estimates recorded; reconciled post-hoc; MAPE computed.

### M3 — Cost tiers

**Reference code (`src/lib/cost/tiers.js`):**

```js
// Tier definitions + assignment from pricing.
export const COST_TIERS = ["cheap", "standard", "premium"];

export function tierForModel(model, pricing, { cheapMaxInput = 1, premiumMinInput = 10 } = {}) {
  const p = pricing[model];
  if (!p) return "standard";
  if (p.input <= cheapMaxInput) return "cheap";
  if (p.input >= premiumMinInput) return "premium";
  return "standard";
}

// Tier routing: budget-constrained requests prefer cheaper tiers.
export function applyBudgetTier(candidates, { budget = null, tierByModel, maxTier = "standard" } = {}) {
  if (budget == null) return candidates;
  const allowed = candidates.filter((c) => {
    const tier = tierByModel[c.model] ?? "standard";
    return COST_TIERS.indexOf(tier) <= COST_TIERS.indexOf(maxTier);
  });
  return allowed.length ? allowed : candidates;
}
```

**Acceptance criteria:** tiers assigned from pricing; budget filter respects max tier.

### M4 — Integration + tests

**Reference code (`src/lib/cost/estimate.js`):**

```js
import { estimateRequestTokens, estimateCost } from "./tokens.js";
import { lookupPrice } from "./pricing.js";

// Pre-routing estimate with confidence from historical variance.
export function estimateRequestCost({ messages, maxTokens, model, pricing, history = null }) {
  const { input, output } = estimateRequestTokens({ messages, maxTokens });
  const price = lookupPrice(model, pricing);
  const cost = estimateCost({ inputTokens: input, outputTokens: output, price });
  if (cost == null) return { cost: null, confidence: null };
  const variance = history?.variance ?? 0.3;
  const confidence = Math.max(0.1, Math.min(0.95, 1 - variance));
  return { cost: Number(cost.toFixed(6)), confidence: Number(confidence.toFixed(2)), inputTokens: input, outputTokens: output };
}

// Budget check: reject/warn when estimate exceeds budget.
export function checkBudget(estimate, { budget, mode = "warn" } = {}) {
  if (budget == null || estimate.cost == null) return { ok: true };
  if (estimate.cost > budget) return { ok: false, mode, reason: "budget-exceeded", estimate: estimate.cost, budget };
  return { ok: true };
}
```

**Files touched:** `src/lib/cost/` (new: tokens, pricing, estimate, tiers), `src/lib/db/migrations/20260915-cost-estimates.js` (new), `src/lib/db/repos/costRepo.js` (new), `open-sse/config/pricingData.js` (new), `src/sse/handlers/chat.js` (estimate attach + budget check), dashboard cost page (new), `tests/unit/cost.test.js` (new).

**Acceptance criteria:** estimates attached pre-routing; budget enforced; accuracy visible.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Token misestimation | Wrong costs | Heuristic calibration + MAPE tracking |
| Pricing staleness | Wrong estimates | Pricing data refresh (plan 69) |
| Estimate variance | Unreliable budgets | Confidence intervals |
| Budget false alarms | Blocked requests | Conservative thresholds + warn-first |

## Verification

- Unit: estimateTokens, estimateCost, tierForModel, checkBudget, estimateAccuracy
- Manual: estimate vs actual on real traffic; budget-constrained request → cheaper tier
- Regression: `tests/__baseline__/verify-no-regression.mjs`