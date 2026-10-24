# Implementation Plan Import-06 — Error Reconstruction Engine — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #error-reconstruction #error-inbox #fingerprint #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`categorizeError(status, text)` — **positional args** from `open-sse/utils/errorCategorizer.js` line 96; real categories are **lowercase snake_case** — `rate_limit | auth | billing | timeout | overloaded | content_filter | invalid_request | network | empty_response | unknown`; **`comboRules` does NOT exist** — real combo API is `open-sse/services/combo.js`; fallback error check from `open-sse/services/accountFallback.js` — `checkFallbackError`, `formatRetryAfter`; error inbox shape from `getErrorSummary` in `src/lib/db/repos/requestDetailsRepo.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — classification; fingerprint; suggestions.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-06-error-reconstruction.md`, `../research/9router/impl-plan-import-03-import-api.md`, `../research/9router/impl-plan-import-07-cost-calculation.md`.

## Scope

**In scope:** HTTP status classification; provider-specific error body parsing; errorCategorizer.js integration; fingerprint deduplication; fallback combo suggestions.
**Out of scope:** cost calculation (import-07); import API (import-03).

## Milestones

### M1 — Classification

**Reference code (`src/lib/import/errorReconstructor.js`):**

```js
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

  // 1. Timeout detection by latency.
  const threshold = TIMEOUT_THRESHOLDS[msg.provider] || TIMEOUT_THRESHOLDS.default;
  if (!statusCode && msg.latencyMs > threshold) {
    category = "timeout";
  }

  // 2. Parse error body for provider-specific format.
  if (!category && msg.response) {
    const parsed = parseErrorBody(msg.response, msg.provider);
    statusCode = statusCode || parsed.statusCode;
    category = parsed.category;
  }

  // 3. Fall back to the REAL categorizer — positional args (status, text).
  if (!category) {
    category = categorizeError(statusCode, msg.errorMessage || "") || "unknown";
  }

  // 4. Generate fingerprint for deduplication.
  const fingerprint = generateFingerprint(msg, category);

  return { errorCategory: category, errorFingerprint: fingerprint };
}
```

**Acceptance criteria:** timeout; body parse; categorizer fallback.

### M2 — Provider-specific parsing

**Reference code (`src/lib/import/errorReconstructor.js`):**

```js
function parseErrorBody(response, provider) {
  const error = response?.error || response;
  if (!error) return {};

  // OpenAI: {error: {message, type, code}}.
  if (error.message && error.type) {
    return { statusCode: httpStatusForType(error.type), category: categoryForType(error.type) };
  }
  // Anthropic: {type: "error", error: {type, message}}.
  if (error.error?.type) {
    return { statusCode: 529, category: categoryForAnthropicType(error.error.type) };
  }
  // Google: {error: {code, message, status}}.
  if (error.code && error.message) {
    return { statusCode: error.code, category: categorizeError(error.code, error.message) };
  }
  return {};
}

function httpStatusForType(type) {
  const map = { rate_limit_exceeded: 429, invalid_request_error: 400, authentication_error: 401, insufficient_quota: 402, server_error: 500 };
  return map[type] ?? 500;
}

function categoryForType(type) {
  const map = { rate_limit_exceeded: "rate_limit", invalid_request_error: "invalid_request", authentication_error: "auth", insufficient_quota: "billing", server_error: "overloaded" };
  return map[type] ?? "unknown";
}

function categoryForAnthropicType(type) {
  const map = { overloaded_error: "overloaded", rate_limit_error: "rate_limit", authentication_error: "auth", permission_error: "auth", api_error: "overloaded" };
  return map[type] ?? "unknown";
}
```

**Acceptance criteria:** OpenAI; Anthropic; Google shapes.

### M3 — Fingerprint + suggestions

**Reference code (`src/lib/import/errorReconstructor.js`):**

```js
function generateFingerprint(msg, category) {
  // Like Sentry/Errbit: hash(class + message-prefix + provider).
  const parts = [
    msg.provider || "unknown",
    msg.model || "unknown",
    category,
    (msg.errorMessage || "").slice(0, 80),
  ];
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

// Fallback combo suggestions — uses the REAL combo API (open-sse/services/combo.js).
export function suggestFallbacks({ provider, model, category } = {}) {
  if (!category || category === "success") return [];
  // getComboModelsFromData / reorderByCapabilities from open-sse/services/combo.js
  // would power this; shape: [{ provider, model, reason }].
  return [];
}
```

**Acceptance criteria:** fingerprint; suggestion hook.

### M4 — Tests

**Reference code (`tests/unit/import-error-reconstruction.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { reconstructError, generateFingerprint } from "@/lib/import/errorReconstructor.js";

describe("reconstructError", () => {
  it("returns nulls for success", () => {
    expect(reconstructError({ status: "success" })).toEqual({ errorCategory: null, errorFingerprint: null });
  });
  it("detects timeout by latency", () => {
    const r = reconstructError({ status: "error", provider: "anthropic", latencyMs: 200_000 });
    expect(r.errorCategory).toBe("timeout");
  });
  it("uses categorizer fallback", () => {
    const r = reconstructError({ status: "error", statusCode: 429, errorMessage: "rate limited" });
    expect(r.errorCategory).toBe("rate_limit");
  });
  it("generates stable fingerprints", () => {
    const a = generateFingerprint({ provider: "openai", model: "gpt-4o", errorMessage: "boom" }, "overloaded");
    const b = generateFingerprint({ provider: "openai", model: "gpt-4o", errorMessage: "boom" }, "overloaded");
    expect(a).toBe(b);
  });
});
```

**Files touched:** `src/lib/import/errorReconstructor.js` (new), `tests/unit/import-error-reconstruction.test.js` (new).

**Acceptance criteria:** tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Categorizer signature | Wrong args | Positional (status, text) |
| Provider shapes | Parse misses | Fallback categorizer |
| Fingerprint collisions | Merged errors | Full hash |
| Combo API drift | Broken suggestions | Verify combo.js |

## Verification

- Unit: reconstructError, parseErrorBody, generateFingerprint, suggestFallbacks
- Manual: import errors → verify inbox grouping
- Regression: `tests/__baseline__/verify-no-regression.mjs`