# Branch B: Provider Matching by Model Name — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, provider-matching, binary-tree, branch-b

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch B: PROVIDER MATCHING BY MODEL NAME

The core enabler: match imported model names to known providers so records can be costed, error-categorized, and viewed like native traffic.

### L2 B1: MODEL NAME NORMALIZATION

#### L3 B1a: Normalization Pipeline
- **L4 B1a1: String Cleaning**
  - L5: lowercase, trim whitespace, strip version suffixes (`-latest`, `-20241022`)
  - L6: Handle provider prefixes (`anthropic/claude-3.5-sonnet` → `claude-3.5-sonnet`)
- **L4 B1a2: Alias Resolution**
  - L5: Map aliases (`gpt-4o` → `gpt-4o-2024-08-06`, `sonnet` → `claude-3-5-sonnet-20241022`)
  - L6: Use `open-sse/config/providerModels.js` alias table

#### L3 B1b: Matching Strategies
- **L4 B1b1: Exact Match**
  - L5: Direct lookup in provider registry model lists
  - L6: O(1) via Map, confidence 1.0
- **L4 B1b2: Prefix Match**
  - L5: `claude-` → anthropic, `gpt-` → openai, `gemini-` → google
  - L6: Trie-based lookup, confidence 0.9
- **L4 B1b3: Fuzzy Match**
  - L5: Levenshtein distance / substring match (`sonnet` → claude-3-sonnet family)
  - L6: Threshold-based, confidence 0.7
- **L4 B1b4: Regex Patterns**
  - L5: `^claude-(3|3\.5|4)` → anthropic; `^gpt-(3\.5|4|4o)` → openai
  - L6: Compiled regex list, ordered by specificity

### L2 B2: PROVIDER REGISTRY INTEGRATION

#### L3 B2a: Registry Data Sources
- **L4 B2a1: open-sse/providers/registry/*.js**
  - L5: 98+ provider files with model lists
  - L6: Auto-generated index.js — regenerate via `scripts/migrate-registry.mjs`
- **L4 B2a2: src/config/providerModels.js**
  - L5: Model → provider mapping table
  - L6: Used by dashboard for model selection

#### L3 B2b: Matching Engine
- **L4 B2b1: ModelMatcher Class**
  - L5: `src/lib/import/matcher.js` — loads registry, builds lookup structures
  - L6: Cached in memory, rebuilt on registry change
- **L4 B2b2: Confidence Scoring**
  - L5: exact=1.0, prefix=0.9, fuzzy=0.7, none=0.0
  - L6: Stored per record, filterable in UI

### L2 B3: UNKNOWN MODEL HANDLING

#### L3 B3a: Unknown Model Registry
- **L4 B3a1: Auto-Capture**
  - L5: Unknown models stored in `unknown_models` table with first-seen timestamp
  - L6: Dashboard shows "unmatched models" list for manual mapping
- **L4 B3a2: Manual Mapping UI**
  - L5: User assigns unknown model → provider + canonical model name
  - L6: Mapping persisted, applied to future imports

#### L3 B3b: Heuristic Fallbacks
- **L4 B3b1: Local Model Detection**
  - L5: `local-*`, `ollama-*`, `lmstudio-*` → local-device provider
  - L6: Confidence 0.5, flagged for review
- **L4 B3b2: Provider-Specific Suffixes**
  - L5: `-turbo` → openai, `-flash` → google, `-sonnet` → anthropic
  - L6: Suffix dictionary, confidence 0.6

### L2 B4: MATCHING PERFORMANCE

#### L3 B4a: Lookup Structures
- **L4 B4a1: In-Memory Maps**
  - L5: `Map<modelName, provider>` for exact, `Trie` for prefix
  - L6: ~100k models, <1ms lookup
- **L4 B4a2: SQLite Indexes**
  - L5: `idx_imported_model` on `imported_messages(model)`
  - L6: For batch re-matching after registry updates

#### L3 B4b: Batch Re-Matching
- **L4 B4b1: Re-Match All**
  - L5: After registry update, re-run matcher on `provider='unknown'` records
  - L6: Background job, progress tracking
- **L4 B4b2: Incremental**
  - L5: Only re-match records imported since last registry change
  - L6: Timestamp-based, faster

## Implementation Priority

1. **Normalization + Exact/Prefix Match** (core) — 2 days
2. **Fuzzy Match + Confidence** — 1 day
3. **Unknown Model Registry + Manual Mapping UI** — 2 days
4. **Batch Re-Matching** — 1 day

## Open Questions

- Should matching be case-insensitive? (Yes — model names are case-insensitive in practice)
- How to handle provider-specific model versions (`claude-3-5-sonnet-20241022` vs `claude-3.5-sonnet`)?
- Should the matcher learn from user corrections (feedback loop)?

## Related Implementation Plans

- `9router/impl-plan-import-02-provider-matching.md` — `matcher.js` (exact 1.0 → prefix 0.9 → fuzzy 0.7 → local 0.5 → none 0) + `unknown_models` table + `unknownModels.js`
- `9router/impl-plan-import-18-model-catalog-sync.md` — unknown-model suggestion/resolution using `PROVIDER_MODELS` + the existing models.dev catalog sync
- `9router/impl-plan-import-07-cost-calculation.md` — provider must be resolved before pricing can be looked up