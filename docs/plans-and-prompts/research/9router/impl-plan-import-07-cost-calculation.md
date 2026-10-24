# Implementation Plan 07: Cost Calculation Engine

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, cost, pricing

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-d-cost-calculation.md` (primary — pricing sources, token counting, cost formula, display, accuracy)
- `../2026-09-17-hermes-import-branch-b-provider-matching.md` (provider must be known before pricing)

## Goal

Calculate costs for imported messages using the same pricing data as native 9Router traffic, with confidence indicators for estimated values.

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| Pricing function | `getPricingForModel(provider, model)` — **arg order is (provider, model)**, NOT (model, provider) as the original plan used |
| Pricing shape | `{ input, output, cached, reasoning, cache_creation }` — **$/1M tokens** (see `open-sse/providers/pricing.js` header) — NOT `inputPer1k`/`outputPer1k`/`cachedInputPer1k` |
| Cost formula | `tokens / 1_000_000 * rate` — original divided by 1000 (wrong by 1000×) |
| Pricing sources | `open-sse/providers/pricing.js` (static constants: `MODEL_PRICING`, `PROVIDER_PRICING`, `PATTERN_PRICING`) + `src/lib/db/repos/pricingRepo.js` (user overrides in kv store, merged) |
| **No `updatedAt` on pricing** | Pricing entries are plain `{ input, output, cached, ... }` — no timestamp field; staleness-based confidence doesn't apply |
| Fallback order | `getPricingForModel`: provider-specific → canonical model (strips `vendor/` prefix) → glob pattern (`codex-*`) → null |
| Adapter API | `db.run/get/all/exec` positional params — no `.prepare()` |

## Scope

- Token extraction (provider-specific)
- Pricing lookup (pricingRepo)
- Cost formula (input/output/cached)
- Confidence scoring
- Cost display

## Design

### 1. Cost Calculator — `src/lib/import/costCalculator.js`

**Purpose:** Compute cost from tokens + real pricing tables, with confidence.

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `calculateCost(msg)` | Pricing lookup → token extraction → formula → confidence | `{ cost, confidence, pricingSource, estimated }` |
| `extractTokens(msg)` | Provider-specific usage fields, estimate from content if missing | `{ promptTokens, completionTokens, estimated }` |

```javascript
// src/lib/import/costCalculator.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { getPricingForModel } from "open-sse/providers/pricing.js";

const ESTIMATED_TOKENS_PER_CHAR = 0.25;
// Rates are $/1M tokens (see open-sse/providers/pricing.js header comment)
const PER_MILLION = 1_000_000;

export async function calculateCost(msg) {
  if (!msg.model) return { cost: null, confidence: "none", pricingSource: null, estimated: false };

  // 1. Get pricing — REAL signature: getPricingForModel(provider, model)
  const pricing = msg.provider ? getPricingForModel(msg.provider, msg.model) : null;
  const pricingSource = pricing ? "exact" : "none";
  if (!pricing) return { cost: null, confidence: "none", pricingSource, estimated: false };

  // 2. Get tokens (extract or estimate)
  const { promptTokens, completionTokens, estimated } = extractTokens(msg);
  if (!promptTokens && !completionTokens) {
    return { cost: null, confidence: "none", pricingSource, estimated };
  }

  // 3. Calculate — divide by 1,000,000 (rates are per-1M)
  const inputCost = (promptTokens || 0) / PER_MILLION * (pricing.input || 0);
  const outputCost = (completionTokens || 0) / PER_MILLION * (pricing.output || 0);
  const cachedCost = (msg.cachedInputTokens || 0) / PER_MILLION * (pricing.cached || 0);
  const cost = Math.round((inputCost + outputCost + cachedCost) * 1_000_000) / 1_000_000;

  // 4. Confidence
  let confidence = "high";
  if (estimated) confidence = "medium";

  return { cost, confidence, pricingSource, estimated };
}

function extractTokens(msg) {
  // Provider-specific token fields
  const usage = msg.response?.usage || {};
  let promptTokens = msg.promptTokens || usage.prompt_tokens || usage.input_tokens;
  let completionTokens = msg.completionTokens || usage.completion_tokens || usage.output_tokens;

  // Estimate from content if missing
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

**⚠️ GROUNDING FIXES (original plan was wrong):**
1. Called `getPricing(msg.model, msg.provider)` — **wrong arg order**. Real: `getPricingForModel(provider, model)`.
2. Used `pricing.inputPer1k` / `outputPer1k` / `cachedInputPer1k` — **don't exist**. Real shape: `{ input, output, cached, reasoning, cache_creation }`.
3. Divided by 1000 — **wrong by 1000×**. Rates are $/1M tokens → divide by 1,000,000.
4. Checked `pricing.updatedAt` — **doesn't exist** on pricing entries. Removed staleness logic.

### 2. Cost Display Helper — `src/lib/import/costDisplay.js`

**Purpose:** Format cost for UI with confidence markers.

```javascript
// src/lib/import/costDisplay.js
// SUGGESTION ONLY — review against actual codebase before implementing
export function formatCost(cost, confidence) {
  if (cost === null) return "cost unknown";
  const formatted = `$${cost.toFixed(6)}`;
  if (confidence === "low") return `~${formatted}`;
  if (confidence === "medium") return `${formatted}?`;
  return formatted;
}
```

### 3. Schema addition — `cost_confidence` column

**Purpose:** Store the confidence so the UI can render `~`/`?` markers without recomputing.

```sql
-- Addition to 005-imported-messages.js up(db)
ALTER TABLE imported_messages ADD COLUMN cost_confidence TEXT;
```

## Steps (per-part instructions)

### Step 1 — Create `src/lib/import/costCalculator.js`
1. Create the file using `getPricingForModel(provider, model)`.
2. **Verify:** `calculateCost({ provider: 'openai', model: 'gpt-4o', promptTokens: 1000, completionTokens: 500 })` → `{ cost: 0.0075, confidence: 'high' }` (1000/1M×2.50 + 500/1M×10.00).

### Step 2 — Create `src/lib/import/costDisplay.js`
1. Create the file.
2. **Verify:** `formatCost(0.0075, 'medium')` → `"$0.007500?"`.

### Step 3 — Add `cost_confidence` column to migration
1. Add the ALTER to plan 01's migration + `TABLES` in `schema.js` + bump `SCHEMA_VERSION`.
2. **Verify:** `PRAGMA table_info(imported_messages)` shows `cost_confidence`.

### Step 4 — Wire into import pipeline
1. In the import API (plan 03), call `calculateCost(msg)` and store `cost` + `cost_confidence`.
2. **Verify:** imported message with usage shows cost; without usage shows estimated cost with `?`.

### Step 5 — Update Messages page cost column
1. In the Messages page, render `formatCost(cost, costConfidence)` for imported rows.
2. **Verify:** estimated costs show `?` marker.

### Step 6 — Test with known model/token combos
1. Run the verification commands below.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| `getPricingForModel` | Missing pricing for model | Return null + "cost unknown" |
| Token extraction | Missing usage | Estimate from content, flag |
| Rate unit | $/1M vs $/1K confusion | Divide by 1,000,000 (verified header) |

## Verification (commands)

```bash
node -e "import('./src/lib/import/costCalculator.js').then(async m => {
  console.log(await m.calculateCost({ provider: 'openai', model: 'gpt-4o', promptTokens: 1000, completionTokens: 500 }));
  console.log(await m.calculateCost({ provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', promptTokens: 1000, completionTokens: 500 }));
  console.log(await m.calculateCost({ model: 'unknown-model-xyz', promptTokens: 100 }));
})"
# Expect: gpt-4o → 0.0075 high; claude → 0.003+0.0075=0.0105 high; unknown → cost null
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.