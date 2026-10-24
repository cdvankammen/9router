# Implementation Plan 79 — Per-Model Request Adaptation — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #request-adaptation #parameters #profiles #clamping #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (request normalization from plan 52 (`open-sse/schema/`); capability negotiation from plan 63; translator pipeline in `open-sse/translator/`; param handling in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — send a request with out-of-range params; confirm clamping + profile defaults applied.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-79-per-model-request-adaptation.md`, `../research/9router/impl-plan-63-capability-discovery-negotiation.md`, `../research/9router/impl-plan-52-request-normalization-canonical.md`.

## Scope

**In scope:** parameter profiles (per-model defaults for temperature, max_tokens, top_p, etc.); valid ranges per model; adaptation rules (when to adapt); adaptation engine (profile lookup, mapping, clamping); profile management (API + dashboard, validation, versioning); translator integration + telemetry.
**Out of scope:** learned parameter optimization; per-request adaptive tuning loops.

## Milestones

### M1 — Parameter profiles

**Reference code (`open-sse/config/adaptationConfig.js`):**

```js
// Per-model parameter profiles: defaults + valid ranges.
export const DEFAULT_PROFILES = {
  "gpt-4o": {
    defaults: { temperature: 1, max_tokens: 4096, top_p: 1 },
    ranges: { temperature: [0, 2], max_tokens: [1, 16384], top_p: [0, 1] },
  },
  "claude-sonnet-4-5": {
    defaults: { temperature: 1, max_tokens: 8192, top_p: 1 },
    ranges: { temperature: [0, 1], max_tokens: [1, 64000], top_p: [0, 1] },
  },
  // ...extend per provider docs
};

export const ADAPTABLE_PARAMS = ["temperature", "max_tokens", "top_p", "presence_penalty", "frequency_penalty"];

export function getProfile(model, profiles = DEFAULT_PROFILES) {
  return profiles[model] ?? null;
}

export function validateProfile(profile) {
  const issues = [];
  for (const [param, [min, max]] of Object.entries(profile.ranges ?? {})) {
    if (min > max) issues.push({ param, message: "min > max" });
    const d = profile.defaults?.[param];
    if (d != null && (d < min || d > max)) issues.push({ param, message: `default ${d} outside [${min}, ${max}]` });
  }
  return issues;
}
```

**Acceptance criteria:** profiles defined; lookup works; validation catches bad ranges/defaults.

### M2 — Adaptation engine

**Reference code (`src/lib/adaptation/engine.js`):**

```js
import { getProfile, ADAPTABLE_PARAMS } from "../../open-sse/config/adaptationConfig.js";

// Adapt request params: apply profile defaults for missing params, clamp out-of-range.
export function adaptParams(model, params, { profiles, log = () => {} } = {}) {
  const profile = getProfile(model, profiles);
  if (!profile) return { params, adapted: [], clamped: [] };
  const out = { ...params };
  const adapted = [];
  const clamped = [];
  for (const p of ADAPTABLE_PARAMS) {
    const [min, max] = profile.ranges[p] ?? [];
    if (min == null) continue;
    if (out[p] == null && profile.defaults[p] != null) {
      out[p] = profile.defaults[p];
      adapted.push({ param: p, from: null, to: out[p] });
    } else if (out[p] != null && (out[p] < min || out[p] > max)) {
      const before = out[p];
      out[p] = Math.min(max, Math.max(min, out[p]));
      clamped.push({ param: p, from: before, to: out[p] });
      log({ kind: "clamp", model, param: p, from: before, to: out[p] });
    }
  }
  return { params: out, adapted, clamped };
}

// Adaptation rules: when to adapt (e.g., only when client didn't specify).
export function shouldAdapt({ clientSpecified = [], param }) {
  return !clientSpecified.includes(param);
}
```

**Acceptance criteria:** defaults applied for missing; out-of-range clamped; rules respected.

### M3 — Profile management

**Reference code (migration `src/lib/db/migrations/20260915-adaptation.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS adaptation_profiles (
      model TEXT PRIMARY KEY,
      defaults_json TEXT NOT NULL,
      ranges_json TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS adaptation_profiles"); };
```

```js
// src/lib/db/repos/adaptationRepo.js
export async function upsertProfile(db, { model, defaults, ranges, version }) {
  db.run(`INSERT INTO adaptation_profiles (model, defaults_json, ranges_json, version, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(model) DO UPDATE SET defaults_json = excluded.defaults_json,
            ranges_json = excluded.ranges_json, version = excluded.version, updated_at = excluded.updated_at`,
    [model, JSON.stringify(defaults), JSON.stringify(ranges), version ?? 1, new Date().toISOString()]);
}
export async function listProfiles(db) {
  return db.all("SELECT model, defaults_json, ranges_json, version, updated_at FROM adaptation_profiles");
}
```

**Acceptance criteria:** profiles upserted; versioned; listed.

### M4 — Integration + telemetry + tests

**Reference code (`src/app/api/v1/adaptation/route.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { listProfiles, upsertProfile } from "@/lib/db/repos/adaptationRepo.js";
import { validateProfile } from "../../../open-sse/config/adaptationConfig.js";

export async function GET() {
  const db = getAdapter();
  return Response.json({ profiles: await listProfiles(db) });
}

export async function POST(req) {
  const db = getAdapter();
  const body = await req.json();
  const issues = validateProfile(body);
  if (issues.length) return Response.json({ error: "invalid profile", issues }, { status: 400 });
  await upsertProfile(db, body);
  return Response.json({ ok: true });
}
```

**Files touched:** `src/lib/adaptation/` (new: engine), `open-sse/config/adaptationConfig.js` (new), `open-sse/translator/` (integration — apply before translation), `src/lib/db/migrations/20260915-adaptation.js` (new), `src/lib/db/repos/adaptationRepo.js` (new), `src/app/api/v1/adaptation/route.js` (new), dashboard adaptation page (new), `tests/unit/adaptation.test.js` (new).

**Acceptance criteria:** engine applied in translation path; API manages profiles; telemetry logged.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Wrong profiles | Degraded outputs | Validation + defaults |
| Over-adaptation | Client surprises | Rules (only when unspecified) |
| Clamping surprises | Silent changes | Logging + telemetry |
| Complexity | Hard to reason | Simple defaults first |

## Verification

- Unit: adaptParams, validateProfile, shouldAdapt
- Manual: request with temperature 5 → clamped; missing max_tokens → default applied
- Regression: `tests/__baseline__/verify-no-regression.mjs`