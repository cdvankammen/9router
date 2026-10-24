# Implementation Plan 05: Hermes Hook Integration

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, hermes, hook, webhook

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-a-log-capture.md` (A1 — Hermes post-request hook)
- `../2026-09-17-hermes-import-branch-w-agent-adapters.md` (hook vs proxy vs log tradeoffs per agent)

## Goal

Configure Hermes agents to POST their request/response data to 9Router's import API in real-time.

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| **Hermes is EXTERNAL** | No Hermes code in this repo — `docs/index.md` mentions "Hermes fleet on mini"; Hermes is a separate agent system the user runs |
| Import API | Plan 03 defines `POST /api/messages/import` with `x-api-key` auth (`IMPORT_API_KEY` env) |
| Route pattern | `src/app/api/messages/route.js` — `NextResponse`, try/catch, `{ error, message }` 500 shape |
| Config endpoint precedent | `src/app/api/version/update/route.js` — env-gated secret auth |
| **Hermes hook API unknown** | Whether Hermes supports post-request hooks must be discovered from the actual Hermes install (`~/.hermes/`) — this plan documents the 9Router side + a conceptual hook |

## Scope

- Hermes config schema (documentation + example)
- Post-request hook (conceptual — Hermes-side)
- Retry on failure
- 9Router config endpoint (the part that lives in this repo)

## Design

### 1. 9Router Config Endpoint — `src/app/api/messages/import/config/route.js`

**Purpose:** Let agents discover the import URL + auth requirements without hardcoding. This is the only part of this plan that lives in the 9Router repo.

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `GET(request)` | Return import URL, auth requirement, max batch, example config | `NextResponse` |

```javascript
// src/app/api/messages/import/config/route.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { NextResponse } from "next/server";

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

### 2. Hermes Config (documentation — external side)

**Purpose:** Document the suggested Hermes-side config. **The actual Hermes config schema must be verified against the real Hermes install** — this is a proposal, not a verified format.

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

### 3. Post-Request Hook (conceptual — Hermes side)

**Purpose:** Show the shape of a Hermes-side hook that POSTs to the import API. **This is conceptual** — the real hook mechanism depends on Hermes' actual extension API.

```javascript
// Conceptual Hermes integration (agent-side) — NOT 9Router code
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
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.api_key,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(config.timeout_ms),
      });
      if (res.ok) return;
      if (res.status >= 400 && res.status < 500) return; // don't retry client errors
    } catch (err) {
      if (attempt === config.retry.max_attempts) {
        console.error("Hermes import failed after retries:", err);
        return;
      }
      await new Promise((r) => setTimeout(r, config.retry.backoff_ms * attempt));
    }
  }
}
```

## Steps (per-part instructions)

### Step 1 — Create `/api/messages/import/config` endpoint
1. Create `src/app/api/messages/import/config/route.js` with the GET handler.
2. **Verify:** `curl http://localhost:20128/api/messages/import/config` → JSON with `importUrl`, `requiresApiKey`, `maxBatchSize`.

### Step 2 — Document Hermes config schema
1. Add a doc under `docs/` describing the suggested Hermes config + hook.
2. **Verify:** doc lists the config endpoint as the discovery mechanism.

### Step 3 — Create example config file
1. Add `docs/examples/hermes-ninerouter-config.yaml` with the suggested config.
2. **Verify:** YAML parses (`node -e "console.log(require('yaml').parse(...))"` if yaml dep exists, else manual review).

### Step 4 — Add setup instructions to docs
1. Document: set `IMPORT_API_KEY`, point Hermes at `/api/messages/import/config`, configure the hook.
2. **Verify:** instructions reference real env var name (`IMPORT_API_KEY`).

### Step 5 — Test end-to-end with Hermes
1. **Requires the real Hermes install** — verify the hook API exists, wire it, confirm messages appear in the Messages page.
2. If Hermes has no hook API → fall back to plan 04 (log file tail).

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| Hermes supports hooks | **May not have hook API (unverified)** | Fallback to log file tail (plan 04) |
| Network latency | Hook adds latency | Async fire-and-forget |
| Import API down | Lost messages | Retry with backoff |
| Hermes config schema | Unverified | Discover from real `~/.hermes/` install |

## Verification (commands)

```bash
# Config endpoint
curl http://localhost:20128/api/messages/import/config
# Expect: { importUrl: ".../api/messages/import", requiresApiKey: true|false, maxBatchSize: 1000, ... }
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.