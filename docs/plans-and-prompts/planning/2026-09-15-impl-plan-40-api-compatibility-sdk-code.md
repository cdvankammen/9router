# Implementation Plan 40 — API Compatibility & SDK Support — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #api-compatibility #openai #sdk #endpoints #error-shapes #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`src/app/api/v1/*` route structure, `next.config.mjs` rewrite mapping `/v1/*` → `/api/v1/*`, `open-sse/translator/` pivot-through-OpenAI design, `open-sse/config/errorCodes.js` if present, existing skills under `skills/`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit every endpoint with the official OpenAI SDK (Python + JS), confirm error shapes.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-40-api-compatibility-sdk.md`, `../research/9router/44-branch-gateways-and-serving.md`, `../research/9router/impl-plan-128-api-consistency-versioning.md`.

## Scope

**In scope:** endpoint coverage matrix (chat/completions, embeddings, images, audio stt/tts, files, models); parameter passthrough + translation + validation; OpenAI-compatible error shapes (`error: {message, type, param, code}`) and status codes; SDK test matrix (openai-python, openai-js) in CI; `docs/api-compatibility.md`.
**Out of scope:** new provider executors; non-OpenAI API surfaces (Anthropic-native endpoint is a separate concern).

## Milestones

### M1 — Endpoint coverage matrix + gap audit

**Reference code (`scripts/audit-endpoints.mjs`):**

```js
// Audits which OpenAI endpoints exist under src/app/api/v1/.
import fs from "node:fs";
import path from "node:path";

const EXPECTED = [
  "/v1/chat/completions", "/v1/completions", "/v1/embeddings",
  "/v1/images/generations", "/v1/images/edits",
  "/v1/audio/transcriptions", "/v1/audio/speech",
  "/v1/files", "/v1/models", "/v1/models/{id}",
];

const apiDir = path.join(process.cwd(), "src", "app", "api", "v1");
const existing = [];
function walk(dir, prefix = "") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, `${prefix}/${entry.name}`);
    else if (entry.name === "route.js") existing.push(prefix);
  }
}
walk(apiDir);

const gaps = EXPECTED.filter((e) => !existing.some((x) => e.startsWith(x) || x.startsWith(e)));
console.log(JSON.stringify({ expected: EXPECTED.length, existing: existing.length, gaps }, null, 2));
```

**Acceptance criteria:** audit script lists gaps; each gap has a decision (implement now vs documented defer).

### M2 — Parameter fidelity (passthrough + translation + validation)

**Reference code (`src/lib/api/params.js`):**

```js
// OpenAI → provider parameter mapping registry.
// Each entry: { openaiParam, providers: { providerId: { param, transform } } }
export const PARAM_MAP = {
  temperature: { providers: {} },            // passthrough everywhere
  top_p: { providers: {} },
  max_tokens: { providers: { anthropic: { param: "max_tokens" } } },
  stream: { providers: {} },
  tools: { providers: { anthropic: { param: "tools", transform: toAnthropicTools } } },
  tool_choice: { providers: { anthropic: { param: "tool_choice", transform: toAnthropicToolChoice } } },
  response_format: { providers: { google: { param: "responseMimeType", transform: toGoogleResponseFormat } } },
  stop: { providers: { google: { param: "stopSequences" } } },
};

export function translateParams(openaiParams, providerId) {
  const out = {};
  for (const [key, value] of Object.entries(openaiParams)) {
    const entry = PARAM_MAP[key];
    if (!entry) continue; // unknown param: drop (log once)
    const mapping = entry.providers[providerId];
    if (!mapping) { out[key] = value; continue; } // passthrough
    out[mapping.param] = mapping.transform ? mapping.transform(value) : value;
  }
  return out;
}

// Validation: OpenAI-compatible errors for bad params.
export function validateParams(params) {
  if (params.temperature !== undefined && (params.temperature < 0 || params.temperature > 2)) {
    return { error: { message: "temperature must be between 0 and 2", type: "invalid_request_error", param: "temperature", code: null } };
  }
  if (params.max_tokens !== undefined && (!Number.isInteger(params.max_tokens) || params.max_tokens <= 0)) {
    return { error: { message: "max_tokens must be a positive integer", type: "invalid_request_error", param: "max_tokens", code: null } };
  }
  return null;
}
```

**Acceptance criteria:** params round-trip per provider; unknown params dropped safely; validation returns OpenAI-shaped errors.

### M3 — Error compatibility

**Reference code (`src/lib/api/errors.js`):**

```js
// OpenAI-compatible error envelope.
export function openAiError({ message, type = "invalid_request_error", param = null, code = null, status = 400 }) {
  return new Response(JSON.stringify({ error: { message, type, param, code } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Map internal errors → OpenAI shapes.
export function toOpenAiError(err) {
  const map = {
    RATE_LIMITED: { status: 429, type: "rate_limit_error", code: "rate_limit_exceeded" },
    AUTH_ERROR: { status: 401, type: "authentication_error", code: "invalid_api_key" },
    CONTEXT_LENGTH: { status: 400, type: "invalid_request_error", code: "context_length_exceeded" },
    MODEL_NOT_FOUND: { status: 404, type: "invalid_request_error", code: "model_not_found" },
    OVERLOADED: { status: 503, type: "api_error", code: "overloaded" },
    TIMEOUT: { status: 504, type: "api_error", code: "timeout" },
  };
  const m = map[err.category] ?? { status: 500, type: "api_error", code: null };
  return openAiError({ message: err.message ?? "Internal server error", type: m.type, code: m.code, status: m.status });
}
```

**Acceptance criteria:** every error path returns OpenAI-shaped envelope; status codes match OpenAI conventions.

### M4 — SDK test matrix + docs

**Reference code (`tests/sdk/openai-sdk.test.js`):**

```js
// Runs against a live dev server (skipped unless NINEROUTER_SDK_TEST_URL is set).
import { describe, it, expect } from "vitest";

const BASE = process.env.NINEROUTER_SDK_TEST_URL;
const skip = BASE ? describe : describe.skip;

skip("OpenAI JS SDK compatibility", () => {
  it("chat.completions.create works", async () => {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ baseURL: `${BASE}/v1`, apiKey: "test" });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say hi" }],
      max_tokens: 10,
    });
    expect(res.choices[0].message.content).toBeTruthy();
  });

  it("models.list works", async () => {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ baseURL: `${BASE}/v1`, apiKey: "test" });
    const res = await client.models.list();
    expect(res.data.length).toBeGreaterThan(0);
  });

  it("error shape is OpenAI-compatible", async () => {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ baseURL: `${BASE}/v1`, apiKey: "test" });
    await expect(client.chat.completions.create({
      model: "definitely-not-a-model",
      messages: [{ role: "user", content: "hi" }],
    })).rejects.toMatchObject({ status: 404 });
  });
});
```

**Files touched:** `docs/api-compatibility.md` (new: endpoint matrix, param table, error codes, SDK examples), `tests/sdk/` (new), CI job wiring (plan 32).

**Acceptance criteria:** SDK tests pass against dev server; docs complete.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Translator fidelity | Param loss | Fidelity tests per provider |
| Error mapping | Wrong shapes | Compatibility tests |
| SDK version drift | Test rot | Pin SDK versions |
| Endpoint gaps | Client breakage | Coverage matrix + audit script |

## Verification

- Unit: params, errors
- SDK: openai-js + openai-python against dev server
- Manual: curl each endpoint; verify error shapes
- Regression: `tests/__baseline__/verify-no-regression.mjs`