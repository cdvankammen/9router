# Implementation Plan Import-02 — Provider Matching Engine — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #provider-matching #matcher #confidence #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (model source of truth from `open-sse/providers/index.js`; public accessor from `open-sse/config/providerModels.js` — **`src/config/providerModels.js` does NOT exist**; registry shape from `open-sse/providers/registry/anthropic.js` — an **array**, no `getRegistry()`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — normalization; matching; unknown handling.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-02-provider-matching.md`, `../research/9router/impl-plan-import-01-db-schema.md`, `../research/9router/impl-plan-import-03-import-api.md`.

## Scope

**In scope:** model name normalization; exact/prefix/fuzzy matching; confidence scoring; unknown model handling.
**Out of scope:** import API (import-03); cost calculation (import-07).

## Milestones

### M1 — Normalization

**Reference code (`src/lib/import/matcher.js`):**

```js
import { getProviderModels } from "open-sse/config/providerModels.js";
import { PROVIDER_MODELS } from "open-sse/providers/index.js";

// Normalize: lowercase, strip provider prefix, strip version suffix.
export function normalizeModelName(name) {
  if (!name) return "";
  let normalized = name.toLowerCase().trim();
  if (normalized.includes("/")) normalized = normalized.split("/").pop();
  normalized = normalized.replace(/-\d{6,8}$/, "");
  normalized = normalized.replace(/-(latest|beta|alpha)$/, "");
  return normalized;
}
```

**Acceptance criteria:** prefix stripped; suffix stripped; lowercase.

### M2 — Lookup building

**Reference code (`src/lib/import/matcher.js`):**

```js
// Build in-memory exact map + fuzzy list from PROVIDER_MODELS (cached, TTL 60s).
let exactMap = null;
let fuzzyList = null;
let builtAt = 0;
const CACHE_TTL_MS = 60_000;

function buildLookups() {
  const now = Date.now();
  if (exactMap && now - builtAt < CACHE_TTL_MS) return;

  exactMap = new Map();
  fuzzyList = [];

  // PROVIDER_MODELS is keyed by alias || id, values are [{ id, name }].
  for (const [providerKey, models] of Object.entries(PROVIDER_MODELS)) {
    for (const model of models || []) {
      const normalized = normalizeModelName(model.id);
      if (!normalized) continue;
      exactMap.set(normalized, { provider: providerKey, model: model.id, confidence: 1.0 });
      fuzzyList.push({ model: normalized, provider: providerKey });
    }
  }
  builtAt = now;
}
```

**Acceptance criteria:** exact map; fuzzy list; TTL cache.

### M3 — Matching strategies

**Reference code (`src/lib/import/matcher.js`):**

```js
// Exact → prefix → fuzzy → local → unknown.
export function matchModelToProvider(modelName) {
  buildLookups();
  const normalized = normalizeModelName(modelName);
  if (!normalized) return { provider: null, model: modelName, confidence: 0, matchType: "none" };

  // 1. Exact match
  const exact = exactMap.get(normalized);
  if (exact) return { ...exact, matchType: "exact" };

  // 2. Prefix match (first 2 tokens)
  const parts = normalized.split("-");
  if (parts.length >= 2) {
    const prefix = parts.slice(0, 2).join("-");
    const prefixMatch = exactMap.get(prefix);
    if (prefixMatch) return { ...prefixMatch, model: modelName, confidence: 0.9, matchType: "prefix" };
  }

  // 3. Fuzzy match (substring in known models)
  const fuzzy = fuzzyList.find((f) => f.model.includes(normalized) || normalized.includes(f.model));
  if (fuzzy) return { provider: fuzzy.provider, model: modelName, confidence: 0.7, matchType: "fuzzy" };

  // 4. Local model detection
  if (normalized.startsWith("local-") || normalized.startsWith("ollama-") || normalized.startsWith("lmstudio-")) {
    return { provider: "local-device", model: modelName, confidence: 0.5, matchType: "local" };
  }

  // 5. Unknown
  return { provider: null, model: modelName, confidence: 0, matchType: "unknown" };
}

// Batch: apply matcher to an array of messages.
export function matchBatch(messages = []) {
  return messages.map((m) => ({ ...m, ...matchModelToProvider(m.model) }));
}
```

**Acceptance criteria:** exact; prefix; fuzzy; local; unknown; batch.

### M4 — Unknown model handling + tests

**Reference code (`src/lib/import/unknownModels.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// Record unknown models for later review.
export async function recordUnknownModel({ model, provider = null, source = "manual" } = {}) {
  const db = getAdapter();
  db.run(
    `INSERT OR IGNORE INTO unknown_models (model, provider, source, first_seen)
     VALUES (?, ?, ?, ?)`,
    [model, provider, source, new Date().toISOString()],
  );
}
```

**Files touched:** `src/lib/import/matcher.js` (new), `src/lib/import/unknownModels.js` (new), `src/lib/db/migrations/005-imported-messages.js` (add `unknown_models` table or fold into import-01), `tests/unit/import-matcher.test.js` (new).

**Acceptance criteria:** unknown recorded; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Registry shape | Wrong lookups | Verify registry array |
| Model drift | Stale matches | TTL cache |
| Fuzzy false positives | Wrong provider | Confidence scoring |
| Unknown models | Unmatched | Record + review |

## Verification

- Unit: normalizeModelName, buildLookups, matchModelToProvider, matchBatch, recordUnknownModel
- Manual: match known/unknown models
- Regression: `tests/__baseline__/verify-no-regression.mjs`