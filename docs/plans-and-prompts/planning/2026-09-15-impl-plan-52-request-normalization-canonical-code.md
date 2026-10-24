# Implementation Plan 52 — Request Normalization & Canonical Schema — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #request-normalization #canonical-schema #validation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`open-sse/translator/` pivot-through-OpenAI design; `open-sse/translator/schema/` constants; `open-sse/handlers/chatCore.js` parse flow; the `translator-request-normalization` known-fail catalogued in `tests/__baseline__/known-fails.txt` — this plan should fix it).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the request-normalization tests; confirm the known-fail moves to green; check translators still pass.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-52-request-normalization-canonical.md`, `../research/9router/impl-plan-40-api-compatibility-sdk.md`, `../research/9router/impl-plan-16-divergence.md`.

## Scope

**In scope:** canonical request schema (OpenAI intermediate — messages, tools, params); normalization pipeline (field aliases like `max_tokens`/`max_completion_tokens`, defaults, safe type coercion); structured validation (required/type/range) with clear errors; translator + executor integration on canonical schema; fix the `translator-request-normalization` known-fail.
**Out of scope:** response normalization (plan 16); per-provider quirks beyond the canonical mapping.

## Milestones

### M1 — Canonical schema

**Reference code (`open-sse/schema/canonical.js`):**

```js
// Canonical (OpenAI-intermediate) request schema — the single shape translators consume.
export const CANONICAL_SCHEMA = {
  model: { type: "string", required: true },
  messages: { type: "array", required: true, items: { type: "object" } },
  temperature: { type: "number", min: 0, max: 2 },
  top_p: { type: "number", min: 0, max: 1 },
  max_tokens: { type: "integer", min: 1 },
  stream: { type: "boolean", default: false },
  stop: { type: ["string", "array"] },
  tools: { type: "array" },
  tool_choice: { type: ["string", "object"] },
  response_format: { type: "object" },
  seed: { type: "integer" },
  user: { type: "string" },
};

// Field aliases accepted on input, normalized to canonical keys.
export const FIELD_ALIASES = {
  max_completion_tokens: "max_tokens",
  maxOutputTokens: "max_tokens",
  topP: "top_p",
  responseMimeType: "response_format",
  stopSequences: "stop",
};

export function canonicalKey(key) {
  return FIELD_ALIASES[key] ?? key;
}
```

**Acceptance criteria:** schema defined; aliases map to canonical keys; versioned (v1).

### M2 — Normalization pipeline

**Reference code (`open-sse/schema/normalize.js`):**

```js
import { CANONICAL_SCHEMA, canonicalKey } from "./canonical.js";

// parse → normalize → validate. Returns { request, errors }.
export function normalizeRequest(raw) {
  const errors = [];
  const request = {};

  // 1. Alias mapping.
  for (const [key, value] of Object.entries(raw)) {
    const canonical = canonicalKey(key);
    if (canonical !== key && raw[canonical] !== undefined) {
      errors.push({ field: key, message: `duplicate field: ${key} and ${canonical} both provided` });
      continue;
    }
    request[canonical] = value;
  }

  // 2. Defaults.
  for (const [key, def] of Object.entries(DEFAULTS)) {
    if (request[key] === undefined) request[key] = def;
  }

  // 3. Safe coercion.
  if (request.temperature !== undefined && typeof request.temperature === "string") {
    const n = Number(request.temperature);
    if (Number.isNaN(n)) errors.push({ field: "temperature", message: "not a number" });
    else request.temperature = n;
  }
  if (request.stream !== undefined && typeof request.stream === "string") {
    request.stream = request.stream === "true" || request.stream === "1";
  }

  return { request, errors };
}

const DEFAULTS = { stream: false, temperature: 1 };
```

**Acceptance criteria:** aliases normalized; duplicates flagged; defaults applied; coercion safe.

### M3 — Validation

**Reference code (`open-sse/schema/validate.js`):**

```js
import { CANONICAL_SCHEMA } from "./canonical.js";

export function validateRequest(request) {
  const errors = [];
  for (const [key, spec] of Object.entries(CANONICAL_SCHEMA)) {
    const value = request[key];
    if (value === undefined) {
      if (spec.required) errors.push({ field: key, message: "required field missing" });
      continue;
    }
    const types = Array.isArray(spec.type) ? spec.type : [spec.type];
    if (!types.includes(typeof value) && !(spec.type === "array" && Array.isArray(value))) {
      errors.push({ field: key, message: `expected ${types.join("|")}, got ${typeof value}` });
      continue;
    }
    if (spec.type === "number" || spec.type === "integer") {
      if (spec.min !== undefined && value < spec.min) errors.push({ field: key, message: `below min ${spec.min}` });
      if (spec.max !== undefined && value > spec.max) errors.push({ field: key, message: `above max ${spec.max}` });
    }
    if (spec.type === "integer" && !Number.isInteger(value)) {
      errors.push({ field: key, message: "expected integer" });
    }
  }
  return errors;
}
```

**Acceptance criteria:** required/type/range checks; structured errors with field + message.

### M4 — Integration + known-fail fix + tests

**Reference code (integration in `open-sse/handlers/chatCore.js`):**

```js
// Replace ad-hoc per-format parsing with: normalize → validate → translate.
import { normalizeRequest } from "../schema/normalize.js";
import { validateRequest } from "../schema/validate.js";

export function parseAndNormalize(rawBody) {
  const { request, errors: normErrors } = normalizeRequest(rawBody);
  const errors = [...normErrors, ...validateRequest(request)];
  if (errors.length) {
    const err = new Error("Invalid request");
    err.code = "INVALID_REQUEST";
    err.details = errors;
    throw err;
  }
  return request; // canonical — translators consume this shape
}
```

**Files touched:** `open-sse/schema/` (new: canonical, normalize, validate), `open-sse/translator/` (consume canonical), `open-sse/handlers/chatCore.js` (pipeline), `tests/unit/request-normalization.test.js` (new), `tests/__baseline__/known-fails.txt` (remove entry when green).

**Acceptance criteria:** pipeline integrated; translator-request-normalization known-fail green; no translator regressions.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Schema churn | Translator breakage | Versioned schema + incremental migration |
| Coercion bugs | Wrong values | Safe coercion + tests |
| Duplicate fields | Ambiguity | Explicit error |
| Known-fail fix | Partial fix | Baseline verification |

## Verification

- Unit: normalize, validate, pipeline
- Baseline: `tests/__baseline__/verify-no-regression.mjs` + known-fails check
- Manual: curl requests with aliases/quirks → canonical handling
- Regression: full `npx vitest run` in tests/