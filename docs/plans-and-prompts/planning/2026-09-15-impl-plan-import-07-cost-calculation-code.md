# Implementation Plan Import-07 — Cost Calculation Engine — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #cost #pricing #confidence #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`getPricingForModel(provider, model)` — **arg order is (provider, model)**, NOT (model, provider); pricing shape `{ input, output, cached, reasoning, cache_creation }` — **$/1M tokens**; cost formula `tokens / 1_000_000 * rate` — original divided by 1000, **wrong by 1000×**; pricing sources from `open-sse/providers/pricing.js` + user overrides from `src/lib/db/repos/pricingRepo.js`; **no `updatedAt` on pricing**).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — tokens; pricing; formula; confidence.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-07-cost-calculation.md`, `../research/9router/impl-plan-import-03-import-api.md`, `../research/9router/impl-plan-import-06-error-reconstruction.md`.

## Scope

**In scope:** token extraction (provider-specific); pricing lookup (pricingRepo); cost formula (input/output/cached); confidence scoring; cost display.
**Out of scope:** error reconstruction (import-06); import API (import-03).

## Milestones

### M1 — Token extraction

**Reference code (`src/lib/import/costCalculator.js`):**

```js
import { getPricingForModel } from "open-sse/providers/pricing.js";

const ESTIMATED_TOKENS_PER_CHAR = 0.25;
// Rates are $/1M tokens (see open-sse/providers/pricing.js header comment).
const PER_MILLION = 1_000_000;

function extractTokens(msg) {
  // Provider-specific token fields.
  const usage = msg.response?.usage || {};
  let promptTokens = msg.promptTokens || usage.prompt_tokens || usage.input_tokens;
  let completionTokens = msg.completionTokens || usage.completion_tokens || usage.output_tokens;

  // Estimate from content if missing.
  let estimated = false;
  if (!promptTokens && msg.request?.messages) {
    const text = msg.request.messages.map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)).join(" ");
    promptTokens = Math.ceil(text.length * ESTIMATED_TOKENS_PER_CHAR);
    estimated = true;
  }
  if (!completionTokens && msg.response?.choices?.[0]?.message?.content) {
    const text = msg.response.choices[0].message.content;
    completionTokens = Math.ceil(text.length * ESTIMATED_TOKENS_PER_CHAR);
    estimated = true;
  }

  return { promptTokens, completionTokens, estimated };
}
```

**Acceptance criteria:** usage fields; content estimation; estimated flag.

### M2 — Cost formula

**Reference code (`src/lib/import/costCalculator.js`):**

```js
export async function calculateCost(msg) {
  if (!msg.model) return { cost: null, confidence: "none", pricingSource: null, estimated: false };

  // 1. Get pricing — REAL signature: getPricingForModel(provider, model).
  const pricing = msg.provider ? getPricingForModel(msg.provider, msg.model) : null;
  const pricingSource = pricing ? "exact" : "none";
  if (!pricing) return { cost: null, confidence: "none", pricingSource, estimated: false };

  // 2. Get tokens (extract or estimate).
  const { promptTokens, completionTokens, estimated } = extractTokens(msg);
  if (!promptTokens && !completionTokens) {
    return { cost: null, confidence: "none", pricingSource, estimated };
  }

  // 3. Calculate — divide by 1,000,000 (rates are per-1M).
  const inputCost = (promptTokens || 0) / PER_MILLION * (pricing.input || 0);
  const outputCost = (completionTokens || 0) / PER_MILLION * (pricing.output || 0);
  const cachedCost = (msg.cachedInputTokens || 0) / PER_MILLION * (pricing.cached || 0);
  const cost = Math.round((inputCost + outputCost + cachedCost) * 1_000_000) / 1_000_000;

  // 4. Confidence.
  let confidence = "high";
  if (estimated) confidence = "medium";

  return { cost, confidence, pricingSource, estimated };
}
```

**Acceptance criteria:** pricing lookup; formula; confidence.

### M3 — Cost display

**Reference code (`src/lib/import/costDisplay.js`):**

```js
// Format cost for UI with confidence markers.
export function formatCost({ cost, confidence = "high" } = {}) {
  if (cost === null || cost === undefined) return "—";
  const marker = confidence === "high" ? "" : confidence === "medium" ? "~" : "?";
  return `${marker}$${cost.toFixed(4)}`;
}

export function costConfidenceLabel(confidence) {
  return { high: "Exact", medium: "Estimated", none: "Unknown" }[confidence] ?? "Unknown";
}
```

**Acceptance criteria:** formatting; confidence labels.

### M4 — Tests

**Reference code (`tests/unit/import-cost.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { calculateCost, extractTokens } from "@/lib/import/costCalculator.js";

describe("calculateCost", () => {
  it("returns null cost without model", async () => {
    const r = await calculateCost({});
    expect(r.cost).toBeNull();
  });
  it("estimates tokens from content", async () => {
    const r = extractTokens({ request: { messages: [{ content: "hello world" }] } });
    expect(r.promptTokens).toBeGreaterThan(0);
    expect(r.estimated).toBe(true);
  });
});
```

**Files touched:** `src/lib/import/costCalculator.js` (new), `src/lib/import/costDisplay.js` (new), `tests/unit/import-cost.test.js` (new).

**Acceptance criteria:** tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Pricing arg order | Wrong lookup | (provider, model) |
| Per-1M rates | 1000× errors | Divide by 1M |
| Missing tokens | No cost | Content estimation |
| Pricing drift | Stale rates | pricingRepo overrides |

## Verification

- Unit: calculateCost, extractTokens, formatCost, costConfidenceLabel
- Manual: import messages → verify costs
- Regression: `tests/__baseline__/verify-no-regression.mjs`