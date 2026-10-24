# Branch X: Model Catalog Sync & Unknown Model Resolution — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, model-catalog, unknown-models, binary-tree, branch-x

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch X: MODEL CATALOG SYNC & UNKNOWN MODEL RESOLUTION

Imported messages may reference models 9Router doesn't know. Build a catalog sync + resolution workflow so unknown models become first-class over time.

### L2 X1: CATALOG SOURCES

#### L3 X1a: Local Registry
- **L4 X1a1: open-sse Registry**
  - L5: Primary source: `open-sse/providers/registry/*.js` model lists
  - L6: Already the source of truth for native routing

#### L3 X1b: Remote Catalogs
- **L4 X1b1: OpenRouter Models API**
  - L5: `GET https://openrouter.ai/api/v1/models` — broad model catalog with pricing
  - L6: Sync periodically; map to providers
- **L4 X1b2: Provider Model APIs**
  - L5: OpenAI `/v1/models`, Anthropic models list, Google models list
  - L6: Authoritative per-provider

#### L3 X1c: Community Catalogs
- **L4 X1c1: models.dev**
  - L5: Open catalog of model metadata (context, pricing, capabilities)
  - L6: Good for long-tail models
- **L4 X1c2: LiteLLM model map**
  - L5: LiteLLM's `model_prices_and_context_window.json`
  - L6: Very broad, includes pricing

### L2 X2: UNKNOWN MODEL WORKFLOW

#### L3 X2a: Detection
- **L4 X2a1: On Import**
  - L5: Matcher returns `provider: null` → record in `unknown_models`
  - L6: Count, first_seen, last_seen, sample request

#### L3 X2b: Review UI
- **L4 X2b1: Unknown Models Page**
  - L5: List unknown models with counts and samples
  - L6: "Map to provider" action per model

#### L3 X2c: Resolution
- **L4 X2c1: Manual Mapping**
  - L5: User picks provider + canonical model → backfill all matching rows
  - L6: `updateModelMapping()` in repo
- **L4 X2c2: Auto-Suggestion**
  - L5: Fuzzy suggest likely provider based on name patterns
  - L6: "Did you mean claude-3.5-sonnet?"

### L2 X3: CATALOG SYNC JOBS

#### L3 X3a: Scheduled Sync
- **L4 X3a1: Daily Sync**
  - L5: Daily job fetches remote catalogs, diffs against local
  - L6: New models → added to a `model_catalog` table

#### L3 X3b: Diff Reporting
- **L4 X3b1: New/Removed Models**
  - L5: Report models added/removed upstream
  - L6: Dashboard notification

### L2 X4: MODEL METADATA

#### L3 X4a: Pricing Metadata
- **L4 X4a1: Input/Output Prices**
  - L5: Store per-model input/output price per 1M tokens
  - L6: Feeds costCalculator (Branch D)

#### L3 X4b: Capability Metadata
- **L4 X4b1: Context Window, Tools, Vision**
  - L5: Store context window, supports_tools, supports_vision
  - L6: Enables capability-aware routing

### L2 X5: ALIASES & NORMALIZATION

#### L3 X5a: Model Aliases
- **L4 X5a1: Alias Table**
  - L5: `model_aliases(alias, canonical_model, provider)`
  - L6: e.g., `gpt-4-turbo` → `gpt-4-turbo-2024-04-09`

#### L3 X5b: Provider Prefixes
- **L4 X5b1: Prefix Stripping**
  - L5: `anthropic/claude-3.5-sonnet` → provider=anthropic, model=claude-3.5-sonnet
  - L6: Already in matcher normalizeModelName

## Open Questions

1. Should 9Router sync remote catalogs automatically or on-demand?
2. Is models.dev or LiteLLM the better pricing source?
3. How many unknown models are expected in practice?

## Related Implementation Plans

- `9router/impl-plan-import-18-model-catalog-sync.md` — catalog sync job, unknown model resolution UI, alias table with code