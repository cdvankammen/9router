# Implementation Plan 17: Agent Adapters & Integration Recipes

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, agents, adapters, integration

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-w-agent-adapters.md` (primary — per-agent config recipes and hook payload contract)
- `../2026-09-17-hermes-import-branch-a-log-capture.md` (hook vs log-tail vs proxy capture mechanisms)
- `../2026-09-17-hermes-import-branch-f-proxy-intercept.md` (proxy env-var recipes per agent)

## Goal

Concrete integration recipes for each agent (Hermes, Claude Code, Cursor, Codex, Aider, Continue, Cline) to feed 9Router. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| **Zod is NOT installed** | `package.json` has no `zod` — original plan's `hookPayloadSchema.js` used `import { z } from "zod"` (would fail). Use the hand-rolled contract from plan 19 instead |
| Import API | Plan 03: `POST /api/messages/import` with `x-api-key` |
| Config endpoint | Plan 05: `GET /api/messages/import/config` — returns import URL + example config |
| Proxy env vars | `ANTHROPIC_BASE_URL`, `OPENAI_BASE_URL`, `OPENAI_API_BASE` — standard agent env vars; 9Router exposes OpenAI-compatible `/v1/*` |
| Agent formats | Hermes/Claude Code/Cursor/Codex formats are EXTERNAL — recipes must be validated against real installs |

## Scope

- Per-agent config snippets (hook, proxy, env vars)
- Hook payload spec
- Adapter detection helper

## Design

### Hermes Hook Config

```yaml
# Hermes config.yaml (suggestion)
# Add post-request hook to send every request/response to 9Router
hooks:
  post_request:
    - url: "http://localhost:20128/api/messages/import"
      method: POST
      headers:
        x-api-key: "${IMPORT_API_KEY}"
      body:
        source: "hermes"
        messages:
          - model: "{{model}}"
            provider: "{{provider}}"
            request: "{{request}}"
            response: "{{response}}"
            timestamp: "{{timestamp}}"
            latencyMs: "{{latency_ms}}"
            tokens: "{{tokens}}"
            cost: "{{cost}}"
            status: "{{status}}"
            error: "{{error}}"
            conversationId: "{{session_id}}"
            sourceSessionId: "{{session_id}}"
      retry: 3
      backoff: exponential
```

### Claude Code Proxy Config

```bash
# Claude Code → 9Router (suggestion)
# Set in shell profile or Claude Code settings
export ANTHROPIC_BASE_URL="http://localhost:20128/v1"
export ANTHROPIC_AUTH_TOKEN="<9router-api-key>"
# All Claude Code traffic now flows through 9Router natively
```

### Cursor Proxy Config

```json
// Cursor settings.json (suggestion)
{
  "cursor.openai.baseUrl": "http://localhost:20128/v1",
  "cursor.openai.apiKey": "<9router-api-key>"
}
```

### Codex Proxy Config

```bash
# Codex → 9Router (suggestion)
export OPENAI_BASE_URL="http://localhost:20128/v1"
export OPENAI_API_KEY="<9router-api-key>"
```

### Aider Config

```bash
# Aider → 9Router (suggestion)
export OPENAI_API_BASE="http://localhost:20128/v1"
export OPENAI_API_KEY="<9router-api-key>"
```

### Hook Payload Spec — `src/lib/import/hookPayloadSchema.js`

**Purpose:** Canonical hook payload shape. **⚠️ GROUNDING FIX: Zod is NOT installed** — use the plain-object contract from plan 19 (or add `zod` first). The shape below is the contract.

```javascript
// src/lib/import/hookPayloadSchema.js
// SUGGESTION ONLY — contract definition (Zod NOT installed — see plan 19 for validator choice)
export const HookMessageSchema = {
  model: { type: "string", required: true, min: 1 },
  provider: { type: "string", optional: true },
  request: { type: "any", optional: true },
  response: { type: "any", optional: true },
  timestamp: { type: "string", optional: true, format: "datetime" },
  latencyMs: { type: "number", optional: true, min: 0 },
  tokens: { type: "object", optional: true, fields: {
    prompt: { type: "number", optional: true, min: 0 },
    completion: { type: "number", optional: true, min: 0 },
    total: { type: "number", optional: true, min: 0 },
  }},
  cost: { type: "number", optional: true, min: 0 },
  status: { type: "enum", values: ["success", "error"], default: "success" },
  error: { type: "string", optional: true },
  conversationId: { type: "string", optional: true },
  sourceSessionId: { type: "string", optional: true },
  metadata: { type: "object", optional: true },
};

export const HookBatchSchema = {
  source: { type: "enum", values: ["hermes", "claude-code", "cursor", "codex", "aider", "continue", "cline", "custom"] },
  batchId: { type: "string", optional: true },
  idempotencyKey: { type: "string", optional: true },
  messages: { type: "array", min: 1, max: 1000, item: HookMessageSchema },
};
```

### Adapter Detection Helper — `src/lib/import/agentDetect.js`

**Purpose:** Detect which agent a payload came from based on shape.

```javascript
// src/lib/import/agentDetect.js
// SUGGESTION ONLY
export function detectAgent(payload) {
  if (payload.source) return payload.source;
  if (payload.isSidechain !== undefined) return "claude-code";
  if (payload.cursorTrace) return "cursor";
  if (payload.object === "response") return "codex";
  if (payload.hermesSessionId) return "hermes";
  return "custom";
}
```

### Config Snippet API — `src/app/api/messages/import/config/route.js` (extend)

**Purpose:** Return per-agent setup snippets. Extends plan 05's config endpoint.

```javascript
// src/app/api/messages/import/config/route.js (extend)
// SUGGESTION ONLY
import { NextResponse } from "next/server";

const SNIPPETS = {
  hermes: `hooks:\n  post_request:\n    - url: "http://localhost:20128/api/messages/import"\n      ...`,
  "claude-code": `export ANTHROPIC_BASE_URL="http://localhost:20128/v1"`,
  cursor: `{ "cursor.openai.baseUrl": "http://localhost:20128/v1" }`,
  codex: `export OPENAI_BASE_URL="http://localhost:20128/v1"`,
  aider: `export OPENAI_API_BASE="http://localhost:20128/v1"`,
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get("agent");
  if (agent && SNIPPETS[agent]) {
    return NextResponse.json({ agent, snippet: SNIPPETS[agent] });
  }
  return NextResponse.json({ agents: Object.keys(SNIPPETS), snippets: SNIPPETS });
}
```

## Steps (per-part instructions)

### Step 1 — Document per-agent config in skill + docs
1. Add the recipes above to `skills/9router-message-import/SKILL.md` + docs.
2. **Verify:** recipes reference the real import URL + `IMPORT_API_KEY`.

### Step 2 — `hookPayloadSchema.js` — hook payload contract
1. Create the file (plain-object contract — Zod NOT installed).
2. **Verify:** contract matches plan 19's `ImportMessageSchema`.

### Step 3 — `agentDetect.js` — payload → agent detection
1. Create the file.
2. **Verify:** `detectAgent({ isSidechain: false })` → `"claude-code"`.

### Step 4 — Extend config API with snippets
1. Add `SNIPPETS` + `?agent=` param to plan 05's config route.
2. **Verify:** `curl "http://localhost:20128/api/messages/import/config?agent=codex"` → snippet.

### Step 5 — Import Modal shows per-agent setup tabs
1. In plan 08's ImportModal, add tabs per agent showing the snippet.
2. **Verify:** each tab shows the correct snippet.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| Agent config formats | Change between versions | Document version, test on upgrade |
| Hook support | Hermes may not support hooks | Fall back to log parsing |
| Proxy env vars | Agent may ignore | Verify with test request |
| Zod | **Not installed** | Use plain-object contract (plan 19) |

## Verification (commands)

```bash
# Config API returns snippets
curl "http://localhost:20128/api/messages/import/config?agent=codex"
# Expect: { agent: "codex", snippet: "export OPENAI_BASE_URL=..." }
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.