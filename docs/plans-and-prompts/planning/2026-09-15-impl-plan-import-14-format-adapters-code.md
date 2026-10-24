# Implementation Plan Import-14 — Format Adapters & Parsers — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #parsers #adapters #formats #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`cursorProtobuf.js` EXISTS at `open-sse/utils/cursorProtobuf.js` — but **`decodeCursorProtobuf` does NOT exist**; real cursor decode exports are `decodeMessage(data)`, `parseConnectRPCFrame(buffer)`, `decodeVarint`, `decodeField`, `extractTextFromResponse(payload)`; translator formats from `open-sse/translator/formats/` — `openai.js`, `claude.js`, `gemini.js`, `responsesApi.js` (Codex), `maxTokens.js`; agent log formats are EXTERNAL — parsers must be validated against real agent installs; import API from plan import-03 — `detectAndParse` hooks in when `source=log-file`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — registry; parsers; fallback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-14-format-adapters.md`, `../research/9router/impl-plan-import-04-log-file-tail.md`, `../research/9router/impl-plan-import-03-import-api.md`.

## Scope

**In scope:** adapter registry with auto-detection; Hermes, Claude Code, Cursor, Codex parsers; OpenAI-compatible fallback; streaming line-by-line parsing.
**Out of scope:** log watcher (import-04); deduplication (import-13).

## Milestones

### M1 — Adapter registry

**Reference code (`src/lib/import/parsers/registry.js`):**

```js
const adapters = new Map();

export function registerParser(id, adapter) {
  adapters.set(id, adapter);
}

export function getParser(id) {
  return adapters.get(id);
}

export async function detectAndParse(content, hint) {
  // If hint provided, try that first.
  if (hint && adapters.has(hint)) {
    const adapter = adapters.get(hint);
    if (await adapter.detect(content)) return adapter.parse(content);
  }
  // Otherwise try all in priority order.
  for (const [id, adapter] of adapters) {
    if (await adapter.detect(content)) return adapter.parse(content);
  }
  throw new Error("No parser detected format");
}

export function listParsers() {
  return Array.from(adapters.keys());
}
```

**Acceptance criteria:** register; detect; parse; list.

### M2 — Hermes parser

**Reference code (`src/lib/import/parsers/hermesParser.js`):**

```js
import { registerParser } from "./registry.js";

// Format must be validated against the real Hermes install — this is a proposal.
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
      // Hermes session format: { type: "user|assistant|tool", message: {...}, metadata: {...} }.
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

**Acceptance criteria:** detect; parse; register.

### M3 — Cursor parser (protobuf-aware)

**Reference code (`src/lib/import/parsers/cursorParser.js`):**

```js
import { registerParser } from "./registry.js";
// Real cursor decode exports from open-sse/utils/cursorProtobuf.js:
// decodeMessage(data), parseConnectRPCFrame(buffer), extractTextFromResponse(payload).
import { decodeMessage, extractTextFromResponse } from "open-sse/utils/cursorProtobuf.js";

const cursorParser = {
  id: "cursor",
  async detect(content) {
    // Cursor logs are binary protobuf frames or JSONL with cursor markers.
    return content.includes("cursor") || content.includes("connect.rpc");
  },
  async parse(content) {
    const messages = [];
    for (const line of content.trim().split("\n")) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.payload) {
          const decoded = decodeMessage(obj.payload);
          const text = extractTextFromResponse(decoded);
          messages.push({
            model: obj.model ?? "cursor",
            response: { content: text },
            timestamp: obj.timestamp ?? new Date().toISOString(),
            status: "success",
            sourceSessionId: obj.sessionId ?? null,
            metadata: { cursor: true },
          });
        }
      } catch {
        // skip non-JSON lines
      }
    }
    return messages;
  },
};

registerParser("cursor", cursorParser);
```

**Acceptance criteria:** detect; decode; parse.

### M4 — OpenAI fallback + tests

**Reference code (`src/lib/import/parsers/openaiParser.js`):**

```js
import { registerParser } from "./registry.js";

// OpenAI-compatible fallback: { model, request, response, ... }.
const openaiParser = {
  id: "openai",
  async detect(content) {
    const line = content.trim().split("\n")[0];
    try {
      const obj = JSON.parse(line);
      return !!obj.model && (!!obj.request || !!obj.response);
    } catch {
      return false;
    }
  },
  async parse(content) {
    return content.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  },
};

registerParser("openai", openaiParser);
```

**Files touched:** `src/lib/import/parsers/registry.js` (new), `src/lib/import/parsers/hermesParser.js` (new), `src/lib/import/parsers/cursorParser.js` (new), `src/lib/import/parsers/openaiParser.js` (new), `src/app/api/messages/import/route.js` (detectAndParse hook), `tests/unit/import-parsers.test.js` (new).

**Acceptance criteria:** fallback; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| External formats | Unknown shapes | Validate against installs |
| Protobuf decode | Wrong exports | Use real cursorProtobuf |
| Parser priority | Wrong parse | Hint-first |
| Malformed lines | Parse errors | try/catch skip |

## Verification

- Unit: registerParser, getParser, detectAndParse, listParsers, hermesParser, cursorParser, openaiParser
- Manual: feed sample logs → verify parse
- Regression: `tests/__baseline__/verify-no-regression.mjs`