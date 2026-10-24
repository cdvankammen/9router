# Implementation Plan 02: Provider Matching Engine

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, provider-matching, matcher

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-b-provider-matching.md` (primary — normalization, matching tiers, unknown handling)
- `../2026-09-17-hermes-import-branch-m-integration-existing-components.md` (reuse `PROVIDER_MODELS` rather than a parallel registry)

## Goal

Create the model → provider matching engine that identifies which provider an imported message came from based on the model name.

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| Model source of truth | `open-sse/providers/index.js` builds `PROVIDER_MODELS` from `registry/index.js` — keyed by `alias \|\| id`, values are `[{ id, name }]` (normalized via `normalizeModel`) |
| Public accessor | `open-sse/config/providerModels.js` exports `getProviderModels(aliasOrId)` → array of `{id, name}` |
| **`src/config/providerModels.js` does NOT exist** | The real file is `open-sse/config/providerModels.js` — the original plan imported from a nonexistent path |
| Registry shape | `export default [...]` — an **array**, no `getRegistry()` function (original plan called `getRegistry()` which would be undefined) |
| Registry entry shape | `{ id, alias, models: [{ id, name }], ... }` — see `open-sse/providers/registry/anthropic.js` |
| Adapter API | `db.run/get/all/exec` with positional params — no `.prepare()` |
| `unknown_models` table | Does not exist yet — needs its own migration (or fold into plan 01's migration) |

## Scope

- Model name normalization
- Exact/prefix/fuzzy matching strategies
- Confidence scoring
- Unknown model handling

## Design

### 1. Matcher — `src/lib/import/matcher.js`

**Purpose:** Given a model name, return `{ provider, model, confidence, matchType }`.

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `normalizeModelName(name)` | Lowercase, strip provider prefix (`anthropic/`), strip version suffix (`-20241022`) | normalized string |
| `buildLookups()` | Build in-memory exact map + fuzzy list from `PROVIDER_MODELS` (cached, TTL 60s) | void |
| `matchModelToProvider(modelName)` | Exact → prefix → fuzzy → local → unknown | `{ provider, model, confidence, matchType }` |
| `matchBatch(messages)` | Apply matcher to an array of messages | enriched array |

```javascript
// src/lib/import/matcher.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { getProviderModels } from "open-sse/config/providerModels.js";
import { PROVIDER_MODELS } from "open-sse/providers/index.js";

// Build lookup structures once, cache in memory
let exactMap = null;
let fuzzyList = null;
let builtAt = 0;
const CACHE_TTL_MS = 60_000;

export function normalizeModelName(name) {
  if (!name) return "";
  let normalized = name.toLowerCase().trim();
  // Strip provider prefix: "anthropic/claude-3.5-sonnet" → "claude-3.5-sonnet"
  if (normalized.includes("/")) normalized = normalized.split("/").pop();
  // Strip version suffixes: "claude-3.5-sonnet-20241022" → "claude-3.5-sonnet"
  normalized = normalized.replace(/-\d{6,8}$/, "");
  normalized = normalized.replace(/-(latest|beta|alpha)$/, "");
  return normalized;
}

function buildLookups() {
  const now = Date.now();
  if (exactMap && now - builtAt < CACHE_TTL_MS) return;

  exactMap = new Map();
  fuzzyList = [];

  // PROVIDER_MODELS is keyed by alias || id, values are [{ id, name }]
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
  return { provider: null, model: modelName, confidence: 0, matchType: "none" };
}

export function matchBatch(messages) {
  return messages.map((msg) => ({ ...msg, ...matchModelToProvider(msg.model) }));
}
```

**⚠️ GROUNDING FIXES (original plan was wrong):**
1. Imported from `@/config/providerModels` — **doesn't exist**. Real: `open-sse/config/providerModels.js` (or `open-sse/providers/index.js` for `PROVIDER_MODELS`).
2. Called `getRegistry()` — **doesn't exist**. Real: `REGISTRY` is `export default [...]` (an array).
3. Used `provider.models` — real entries have `models: [{ id, name }]`, so iterate `model.id` not `model` (a string).
4. `matchModelToProvider` was `async` — no need; lookups are synchronous.

### 2. Unknown Model Registry — `src/lib/import/unknownModels.js`

**Purpose:** Track models that couldn't be matched, so the user can review and map them later.

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `recordUnknownModel(model, source)` | Upsert into `unknown_models` (count++, last_seen) | void |
| `getUnknownModels()` | List unknown models by count desc | array |
| `mapUnknownModel(model, provider, canonicalModel)` | Mark a model as mapped | void |

```javascript
// src/lib/import/unknownModels.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { getAdapter } from "@/lib/db/driver";

export async function recordUnknownModel(model, source) {
  const db = await getAdapter();
  db.run(`
    INSERT INTO unknown_models (model, source, first_seen, last_seen, count)
    VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1)
    ON CONFLICT(model) DO UPDATE SET
      last_seen = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
      count = count + 1
  `, [model, source]);
}

export async function getUnknownModels() {
  const db = await getAdapter();
  return db.all(`
    SELECT model, source, count, first_seen, last_seen
    FROM unknown_models
    ORDER BY count DESC
  `);
}

export async function mapUnknownModel(model, provider, canonicalModel) {
  const db = await getAdapter();
  db.run(`
    UPDATE unknown_models SET mapped_provider = ?, mapped_model = ?, mapped_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE model = ?
  `, [provider, canonicalModel, model]);
}
```

**⚠️ GROUNDING FIX:** Original used `db.prepare(...).run(...)` — adapter has no `.prepare()`. Use `db.run(sql, params[])`.

### 3. `unknown_models` table migration

**Purpose:** Store unknown model sightings. Add to plan 01's migration (or a separate `006-unknown-models.js`).

```javascript
// src/lib/db/migrations/006-unknown-models.js
// SUGGESTION ONLY
export default {
  version: 6,
  name: "unknown-models",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS unknown_models (
        model TEXT PRIMARY KEY,
        source TEXT,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        mapped_provider TEXT,
        mapped_model TEXT,
        mapped_at TEXT
      )
    `);
    console.log("[DB][migrate:006] unknown_models table created");
  },
};
```

## Steps (per-part instructions)

### Step 1 — Create `src/lib/import/matcher.js`
1. Create the file with the functions above.
2. **Verify:** `node -e "import('./src/lib/import/matcher.js').then(m => console.log(m.matchModelToProvider('claude-3-5-sonnet-20241022')))"` → `{ provider: 'anthropic', confidence: 1, matchType: 'exact' }`.

### Step 2 — Create `src/lib/import/unknownModels.js`
1. Create the file with the functions above.
2. **Verify:** import succeeds; `getUnknownModels()` returns `[]` on empty table.

### Step 3 — Add `unknown_models` table migration
1. Create `006-unknown-models.js` (or fold into plan 01's migration).
2. Register in `migrations/index.js`.
3. **Verify:** `latestVersion()` returns 6.

### Step 4 — Wire matcher into import API
1. In the import API route, call `matchBatch(messages)` before insert.
2. For unmatched (`matchType: "none"`), call `recordUnknownModel(model, source)`.
3. **Verify:** importing `unknown-model-xyz` records it in `unknown_models`.

### Step 5 — Test with real model names
1. Run the verification commands below.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| `PROVIDER_MODELS` | Registry changes | Rebuild lookups on TTL expiry |
| Fuzzy matching | False positives | Confidence threshold 0.7 |
| Unknown models | Table growth | Group by model, count |

## Verification (commands)

```bash
# Exact matches
node -e "import('./src/lib/import/matcher.js').then(m => {
  for (const name of ['claude-3-5-sonnet-20241022', 'gpt-4o', 'gemini-2.5-pro']) {
    console.log(name, '→', m.matchModelToProvider(name));
  }
})"
# Expect: claude-3-5-sonnet-20241022 → anthropic 1.0; gpt-4o → openai 1.0; gemini-2.5-pro → google 1.0

# Unknown
node -e "import('./src/lib/import/matcher.js').then(m => console.log(m.matchModelToProvider('unknown-model-xyz')))"
# Expect: { provider: null, confidence: 0, matchType: 'none' }
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.