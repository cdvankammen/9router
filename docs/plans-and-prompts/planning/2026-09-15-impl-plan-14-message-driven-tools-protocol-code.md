# Implementation Plan 14 — Message-Driven Tools Protocol — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #message-driven-tools #tools-protocol #agentic #tool-calls #handoff #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/translator/` tool message handling, `open-sse/rtk/` tool_result compression, `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-14-message-driven-tools.md`, `../research/9router/31-message-driven-tools.md`
>
> **Note on overlap:** this plan is the *tools protocol* for agentic workflows (tool message types, chaining, handoff). It is distinct from `2026-09-15-message-driven-tools-implementation-plan.md` (message capture/filtering for the messages page). Overlap is acceptable per project direction.

## Scope

**In scope:** tool message types (`tool_call`/`tool_result`/`tool_error`/`tool_progress`/`tool_handoff`); tool chaining/branching/retry/timeout; multi-turn stateful tools; tool handoff between models; OpenAI-compatible exposure; RTK integration.
**Out of scope:** MCP server implementation (external); tool registry UI (plan 12).

## Milestones

### M1 — Tool message types

**Reference code (`open-sse/translator/schema/toolMessages.js`):**

```js
// Canonical tool message shapes (OpenAI-compatible).
export const TOOL_MESSAGE_TYPES = {
  tool_call: {
    role: "assistant",
    content: null,
    tool_calls: [{ id: "call_xxx", type: "function", function: { name, arguments } }],
  },
  tool_result: {
    role: "tool",
    tool_call_id: "call_xxx",
    content: "result text or JSON",
  },
  tool_error: {
    role: "tool",
    tool_call_id: "call_xxx",
    content: JSON.stringify({ is_error: true, error: { type, message } }),
  },
  tool_progress: {
    role: "tool",
    tool_call_id: "call_xxx",
    content: JSON.stringify({ progress: { status: "running", percent, detail } }),
  },
  tool_handoff: {
    role: "assistant",
    content: null,
    tool_calls: [{ id: "handoff_xxx", type: "function", function: { name: "__handoff__", arguments: JSON.stringify({ to_model, reason }) } }],
  },
};

export function makeToolCall(id, name, args) {
  return { id, type: "function", function: { name, arguments: JSON.stringify(args) } };
}

export function makeToolResult(callId, content, { isError = false } = {}) {
  return { role: "tool", tool_call_id: callId, content: isError ? JSON.stringify({ is_error: true, error: content }) : content };
}
```

**Acceptance criteria:** canonical shapes; translators map provider tool messages to/from these.

### M2 — Tool chaining + retry + timeout

**Reference code (`open-sse/services/toolRunner.js`):**

```js
// Executes tool calls with chaining, retry, timeout.
export async function runToolCall(tool, args, { retries = 2, timeoutMs = 30_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        tool.execute(args),
        new Promise((_, rej) => setTimeout(() => rej(new Error("tool timeout")), Math.max(0, deadline - Date.now()))),
      ]);
      return { ok: true, result };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(500 * 2 ** attempt); // backoff
    }
  }
  return { ok: false, error: lastErr };
}

// Chaining: tool results feed next tool call (branching via conditional tool selection).
export async function runToolChain(chain, ctx) {
  const outputs = [];
  for (const step of chain) {
    const { ok, result, error } = await runToolCall(step.tool, step.args(ctx, outputs));
    outputs.push({ step: step.id, ok, result, error });
    if (!ok && !step.optional) return { ok: false, outputs };
    if (step.branch) {
      const next = step.branch(outputs);
      if (next) return runToolChain(next, ctx);
    }
  }
  return { ok: true, outputs };
}
```

**Acceptance criteria:** retry with backoff; timeout; chaining; branching.

### M3 — Multi-turn stateful tools + handoff

**Reference code (`src/lib/db/repos/toolSessionRepo.js`):**

```js
// Tool sessions persist state across turns.
export async function getToolSession(sessionId) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM tool_sessions WHERE id = ?`, [sessionId]);
  return row ? { ...row, state: JSON.parse(row.state) } : null;
}

export async function saveToolSession(sessionId, state) {
  const db = await getAdapter();
  await db.run(
    `INSERT INTO tool_sessions (id, state, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
    [sessionId, JSON.stringify(state), Date.now()]
  );
}
```

**Handoff (`open-sse/services/toolHandoff.js`):**

```js
// Handoff: model A calls __handoff__ -> route to model B with context.
export async function handleHandoff(toolCall, ctx) {
  const { to_model, reason } = JSON.parse(toolCall.function.arguments);
  return {
    type: "handoff",
    to_model,
    reason,
    context: { conversation: ctx.conversation, tool_state: ctx.toolState },
  };
}
```

**Acceptance criteria:** state persists across turns; handoff routes with context.

### M4 — OpenAI exposure + RTK + tests

**Files touched:**
- `open-sse/rtk/` — compress `tool_result` content (already exists); add `tool_progress` skip rule
- `tests/unit/tools-protocol.test.js` (new)

**Acceptance criteria:** tool messages round-trip through OpenAI-compatible API; RTK skips progress; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Provider tool format quirks | Canonical schema + translators |
| Tool timeouts | Configurable per tool |
| State growth | Session TTL + cleanup |
| Handoff loops | Max handoff depth |

## Verification

- Unit: message shapes, chaining, retry, handoff
- Manual: agentic request with tools → verify tool_call/tool_result round-trip
- Regression: `tests/__baseline__/verify-no-regression.mjs`