# Implementation Plan 19: API Contracts & Client SDKs

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, api-contracts, sdk, openapi

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-y-api-design.md` (primary — endpoint contracts, error codes, SDK surface)
- `../2026-09-17-hermes-import-branch-l-security-privacy.md` (API-key auth, HMAC, tenant scoping)
- `../2026-09-17-hermes-import-branch-m-integration-existing-components.md` (contracts align with existing repo/service conventions)

## Goal

Complete API contract for the import system: endpoints, schemas, error codes, versioning, client SDKs. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| **Zod is NOT installed** | `package.json` has no `zod` dependency — original plan assumed it. Either add it or hand-roll validation (plan 03 shows hand-rolled) |
| Route pattern | `src/app/api/messages/route.js` — `NextResponse`, try/catch, `{ error, message }` 500 shape |
| Auth pattern | `src/app/api/version/update/route.js` — timing-safe `crypto.timingSafeEqual` Bearer comparison; `x-api-key` header for import |
| Import endpoints | Plan 03: `POST /api/messages/import`; Plan 15: `POST /api/messages/import/stream`; Plan 05: `GET /api/messages/import/config` |
| Adapter API | `db.run/get/all/exec` positional params — **no `.prepare()`** |
| Python SDK location | `cli/` is the launcher package — a Python SDK would live there or in `skills/` |

## Scope

- Full endpoint surface
- Zod schemas (shared) — **or hand-rolled**
- Error contract
- Node + Python SDK sketches

## Design

### 1. Shared Schemas — `src/lib/import/schemas.js`

**Purpose:** Validation schemas. **⚠️ GROUNDING FIX: Zod is NOT installed** — either add `zod` to `package.json` (optionalDependency, lazy import) or use the hand-rolled validator from plan 03. The schema below is the **contract** — the validator implementation is a choice.

```javascript
// src/lib/import/schemas.js
// SUGGESTION ONLY — contract definition; validator impl is a choice (Zod or hand-rolled)
// If using Zod: add `zod` to package.json first (NOT currently a dependency)

export const ImportMessageSchema = {
  model: { type: "string", required: true, min: 1 },
  provider: { type: "string", optional: true },
  request: { type: "any", optional: true },
  response: { type: "any", optional: true },
  timestamp: { type: "string", optional: true, format: "datetime" },
  latencyMs: { type: "number", optional: true, min: 0 },
  promptTokens: { type: "number", optional: true, min: 0 },
  completionTokens: { type: "number", optional: true, min: 0 },
  totalTokens: { type: "number", optional: true, min: 0 },
  cost: { type: "number", optional: true, min: 0 },
  status: { type: "enum", values: ["success", "error"], default: "success" },
  errorMessage: { type: "string", optional: true },
  errorCategory: { type: "string", optional: true },
  conversationId: { type: "string", optional: true },
  sourceSessionId: { type: "string", optional: true },
  sourceApp: { type: "string", optional: true },
  idempotencyKey: { type: "string", optional: true },
  metadata: { type: "object", optional: true },
};

export const ImportBatchSchema = {
  source: { type: "enum", values: ["hermes", "claude-code", "cursor", "codex", "aider", "continue", "cline", "log-file", "proxy", "manual", "custom"] },
  batchId: { type: "string", optional: true },
  idempotencyKey: { type: "string", optional: true },
  messages: { type: "array", min: 1, max: 1000, item: ImportMessageSchema },
};

export const ImportResponseSchema = {
  imported: { type: "number" },
  duplicates: { type: "number" },
  skipped: { type: "number" },
  errors: { type: "array", optional: true, item: { type: "object", fields: { index: "number", error: "string" } } },
  batchDuplicate: { type: "boolean", optional: true },
};
```

### 2. Error Contract — `src/lib/import/errors.js`

**Purpose:** Stable error codes for the import API.

```javascript
// src/lib/import/errors.js
// SUGGESTION ONLY
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

### 3. Node SDK — `src/lib/import/client.js`

**Purpose:** Client for the import API. **⚠️ GROUNDING FIX:** Original used `importStream(stream)` with a raw stream — the real stream endpoint (plan 15) reads `request.body` (a ReadableStream), so the client should pass a `ReadableStream` or `Blob`.

```javascript
// src/lib/import/client.js
// SUGGESTION ONLY
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
    // stream: ReadableStream or Blob (plan 15 reads request.body)
    const res = await fetch(`${this.baseUrl}/api/messages/import/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-ndjson",
        "x-api-key": this.apiKey,
      },
      body: stream,
    });
    if (!res.ok) throw new Error(`Stream import failed: ${res.status}`);
    return res.json();
  }

  async getJobs() {
    const res = await fetch(`${this.baseUrl}/api/messages/import/jobs`, {
      headers: { "x-api-key": this.apiKey },
    });
    return res.json();
  }

  async getUnknownModels() {
    const res = await fetch(`${this.baseUrl}/api/messages/import/unknown-models`, {
      headers: { "x-api-key": this.apiKey },
    });
    return res.json();
  }

  async mapUnknownModel(model, provider, canonicalModel) {
    const res = await fetch(`${this.baseUrl}/api/messages/import/unknown-models/${encodeURIComponent(model)}/map`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": this.apiKey },
      body: JSON.stringify({ provider, canonicalModel }),
    });
    return res.json();
  }
}
```

### 4. Python SDK — `cli/import_client.py` (suggestion)

**Purpose:** Python client for agents that aren't Node-based. Lives in `cli/` (the launcher package) or `skills/`.

```python
# cli/import_client.py (suggestion)
# SUGGESTION ONLY
import requests

class ImportClient:
    def __init__(self, base_url="http://localhost:20128", api_key=None):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def _headers(self):
        return {"x-api-key": self.api_key} if self.api_key else {}

    def import_messages(self, messages, source="custom", batch_id=None):
        res = requests.post(
            f"{self.base_url}/api/messages/import",
            headers=self._headers(),
            json={"source": source, "batchId": batch_id, "messages": messages},
        )
        res.raise_for_status()
        return res.json()

    def import_jsonl(self, path, source="log-file"):
        with open(path, "rb") as f:
            res = requests.post(
                f"{self.base_url}/api/messages/import/stream",
                headers={**self._headers(), "Content-Type": "application/x-ndjson"},
                data=f,
            )
        res.raise_for_status()
        return res.json()

    def get_unknown_models(self):
        res = requests.get(f"{self.base_url}/api/messages/import/unknown-models", headers=self._headers())
        res.raise_for_status()
        return res.json()
```

### 5. curl Examples

```bash
# Import a single message
curl -X POST http://localhost:20128/api/messages/import \
  -H "Content-Type: application/json" \
  -H "x-api-key: $IMPORT_API_KEY" \
  -d '{
    "source": "hermes",
    "messages": [{
      "model": "claude-3-5-sonnet-20241022",
      "request": {"messages": [{"role": "user", "content": "hi"}]},
      "response": {"content": "hello"},
      "status": "success"
    }]
  }'

# Stream a JSONL file
curl -X POST http://localhost:20128/api/messages/import/stream \
  -H "Content-Type: application/x-ndjson" \
  -H "x-api-key: $IMPORT_API_KEY" \
  --data-binary @hermes-session.jsonl

# List unknown models
curl http://localhost:20128/api/messages/import/unknown-models \
  -H "x-api-key: $IMPORT_API_KEY"
```

## Steps (per-part instructions)

### Step 1 — `schemas.js` — shared schemas
1. Create `src/lib/import/schemas.js` with the contract above.
2. **Verify:** if using Zod, add `zod` to package.json first; if hand-rolled, wire into plan 03's validator.

### Step 2 — `errors.js` — error contract
1. Create `src/lib/import/errors.js`.
2. **Verify:** `importError('UNAUTHORIZED')` → `{ error: { code: 'UNAUTHORIZED', status: 401, ... } }`.

### Step 3 — `client.js` — Node SDK
1. Create `src/lib/import/client.js`.
2. **Verify:** `new ImportClient({ apiKey: 'test' }).importMessages([{ model: 'gpt-4o' }])` → response.

### Step 4 — Python SDK in `cli/`
1. Create `cli/import_client.py`.
2. **Verify:** `python3 -c "from import_client import ImportClient; print(ImportClient())"` → no import errors.

### Step 5 — Document curl examples
1. Add curl examples to the skill + docs.
2. **Verify:** examples match the real endpoint paths.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| Zod | **Not installed** | Hand-rolled validation (plan 03) or add `zod` |
| SDK drift | API changes | Version SDK with API |
| Python SDK | Maintenance | Keep minimal |

## Verification (commands)

```bash
# Node SDK imports a batch
node -e "import('./src/lib/import/client.js').then(({ ImportClient }) => {
  const c = new ImportClient({ apiKey: 'test' });
  c.importMessages([{ model: 'gpt-4o', request: { messages: [{ role: 'user', content: 'hi' }] } }]).then(r => console.log(r));
})"
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.