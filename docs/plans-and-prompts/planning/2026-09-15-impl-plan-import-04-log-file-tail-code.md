# Implementation Plan Import-04 — Log File Tail & Parsers — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #log-file #parser #watcher #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (**`usage.json` is LEGACY** — `src/lib/db/paths.js` `LEGACY_FILES.usage`; **`appendRequestLog` is a NO-OP** — `src/lib/db/repos/usageRepo.js` line 744; live log source is the `usageHistory` table; data dir from `@/lib/dataDir.js`; boot hook from `src/instrumentation.js` `register()`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — watcher; parsers; sync state.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-04-log-file-tail.md`, `../research/9router/impl-plan-import-05-hermes-hook.md`, `../research/9router/impl-plan-import-03-import-api.md`.

## Scope

**In scope:** file watcher (fs.watch); JSONL parser; incremental sync (last-read position); rotation handling.
**Out of scope:** Hermes hook (import-05); import API (import-03).

## Milestones

### M1 — Sync state

**Reference code (`src/lib/import/syncState.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// Track last-read position per file.
export function getLastSyncPosition(filePath) {
  const db = getAdapter();
  const row = db.get(`SELECT position FROM import_sync_state WHERE file_path = ?`, [filePath]);
  return row?.position ?? 0;
}

export function setLastSyncPosition(filePath, position) {
  const db = getAdapter();
  db.run(
    `INSERT INTO import_sync_state (file_path, position, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(file_path) DO UPDATE SET position = excluded.position, updated_at = excluded.updated_at`,
    [filePath, position, new Date().toISOString()],
  );
}
```

**Acceptance criteria:** position persisted; upsert works.

### M2 — File watcher

**Reference code (`src/lib/import/logWatcher.js`):**

```js
import fs from "node:fs";
import path from "node:path";
import { importFromLine } from "./logParsers.js";
import { insertImportedMessages } from "@/lib/db/repos/importedMessagesRepo.js";
import { getLastSyncPosition, setLastSyncPosition } from "./syncState.js";

// NOTE: usage.json/log.txt are LEGACY — the live source is the usageHistory
// table. Watch external agent logs instead:
//   ~/.hermes/logs/messages.jsonl, ~/.claude/projects/**/*.jsonl, etc.
const WATCHED_FILES = [
  // { path: "~/.hermes/logs/messages.jsonl", format: "jsonl", source: "hermes" },
  // { path: "~/.claude/logs/conversations.jsonl", format: "jsonl", source: "claude-code" },
];

export function startLogWatcher(config = {}) {
  const files = config.files || WATCHED_FILES;
  for (const file of files) {
    const resolved = path.resolve(file.path.replace(/^~/, process.env.HOME || ""));
    if (!fs.existsSync(resolved)) continue;

    // Initial read: start from current end (don't re-import history).
    const lastPos = getLastSyncPosition(resolved);
    if (lastPos === 0) {
      setLastSyncPosition(resolved, fs.statSync(resolved).size);
    }

    fs.watch(resolved, { persistent: false }, async (eventType) => {
      if (eventType !== "change") return;
      await readNewLines(resolved, file);
    });
  }
}

async function readNewLines(filePath, fileConfig) {
  const lastPos = getLastSyncPosition(filePath);
  const stat = fs.statSync(filePath);

  // Handle file rotation: size shrank → reset to 0.
  if (stat.size < lastPos) {
    setLastSyncPosition(filePath, 0);
    return;
  }
  if (stat.size === lastPos) return;

  const stream = fs.createReadStream(filePath, { start: lastPos, encoding: "utf8" });
  let buffer = "";
  const messages = [];

  stream.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const msg = importFromLine(line, fileConfig);
      if (msg) messages.push(msg);
    }
  });

  stream.on("end", async () => {
    setLastSyncPosition(filePath, stat.size);
    if (messages.length > 0) {
      await insertImportedMessages(messages);
    }
  });
}
```

**Acceptance criteria:** watcher starts; rotation handled; position advanced.

### M3 — Parsers

**Reference code (`src/lib/import/logParsers.js`):**

```js
// Parse a single line from a watched file.
export function importFromLine(line, fileConfig) {
  if (!line || !line.trim()) return null;
  try {
    const parsed = JSON.parse(line);
    // JSONL shape varies by source; normalize common fields.
    return {
      source: fileConfig.source ?? "log-file",
      model: parsed.model ?? parsed.request?.model ?? null,
      timestamp: parsed.timestamp ?? parsed.created_at ?? new Date().toISOString(),
      request: parsed.request ?? null,
      response: parsed.response ?? null,
      status: parsed.status ?? (parsed.error ? "error" : "success"),
      latencyMs: parsed.latencyMs ?? parsed.latency_ms ?? null,
      conversationId: parsed.conversationId ?? parsed.session_id ?? null,
      sourceApp: parsed.sourceApp ?? fileConfig.source ?? "log-file",
    };
  } catch {
    return null; // skip non-JSON lines
  }
}
```

**Acceptance criteria:** JSONL parsed; non-JSON skipped; normalized shape.

### M4 — Boot hook + tests

**Reference code (`src/instrumentation.js` addition):**

```js
// Start the log watcher alongside existing boot hooks.
import { startLogWatcher } from "@/lib/import/logWatcher.js";

export async function register() {
  // ...existing hooks (startMarkdownLogFlusher, startSrComboCleanup, startModelCatalogSync)...
  try {
    startLogWatcher();
  } catch (err) {
    console.error("[import] log watcher failed to start:", err);
  }
}
```

**Files touched:** `src/lib/import/syncState.js` (new), `src/lib/import/logWatcher.js` (new), `src/lib/import/logParsers.js` (new), `src/instrumentation.js` (boot hook), `src/lib/db/migrations/005-imported-messages.js` (add `import_sync_state` table), `tests/unit/import-log-watcher.test.js` (new).

**Acceptance criteria:** boot hook; fail-open; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| External log formats | Unknown shapes | Discover from installs |
| File rotation | Missed lines | Size check |
| Watcher races | Duplicate imports | Position tracking |
| Boot failures | Crash | Fail-open try/catch |

## Verification

- Unit: getLastSyncPosition, setLastSyncPosition, startLogWatcher, readNewLines, importFromLine
- Manual: append lines → watch → import
- Regression: `tests/__baseline__/verify-no-regression.mjs`