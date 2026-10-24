# Implementation Plan Import-17 — Agent Adapters & Integration Recipes — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #agents #adapters #integration #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (import API from plan import-03; hook payload shape must match the real import endpoint; **Zod is NOT installed** — the hook payload schema below uses Zod, so either add the dependency or hand-roll validation; agent config formats are EXTERNAL — verify against real agent installs).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — recipes; payload spec; detection helper.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-17-agent-adapters.md`, `../research/9router/impl-plan-import-03-import-api.md`, `../research/9router/impl-plan-import-05-hermes-hook.md`.

## Scope

**In scope:** per-agent config snippets (hook, proxy, env vars); hook payload spec; adapter detection helper.
**Out of scope:** Hermes hook (import-05); format parsers (import-14).

## Milestones

### M1 — Agent config recipes

**Reference code (documentation — `docs/agent-import-recipes.md`):**

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

```bash
# Claude Code → 9Router (suggestion)
export ANTHROPIC_BASE_URL="http://localhost:20128/v1"
export ANTHROPIC_AUTH_TOKEN="<9router-api-key>"
# All Claude Code traffic now flows through 9Router natively
```

```json
// Cursor settings.json (suggestion)
{
  "cursor.openai.baseUrl": "http://localhost:20128/v1",
  "cursor.openai.apiKey": "<9router-api-key>"
}
```

```bash
# Codex → 9Router (suggestion)
export OPENAI_BASE_URL="http://localhost:20128/v1"
export OPENAI_API_KEY="<9router-api-key>"
```

```bash
# Aider → 9Router (suggestion)
export OPENAI_API_BASE="http://localhost:20128/v1"
export OPENAI_API_KEY="<9router-api-key>"
```

**Acceptance criteria:** recipes documented; proxy env vars shown.

### M2 — Hook payload spec

**Reference code (`src/lib/import/hookPayloadSchema.js`):**

```js
// The canonical hook payload shape — validate with Zod (add dependency) or hand-roll.
import { z } from "zod";

export const HookMessageSchema = z.object({
  model: z.string().min(1),
  provider: z.string().optional(),
  request: z.unknown().optional(),
  response: z.unknown().optional(),
  timestamp: z.string().datetime().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  tokens: z.object({
    prompt: z.number().int().nonnegative().optional(),
    completion: z.number().int().nonnegative().optional(),
    total: z.number().int().nonnegative().optional(),
  }).optional(),
  cost: z.number().nonnegative().optional(),
  status: z.enum(["success", "error"]).default("success"),
  error: z.string().optional(),
  conversationId: z.string().optional(),
  sourceSessionId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const HookBatchSchema = z.object({
  source: z.enum(["hermes", "claude-code", "cursor", "codex", "aider", "continue", "cline", "custom"]),
  batchId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  messages: z.array(HookMessageSchema).min(1).max(1000),
});
```

**Acceptance criteria:** message schema; batch schema.

### M3 — Detection helper

**Reference code (`src/lib/import/detectAgent.js`):**

```js
// Detect which agent produced a payload from its shape.
export function detectAgent(payload) {
  if (payload.source) return payload.source;
  if (payload.hermesSessionId) return "hermes";
  if (payload.cursor?.sessionId) return "cursor";
  if (payload.anthropic?.sessionId) return "claude-code";
  if (payload.codex?.sessionId) return "codex";
  return "custom";
}
```

**Acceptance criteria:** detection; fallback.

### M4 — Tests

**Reference code (`tests/unit/import-agent-adapters.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { detectAgent } from "@/lib/import/detectAgent.js";

describe("detectAgent", () => {
  it("detects hermes", () => {
    expect(detectAgent({ hermesSessionId: "s1" })).toBe("hermes");
  });
  it("falls back to custom", () => {
    expect(detectAgent({})).toBe("custom");
  });
});
```

**Files touched:** `docs/agent-import-recipes.md` (new), `src/lib/import/hookPayloadSchema.js` (new), `src/lib/import/detectAgent.js` (new), `tests/unit/import-agent-adapters.test.js` (new).

**Acceptance criteria:** tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| External configs | Wrong formats | Verify against installs |
| Zod not installed | Schema errors | Add dep or hand-roll |
| Proxy env vars | Traffic bypass | Document both paths |
| Payload drift | Broken hooks | Shared schema |

## Verification

- Unit: detectAgent, HookMessageSchema, HookBatchSchema
- Manual: configure agent → verify import
- Regression: `tests/__baseline__/verify-no-regression.mjs`