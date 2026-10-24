# Implementation Plan 04: Log File Tail & Parsers

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, log-file, parser, watcher

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-a-log-capture.md` (A2 — log file tail)
- `../2026-09-17-hermes-import-branch-f-proxy-intercept.md` (alternative when proxying isn't possible)
- `../2026-09-17-hermes-import-branch-n-migration-backward-compatibility.md` (persistent sync position survives restart)

## Goal

Watch and parse external agent log files (Hermes, Claude Code, usage.json, log.txt) to import messages without requiring agent configuration changes.

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| **`usage.json` is LEGACY** | `src/lib/db/paths.js` — `LEGACY_FILES.usage = path.join(DATA_DIR, "usage.json")`; it's a migration source, not a live file |
| **`appendRequestLog` is a NO-OP** | `src/lib/db/repos/usageRepo.js` line 744: `export async function appendRequestLog() {}` — "request log is now derived from usageHistory table on read" |
| Live log source | `usageHistory` table (SQLite) — `getRecentLogs` reads `SELECT timestamp, provider, model, connectionId, promptTokens, completionTokens, status, tokens FROM usageHistory ORDER BY id DESC` |
| Data dir | `DATA_DIR` from `@/lib/dataDir.js` (NOT hardcoded `~/.9router`) — `paths.js` joins `DATA_DIR/db/data.sqlite` |
| Boot hook | `src/instrumentation.js` `register()` — already starts `startMarkdownLogFlusher`, `startSrComboCleanup`, `startModelCatalogSync`; a watcher would start here |
| Adapter API | `db.run/get/all/exec` positional params — no `.prepare()` |
| Hermes/Claude logs | External paths (`~/.hermes/...`, `~/.claude/...`) — NOT in this repo; formats must be discovered from the actual agent installs |

## Scope

- File watcher (chokidar/fs.watch)
- JSONL parser
- SQLite reader
- Incremental sync (track last-read position)

## Design

### 1. File Watcher — `src/lib/import/logWatcher.js`

**Purpose:** Watch configured files for appends, parse new lines, import them.

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `startLogWatcher(config)` | Register watchers for each configured file | void |
| `readNewLines(filePath, fileConfig)` | Stream from last position, parse, import | void |
| `handleRotation(filePath, stat)` | Detect truncation/rotation → reset position | boolean |

```javascript
// src/lib/import/logWatcher.js
// SUGGESTION ONLY — review against actual codebase before implementing
import fs from "node:fs";
import path from "node:path";
import { importFromLine } from "./logParsers.js";
import { insertImportedMessages } from "@/lib/db/repos/importedMessagesRepo.js";
import { getLastSyncPosition, setLastSyncPosition } from "./syncState.js";

// NOTE: usage.json/log.txt are LEGACY (see Grounding) — the live source is
// the usageHistory table. Watch external agent logs instead:
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

    // Initial read: start from current end (don't re-import history)
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

  // Handle file rotation: size shrank → reset to 0
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

**⚠️ GROUNDING FIXES (original plan was wrong):**
1. Watched `~/.9router/usage.json` + `log.txt` — **legacy files, no longer written** (`appendRequestLog` is a no-op). The live source is the `usageHistory` table. Watching those files would import nothing.
2. Used in-memory `positions` Map — lost on restart. Use the `import_sync_state` table (persistent).
3. Hardcoded `~/.9router` — real data dir is `DATA_DIR` from `@/lib/dataDir.js`.

### 2. Parsers — `src/lib/import/logParsers.js`

**Purpose:** Parse one line of an agent log into a canonical message.

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `importFromLine(line, fileConfig)` | JSON.parse + normalize | message or null |
| `normalizeLogEntry(entry, source)` | Map agent-specific shapes to canonical | message or null |

```javascript
// src/lib/import/logParsers.js
// SUGGESTION ONLY — review against actual codebase before implementing
export function importFromLine(line, fileConfig) {
  if (!line.trim()) return null;
  try {
    const parsed = JSON.parse(line);
    return normalizeLogEntry(parsed, fileConfig.source);
  } catch {
    return null; // skip malformed lines
  }
}

function normalizeLogEntry(entry, source) {
  // Handle different log formats
  if (entry.model && entry.prompt !== undefined) {
    // Generic format: {timestamp, model, prompt, completion, tokens, cost}
    return {
      timestamp: entry.timestamp || new Date().toISOString(),
      model: entry.model,
      request: { messages: [{ role: "user", content: entry.prompt }] },
      response: { choices: [{ message: { role: "assistant", content: entry.completion } }] },
      promptTokens: entry.prompt_tokens || entry.tokens?.input,
      completionTokens: entry.completion_tokens || entry.tokens?.output,
      status: entry.error ? "error" : "success",
      error: entry.error,
      source,
      conversationId: entry.conversation_id || entry.session_id,
    };
  }
  if (entry.request && entry.response) {
    // Already in import format
    return { ...entry, source };
  }
  return null;
}
```

### 3. Sync State — `src/lib/import/syncState.js`

**Purpose:** Persist per-file read positions so restarts resume (not re-import).

**⚠️ GROUNDING FIX:** Original used `db.prepare(...)` — adapter has no `.prepare()`. Use `db.run(sql, params[])`.

```javascript
// src/lib/import/syncState.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { getAdapter } from "@/lib/db/driver.js";

export async function getLastSyncPosition(filePath) {
  const db = await getAdapter();
  const row = db.get("SELECT position FROM import_sync_state WHERE file_path = ?", [filePath]);
  return row?.position || 0;
}

export async function setLastSyncPosition(filePath, position) {
  const db = await getAdapter();
  db.run(`
    INSERT INTO import_sync_state (file_path, position, updated_at)
    VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    ON CONFLICT(file_path) DO UPDATE SET position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  `, [filePath, position, position]);
}
```

### 4. `import_sync_state` table migration

**Purpose:** Persist watcher positions. Add to plan 01's migration (or a separate `007-import-sync-state.js`).

```javascript
// src/lib/db/migrations/007-import-sync-state.js
// SUGGESTION ONLY
export default {
  version: 7,
  name: "import-sync-state",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS import_sync_state (
        file_path TEXT PRIMARY KEY,
        position INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )
    `);
    console.log("[DB][migrate:007] import_sync_state table created");
  },
};
```

### 5. Boot hook — `src/instrumentation.js`

**Purpose:** Start the watcher at server boot, alongside the existing flusher/cleanup/sync starters.

```javascript
// src/instrumentation.js (addition inside register(), NEXT_RUNTIME === "nodejs")
try {
  const { startLogWatcher } = await import("@/lib/import/logWatcher.js");
  startLogWatcher();
} catch (err) {
  console.error("[LogWatcher] start failed:", err?.message || err);
}
```

## Steps (per-part instructions)

### Step 1 — Create `src/lib/import/logWatcher.js`
1. Create the file with `startLogWatcher` + `readNewLines`.
2. **Verify:** `node -e "import('./src/lib/import/logWatcher.js').then(m => console.log(typeof m.startLogWatcher))"` → `function`.

### Step 2 — Create `src/lib/import/logParsers.js`
1. Create the file with `importFromLine` + `normalizeLogEntry`.
2. **Verify:** `importFromLine('{"model":"gpt-4o","prompt":"hi","completion":"hello"}', { source: 'hermes' })` → canonical message.

### Step 3 — Create `src/lib/import/syncState.js`
1. Create the file.
2. **Verify:** `setLastSyncPosition('/tmp/x.jsonl', 42)` then `getLastSyncPosition('/tmp/x.jsonl')` → `42`.

### Step 4 — Add `import_sync_state` migration
1. Create `007-import-sync-state.js` (or fold into plan 01).
2. Register in `migrations/index.js`.
3. **Verify:** `latestVersion()` returns 7.

### Step 5 — Start watcher in `src/instrumentation.js`
1. Add the boot hook.
2. **Verify:** server starts without errors; watcher logs no failures.

### Step 6 — Test with synthetic log file
1. Create `/tmp/test-agent-log.jsonl`, append 3 lines, run watcher, verify 3 messages imported.
2. Append 2 more lines → only 2 new imported (position tracking works).
3. Truncate file → position resets, continues.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| fs.watch | Platform differences | Fallback to polling (1s interval) |
| File rotation | Position invalid | Detect size decrease → reset |
| Malformed lines | Parse errors | Skip + log, don't crash |
| Large files | Memory | Stream, don't read whole file |
| External agent log formats | Unknown shapes | Discover from actual installs; parser per agent |

## Verification (commands)

```bash
# Synthetic append test
node -e "
import('./src/lib/import/logParsers.js').then(m => {
  const line = JSON.stringify({ model: 'gpt-4o', prompt: 'hi', completion: 'hello', tokens: { input: 10, output: 5 } });
  console.log(m.importFromLine(line, { source: 'hermes' }));
})"
# Expect: canonical message with promptTokens 10, completionTokens 5
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.