# Implementation Plan 44 — Dynamic Model Combo Auto-Switch — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #combos #auto-switch #adaptive #hysteresis #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (combo expansion in `src/sse/handlers/chat.js`; combo storage in `src/lib/db/repos/comboRepo.js`; existing `scripts/test-combo-autoswitch.mjs`; the combo fallback loop in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the auto-switch harness; simulate cost/latency/error spikes; confirm hysteresis prevents thrash.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-44-dynamic-combo-autoswitch.md`, `../research/9router/42-branch-cascades-and-fallbacks.md`, `../research/9router/impl-plan-02-cascade-enhancements.md`.

## Scope

**In scope:** dynamic combo model (variants per combo: cheap/balanced/quality); condition signals (cost, latency, error rate, quota, task type); selection function; hysteresis + cooldown; switch logging; outcome tracking + variant ranking; dashboard variant management.
**Out of scope:** ML-based prediction; per-request A/B experimentation.

## Milestones

### M1 — Dynamic combo model + selection function

**Reference code (`src/lib/combos/dynamic.js`):**

```js
// Variant selection based on real-time conditions.
// combo.variants: [{ id: "cheap", models: [...], maxCostPer1k?: number, maxLatencyMs?: number }]

export function selectVariant(combo, conditions) {
  if (!combo.variants?.length) return { variant: null, reason: "no-variants" };

  // 1. Hard constraints first: drop variants that violate current conditions.
  const viable = combo.variants.filter((v) => {
    if (v.maxCostPer1k && conditions.costPer1k > v.maxCostPer1k) return false;
    if (v.maxLatencyMs && conditions.latencyMs > v.maxLatencyMs) return false;
    return true;
  });
  if (!viable.length) return { variant: combo.variants[0], reason: "all-violate-fallback-first" };

  // 2. Task-type preference.
  const taskPref = combo.taskPreferences?.[conditions.taskType];
  if (taskPref) {
    const preferred = viable.find((v) => v.id === taskPref);
    if (preferred) return { variant: preferred, reason: `task-${conditions.taskType}` };
  }

  // 3. Default: balanced, else first viable.
  const balanced = viable.find((v) => v.id === "balanced");
  return { variant: balanced ?? viable[0], reason: balanced ? "balanced" : "first-viable" };
}
```

**Acceptance criteria:** selection respects hard constraints; task preferences honored; deterministic fallback.

### M2 — Hysteresis + cooldown + switch logging

**Reference code (`src/lib/combos/autoswitch.js`):**

```js
// State per combo: current variant, last switch time, consecutive breach count.
const state = new Map(); // comboId -> { variantId, lastSwitchAt, breaches }

const HYSTERESIS_BREACHES = 3;   // sustained condition before switching
const COOLDOWN_MS = 5 * 60_000;  // min time between switches

export function maybeSwitch(combo, conditions, now = Date.now()) {
  const s = state.get(combo.id) ?? { variantId: combo.variants?.[0]?.id ?? null, lastSwitchAt: 0, breaches: 0 };
  const { variant, reason } = selectVariant(combo, conditions);

  if (variant.id === s.variantId) {
    s.breaches = 0; // healthy
    state.set(combo.id, s);
    return { switched: false, reason: "stable" };
  }

  // A different variant is preferred — require sustained breach + cooldown.
  s.breaches += 1;
  if (s.breaches < HYSTERESIS_BREACHES) {
    state.set(combo.id, s);
    return { switched: false, reason: `hysteresis-${s.breaches}/${HYSTERESIS_BREACHES}` };
  }
  if (now - s.lastSwitchAt < COOLDOWN_MS) {
    state.set(combo.id, s);
    return { switched: false, reason: "cooldown" };
  }

  s.variantId = variant.id;
  s.lastSwitchAt = now;
  s.breaches = 0;
  state.set(combo.id, s);
  logSwitch(combo.id, s.variantId, reason, conditions);
  return { switched: true, variant, reason };
}

function logSwitch(comboId, variantId, reason, conditions) {
  // Persist to combo_switch_events (see M3) — fire-and-forget.
  console.info(`[combo] ${comboId} -> ${variantId} (${reason})`, conditions);
}
```

**Acceptance criteria:** no thrash (3 consecutive breaches required); cooldown respected; every switch logged with reason.

### M3 — Outcome tracking + variant ranking

**Reference code (migration `src/lib/db/migrations/20260915-combo-switch-events.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS combo_switch_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      combo_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      conditions_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_combo_switch_events_combo ON combo_switch_events (combo_id, created_at);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS combo_switch_events"); };
```

```js
// src/lib/db/repos/comboSwitchRepo.js
export async function recordOutcome(db, { comboId, variantId, ok, latencyMs, cost }) {
  // Upsert rolling stats per (combo, variant).
  db.run(`
    INSERT INTO combo_variant_stats (combo_id, variant_id, attempts, failures, total_latency_ms, total_cost)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(combo_id, variant_id) DO UPDATE SET
      attempts = attempts + 1,
      failures = failures + excluded.failures,
      total_latency_ms = total_latency_ms + excluded.total_latency_ms,
      total_cost = total_cost + excluded.total_cost
  `, [comboId, variantId, ok ? 0 : 1, latencyMs ?? 0, cost ?? 0]);
}

export async function rankVariants(db, comboId) {
  return db.all(`
    SELECT variant_id,
           attempts,
           failures,
           ROUND(failures * 1.0 / attempts, 3) AS failure_rate,
           ROUND(total_latency_ms * 1.0 / attempts, 0) AS avg_latency_ms,
           ROUND(total_cost * 1.0 / attempts, 6) AS avg_cost
    FROM combo_variant_stats WHERE combo_id = ?
    ORDER BY failure_rate ASC, avg_latency_ms ASC, avg_cost ASC
  `, [comboId]);
}
```

**Acceptance criteria:** outcomes recorded per variant; ranking query returns ordered stats; dashboard can display them.

### M4 — Integration + test harness extension

**Reference code (`scripts/test-combo-autoswitch.mjs` extension):**

```js
// Simulate condition sequences and assert hysteresis behavior.
import { maybeSwitch } from "../src/lib/combos/autoswitch.js";

const combo = {
  id: "test-combo",
  variants: [
    { id: "cheap", models: ["gpt-4o-mini"], maxCostPer1k: 0.01 },
    { id: "balanced", models: ["gpt-4o"], maxCostPer1k: 0.05 },
    { id: "quality", models: ["gpt-4.1"], maxCostPer1k: 0.2 },
  ],
};

let now = 1_000_000;
const results = [];
// Latency spike: 3 consecutive breaches should switch cheap -> balanced.
for (let i = 0; i < 3; i++) {
  results.push(maybeSwitch(combo, { costPer1k: 0.005, latencyMs: 5000, taskType: "chat" }, now));
  now += 60_000;
}
console.log(results.map((r) => r.reason).join(" -> "));
// Expect: hysteresis-1/3 -> hysteresis-2/3 -> switched (balanced)
```

**Files touched:** `src/lib/combos/` (new: dynamic.js, autoswitch.js), `src/lib/db/migrations/20260915-combo-switch-events.js` (new), `src/lib/db/repos/comboSwitchRepo.js` (new), `src/sse/handlers/chat.js` (selection integration), dashboard combos page (variant management), `scripts/test-combo-autoswitch.mjs` (extend), `tests/unit/combo-autoswitch.test.js` (new).

**Acceptance criteria:** harness shows hysteresis sequence; integration point in chat.js documented; dashboard can edit variants.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Condition signals | Stale data | Fresh signals per request |
| Switch thrash | Instability | Hysteresis + cooldown |
| Wrong variant | Worse UX | Outcome tracking + ranking |
| Complexity | Over-engineering | Simple conditions first |

## Verification

- Unit: selection, hysteresis, cooldown, ranking
- Harness: `node scripts/test-combo-autoswitch.mjs`
- Manual: dashboard variant edit → live switch
- Regression: `tests/__baseline__/verify-no-regression.mjs`