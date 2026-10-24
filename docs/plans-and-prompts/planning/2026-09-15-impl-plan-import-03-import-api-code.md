# Implementation Plan Import-03 — Import API Endpoint — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #api #endpoint #validation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (route pattern from `src/app/api/messages/route.js`; auth pattern from `src/app/api/version/update/route.js` — timing-safe `crypto.timingSafeEqual` Bearer comparison; **Zod is NOT installed** — hand-roll validation; error categorizer from `open-sse/utils/errorCategorizer.js` — `categorizeError(status, text)` **positional args**; pricing from `open-sse/providers/pricing.js` — `getPricingForModel(provider, model)` in **$/1M tokens**).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — auth; validation; pipeline.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-03-import-api.md`, `../research/9router/impl-plan-import-01-db-schema.md`, `../research/9router/impl-plan-import-02-provider-matching.md`.

## Scope

**In scope:** POST `/api/messages/import` (batch); POST `/api/messages/import/{jobId}/status` (progress); auth (API key); validation (hand-rolled); response format.
**Out of scope:** log watcher (import-04); Hermes hook (import-05).

## Milestones

### M1 — Auth + validation

**Reference code (`src/app/api/messages/import/route.js`):**

```js
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { matchBatch } from "@/lib/import/matcher";
import { normalizeMessage } from "@/lib/import/normalizer";
import { calculateCost } from "@/lib/import/costCalculator";
import { reconstructError } from "@/lib/import/errorReconstructor";
import { insertImportedMessages } from "@/lib/db/repos/importedMessagesRepo";
import { recordUnknownModel } from "@/lib/import/unknownModels";

// Timing-safe compare — mirrors src/app/api/version/update/route.js.
function checkImportAuth(request) {
  const secret = process.env.IMPORT_API_KEY;
  if (!secret) return true; // no key configured → open (dev only)
  const received = Buffer.from(request.headers.get("x-api-key") || "", "utf8");
  const expected = Buffer.from(secret, "utf8");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

// Hand-rolled validation (Zod is NOT a dependency).
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
```

**Acceptance criteria:** auth; validation; 401/400 shapes.

### M2 — Pipeline

**Reference code (`src/app/api/messages/import/route.js`):**

```js
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

    // Pipeline: normalize → match → cost → error-reconstruct.
    const normalized = messages.map((msg) => normalizeMessage(msg, source));
    const matched = matchBatch(normalized);
    const costed = [];
    for (const msg of matched) {
      costed.push({ ...msg, cost: await calculateCost(msg) });
    }
    const reconstructed = costed.map((msg) => ({ ...msg, ...reconstructError(msg) }));

    // Record unknown models.
    for (const msg of reconstructed) {
      if (msg.matchType === "unknown") await recordUnknownModel({ model: msg.model, source });
    }

    // Store.
    const inserted = await insertImportedMessages(reconstructed);

    // Per-provider counts.
    const byProvider = reconstructed.reduce((acc, m) => {
      acc[m.provider ?? "unknown"] = (acc[m.provider ?? "unknown"] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ ok: true, inserted, byProvider }, { status: 201 });
  } catch (err) {
    console.error("[import] failed:", err);
    return NextResponse.json({ error: "Import failed", message: err.message }, { status: 500 });
  }
}
```

**Acceptance criteria:** pipeline runs; per-provider counts; 201 response.

### M3 — Job status endpoint

**Reference code (`src/app/api/messages/import/[jobId]/status/route.js`):**

```js
import { NextResponse } from "next/server";

// Progress tracking for long imports.
export async function GET(request, { params }) {
  const { jobId } = await params;
  // Job state would live in a jobs table or in-memory map.
  const job = globalThis.__importJobs?.[jobId];
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ jobId, status: job.status, processed: job.processed, total: job.total });
}
```

**Acceptance criteria:** job lookup; 404; progress shape.

### M4 — Tests

**Reference code (`tests/unit/import-api.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { validateImportBody } from "@/app/api/messages/import/route.js";

describe("validateImportBody", () => {
  it("accepts valid body", () => {
    const r = validateImportBody({ source: "hermes", messages: [{ model: "claude-3.5-sonnet" }] });
    expect(r.ok).toBe(true);
  });
  it("rejects empty messages", () => {
    const r = validateImportBody({ source: "hermes", messages: [] });
    expect(r.ok).toBe(false);
  });
  it("rejects missing model", () => {
    const r = validateImportBody({ source: "hermes", messages: [{ timestamp: "x" }] });
    expect(r.ok).toBe(false);
  });
});
```

**Files touched:** `src/app/api/messages/import/route.js` (new), `src/app/api/messages/import/[jobId]/status/route.js` (new), `src/lib/import/normalizer.js` (new), `src/lib/import/costCalculator.js` (new), `tests/unit/import-api.test.js` (new).

**Acceptance criteria:** tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| No Zod | Validation gaps | Hand-rolled checks |
| Auth bypass | Open endpoint | Env-gated key |
| Large batches | Slow imports | 1000 cap |
| Pipeline errors | Partial imports | try/catch + 500 |

## Verification

- Unit: checkImportAuth, validateImportBody, POST pipeline
- Manual: POST batch → verify counts
- Regression: `tests/__baseline__/verify-no-regression.mjs`