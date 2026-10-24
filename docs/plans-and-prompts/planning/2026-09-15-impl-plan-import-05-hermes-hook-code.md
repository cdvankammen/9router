# Implementation Plan Import-05 — Hermes Hook Integration — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #hermes #hook #webhook #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (**Hermes is EXTERNAL** — no Hermes code in this repo; import API from plan import-03 (`POST /api/messages/import` with `x-api-key` auth); route pattern from `src/app/api/messages/route.js`; config endpoint precedent from `src/app/api/version/update/route.js`; **Hermes hook API unknown** — must be discovered from the actual Hermes install).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — config endpoint; retry; docs.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-05-hermes-hook.md`, `../research/9router/impl-plan-import-03-import-api.md`, `../research/9router/impl-plan-import-04-log-file-tail.md`.

## Scope

**In scope:** 9Router config endpoint (the part that lives in this repo); retry on failure; documentation of Hermes-side config.
**Out of scope:** Hermes-side hook implementation (external); Hermes config schema verification (external).

## Milestones

### M1 — Config endpoint

**Reference code (`src/app/api/messages/import/config/route.js`):**

```js
import { NextResponse } from "next/server";

// Let agents discover the import URL + auth requirements without hardcoding.
export async function GET(request) {
  const baseUrl = new URL(request.url).origin;
  return NextResponse.json({
    importUrl: `${baseUrl}/api/messages/import`,
    requiresApiKey: !!process.env.IMPORT_API_KEY,
    maxBatchSize: 1000,
    supportedSources: ["hermes", "log-file", "proxy", "manual"],
    hermesConfigExample: {
      ninerouter: {
        enabled: true,
        import_url: `${baseUrl}/api/messages/import`,
        timeout_ms: 5000,
        retry: { max_attempts: 3, backoff_ms: 1000 },
      },
    },
  });
}
```

**Acceptance criteria:** GET returns config; env-gated auth flag.

### M2 — Hermes config docs

**Reference code (documentation — external side):**

```yaml
# ~/.hermes/config.yaml (SUGGESTED — verify against real Hermes schema)
ninerouter:
  enabled: true
  import_url: http://localhost:20128/api/messages/import
  api_key: ${NINEROUTER_IMPORT_KEY}
  timeout_ms: 5000
  retry:
    max_attempts: 3
    backoff_ms: 1000
  include:
    request: true
    response: true
    headers: false  # stripped anyway
  exclude_models:
    - "local-*"
```

**Acceptance criteria:** docs committed; schema flagged as unverified.

### M3 — Post-request hook (conceptual)

**Reference code (conceptual Hermes-side — NOT 9Router code):**

```js
// Conceptual Hermes integration (agent-side) — NOT 9Router code.
async function postRequestHook({ request, response, status, latencyMs, model }) {
  const config = loadNinerouterConfig();
  if (!config.enabled) return;

  const payload = {
    source: "hermes",
    messages: [{
      timestamp: new Date().toISOString(),
      model,
      request,
      response,
      status,
      latencyMs,
      sourceApp: "hermes",
      conversationId: request.metadata?.session_id,
    }],
  };

  for (let attempt = 1; attempt <= config.retry.max_attempts; attempt++) {
    try {
      const res = await fetch(config.import_url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": config.api_key },
        body: JSON.stringify(payload),
      });
      if (res.ok) return;
    } catch {
      // backoff and retry
    }
    await new Promise((r) => setTimeout(r, config.retry.backoff_ms * attempt));
  }
}
```

**Acceptance criteria:** conceptual hook documented; retry shape shown.

### M4 — Tests

**Reference code (`tests/unit/import-config.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/messages/import/config/route.js";

describe("import config endpoint", () => {
  it("returns import URL and auth flag", async () => {
    const res = await GET(new Request("http://localhost:20128/api/messages/import/config"));
    const body = await res.json();
    expect(body.importUrl).toContain("/api/messages/import");
    expect(body.maxBatchSize).toBe(1000);
  });
});
```

**Files touched:** `src/app/api/messages/import/config/route.js` (new), `docs/hermes-import.md` (new — Hermes-side config docs), `tests/unit/import-config.test.js` (new).

**Acceptance criteria:** tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Hermes hook API unknown | Wrong integration | Discover from install |
| Config drift | Stale URLs | Dynamic endpoint |
| Retry storms | Duplicate imports | Idempotency (import-13) |
| Auth leakage | Key exposure | Env-gated key |

## Verification

- Unit: GET config endpoint
- Manual: fetch config → configure Hermes → observe imports
- Regression: `tests/__baseline__/verify-no-regression.mjs`