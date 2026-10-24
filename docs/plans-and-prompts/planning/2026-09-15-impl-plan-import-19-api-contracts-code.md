# Implementation Plan Import-19 — API Contracts & Client SDKs — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #api-contracts #sdk #openapi #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (import API from plan import-03; stream endpoint from plan import-15; **Zod is NOT installed** — the schemas below use Zod, so either add the dependency or hand-roll validation; error contract must match the real route error shapes `{ error, message }`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — schemas; errors; SDK.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-19-api-contracts.md`, `../research/9router/impl-plan-import-03-import-api.md`, `../research/9router/impl-plan-import-15-streaming-realtime.md`.

## Scope

**In scope:** full endpoint surface; Zod schemas (shared); error contract; Node + Python SDK sketches.
**Out of scope:** import API (import-03); streaming (import-15).

## Milestones

### M1 — Shared schemas

**Reference code (`src/lib/import/schemas.js`):**

```js
// Zod is NOT installed — add dependency or hand-roll validation.
import { z } from "zod";

export const ImportMessageSchema = z.object({
  model: z.string().min(1),
  provider: z.string().optional(),
  request: z.unknown().optional(),
  response: z.unknown().optional(),
  timestamp: z.string().datetime().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  status: z.enum(["success", "error"]).default("success"),
  errorMessage: z.string().optional(),
  errorCategory: z.string().optional(),
  conversationId: z.string().optional(),
  sourceSessionId: z.string().optional(),
  sourceApp: z.string().optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ImportBatchSchema = z.object({
  source: z.enum(["hermes", "claude-code", "cursor", "codex", "aider", "continue", "cline", "log-file", "proxy", "manual", "custom"]),
  batchId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  messages: z.array(ImportMessageSchema).min(1).max(1000),
});

export const ImportResponseSchema = z.object({
  imported: z.number(),
  duplicates: z.number(),
  skipped: z.number(),
  errors: z.array(z.object({
    index: z.number(),
    error: z.string(),
  })).optional(),
  batchDuplicate: z.boolean().optional(),
});
```

**Acceptance criteria:** message schema; batch schema; response schema.

### M2 — Error contract

**Reference code (`src/lib/import/errors.js`):**

```js
export const ImportErrorCodes = {
  INVALID_PAYLOAD: { code: "INVALID_PAYLOAD", status: 400, message: "Payload failed validation" },
  UNAUTHORIZED: { code: "UNAUTHORIZED", status: 401, message: "Missing or invalid API key" },
  FORBIDDEN: { code: "FORBIDDEN", status: 403, message: "Not allowed for this tenant" },
  DUPLICATE: { code: "DUPLICATE", status: 409, message: "Message already imported (onDuplicate=error)" },
  BATCH_TOO_LARGE: { code: "BATCH_TOO_LARGE", status: 413, message: "Batch exceeds 1000 messages" },
  RATE_LIMITED: { code: "RATE_LIMITED", status: 429, message: "Import rate limit exceeded" },
  INTERNAL: { code: "INTERNAL", status: 500, message: "Internal server error" },
};

export function importError(code, details) {
  const def = ImportErrorCodes[code] || ImportErrorCodes.INTERNAL;
  return { error: { code: def.code, message: def.message, details } };
}
```

**Acceptance criteria:** codes; statuses; helper.

### M3 — Node SDK

**Reference code (`src/lib/import/client.js`):**

```js
export class ImportClient {
  constructor({ baseUrl = "http://localhost:20128", apiKey }) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async importMessages(messages, { source = "custom", batchId, idempotencyKey, onDuplicate } = {}) {
    const res = await fetch(`${this.baseUrl}/api/messages/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({ source, batchId, idempotencyKey, messages, onDuplicate }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Import failed: ${res.status}`);
    }
    return res.json();
  }

  async importStream(stream, { source = "log-file" } = {}) {
    const res = await fetch(`${this.baseUrl}/api/messages/import/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-ndjson",
        "x-api-key": this.apiKey,
      },
      body: stream,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Stream import failed: ${res.status}`);
    }
    return res.json();
  }

  async getConfig() {
    const res = await fetch(`${this.baseUrl}/api/messages/import/config`);
    return res.json();
  }
}
```

**Acceptance criteria:** import; stream; config.

### M4 — Python SDK sketch + tests

**Reference code (`docs/import-sdk-python.md`):**

```python
# Python SDK sketch (suggestion)
import requests

class ImportClient:
    def __init__(self, base_url="http://localhost:20128", api_key=None):
        self.base_url = base_url
        self.headers = {"x-api-key": api_key} if api_key else {}

    def import_messages(self, messages, source="custom"):
        res = requests.post(
            f"{self.base_url}/api/messages/import",
            json={"source": source, "messages": messages},
            headers=self.headers,
        )
        res.raise_for_status()
        return res.json()
```

**Files touched:** `src/lib/import/schemas.js` (new), `src/lib/import/errors.js` (new), `src/lib/import/client.js` (new), `docs/import-sdk-python.md` (new), `tests/unit/import-contracts.test.js` (new).

**Acceptance criteria:** SDK sketch; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Zod not installed | Schema errors | Add dep or hand-roll |
| Error shape drift | Broken clients | Shared contract |
| SDK bugs | Failed imports | Tests |
| Versioning | Breaking changes | Versioned endpoints |

## Verification

- Unit: ImportMessageSchema, ImportBatchSchema, importError, ImportClient
- Manual: SDK import → verify response
- Regression: `tests/__baseline__/verify-no-regression.mjs`