# Implementation Plan 14: Format Adapters & Parsers

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, parsers, adapters, formats

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-t-format-adapters.md` (primary — Hermes/Claude Code/Cursor/Codex log formats)
- `../2026-09-17-hermes-import-branch-i-normalization-sanitization.md` (shared normalization applied after parsing)
- `../2026-09-17-hermes-import-branch-f-proxy-intercept.md` (proxy-captured payloads reuse the same parsers)

## Goal

Parse every agent/tool log format into the unified import schema. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| `cursorProtobuf.js` EXISTS | `open-sse/utils/cursorProtobuf.js` — but **`decodeCursorProtobuf` does NOT exist** (original plan imported it) |
| Real cursor decode exports | `decodeMessage(data)`, `parseConnectRPCFrame(buffer)`, `decodeVarint`, `decodeField`, `extractTextFromResponse(payload)` |
| Translator formats | `open-sse/translator/formats/` — `openai.js`, `claude.js`, `gemini.js`, `responsesApi.js` (Codex), `maxTokens.js` — the translator pivots through OpenAI format |
| Agent log formats | Hermes/Claude Code/Cursor/Codex formats are EXTERNAL — parsers must be validated against real agent installs |
| Import API | Plan 03: `POST /api/messages/import` — `detectAndParse` hooks in when `source=log-file` |

## Scope

- Adapter registry with auto-detection
- Hermes, Claude Code, Cursor, Codex parsers
- OpenAI-compatible fallback
- Streaming line-by-line parsing

## Design

### 1. Adapter Registry — `src/lib/import/parsers/registry.js`

**Purpose:** Register + auto-detect parsers.

```javascript
// src/lib/import/parsers/registry.js
// SUGGESTION ONLY — review against actual codebase before implementing
const adapters = new Map();

export function registerParser(id, adapter) {
  adapters.set(id, adapter);
}

export function getParser(id) {
  return adapters.get(id);
}

export async function detectAndParse(content, hint) {
  // If hint provided, try that first
  if (hint && adapters.has(hint)) {
    const adapter = adapters.get(hint);
    if (await adapter.detect(content)) return adapter.parse(content);
  }
  // Otherwise try all in priority order
  for (const [id, adapter] of adapters) {
    if (await adapter.detect(content)) return adapter.parse(content);
  }
  throw new Error("No parser detected format");
}

export function listParsers() {
  return Array.from(adapters.keys());
}
```

### 2. Hermes Parser — `src/lib/import/parsers/hermesParser.js`

**Purpose:** Parse Hermes session JSONL. **Format must be validated against the real Hermes install** — this is a proposal.

```javascript
// src/lib/import/parsers/hermesParser.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { registerParser } from "./registry.js";

const hermesParser = {
  id: "hermes",
  async detect(content) {
    const line = content.trim().split("\n")[0];
    try {
      const obj = JSON.parse(line);
      return obj.type === "hermes" || obj.source === "hermes" || !!obj.hermesSessionId;
    } catch {
      return false;
    }
  },
  async parse(content) {
    const messages = [];
    for (const line of content.trim().split("\n")) {
      if (!line.trim()) continue;
      const obj = JSON.parse(line);
      // Hermes session format: { type: "user|assistant|tool", message: {...}, metadata: {...} }
      if (obj.type === "assistant" && obj.message) {
        messages.push({
          model: obj.metadata?.model,
          provider: obj.metadata?.provider,
          request: obj.metadata?.request,
          response: obj.message,
          timestamp: obj.timestamp,
          latencyMs: obj.metadata?.latencyMs,
          tokens: obj.metadata?.tokens,
          cost: obj.metadata?.cost,
          status: obj.metadata?.error ? "error" : "success",
          errorMessage: obj.metadata?.error,
          conversationId: obj.hermesSessionId,
          sourceSessionId: obj.hermesSessionId,
          metadata: { hermes: true, ...obj.metadata },
        });
      }
    }
    return messages;
  },
};

registerParser("hermes", hermesParser);
```

### 3. Claude Code Parser — `src/lib/import/parsers/claudeCodeParser.js`

**Purpose:** Parse Claude Code JSONL. **Format must be validated against the real `~/.claude/` install.**

```javascript
// src/lib/import/parsers/claudeCodeParser.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { registerParser } from "./registry.js";

const claudeCodeParser = {
  id: "claude-code",
  async detect(content) {
    const line = content.trim().split("\n")[0];
    try {
      const obj = JSON.parse(line);
      return obj.type === "user" || obj.type === "assistant" || obj.isSidechain !== undefined;
    } catch {
      return false;
    }
  },
  async parse(content) {
    const messages = [];
    let currentRequest = null;
    for (const line of content.trim().split("\n")) {
      if (!line.trim()) continue;
      const obj = JSON.parse(line);
      if (obj.type === "user" && obj.message) {
        currentRequest = { role: "user", content: obj.message.content };
      } else if (obj.type === "assistant" && obj.message) {
        const usage = obj.message.usage || {};
        messages.push({
          model: obj.message.model,
          provider: "anthropic",
          request: currentRequest ? [currentRequest] : [],
          response: obj.message,
          timestamp: obj.timestamp,
          latencyMs: obj.durationMs,
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens,
          cost: obj.costUSD,
          status: obj.isError ? "error" : "success",
          errorMessage: obj.error,
          conversationId: obj.sessionId,
          sourceSessionId: obj.sessionId,
          metadata: { claudeCode: true, isSidechain: obj.isSidechain },
        });
        currentRequest = null;
      }
    }
    return messages;
  },
};

registerParser("claude-code", claudeCodeParser);
```

### 4. Cursor Parser — `src/lib/import/parsers/cursorParser.js`

**Purpose:** Parse Cursor traces (protobuf or JSONL).

**⚠️ GROUNDING FIX (original plan was wrong):** Imported `decodeCursorProtobuf` from `open-sse/utils/cursorProtobuf.js` — **doesn't exist**. Real exports: `decodeMessage(data)`, `parseConnectRPCFrame(buffer)`, `extractTextFromResponse(payload)`. The parser must use those.

```javascript
// src/lib/import/parsers/cursorParser.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { registerParser } from "./registry.js";
import { decodeMessage, parseConnectRPCFrame, extractTextFromResponse } from "open-sse/utils/cursorProtobuf.js";

const cursorParser = {
  id: "cursor",
  async detect(content) {
    // Protobuf detection: binary content or specific magic bytes
    if (content instanceof Uint8Array || Buffer.isBuffer(content)) return true;
    const line = content.trim().split("\n")[0];
    try {
      const obj = JSON.parse(line);
      return obj.cursorTrace === true || obj.type === "cursor";
    } catch {
      return false;
    }
  },
  async parse(content) {
    if (content instanceof Uint8Array || Buffer.isBuffer(content)) {
      // REAL API: parseConnectRPCFrame + decodeMessage (NOT decodeCursorProtobuf)
      const frame = parseConnectRPCFrame(content);
      const decoded = decodeMessage(frame?.payload || content);
      return [{
        model: decoded.model || "unknown",
        provider: "cursor",
        request: decoded.messages || [],
        response: extractTextFromResponse(content) || decoded,
        timestamp: new Date().toISOString(),
        status: "success",
        metadata: { cursor: true, protobuf: true },
      }];
    }
    // JSONL fallback
    const messages = [];
    for (const line of content.trim().split("\n")) {
      if (!line.trim()) continue;
      const obj = JSON.parse(line);
      messages.push({
        model: obj.model,
        provider: obj.provider,
        request: obj.request,
        response: obj.response,
        timestamp: obj.timestamp,
        latencyMs: obj.latencyMs,
        tokens: obj.tokens,
        cost: obj.cost,
        status: obj.error ? "error" : "success",
        errorMessage: obj.error,
        conversationId: obj.conversationId,
        sourceSessionId: obj.sessionId,
        metadata: { cursor: true },
      });
    }
    return messages;
  },
};

registerParser("cursor", cursorParser);
```

### 5. Codex Parser — `src/lib/import/parsers/codexParser.js`

**Purpose:** Parse Codex OpenAI Responses API format. The repo has `open-sse/translator/formats/responsesApi.js` — reuse its shape knowledge.

```javascript
// src/lib/import/parsers/codexParser.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { registerParser } from "./registry.js";

const codexParser = {
  id: "codex",
  async detect(content) {
    const line = content.trim().split("\n")[0];
    try {
      const obj = JSON.parse(line);
      return obj.type === "response" || obj.object === "response";
    } catch {
      return false;
    }
  },
  async parse(content) {
    const messages = [];
    for (const line of content.trim().split("\n")) {
      if (!line.trim()) continue;
      const obj = JSON.parse(line);
      // OpenAI Responses API format
      if (obj.type === "response" && obj.output) {
        const usage = obj.usage || {};
        messages.push({
          model: obj.model,
          provider: "openai",
          request: obj.input,
          response: obj.output,
          timestamp: obj.created_at,
          latencyMs: obj.latencyMs,
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.total_tokens,
          cost: obj.cost,
          status: obj.error ? "error" : "success",
          errorMessage: obj.error?.message,
          conversationId: obj.conversation_id,
          sourceSessionId: obj.session_id,
          metadata: { codex: true },
        });
      }
    }
    return messages;
  },
};

registerParser("codex", codexParser);
```

### 6. OpenAI-Compatible Fallback — `src/lib/import/parsers/openaiParser.js`

**Purpose:** Catch-all for OpenAI-format logs.

```javascript
// src/lib/import/parsers/openaiParser.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { registerParser } from "./registry.js";

const openaiParser = {
  id: "openai-compatible",
  async detect(content) {
    const line = content.trim().split("\n")[0];
    try {
      const obj = JSON.parse(line);
      return obj.model && (obj.messages || obj.prompt || obj.input);
    } catch {
      return false;
    }
  },
  async parse(content) {
    const messages = [];
    for (const line of content.trim().split("\n")) {
      if (!line.trim()) continue;
      const obj = JSON.parse(line);
      const usage = obj.usage || {};
      messages.push({
        model: obj.model,
        provider: obj.provider || "unknown",
        request: obj.messages || obj.prompt || obj.input,
        response: obj.choices?.[0]?.message || obj.output,
        timestamp: obj.created || obj.timestamp,
        latencyMs: obj.latencyMs,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost: obj.cost,
        status: obj.error ? "error" : "success",
        errorMessage: obj.error?.message,
        conversationId: obj.conversation_id,
        sourceSessionId: obj.session_id,
        metadata: { openaiCompatible: true },
      });
    }
    return messages;
  },
};

registerParser("openai-compatible", openaiParser);
```

## Steps (per-part instructions)

### Step 1 — `registry.js` — adapter registration + detection
1. Create the file.
2. **Verify:** `listParsers()` returns registered ids.

### Step 2 — Per-format parsers
1. Create `hermesParser.js`, `claudeCodeParser.js`, `cursorParser.js`, `codexParser.js`, `openaiParser.js`.
2. **Verify:** each registers itself (side-effect import).

### Step 3 — Auto-register on import
1. Import all parser files in the import pipeline (or a `parsers/index.js` barrel).
2. **Verify:** `detectAndParse` finds the right parser for each fixture.

### Step 4 — Import API uses `detectAndParse` when source=log-file
1. In the import route, when `source === "log-file"`, run `detectAndParse(content, hint)`.
2. **Verify:** log-file import parses correctly.

### Step 5 — Test fixtures per format
1. Create `tests/fixtures/import/` with one JSONL per format.
2. **Verify:** each fixture parses to canonical messages.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| cursorProtobuf | Binary format changes | Use real exports (`parseConnectRPCFrame`/`decodeMessage`), fallback to JSONL |
| Claude Code format | Private/undocumented | Best-effort, log unknown fields |
| Detection conflicts | Two parsers match | Priority order in registry |

## Verification (commands)

```bash
# Hermes fixture
node -e "
import('./src/lib/import/parsers/registry.js').then(async (reg) => {
  await import('./src/lib/import/parsers/hermesParser.js');
  const content = JSON.stringify({ type: 'assistant', message: { content: 'hi' }, metadata: { model: 'gpt-4o' }, hermesSessionId: 's1' });
  console.log(await reg.detectAndParse(content, 'hermes'));
})"
# Expect: one canonical message with model gpt-4o
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.