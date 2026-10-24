# Implementation Plan 51 — Model Aliases & Virtual Models — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #model-aliases #virtual-models #abstraction #resolution #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (model name handling in `src/sse/handlers/chat.js`; `open-sse/config/providerModels.js`; `/v1/models` endpoint; usage tracking in `src/lib/usageDb.js`; alias regression baselines in `tests/__baseline__/` — the summary notes alias logic has baseline checks).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — create aliases incl. virtual models, resolve at request time, check cycle detection, confirm usage attribution.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-51-model-aliases-virtual.md`, `../research/9router/impl-plan-05-gateway-interop.md`, `../research/9router/impl-plan-44-dynamic-combo-autoswitch.md`.

## Scope

**In scope:** alias model (static 1:1 + dynamic strategy-based); virtual models (best-quality, cheapest, fastest, balanced) resolving to strategies; alias CRUD via API + dashboard; cycle detection; aliases exposed via `/v1/models`; usage tracked by resolved model + alias; resolution telemetry.
**Out of scope:** alias sharing across users (multi-tenant); wildcard aliases.

## Milestones

### M1 — Alias model + resolution

**Reference code (migration `src/lib/db/migrations/20260915-aliases.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alias TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'static',   -- static | virtual
      target TEXT,                            -- static: model name
      strategy TEXT,                          -- virtual: best-quality | cheapest | fastest | balanced
      fallback_chain_json TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS model_aliases"); };
```

```js
// src/lib/db/repos/aliasRepo.js
export async function listAliases(db) {
  return db.all("SELECT * FROM model_aliases ORDER BY alias");
}
export async function getAlias(db, alias) {
  return db.get("SELECT * FROM model_aliases WHERE alias = ?", [alias]);
}
export async function upsertAlias(db, { alias, type, target, strategy, fallbackChain = [], enabled = 1 }) {
  db.run(`
    INSERT INTO model_aliases (alias, type, target, strategy, fallback_chain_json, enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(alias) DO UPDATE SET
      type = excluded.type, target = excluded.target, strategy = excluded.strategy,
      fallback_chain_json = excluded.fallback_chain_json, enabled = excluded.enabled,
      updated_at = datetime('now')
  `, [alias, type, target ?? null, strategy ?? null, JSON.stringify(fallbackChain), enabled]);
}
```

**Acceptance criteria:** aliases persisted; static + virtual types; upsert idempotent.

### M2 — Virtual model resolution

**Reference code (`src/lib/aliases/resolve.js`):**

```js
import { getAlias } from "@/lib/db/repos/aliasRepo.js";
import { getAdapter } from "@/lib/db/driver.js";

// Resolve an alias to a concrete model at request time.
export async function resolveModel(db, requestedModel, { conditions = {} } = {}) {
  const alias = await getAlias(db, requestedModel);
  if (!alias || !alias.enabled) return { model: requestedModel, alias: null, strategy: null };

  if (alias.type === "static") {
    return { model: alias.target, alias: requestedModel, strategy: null };
  }

  // Virtual: pick from strategy over the fallback chain.
  const chain = JSON.parse(alias.fallback_chain_json ?? "[]");
  const chosen = pickByStrategy(alias.strategy, chain, conditions);
  return { model: chosen ?? chain[0] ?? requestedModel, alias: requestedModel, strategy: alias.strategy };
}

function pickByStrategy(strategy, chain, conditions) {
  if (!chain.length) return null;
  switch (strategy) {
    case "cheapest": {
      const sorted = [...chain].sort((a, b) => (conditions.pricing?.[a] ?? 1) - (conditions.pricing?.[b] ?? 1));
      return sorted[0];
    }
    case "fastest": {
      const sorted = [...chain].sort((a, b) => (conditions.latency?.[a] ?? 1e9) - (conditions.latency?.[b] ?? 1e9));
      return sorted[0];
    }
    case "best-quality": {
      // Quality ranking from settings (qualityRanking) — fall back to chain order.
      const ranking = conditions.qualityRanking ?? [];
      for (const m of ranking) if (chain.includes(m)) return m;
      return chain[0];
    }
    case "balanced":
    default:
      return chain[0];
  }
}
```

**Acceptance criteria:** static aliases resolve 1:1; virtuals pick by strategy; unknown alias passes through unchanged.

### M3 — Cycle detection + management API

**Reference code (`src/lib/aliases/validate.js`):**

```js
// Cycle detection: aliases must not form a chain (alias → alias).
export function detectCycles(aliases) {
  const byAlias = new Map(aliases.map((a) => [a.alias, a]));
  const visited = new Set();
  const stack = new Set();
  const cycles = [];

  const visit = (alias) => {
    if (stack.has(alias)) { cycles.push(alias); return; }
    if (visited.has(alias)) return;
    visited.add(alias);
    stack.add(alias);
    const a = byAlias.get(alias);
    if (a?.type === "static" && byAlias.has(a.target)) visit(a.target);
    stack.delete(alias);
  };

  for (const a of aliases) visit(a.alias);
  return cycles;
}
```

**Reference code (`src/app/api/v1/aliases/route.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { listAliases, upsertAlias, getAlias } from "@/lib/db/repos/aliasRepo.js";
import { detectCycles } from "@/lib/aliases/validate.js";

export async function GET() {
  const db = getAdapter();
  return Response.json({ aliases: await listAliases(db) });
}

export async function POST(req) {
  const db = getAdapter();
  const body = await req.json();
  const cycles = detectCycles([...(await listAliases(db)), body]);
  if (cycles.length) return Response.json({ error: `alias cycle detected: ${cycles.join(" -> ")}` }, { status: 400 });
  await upsertAlias(db, body);
  return Response.json({ ok: true, alias: await getAlias(db, body.alias) });
}
```

**Acceptance criteria:** cycles rejected with clear error; CRUD works; dashboard functional.

### M4 — API exposure + usage attribution + tests

**Reference code (`src/lib/aliases/integrate.js`):**

```js
// Usage attribution: record both resolved model and alias.
export async function recordUsageWithAlias(db, { resolvedModel, alias, usage, cost }) {
  const { recordUsage } = await import("@/lib/usageDb.js");
  await recordUsage({ model: resolvedModel, alias: alias ?? null, usage, cost });
}

// /v1/models exposure: include aliases alongside real models.
export async function modelsWithAliases(db, realModels) {
  const aliases = await listAliases(db);
  const virtual = aliases.filter((a) => a.enabled).map((a) => ({
    id: a.alias,
    object: "model",
    created: Math.floor(new Date(a.created_at).getTime() / 1000),
    owned_by: "9router-alias",
    virtual: a.type === "virtual",
  }));
  return [...realModels, ...virtual];
}
```

**Files touched:** `src/lib/aliases/` (new: resolve, validate, integrate), `src/lib/db/migrations/20260915-aliases.js` (new), `src/lib/db/repos/aliasRepo.js` (new), `src/sse/handlers/chat.js` (resolution integration), `src/app/api/v1/aliases/route.js` (new), `/v1/models` (expose aliases), dashboard aliases page (new), `tests/unit/aliases.test.js` (new).

**Acceptance criteria:** aliases in /v1/models; usage attributed to both; resolution telemetry logged.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Cycle chains | Infinite resolution | Cycle detection at write |
| Alias confusion | Wrong model used | Clear naming + dashboard |
| Virtual instability | Strategy flips | Fallback chains + conditions |
| Usage attribution | Lost alias info | Dual tracking |

## Verification

- Unit: resolve, cycles, virtuals, attribution
- Manual: alias CRUD in dashboard; request via alias; /v1/models shows aliases
- Regression: `tests/__baseline__/verify-no-regression.mjs` (alias baselines exist — run after changes)