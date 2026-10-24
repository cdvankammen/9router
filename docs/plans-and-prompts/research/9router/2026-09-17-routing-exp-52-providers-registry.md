# Routing Exponential Expansion R52 — Providers Registry

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #providers #registry #auto-generated #provider-models #9router

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Providers registry (one file per provider, auto-generated index, REGISTRY_TEMPLATE)"** from `47-branch-9router-internal-threads.md` L1-A + `07-providers-registry-deep-dive.md`.

## L1 — sub-phrases discovered in the root

1. One file per provider
2. Auto-generated index.js
3. REGISTRY_TEMPLATE.js
4. providerModels.js (config)
5. Migration scripts (migrate-registry, injectDisplay)

## L2 — expansion of each L1 node

### 1. One file per provider
- **1a. Structure** — provider file.
- **1b. Fields** — metadata.
- **1c. Models** — list.
- **1d. Display** — names.

### 2. Auto-generated index
- **2a. Static imports** — all providers.
- **2b. Generated** — script.
- **2c. Don't hand-edit** — warning.
- **2d. Regenerate** — command.

### 3. REGISTRY_TEMPLATE
- **3a. Copy** — new provider.
- **3b. Fill** — fields.
- **3c. Add models** — providerModels.
- **3d. Import** — index.

### 4. providerModels.js
- **4a. Config** — model lists.
- **4b. Per provider** — models.
- **4c. Names** — canonical.
- **4d. Aliases** — display.

### 5. Migration scripts
- **5a. migrate-registry.mjs** — regenerate.
- **5b. injectDisplayToRegistry.mjs** — display.
- **5c. Run** — after changes.
- **5d. Verify** — diff.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → structure
- **1a-i. Export** — provider object.
- **1a-ii. Id** — unique.
- **1a-iii. Name** — display.
- **1a-iv. Models** — array.

### 2a → static imports
- **2a-i. List** — all files.
- **2a-ii. Order** — alphabetical.
- **2a-iii. Export** — combined.
- **2a-iv. Registry** — lookup.

### 3a → copy
- **3a-i. Template** — base.
- **3a-ii. Rename** — provider.
- **3a-iii. Fill** — fields.
- **3a-iv. Save** — file.

### 4a → config
- **4a-i. Structure** — object.
- **4a-ii. Keys** — provider ids.
- **4a-iii. Values** — model arrays.
- **4a-iv. Update** — new models.

### 5a → migrate-registry
- **5a-i. Purpose** — regenerate index.
- **5a-ii. Scan** — provider files.
- **5a-iii. Generate** — imports.
- **5a-iv. Write** — index.js.

## L4 — expansion of selected L3 nodes

### 1a-i → export
- **1a-i-a. Default** — object.
- **1a-i-b. Named** — fields.
- **1a-i-c. ESM** — module.
- **1a-i-d. Import** — index.

### 2a-i → list
- **2a-i-a. Files** — glob.
- **2a-i-b. Sort** — alpha.
- **2a-i-c. Import** — each.
- **2a-i-d. Combine** — array.

### 3a-i → template
- **3a-i-a. Location** — providers/.
- **3a-i-b. Fields** — documented.
- **3a-i-c. Example** — filled.
- **3a-i-d. Copy** — start.

### 4a-i → structure
- **4a-i-a. Object** — literal.
- **4a-i-b. Keys** — provider.
- **4a-i-c. Values** — arrays.
- **4a-i-d. Export** — default.

### 5a-i → purpose
- **5a-i-a. Regenerate** — index.
- **5a-i-b. Consistency** — imports.
- **5a-i-c. Automation** — script.
- **5a-i-d. Safety** — no hand-edit.

## L5 — expansion of selected L4 nodes

### 1a-i-a → default export
- **1a-i-a-1. Object** — provider.
- **1a-i-a-2. Id** — string.
- **1a-i-a-3. Name** — string.
- **1a-i-a-4. Models** — array.

### 2a-i-a → glob files
- **2a-i-a-1. Pattern** — *.js.
- **2a-i-a-2. Exclude** — template.
- **2a-i-a-3. Exclude** — index.
- **2a-i-a-4. Sort** — alpha.

### 3a-i-a → location
- **3a-i-a-1. Dir** — providers/.
- **3a-i-a-2. File** — REGISTRY_TEMPLATE.js.
- **3a-i-a-3. Read** — reference.
- **3a-i-a-4. Copy** — new.

### 4a-i-a → object literal
- **4a-i-a-1. Keys** — provider ids.
- **4a-i-a-2. Values** — model names.
- **4a-i-a-3. Order** — stable.
- **4a-i-a-4. Update** — manual.

### 5a-i-a → regenerate
- **5a-i-a-1. Command** — npm script.
- **5a-i-a-2. Node** — script.
- **5a-i-a-3. Output** — index.js.
- **5a-i-a-4. Verify** — git diff.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → object
- **1a-i-a-1-i. id** — "openai".
- **1a-i-a-1-ii. name** — "OpenAI".
- **1a-i-a-1-iii. models** — [...].
- **1a-i-a-1-iv. display** — names.

### 2a-i-a-1 → pattern
- **2a-i-a-1-i. Glob** — "*.js".
- **2a-i-a-1-ii. Dir** — providers/.
- **2a-i-a-1-iii. Match** — files.
- **2a-i-a-1-iv. Filter** — excludes.

### 3a-i-a-1 → dir
- **3a-i-a-1-i. Path** — open-sse/providers/.
- **3a-i-a-1-ii. Files** — per provider.
- **3a-i-a-1-iii. Template** — included.
- **3a-i-a-1-iv. Index** — generated.

### 4a-i-a-1 → keys
- **4a-i-a-1-i. "openai"** — key.
- **4a-i-a-1-ii. "anthropic"** — key.
- **4a-i-a-1-iii. "google"** — key.
- **4a-i-a-1-iv. 40+** — providers.

### 5a-i-a-1 → command
- **5a-i-a-1-i. npm run** — migrate.
- **5a-i-a-1-ii. Script** — mjs.
- **5a-i-a-1-iii. Output** — file.
- **5a-i-a-1-iv. Commit** — changes.

## Confidence & open questions

- **High confidence:** providers registry architecture from branch 47 + 07-providers-registry-deep-dive.
- **Open questions:**
  - How many providers are registered today (40+)?
  - Should new providers always use the template?
  - How to validate registry consistency?

## Sources

- `docs/plans-and-prompts/research/9router/47-branch-9router-internal-threads.md` L1-A
- `docs/plans-and-prompts/research/9router/07-providers-registry-deep-dive.md`
- `open-sse/providers/registry/` (index.js, REGISTRY_TEMPLATE.js)
- `scripts/migrate-registry.mjs`, `scripts/injectDisplayToRegistry.mjs`