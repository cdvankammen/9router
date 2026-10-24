# Implementation Plan 48 — Plugin System & Extensibility — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #plugins #extensibility #hooks #sandbox #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (request lifecycle in `src/sse/handlers/chat.js` → `open-sse/handlers/chatCore.js` → executors; the `skills/` directory which already has a plugin-like structure; `open-sse/translator/` self-registration pattern; `src/lib/events/bus.js` from plan 37).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — load a plugin, hit its hooks, test timeout + fail-open, disable/enable via dashboard.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-48-plugin-system-extensibility.md`, `../research/9router/impl-plan-14-message-driven-tools.md`, `../research/9router/impl-plan-10-security.md`.

## Scope

**In scope:** stable hook points (pre-parse, post-parse, pre-translate, post-translate, pre-select, post-select, fallback, pre-stream, post-stream, error, startup, shutdown, config-change); plugin manifest (name, version, hooks, permissions); plugin loader with sandbox (Worker/VM); enable/disable + per-plugin config; permissions (network, DB, files); execution timeouts; fail-open behavior.
**Out of scope:** plugin marketplace; remote plugin loading; hot-reload without restart.

## Milestones

### M1 — Hook points + plugin manifest

**Reference code (`src/lib/plugins/hooks.js`):**

```js
// Stable hook points — call sites must use these names exactly.
export const HOOKS = {
  // Request lifecycle
  "request:pre-parse": ["request", "context"],
  "request:post-parse": ["request", "context"],
  "request:pre-translate": ["request", "context"],
  "request:post-translate": ["request", "context"],
  // Routing
  "routing:pre-select": ["candidates", "context"],
  "routing:post-select": ["selected", "context"],
  "routing:fallback": ["error", "candidates", "context"],
  // Response
  "response:pre-stream": ["stream", "context"],
  "response:post-stream": ["stream", "context"],
  "response:error": ["error", "context"],
  // Lifecycle
  "app:startup": ["config"],
  "app:shutdown": [],
  "config:change": ["oldConfig", "newConfig"],
};

// Plugin manifest schema.
export const MANIFEST_SCHEMA = {
  name: { type: "string", required: true },
  version: { type: "string", required: true },
  hooks: { type: "object", required: true }, // { "hook:name": async (args) => modifiedArgs }
  permissions: { type: "array", items: { type: "string", enum: ["network", "db", "files", "config"] }, default: [] },
  timeoutMs: { type: "number", default: 5000 },
  failOpen: { type: "boolean", default: true },
};
```

**Acceptance criteria:** hook names stable; manifest validates; call sites documented.

### M2 — Plugin loader + sandbox

**Reference code (`src/lib/plugins/loader.js`):**

```js
import { Worker } from "node:worker_threads";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load a plugin from a directory (manifest.json + index.js).
export async function loadPlugin(pluginDir) {
  const manifestPath = resolve(pluginDir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  // Validate manifest against MANIFEST_SCHEMA (omitted for brevity).

  // Sandbox: run plugin in a Worker with limited globals.
  const worker = new Worker(resolve(pluginDir, "index.js"), {
    eval: false,
    workerData: { manifest, permissions: manifest.permissions ?? [] },
  });

  const plugin = {
    manifest,
    worker,
    hooks: {},
    async callHook(name, args) {
      if (!this.hooks[name]) return args; // no handler
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (manifest.failOpen) resolve(args);
          else reject(new Error(`Plugin ${manifest.name} timeout on ${name}`));
        }, manifest.timeoutMs ?? 5000);
        this.worker.postMessage({ type: "hook", name, args });
        this.worker.once("message", (msg) => {
          clearTimeout(timeout);
          if (msg.error) { if (manifest.failOpen) resolve(args); else reject(new Error(msg.error)); }
          else resolve(msg.result);
        });
      });
    },
  };

  // Register hook handlers from plugin's exported map.
  // Plugin index.js must export: export const hooks = { "hook:name": async (args) => ... };
  // The worker receives this via message port — simplified here.
  return plugin;
}
```

**Acceptance criteria:** plugin loads in Worker; hooks callable; timeout enforced; fail-open works.

### M3 — Plugin management + config

**Reference code (migration `src/lib/db/migrations/20260915-plugins.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS plugins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      version TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      config_json TEXT NOT NULL DEFAULT '{}',
      manifest_json TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS plugins"); };
```

```js
// src/lib/db/repos/pluginRepo.js
export async function listPlugins(db) {
  return db.all("SELECT id, name, version, enabled, config_json, manifest_json FROM plugins ORDER BY name");
}

export async function setPluginEnabled(db, name, enabled) {
  db.run("UPDATE plugins SET enabled = ?, updated_at = datetime('now') WHERE name = ?", [enabled ? 1 : 0, name]);
}

export async function setPluginConfig(db, name, config) {
  db.run("UPDATE plugins SET config_json = ?, updated_at = datetime('now') WHERE name = ?", [JSON.stringify(config), name]);
}
```

**Acceptance criteria:** plugins listed; enable/disable persists; config persists.

### M4 — Integration + safety + tests

**Reference code (integration in `src/sse/handlers/chat.js`):**

```js
// At each hook point, call enabled plugins in order.
import { getAdapter } from "@/lib/db/driver.js";
import { listPlugins } from "@/lib/db/repos/pluginRepo.js";
import { loadPlugin } from "@/lib/plugins/loader.js";

let pluginCache = null;
export async function getPlugins() {
  if (pluginCache) return pluginCache;
  const db = getAdapter();
  const rows = await listPlugins(db);
  pluginCache = await Promise.all(
    rows.filter((r) => r.enabled).map(async (r) => {
      const plugin = await loadPlugin(r.path);
      plugin.config = JSON.parse(r.config_json ?? "{}");
      return plugin;
    })
  );
  return pluginCache;
}

export async function runHook(name, args, context = {}) {
  const plugins = await getPlugins();
  let result = args;
  for (const plugin of plugins) {
    result = await plugin.callHook(name, { ...result, ...context, pluginConfig: plugin.config });
  }
  return result;
}
```

**Files touched:** `src/lib/plugins/` (new: hooks, loader), `src/lib/db/migrations/20260915-plugins.js` (new), `src/lib/db/repos/pluginRepo.js` (new), `src/sse/handlers/chat.js` (hook calls), `src/app/api/v1/plugins/route.js` (new), dashboard plugins page (new), `tests/unit/plugins.test.js` (new).

**Acceptance criteria:** hooks fire in order; plugin errors don't break requests (fail-open); dashboard manages plugins.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Worker sandbox | Platform limits | Fallback to VM2 or eval with timeout |
| API instability | Breaking plugins | Versioned manifest + semver |
| Performance | Hook overhead | Async + timeout; skip if no plugins |
| Debugging | Opaque failures | Per-plugin logs + structured errors |

## Verification

- Unit: loader, sandbox, timeout, fail-open
- Manual: install sample plugin → hook fires → disable → hook skipped
- Regression: `tests/__baseline__/verify-no-regression.mjs`