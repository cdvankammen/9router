# Implementation Plan 03: Import API Endpoint

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, api, endpoint

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-i-normalization-sanitization.md` (schema normalization + PII/header sanitization)
- `../2026-09-17-hermes-import-branch-l-security-privacy.md` (auth, redaction, key handling)
- `../2026-09-17-hermes-import-branch-a-log-capture.md` (the ingest endpoint all capture mechanisms post into)
- `../2026-09-17-hermes-import-branch-b-provider-matching.md` (matching stage in the pipeline)
- `../2026-09-17-hermes-import-branch-c-error-reconstruction.md` (error stage in the pipeline)
- `../2026-09-17-hermes-import-branch-d-cost-calculation.md` (cost stage in the pipeline)

## Goal

Create the `/api/messages/import` POST endpoint that accepts imported messages, normalizes them, matches providers, calculates costs, and stores them.

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| Route pattern | `src/app/api/messages/route.js` — `NextResponse`, `new URL(request.url).searchParams`, try/catch with `{ error, message }` 500 shape |
| Auth pattern | `src/app/api/version/update/route.js` — timing-safe `crypto.timingSafeEqual` Bearer comparison; also `x-9r-cli-token` + JWT cookie patterns exist |
| **Zod is NOT installed** | `package.json` has no `zod` dependency — original plan assumed it; either add it or hand-roll validation |
| Error categorizer | `open-sse/utils/errorCategorizer.js` — `categorizeError(status, text)` **positional args**, returns lowercase categories: `"overloaded"`, `"invalid_request"`, `"unknown"`, etc. (NOT uppercase `"TIMEOUT"`/`"UNKNOWN"`) |
| Pricing | `open-sse/providers/pricing.js` — `getPricingForModel(provider, model)` → `{ input, output, cached, reasoning, cache_creation }` in **$/1M tokens**; `src/lib/db/repos/pricingRepo.js` wraps it with user overrides (`getPricingForModel(provider, model)`) |
| Sanitize precedent | `requestDetailsRepo.sanitizeHeaders()` — sensitive keys: `authorization, x-api-key, cookie, token, api-key` |
| Adapter API | `db.run/get/all/exec` positional params — no `.prepare()` |

## Scope

- POST `/api/messages/import` — batch import
- POST `/api/messages/import/{jobId}/status` — progress tracking
- Auth (API key)
- Validation (Zod schema — **needs adding to package.json, or hand-rolled**)
- Response format

## Design

### 1. Import API Route — `src/app/api/messages/import/route.js`

**Purpose:** Accept batch imports, run the pipeline (normalize → match → cost → error-reconstruct → store), return per-provider counts.

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `POST(request)` | Auth → validate → pipeline → store → respond | `NextResponse` |
| `checkImportAuth(request)` | Timing-safe API key check (mirrors version/update route) | boolean |
| `validateImportBody(body)` | Shape check (hand-rolled, no Zod dependency) | `{ ok, data }` or `{ ok: false, issues }` |

```javascript
// src/app/api/messages/import/route.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { NextResponse } from "next/server";
import { matchBatch } from "@/lib/import/matcher";
import { normalizeMessage } from "@/lib/import/normalizer";
import { calculateCost } from "@/lib/import/costCalculator";
import { reconstructError } from "@/lib/import/errorReconstructor";
import { insertImportedMessages } from "@/lib/db/repos/importedMessagesRepo";
import { recordUnknownModel } from "@/lib/import/unknownModels";

// Timing-safe compare — mirrors src/app/api/version/update/route.js
function checkImportAuth(request) {
  const secret = process.env.IMPORT_API_KEY;
  if (!secret) return true; // no key configured → open (dev only)
  const received = Buffer.from(request.headers.get("x-api-key") || "", "utf8");
  const expected = Buffer.from(secret, "utf8");
  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
}

// Hand-rolled validation (Zod is NOT a dependency — see Grounding)
function validateImportBody(body) {
  if (!body || typeof body !== "object") return { ok: false, issues: [{ path: "", message: "body must be an object" }] };
  const issues = [];
  const source = body.source || "manual";
  if (!["hermes", "log-file", "proxy", "manual"].includes(source)) {
    issues.push({ path: "source", message: `invalid source: ${source}` });
  }
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 1000) {
    issues.push({ path: "messages", message: "messages must be an array of 1-1000 items" });
  }
  for (let i = 0; i < (messages || []).length; i++) {
    const m = messages[i];
    if (!m || typeof m !== "object" || typeof m.model !== "string" || !m.model.trim()) {
      issues.push({ path: `messages[${i}].model`, message: "model is required" });
    }
  }
  return issues.length ? { ok: false, issues } : { ok: true, data: { source, messages } };
}

export async function POST(request) {
  try {
    if (!checkImportAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = validateImportBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Validation failed", details: parsed.issues }, { status: 400 });
    }

    const { source, messages } = parsed.data;

    // Pipeline: normalize → match → cost → error-reconstruct
    const normalized = messages.map((msg) => normalizeMessage(msg, source));
    const matched = matchBatch(normalized);
    const costed = [];
    for (const msg of matched) {
      costed.push({ ...msg, cost: await calculateCost(msg) });
    }
    const reconstructed = costed.map((msg) => ({ ...msg, ...reconstructError(msg) }));

    // Record unknown models
    for (const msg of reconstructed) {
      if (!msg.provider) await recordUnknownModel(msg.model, source);
    }

    // Store
    const { imported, duplicates } = await insertImportedMessages(reconstructed);

    // Response aggregates
    const matchedProviders = {};
    for (const msg of reconstructed) {
      const p = msg.provider || "unknown";
      matchedProviders[p] = (matchedProviders[p] || 0) + 1;
    }
    const unmatchedModels = [...new Set(reconstructed.filter((m) => !m.provider).map((m) => m.model))];

    return NextResponse.json({
      imported,
      skipped: messages.length - imported,
      duplicates,
      matchedProviders,
      unmatchedModels,
    }, { status: 200 });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json({ error: "Import failed", message: error.message }, { status: 500 });
  }
}
```

**⚠️ GROUNDING FIXES (original plan was wrong):**
1. Used `zod` — **not installed**. Either add `zod` to `package.json` or hand-roll (shown above).
2. `matchBatch` was awaited — it's synchronous in plan 02's design.
3. `reconstructError` was called with `msg` but the original errorReconstructor used `categorizeError({...})` with an object — real signature is `categorizeError(status, text)` positional.

### 2. Normalizer — `src/lib/import/normalizer.js`

**Purpose:** Convert arbitrary agent-log message shapes into the canonical `imported_messages` row shape.

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `normalizeMessage(msg, source)` | Map fields, extract tokens from provider-specific usage shapes | canonical message object |
| `extractTokens(msg)` | Handle `usage.prompt_tokens` / `usage.input_tokens` / `usage.output_tokens` variants | `{ promptTokens, completionTokens }` |

```javascript
// src/lib/import/normalizer.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { sanitizeHeaders, sanitizeBody } from "./sanitizer";

export function normalizeMessage(msg, source) {
  const timestamp = msg.timestamp || new Date().toISOString();
  const status = msg.status ? (msg.status >= 200 && msg.status < 300 ? "success" : "error") : "success";

  // Extract tokens from provider-specific formats
  let promptTokens = msg.promptTokens;
  let completionTokens = msg.completionTokens;
  if (!promptTokens && msg.response?.usage?.prompt_tokens) promptTokens = msg.response.usage.prompt_tokens;
  if (!promptTokens && msg.response?.usage?.input_tokens) promptTokens = msg.response.usage.input_tokens;
  if (!completionTokens && msg.response?.usage?.completion_tokens) completionTokens = msg.response.usage.completion_tokens;
  if (!completionTokens && msg.response?.usage?.output_tokens) completionTokens = msg.response.usage.output_tokens;

  return {
    id: msg.id || crypto.randomUUID(),
    importedAt: timestamp,
    source,
    sourceSessionId: msg.sourceSessionId || null,
    model: msg.model,
    request: sanitizeHeaders(msg.request || {}),
    response: sanitizeHeaders(msg.response || {}),
    status,
    latencyMs: msg.latencyMs || null,
    promptTokens: promptTokens || null,
    completionTokens: completionTokens || null,
    totalTokens: (promptTokens || 0) + (completionTokens || 0) || null,
    errorMessage: msg.error || null,
    sourceApp: msg.sourceApp || source,
    conversationId: msg.conversationId || null,
  };
}
```

### 3. Sanitizer — `src/lib/import/sanitizer.js`

**Purpose:** Strip secrets from imported request/response bodies before storage. **Must match `requestDetailsRepo.sanitizeHeaders()` behavior** so native + imported records are sanitized identically.

```javascript
// src/lib/import/sanitizer.js
// SUGGESTION ONLY — review against actual codebase before implementing
// Mirrors requestDetailsRepo.sanitizeHeaders() sensitive keys
const SENSITIVE_HEADERS = ["authorization", "x-api-key", "cookie", "token", "api-key"];
const API_KEY_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,
  /key-[a-zA-Z0-9]{20,}/g,
  /Bearer\s+[a-zA-Z0-9._-]+/g,
];

export function sanitizeHeaders(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_HEADERS.some((s) => key.toLowerCase().includes(s))) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

export function sanitizeBody(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const str = JSON.stringify(obj);
  let redacted = str;
  for (const pattern of API_KEY_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return redacted !== str ? JSON.parse(redacted) : obj;
}
```

### 4. Cost Calculator — `src/lib/import/costCalculator.js`

**Purpose:** Compute cost from token counts using the real pricing tables.

**⚠️ GROUNDING FIX (original plan was wrong):** Original called `getPricing(msg.model, msg.provider)` — **wrong arg order and wrong function**. Real: `getPricingForModel(provider, model)` from `open-sse/providers/pricing.js` (or `src/lib/db/repos/pricingRepo.js` which layers user overrides). Pricing values are **$/1M tokens** — divide by 1,000,000, not 1,000.

```javascript
// src/lib/import/costCalculator.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { getPricingForModel } from "open-sse/providers/pricing.js";

// Rates are $/1M tokens (see open-sse/providers/pricing.js header comment)
const PER_MILLION = 1_000_000;

export async function calculateCost(msg) {
  if (!msg.provider || !msg.model) return null;
  if (!msg.promptTokens && !msg.completionTokens) return null;

  const pricing = getPricingForModel(msg.provider, msg.model);
  if (!pricing) return null;

  const inputCost = (msg.promptTokens || 0) / PER_MILLION * (pricing.input || 0);
  const outputCost = (msg.completionTokens || 0) / PER_MILLION * (pricing.output || 0);
  const cachedCost = (msg.cachedInputTokens || 0) / PER_MILLION * (pricing.cached || 0);

  return Math.round((inputCost + outputCost + cachedCost) * 1_000_000) / 1_000_000;
}
```

### 5. Error Reconstructor — `src/lib/import/errorReconstructor.js`

**Purpose:** Derive a stable `errorCategory` for failed imports using the existing categorizer.

**⚠️ GROUNDING FIX (original plan was wrong):** Original called `categorizeError({ provider, model, statusCode, errorMessage })` — real signature is `categorizeError(status, text)` (positional). Categories are lowercase (`"overloaded"`, `"invalid_request"`, `"unknown"`, `"rate_limited"`, etc.) — not uppercase `"TIMEOUT"`/`"UNKNOWN"`.

```javascript
// src/lib/import/errorReconstructor.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { categorizeError } from "open-sse/utils/errorCategorizer.js";

export function reconstructError(msg) {
  if (msg.status === "success") return { errorCategory: null };

  const statusCode = msg.statusCode || (msg.status === "error" ? 500 : null);
  const errorMessage = msg.errorMessage || "";

  // Timeout detection (categorizer has no timeout rule — check latency first)
  if (!statusCode && msg.latencyMs > 180_000) {
    return { errorCategory: "timeout" };
  }

  // Real signature: categorizeError(status, text) → lowercase category
  const category = categorizeError(statusCode, errorMessage);
  return { errorCategory: category || "unknown" };
}
```

## Steps (per-part instructions)

### Step 1 — Create `src/lib/import/normalizer.js`
1. Create the file with `normalizeMessage` + `extractTokens`.
2. **Verify:** `node -e "import('./src/lib/import/normalizer.js').then(m => console.log(m.normalizeMessage({ model: 'gpt-4o', response: { usage: { prompt_tokens: 10, completion_tokens: 5 } } }, 'hermes')))"` → tokens extracted, status success.

### Step 2 — Create `src/lib/import/sanitizer.js`
1. Create the file. Keep `SENSITIVE_HEADERS` identical to `requestDetailsRepo.sanitizeHeaders`.
2. **Verify:** `sanitizeHeaders({ authorization: 'Bearer sk-xxx', 'x-api-key': 'k', body: 'ok' })` → authorization + x-api-key removed.

### Step 3 — Create `src/lib/import/costCalculator.js`
1. Create the file using `getPricingForModel(provider, model)`.
2. **Verify:** `calculateCost({ provider: 'openai', model: 'gpt-4o', promptTokens: 1000, completionTokens: 500 })` → `0.0025 + 0.005 = 0.0075`.

### Step 4 — Create `src/lib/import/errorReconstructor.js`
1. Create the file using `categorizeError(status, text)`.
2. **Verify:** `reconstructError({ status: 'error', statusCode: 429, errorMessage: 'rate limit' })` → `rate_limited` (or whatever the categorizer returns for 429).

### Step 5 — Create `src/app/api/messages/import/route.js`
1. Create the route with auth + validation + pipeline.
2. **Verify:** `curl -X POST localhost:20128/api/messages/import -H 'x-api-key: test' -d '{"source":"hermes","messages":[{"model":"gpt-4o","request":{"messages":[{"role":"user","content":"hi"}]}}]}'` → `{ imported: 1, ... }`.

### Step 6 — Add `IMPORT_API_KEY` to `.env.example`
1. Add `IMPORT_API_KEY=` with a comment explaining it gates the import endpoint.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| Zod | **Not installed** | Hand-rolled validation (shown) or add `zod` to package.json |
| `getPricingForModel` | Pricing missing for model | Return null cost |
| `categorizeError` | Positional args misuse | Use `categorizeError(status, text)` |
| `IMPORT_API_KEY` unset | Open endpoint | Warn in logs; require key in production |

## Verification (commands)

```bash
# Single message
curl -X POST http://localhost:20128/api/messages/import \
  -H 'x-api-key: test' \
  -H 'content-type: application/json' \
  -d '{"source":"hermes","messages":[{"model":"gpt-4o","request":{"messages":[{"role":"user","content":"hi"}]},"response":{"usage":{"prompt_tokens":10,"completion_tokens":5}}}]}'
# Expect: { "imported": 1, "matchedProviders": { "openai": 1 }, ... }

# Invalid body → 400
curl -X POST http://localhost:20128/api/messages/import -H 'x-api-key: test' -d '{"source":"hermes","messages":[]}'
# Expect: 400 with validation details

# No key → 401 (when IMPORT_API_KEY set)
curl -X POST http://localhost:20128/api/messages/import -d '{"source":"hermes","messages":[{"model":"gpt-4o"}]}'
# Expect: 401
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.