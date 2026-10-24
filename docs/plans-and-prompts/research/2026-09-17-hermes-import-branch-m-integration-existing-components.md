# Branch M: Integration with Existing 9Router Components — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, integration, existing-components, binary-tree, branch-m

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch M: INTEGRATION WITH EXISTING 9ROUTER COMPONENTS

Reuse existing 9Router infrastructure to minimize code duplication and ensure consistency.

### L2 M1: REQUEST DETAILS REPO

#### L3 M1a: Buffer/Flush Pattern
- **L4 M1a1: Reuse Buffer**
  - L5: Copy `requestDetailsRepo.js` buffer/flush pattern for imported messages
  - L6: Buffer 100 messages, flush every 5 seconds or when full
- **L4 M1a2: Batch Insert**
  - L5: Use `batchInsert` method from `requestDetailsRepo.js`
  - L6: Transaction-wrapped INSERT for atomicity

#### L3 M1b: Observability Config
- **L4 M1b1: Reuse Config**
  - L5: Copy `getObservabilityConfig()` from `requestDetailsRepo.js`
  - L6: Respect `ENABLE_REQUEST_LOGS`, `OBSERVABILITY_MAX_RECORDS` settings
- **L4 M1b2: Dropped Records Counter**
  - L5: Reuse `droppedRecordsCount` pattern for imported messages
  - L6: Expose via observability status API

### L2 M2: USAGE DB

#### L3 M2a: Unified Queries
- **L4 M2a1: getRequestDetails()**
  - L5: Extend `getRequestDetails()` in `usageDb.js` to include imported messages
  - L6: UNION native + imported, apply filters uniformly
- **L4 M2a2: getErrorSummary()**
  - L5: Extend `getErrorSummary()` to include imported errors
  - L6: Fingerprint deduplication across native + imported

#### L3 M2b: Facet Filters
- **L4 M2b1: message_facets Table**
  - L5: Extend `message_facets` table to include imported messages
  - L6: Index latency, tokens, cost for imported messages
- **L4 M2b2: JSON-Path Queries**
  - L5: Extend `jsonPath` filter to work on imported message JSON
  - L6: Same query syntax as native messages

### L2 M3: ERROR CATEGORIZER

#### L3 M3a: Reuse categorizeError()
- **L4 M3a1: Import Function**
  - L5: Import `categorizeError` from `open-sse/utils/errorCategorizer.js`
  - L6: Pass `{provider, model, statusCode, errorMessage}` → get `errorCategory`
- **L4 M3a2: Category Mapping**
  - L5: Use same category enum: `AUTH_ERROR`, `RATE_LIMITED`, `CONTEXT_LENGTH`, etc.
  - L6: Ensures consistency with native error inbox

#### L3 M3b: Provider-Specific Overrides
- **L4 M3b1: Anthropic Overloaded**
  - L5: Reuse existing override: status 529 → `OVERLOADED`
  - L6: Apply to imported Anthropic messages
- **L4 M3b2: OpenAI Rate Limit**
  - L5: Reuse existing override: status 429 → `RATE_LIMITED`
  - L6: Apply to imported OpenAI messages

### L2 M4: PROVIDER MODELS

#### L3 M4a: Model Matching
- **L4 M4a1: providerModels.js**
  - L5: Use `src/config/providerModels.js` for model → provider mapping
  - L6: Reuse existing alias table
- **L4 M4a2: Provider Registry**
  - L5: Use `open-sse/providers/registry/*.js` for model lists
  - L6: Build lookup structures from registry

#### L3 M4b: Pricing
- **L4 M4b1: pricingRepo.js**
  - L5: Use `getPricing(model, provider)` from `pricingRepo.js`
  - L6: Calculate cost using same formula as native messages
- **L4 M4b2: Pricing Updates**
  - L5: Reuse existing pricing update mechanism
  - L6: Ensure imported messages use latest pricing

### L2 M5: SOURCE APPS

#### L3 M5a: Source Detection
- **L4 M5a1: sourceApps.js**
  - L5: Use `src/lib/sourceApps.js` to detect source app from UA/headers
  - L6: Apply to imported messages (if UA/headers present)
- **L4 M5a2: Custom Source Apps**
  - L5: Add new source apps for import sources: `hermes`, `claude-code`, `cursor`
  - L6: Extend `sourceApps.js` rule engine

#### L3 M5b: Source Filtering
- **L4 M5b1: Filter by Source App**
  - L5: Extend Messages page filter to include `sourceApp` filter
  - L6: Filter imported messages by detected source app
- **L4 M5b2: Source App Stats**
  - L5: Show source app breakdown in dashboard: "Hermes: 123 requests, Claude Code: 456 requests"
  - L6: Aggregate by source app

### L2 M6: MESSAGES PAGE UI

#### L3 M6a: Reuse Components
- **L4 M6a1: Message List Component**
  - L5: Reuse existing message list component for imported messages
  - L6: Add source badge, confidence indicator
- **L4 M6a2: Message Detail Component**
  - L5: Reuse existing message detail component (format tabs, JSON viewer)
  - L6: Add import metadata section

#### L3 M6b: Extend Filters
- **L4 M6b1: Source Filter**
  - L5: Add "Source" dropdown: All / Native / Hermes / Claude Code / Log File / Manual
  - L6: Filter `source` field in `all_messages` view
- **L4 M6b2: Confidence Filter**
  - L5: Add "Match Confidence" filter: All / High (≥0.9) / Medium (≥0.7) / Low (<0.7)
  - L6: Filter `model_match_confidence` field

## Implementation Priority

1. **Reuse requestDetailsRepo.js Buffer/Flush Pattern** — 1 day
2. **Extend usageDb.js Unified Queries** — 2 days
3. **Reuse errorCategorizer.js + providerModels.js** — 1 day
4. **Extend Messages Page UI** — 2 days

## Open Questions

- Should imported messages use the same buffer/flush settings as native messages?
- How to handle conflicts between native and imported message IDs?
- Should the system automatically detect source app for imported messages?

## Related Implementation Plans

- `9router/impl-plan-import-01-db-schema.md` — the `all_messages` UNION view so existing native queries see imported rows without changes
- `9router/impl-plan-import-02-provider-matching.md` — reuses `PROVIDER_MODELS` from `open-sse/providers/index.js` rather than a parallel registry
- `9router/impl-plan-import-06-error-reconstruction.md` — reuses `open-sse/utils/errorCategorizer.js` so categories match native exactly
- `9router/impl-plan-import-07-cost-calculation.md` — reuses `open-sse/providers/pricing.js` + `pricingRepo.js` (user overrides honored)
- `9router/impl-plan-import-09-observability-export.md` — new exporters, but reuse `getSettings()` from `settingsRepo.js`
- `9router/impl-plan-import-16-analytics-insights.md` — new `importAnalyticsRepo.js` UNIONing against the real `usageHistory` columns
