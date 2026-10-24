# Implementation Plan 197 — Cooldown Tuning & Optimization — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cooldown #tuning #optimization #effectiveness #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cooldown backoff from plan 95; cooldown timers from plan 181 (`src/lib/cooldown/`); failure detection from plan 186 (`src/lib/failures/`); error hardening from plan 9).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — model; tuning; optimization.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-197-cooldown-tuning-optimization.md`, `../research/9router/impl-plan-95-cooldown-backoff.md`, `../research/9router/impl-plan-181-cooldown-timers-state-management.md`.

## Scope

**In scope:** cooldown model (parameters, scope, types); tuning framework (data, methods, validation); optimization (effectiveness tracking, auto-tuning, alerts).
**Out of scope:** cooldown state machine (plan 181); failure detection (plan 186).

## Milestones

### M1 — Cooldown model

**Reference code (`src/lib/cooldown/tuning.js`):**

```js
// Cooldown parameters: duration, thresholds, recovery.
export const DEFAULT_COOLDOWN_PARAMS = { duration: 60_000, failureThreshold: 0.3, recoveryProbes: 3 };

// Cooldown scope: per-provider, per-model, per-account.
export function cooldownScope({ provider = null, model = null, account = null } = {}) {
  return { provider, model, account };
}

// Cooldown types: error-based, quality-based, latency-based.
export const COOLDOWN_TYPES = ["error", "quality", "latency"];

export function cooldownType({ signals = {} } = {}) {
  if (signals.errorRate >= 0.3) return "error";
  if (signals.quality < 0.4) return "quality";
  if (signals.latency >= 5000) return "latency";
  return null;
}
```

**Acceptance criteria:** parameters; scope; types.

### M2 — Tuning framework

**Reference code (`src/lib/cooldown/tune-framework.js`):**

```js
// Tuning data: cooldown effectiveness metrics.
export function makeTuningData() {
  const examples = []; // {params, effectiveness}
  return {
    add(example) { examples.push(example); },
    all() { return examples; },
    split({ holdout = 0.2, seed = 1 } = {}) {
      const shuffled = [...examples].sort(() => (seed % 2 ? -1 : 1));
      const cut = Math.floor(shuffled.length * (1 - holdout));
      return { train: shuffled.slice(0, cut), holdout: shuffled.slice(cut) };
    },
  };
}

// Tuning methods: grid search.
export function gridSearchTune({ data = [], param = "duration", range = [10_000, 120_000], steps = 6, metric = (p, d) => d.filter((x) => x.params[param] === p && x.effectiveness > 0.5).length / (d.length || 1) } = {}) {
  let best = { value: range[0], score: -Infinity };
  for (let i = 0; i <= steps; i++) {
    const v = range[0] + ((range[1] - range[0]) * i) / steps;
    const score = metric(v, data);
    if (score > best.score) best = { value: v, score };
  }
  return best;
}

// Tuning validation: holdout validation.
export function validateTuning({ data = [], tuned = {} } = {}) {
  const score = data.filter((x) => x.params.duration === tuned.value && x.effectiveness > 0.5).length / (data.length || 1);
  return { score, ok: score >= 0.5 };
}
```

**Acceptance criteria:** data; search; validation.

### M3 — Optimization

**Reference code (`src/lib/cooldown/optimize.js`):**

```js
// Effectiveness tracking: cooldown success rates.
export function makeEffectivenessTracker() {
  const perKey = new Map(); // key -> {cooldowns, recoveries}
  return {
    record(key, { recovered = true } = {}) {
      const s = perKey.get(key) ?? { cooldowns: 0, recoveries: 0 };
      s.cooldowns += 1;
      if (recovered) s.recoveries += 1;
      perKey.set(key, s);
    },
    effectiveness(key) {
      const s = perKey.get(key);
      return s?.cooldowns ? s.recoveries / s.cooldowns : 0.5;
    },
    all() { return Object.fromEntries(perKey); },
  };
}

// Automatic tuning: auto-adjust parameters.
export function autoTune({ tracker, key, params = DEFAULT_COOLDOWN_PARAMS, min = 5_000, max = 300_000 } = {}) {
  const eff = tracker.effectiveness(key);
  if (eff < 0.3) return { ...params, duration: Math.min(max, params.duration * 1.5) }; // lengthen
  if (eff > 0.8) return { ...params, duration: Math.max(min, params.duration * 0.8) }; // shorten
  return params;
}

// Tuning alerts: alert on poor effectiveness.
export function tuningAlert({ tracker, key, threshold = 0.2 } = {}) {
  const eff = tracker.effectiveness(key);
  return { alert: eff < threshold, effectiveness: eff };
}
```

**Acceptance criteria:** tracking; auto-tune; alerts.

### M4 — Integration + tests

**Reference code (`src/lib/cooldown/integrate-tuning.js`):**

```js
// Routing integration: tuned cooldowns.
export function tunedCooldown({ tracker, key, params = DEFAULT_COOLDOWN_PARAMS } = {}) {
  return autoTune({ tracker, key, params });
}

// Fail-open.
export function safeCooldownTune(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/cooldown/tuning.js` (new), `src/lib/cooldown/tune-framework.js` (new), `src/lib/cooldown/optimize.js` (new), `src/lib/cooldown/integrate-tuning.js` (new), `open-sse/handlers/chatCore.js` (cooldown hooks), dashboard cooldown page (new), `tests/unit/cooldown-tuning.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Over-tuning | Bad params | Validation |
| Parameter drift | Stale params | Monitoring |
| Effectiveness noise | Wrong tuning | Smoothing |
| Complexity | Confusion | Simple methods |

## Verification

- Unit: cooldownScope, cooldownType, makeTuningData, gridSearchTune, validateTuning, makeEffectivenessTracker, autoTune, tuningAlert, tunedCooldown
- Manual: track effectiveness → tune → validate
- Regression: `tests/__baseline__/verify-no-regression.mjs`