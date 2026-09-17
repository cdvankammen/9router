# Branch D: Cost Calculation from Model Names — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, cost-calculation, binary-tree, branch-d

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch D: COST CALCULATION FROM MODEL NAMES

Calculate costs for imported requests using the same pricing data as native 9Router traffic.

### L2 D1: PRICING DATA SOURCES

#### L3 D1a: pricingRepo.js
- **L4 D1a1: Schema**
  - L5: `pricing` table: `{model, provider, inputPer1k, outputPer1k, cachedInputPer1k, updatedAt}`
  - L6: Populated from `open-sse/config/pricing.js` + manual overrides
- **L4 D1a2: Lookup API**
  - L5: `getPricing(model, provider)` → returns pricing object or null
  - L6: Cached in memory, invalidated on pricing update

#### L3 D1b: Fallback Pricing
- **L4 D1b1: Model-Only Lookup**
  - L5: If provider not matched, search by model name across all providers
  - L6: Return first match + flag as "estimated pricing"
- **L4 D1b2: Default Pricing**
  - L5: If no pricing found → use $0.00 (unknown cost)
  - L6: Display "cost unknown" in UI, not $0.00

### L2 D2: TOKEN COUNTING

#### L3 D2a: Extract from Response
- **L4 D2a1: OpenAI Format**
  - L5: `response.usage.prompt_tokens`, `response.usage.completion_tokens`
  - L6: Also `completion_tokens_details.reasoning_tokens` for o1/o3
- **L4 D2a2: Anthropic Format**
  - L5: `response.usage.input_tokens`, `response.usage.output_tokens`
  - L6: Also `cache_creation_input_tokens`, `cache_read_input_tokens`

#### L3 D2b: Estimate from Request/Response
- **L4 D2b1: Character Count Heuristic**
  - L5: `tokens ≈ characters / 4` (English text)
  - L6: Apply to `request.messages` + `response.choices[0].message.content`
- **L4 D2b2: Tiktoken (If Available)**
  - L5: Use `tiktoken` library for exact count (if installed)
  - L6: Fallback to heuristic if tiktoken not available

### L2 D3: COST FORMULA

#### L3 D3a: Standard Formula
- **L4 D3a1: Input + Output**
  - L5: `cost = (promptTokens / 1000 * inputPer1k) + (completionTokens / 1000 * outputPer1k)`
  - L6: Round to 6 decimal places
- **L4 D3a2: Cached Input Discount**
  - L5: `cachedCost = cachedInputTokens / 1000 * cachedInputPer1k`
  - L6: Anthropic/OpenAI cache at 10% of input price

#### L3 D3b: Special Cases
- **L4 D3b1: Image Tokens**
  - L5: Images have fixed token costs (e.g., GPT-4V: 85 tokens per 512x512 tile)
  - L6: Count image blocks in request, add to promptTokens
- **L4 D3b2: Tool Use Tokens**
  - L5: Tool calls/responses count toward tokens (already in usage)
  - L6: No special handling needed

### L2 D4: COST DISPLAY

#### L3 D4a: Per-Request
- **L4 D4a1: Messages Page**
  - L5: Show cost column in message list, formatted as `$0.0045`
  - L6: Tooltip shows breakdown: input $0.003 + output $0.0015
- **L4 D4a2: Message Detail**
  - L5: Show full cost breakdown: input tokens, output tokens, cached tokens, total cost
  - L6: Link to pricing page for model

#### L3 D4b: Aggregated
- **L4 D4b1: Dashboard Quota Page**
  - L5: Include imported messages in quota tracking
  - L6: Separate "native" vs "imported" cost breakdown
- **L4 D4b2: Usage Reports**
  - L5: Daily/weekly/monthly cost reports include imported traffic
  - L6: Filter by source (native/imported), provider, model

### L2 D5: COST ACCURACY

#### L3 D5a: Pricing Staleness
- **L4 D5a1: Pricing Update Detection**
  - L5: If pricing.updatedAt > 30 days old → flag as "pricing may be outdated"
  - L6: Link to provider pricing page for manual update
- **L4 D5a2: Model Deprecation**
  - L5: If model no longer in pricing table → use last-known pricing
  - L6: Flag as "deprecated model pricing"

#### L3 D5b: Estimation Confidence
- **L4 D5b1: High Confidence**
  - L5: Exact model match + exact provider match + pricing < 30 days old
  - L6: Display cost as-is
- **L4 D5b2: Low Confidence**
  - L5: Model-only match OR pricing > 30 days old OR estimated tokens
  - L6: Display cost with "~" prefix: `~$0.0045`

## Implementation Priority

1. **pricingRepo.js Integration + Standard Formula** (core) — 1 day
2. **Token Extraction from Response** — 1 day
3. **Fallback Pricing + Estimation** — 1 day
4. **Cost Display in UI** — 1 day

## Open Questions

- Should imported costs count toward user quotas/budgets?
- How to handle models with no pricing data (e.g., local models)?
- Should the system suggest pricing updates when costs seem wrong?
