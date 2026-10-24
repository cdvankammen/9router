# Implementation Plan 06: Error Reconstruction Engine

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, error-reconstruction, error-inbox

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-c-error-reconstruction.md` (primary — status classification, body parsing, categorization, recovery suggestions, aggregation)
- `../2026-09-17-hermes-import-branch-f-proxy-intercept.md` (errors surfaced by proxied traffic)
- `../2026-09-17-hermes-import-branch-m-integration-existing-components.md` (reuse `errorCategorizer.js` for category parity with native)

## Goal

Reconstruct error records from imported messages so they appear in the error inbox exactly like native 9Router errors, with correct categorization and fallback suggestions.

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| `categorizeError` signature | `categorizeError(status, text)` — **positional args**, NOT an object (see `open-sse/utils/errorCategorizer.js` line 96) |
| Real categories | `rate_limit \| auth \| billing \| timeout \| overloaded \| content_filter \| invalid_request \| network \| empty_response \| unknown` — **lowercase, snake_case** (NOT uppercase `RATE_LIMITED`/`AUTH_ERROR` as the original plan used) |
| Status mapping | 429→rate_limit, 401/403→auth, 402→billing, 408/504→timeout, 503→overloaded, 400/451→content_filter, 400/404/405/422→invalid_request, 5xx→overloaded, 4xx→invalid_request, else unknown |
| **`comboRules` does NOT exist** | Original plan imported `getModelEquivalents`/`getCheaperAlternatives` from `open-sse/config/comboRules` — no such file |
| Real combo API | `open-sse/services/combo.js` exports: `reorderByCapabilities`, `detectRequiredCapabilities`, `getRotatedModels`, `resetComboRotation`, `getComboModelsFromData`, `handleComboChat`, `handleFusionChat` |
| Fallback error check | `open-sse/services/accountFallback.js` — `checkFallbackError`, `formatRetryAfter` |
| Adapter API | `db.run/get/all/exec` positional params — no `.prepare()` |
| Error inbox shape | `getErrorSummary` in `src/lib/db/repos/requestDetailsRepo.js` — fingerprint groups `{ fingerprint, provider, model, errorCategory, count, firstTimestamp, lastTimestamp, cost, sampleError, detailId }` |

## Scope

- HTTP status classification
- Provider-specific error body parsing
- errorCategorizer.js integration
- Fingerprint deduplication
- Fallback combo suggestions

## Design

### 1. Error Reconstruction — `src/lib/import/errorReconstructor.js`

**Purpose:** Derive `errorCategory` + `errorFingerprint` for failed imports, using the **real** categorizer.

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `reconstructError(msg)` | Status → timeout → body parse → pattern → categorizer → fingerprint | `{ errorCategory, errorFingerprint }` |
| `parseErrorBody(response, provider)` | Extract status/category from provider-specific error shapes | `{ statusCode, category }` |
| `generateFingerprint(msg, category)` | SHA-256 of provider+model+category+message-prefix | 16-hex string |

```javascript
// src/lib/import/errorReconstructor.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { categorizeError } from "open-sse/utils/errorCategorizer.js";
import crypto from "node:crypto";

const TIMEOUT_THRESHOLDS = {
  anthropic: 180_000,
  openai: 600_000,
  google: 300_000,
  default: 300_000,
};

export function reconstructError(msg) {
  if (msg.status === "success") return { errorCategory: null, errorFingerprint: null };

  let category = null;
  let statusCode = msg.statusCode;

  // 1. Timeout detection by latency
  const threshold = TIMEOUT_THRESHOLDS[msg.provider] || TIMEOUT_THRESHOLDS.default;
  if (!statusCode && msg.latencyMs > threshold) {
    category = "timeout";
  }

  // 2. Parse error body for provider-specific format
  if (!category && msg.response) {
    const parsed = parseErrorBody(msg.response, msg.provider);
    statusCode = statusCode || parsed.statusCode;
    category = parsed.category;
  }

  // 3. Fall back to the REAL categorizer — positional args (status, text)
  if (!category) {
    category = categorizeError(statusCode, msg.errorMessage || "") || "unknown";
  }

  // 4. Generate fingerprint for deduplication
  const fingerprint = generateFingerprint(msg, category);

  return { errorCategory: category, errorFingerprint: fingerprint };
}

function parseErrorBody(response, provider) {
  const error = response?.error || response;
  if (!error) return {};

  // OpenAI: {error: {message, type, code}}
  if (error.message && error.type) {
    return { statusCode: httpStatusForType(error.type), category: categoryForType(error.type) };
  }
  // Anthropic: {type: "error", error: {type, message}}
  if (error.error?.type) {
    return { statusCode: 529, category: categoryForAnthropicType(error.error.type) };
  }
  // Google: {error: {code, message, status}}
  if (error.code && error.message) {
    return { statusCode: error.code, category: categorizeError(error.code, error.message) };
  }
  return {};
}

function generateFingerprint(msg, category) {
  // Like Sentry/Errbit: hash(class + message-prefix + provider)
  const parts = [
    msg.provider || "unknown",
    msg.model || "unknown",
    category,
    (msg.errorMessage || "").substring(0, 100),
  ];
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").substring(0, 16);
}
```

**⚠️ GROUNDING FIXES (original plan was wrong):**
1. Called `categorizeError({ provider, model, statusCode, errorMessage })` — real signature is `categorizeError(status, text)` positional.
2. Used uppercase categories (`RATE_LIMITED`, `AUTH_ERROR`, `TIMEOUT`, `UNKNOWN`) — real categories are lowercase snake_case (`rate_limit`, `auth`, `timeout`, `unknown`).
3. Had its own `ERROR_PATTERNS` table — redundant; the real categorizer already has comprehensive patterns. Use it directly.

### 2. Fallback Suggestions — `src/lib/import/fallbackSuggestions.js`

**Purpose:** Suggest a fallback model/provider for a failed import.

**⚠️ GROUNDING FIX (original plan was wrong):** Imported `getModelEquivalents`/`getCheaperAlternatives` from `open-sse/config/comboRules` — **no such file**. The real fallback machinery is `open-sse/services/combo.js` (`getComboModelsFromData`, `handleComboChat`) + `accountFallback.js` (`checkFallbackError`). A suggestion engine should either reuse those or query the combos repo.

```javascript
// src/lib/import/fallbackSuggestions.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { getComboModelsFromData } from "open-sse/services/combo.js";

// Suggest a fallback based on error category + existing combo data.
// NOTE: this is a proposal — the real suggestion engine may want to reuse
// handleComboChat's fallback chain instead of a standalone function.
export function suggestFallback(msg, errorCategory, combosData) {
  if (!combosData) return null;

  // Reuse the real combo model resolver
  const comboModels = getComboModelsFromData(msg.model, combosData);
  if (comboModels && comboModels.length > 1) {
    const next = comboModels.find((m) => m !== msg.model);
    if (next) return { type: "combo", model: next };
  }

  // Category-based hints (categories are lowercase — see Grounding)
  if (errorCategory === "rate_limit" || errorCategory === "overloaded") {
    return { type: "retry-later", hint: "Same model, different provider or backoff" };
  }
  if (errorCategory === "billing") {
    return { type: "cheaper", hint: "Switch to a cheaper model or top up" };
  }
  return null;
}
```

### 3. Error Aggregation — `src/lib/db/repos/importedMessagesRepo.js` (add)

**Purpose:** Group imported errors by fingerprint, matching the native `getErrorSummary` shape.

**⚠️ GROUNDING FIX:** Original used `db.prepare(...).all()` — adapter has no `.prepare()`. Use `db.all(sql, params[])`. Also the original selected `error_fingerprint` — that column must be added to the `imported_messages` table (plan 01's migration).

```javascript
// src/lib/db/repos/importedMessagesRepo.js (addition)
// SUGGESTION ONLY — review against actual codebase before implementing
export async function getImportedErrorSummary(filter = {}) {
  const db = await getAdapter();
  return db.all(`
    SELECT
      error_fingerprint as fingerprint,
      provider, model, error_category,
      COUNT(*) as count,
      MIN(imported_at) as firstTimestamp,
      MAX(imported_at) as lastTimestamp,
      SUM(cost) as cost,
      MIN(error_message) as sampleError
    FROM imported_messages
    WHERE status = 'error' AND error_fingerprint IS NOT NULL
    GROUP BY error_fingerprint
    ORDER BY count DESC
  `);
}
```

### 4. Schema addition — `error_fingerprint` column

**Purpose:** Store the dedup fingerprint. Add to plan 01's migration + `TABLES` in `schema.js` (with `SCHEMA_VERSION` bump).

```sql
-- Addition to 005-imported-messages.js up(db)
ALTER TABLE imported_messages ADD COLUMN error_fingerprint TEXT;
CREATE INDEX IF NOT EXISTS idx_imported_error_fingerprint ON imported_messages(error_fingerprint);
```

## Steps (per-part instructions)

### Step 1 — Create `src/lib/import/errorReconstructor.js`
1. Create the file using `categorizeError(status, text)`.
2. **Verify:** `reconstructError({ status: 'error', statusCode: 429, errorMessage: 'rate limit exceeded' })` → `{ errorCategory: 'rate_limit', errorFingerprint: '<16-hex>' }`.

### Step 2 — Create `src/lib/import/fallbackSuggestions.js`
1. Create the file using `getComboModelsFromData` (real combo API).
2. **Verify:** with combosData containing a combo for `gpt-4o`, `suggestFallback({model:'gpt-4o'}, 'rate_limit', combosData)` → `{ type: 'combo', model: '<next>' }`.

### Step 3 — Add `error_fingerprint` column to migration
1. Add the ALTER + index to plan 01's migration (or a new migration).
2. Add to `TABLES` in `schema.js` + bump `SCHEMA_VERSION`.
3. **Verify:** `PRAGMA table_info(imported_messages)` shows `error_fingerprint`.

### Step 4 — Add `getImportedErrorSummary()` to repo
1. Add the function to `importedMessagesRepo.js`.
2. **Verify:** importing 2 identical errors → summary groups them as 1 fingerprint with count 2.

### Step 5 — Wire into import pipeline
1. In the import API (plan 03), call `reconstructError(msg)` and store `errorCategory` + `errorFingerprint`.
2. **Verify:** failed imports show in the error inbox with correct category.

### Step 6 — Test with real error samples
1. Run the verification commands below.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| `categorizeError` | Positional args misuse | Use `categorizeError(status, text)` |
| Fingerprint | Too-specific (no grouping) | Use 100-char message prefix |
| Fallback suggestions | `comboRules` doesn't exist | Use `getComboModelsFromData` from `combo.js` |
| `error_fingerprint` column | Missing → query fails | Add to migration + TABLES |

## Verification (commands)

```bash
node -e "import('./src/lib/import/errorReconstructor.js').then(m => {
  console.log(m.reconstructError({ status: 'error', statusCode: 429, errorMessage: 'rate limit exceeded' }));
  console.log(m.reconstructError({ status: 'error', statusCode: 401, errorMessage: 'invalid api key' }));
  console.log(m.reconstructError({ status: 'error', latencyMs: 200000, errorMessage: '' }));
})"
# Expect: rate_limit, auth, timeout (lowercase categories)
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.