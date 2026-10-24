# Implementation Plan 42 — Configuration System Overhaul — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #config #schema #validation #env-contract #ui-parity #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`src/lib/db/repos/settingsRepo.js` `DEFAULT_SETTINGS` — new keys must be added there; `.env.example` env contract; `open-sse/config/` constants; dashboard settings pages; the CLAUDE.md note that file-based and UI config must stay in sync).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — load config with bad values, confirm validation errors; edit in UI, confirm file parity.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-42-config-system-overhaul.md`, `../research/9router/impl-plan-22-config-system.md` (if present), `../research/9router/47-branch-9router-internal-threads.md`.

## Scope

**In scope:** single unified config schema (env → file → UI precedence); load-time validation with clear errors; cross-field validation; auto-generated env docs from schema; UI ↔ file parity enforcement; config export/import (portable JSON).
**Out of scope:** runtime hot-reload of all settings (only safe subset); secrets vault integration.

## Milestones

### M1 — Unified config schema

**Reference code (`src/lib/config/schema.js`):**

```js
// Single source of truth for config: env vars, file config, and UI settings.
// Each entry: { key, source: "env"|"file"|"ui", type, default, envVar?, validate? }
export const CONFIG_SCHEMA = [
  { key: "port", source: "env", type: "number", default: 20128, envVar: "PORT" },
  { key: "hostname", source: "env", type: "string", default: "0.0.0.0", envVar: "HOSTNAME" },
  { key: "jwtSecret", source: "env", type: "string", required: true, envVar: "JWT_SECRET" },
  { key: "initialPassword", source: "env", type: "string", default: "123456", envVar: "INITIAL_PASSWORD" },
  { key: "apiKeySecret", source: "env", type: "string", required: true, envVar: "API_KEY_SECRET" },
  { key: "machineIdSalt", source: "env", type: "string", required: true, envVar: "MACHINE_ID_SALT" },
  { key: "dataDir", source: "env", type: "string", envVar: "DATA_DIR" },
  { key: "rateLimitWindowMs", source: "ui", type: "number", default: 60_000 },
  { key: "rateLimitGeneral", source: "ui", type: "number", default: 120 },
  { key: "rateLimitChat", source: "ui", type: "number", default: 20 },
  { key: "defaultModel", source: "ui", type: "string", default: "gpt-4o-mini" },
  { key: "logLevel", source: "ui", type: "enum", default: "info", values: ["debug", "info", "warn", "error"] },
];

export function getSchemaEntry(key) {
  return CONFIG_SCHEMA.find((e) => e.key === key);
}
```

**Reference code (`src/lib/config/load.js`):**

```js
import { CONFIG_SCHEMA } from "./schema.js";

// Precedence: env > file > UI > default.
export async function loadConfig({ env = process.env, fileConfig = null, uiSettings = {} } = {}) {
  const out = {};
  const errors = [];
  for (const entry of CONFIG_SCHEMA) {
    let value;
    if (entry.source === "env" && entry.envVar && env[entry.envVar] !== undefined) value = env[entry.envVar];
    else if (fileConfig && fileConfig[entry.key] !== undefined) value = fileConfig[entry.key];
    else if (uiSettings[entry.key] !== undefined) value = uiSettings[entry.key];
    else value = entry.default;

    if (value === undefined && entry.required) {
      errors.push(`Missing required config: ${entry.key} (${entry.envVar ?? "no env var"})`);
      continue;
    }
    if (value !== undefined) {
      const coerced = coerce(entry, value);
      if (coerced.error) { errors.push(coerced.error); continue; }
      out[entry.key] = coerced.value;
    }
  }
  return { config: out, errors };
}

function coerce(entry, value) {
  switch (entry.type) {
    case "number": {
      const n = Number(value);
      if (Number.isNaN(n)) return { error: `${entry.key}: expected number, got "${value}"` };
      return { value: n };
    }
    case "boolean": {
      if (value === true || value === "true" || value === "1") return { value: true };
      if (value === false || value === "false" || value === "0") return { value: false };
      return { error: `${entry.key}: expected boolean, got "${value}"` };
    }
    case "enum": {
      if (!entry.values.includes(value)) return { error: `${entry.key}: expected one of ${entry.values.join(", ")}, got "${value}"` };
      return { value };
    }
    default:
      return { value };
  }
}
```

**Acceptance criteria:** precedence works; required missing → error list; types coerced/validated.

### M2 — Load-time validation + cross-field checks

**Reference code (`src/lib/config/validate.js`):**

```js
import { loadConfig } from "./load.js";

export async function validateConfig() {
  const { config, errors } = await loadConfig();
  // Cross-field validation.
  if (config.rateLimitChat > config.rateLimitGeneral) {
    errors.push("rateLimitChat must be <= rateLimitGeneral");
  }
  if (config.port < 1 || config.port > 65535) {
    errors.push(`port out of range: ${config.port}`);
  }
  return { ok: errors.length === 0, config, errors };
}

// Call at startup (instrumentation.js or custom-server.js) — fail fast on hard errors,
// warn on soft errors.
```

**Acceptance criteria:** startup validates; hard errors fail fast; soft errors warn with clear message.

### M3 — Auto-generated env docs

**Reference code (`scripts/gen-env-docs.mjs`):**

```js
// Generates .env.example + docs/env.md from CONFIG_SCHEMA.
import { CONFIG_SCHEMA } from "../src/lib/config/schema.js";

const lines = ["# Auto-generated from src/lib/config/schema.js — do not edit by hand", ""];
for (const entry of CONFIG_SCHEMA.filter((e) => e.source === "env")) {
  const required = entry.required ? " (REQUIRED)" : "";
  lines.push(`# ${entry.key}${required} — default: ${entry.default ?? "none"}`);
  lines.push(`${entry.envVar}=${entry.default ?? ""}`);
  lines.push("");
}
// Write .env.example (and docs/env.md with the same content in a code block).
```

**Acceptance criteria:** `.env.example` regenerated from schema; docs/env.md matches; CI check that they're in sync.

### M4 — UI parity + export/import + tests

**Reference code (`src/lib/config/parity.js`):**

```js
// Parity check: every UI-editable config key must have a settings UI control.
import { CONFIG_SCHEMA } from "./schema.js";
import { getSettings } from "@/lib/db/repos/settingsRepo.js";

export async function checkParity() {
  const settings = await getSettings();
  const uiKeys = CONFIG_SCHEMA.filter((e) => e.source === "ui").map((e) => e.key);
  const missing = uiKeys.filter((k) => !(k in settings));
  return { uiKeys: uiKeys.length, missing, ok: missing.length === 0 };
}

// Export/import: portable JSON of all UI config.
export async function exportConfig() {
  const settings = await getSettings();
  return { version: 1, exportedAt: new Date().toISOString(), settings };
}

export async function importConfig(json) {
  if (json.version !== 1) throw new Error("Unsupported config version");
  // Validate every key against schema before writing.
  const { setSettings } = await import("@/lib/db/repos/settingsRepo.js");
  await setSettings(json.settings);
  return { imported: Object.keys(json.settings).length };
}
```

**Files touched:** `src/lib/config/` (new: schema, load, validate, parity), `.env.example` (generated), dashboard settings (extend: export/import buttons + parity warnings), `tests/unit/config.test.js` (new).

**Acceptance criteria:** parity check passes; export/import round-trips; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Existing settings spread | Migration churn | Backward-compatible reads |
| Env vs UI conflicts | Surprise precedence | Documented precedence + parity tests |
| Validation friction | Startup failures | Hard vs soft error split |
| Schema drift | Stale docs | Generation + CI sync check |

## Verification

- Unit: schema, load, validate, parity, export/import
- Manual: bad env → clear startup error; UI edit → file parity
- Regression: `tests/__baseline__/verify-no-regression.mjs`