# Implementation Plan 64 — Anomaly Detection & Smart Alerts — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #anomaly-detection #alerts #monitoring #statistics #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (analytics rollups from plan 53; cost daily tables from plan 45; event bus + webhook delivery from plan 37; health events from plan 49).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — inject a cost spike, confirm detection + alert; check dedupe; verify severity.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-64-anomaly-detection-alerts.md`, `../research/9router/46-branch-evaluation-and-cost-quality.md`, `../research/9router/impl-plan-37-webhooks-events.md`.

## Scope

**In scope:** metric time series (cost, latency, errors, usage, quota); statistical detection (z-score, moving average) with rolling baselines; detection pipeline (collect → detect → classify with type + severity); smart alerts (dedupe, severity ranking, context); notifications via event bus/webhooks; dashboard anomaly view with links to related traces.
**Out of scope:** ML-based detection (statistical first); root-cause analysis automation.

## Milestones

### M1 — Metric collection + baselines

**Reference code (`src/lib/anomaly/baselines.js`):**

```js
// Rolling baselines per metric key. Keeps last N samples in memory, seeded from DB.
const WINDOW = Number(process.env.ANOMALY_WINDOW ?? 30);

const series = new Map(); // key -> number[]

export function recordSample(key, value, now = Date.now()) {
  const arr = series.get(key) ?? [];
  arr.push({ ts: now, value });
  while (arr.length > WINDOW * 3) arr.shift();
  series.set(key, arr);
}

export function baselineFor(key, { window = WINDOW, excludeLast = 1 } = {}) {
  const arr = (series.get(key) ?? []).slice(0, -(excludeLast || 0));
  const values = arr.slice(-window).map((s) => s.value);
  if (values.length < 5) return null; // not enough data
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  return { mean, stddev: Math.sqrt(variance), count: values.length };
}

export function resetSeries() { series.clear(); }
```

**Acceptance criteria:** samples recorded; baseline needs ≥5 samples; window configurable.

### M2 — Detection pipeline

**Reference code (`src/lib/anomaly/detect.js`):**

```js
import { baselineFor } from "./baselines.js";

// Z-score detection with minimum absolute deviation guard.
export function detectAnomaly(key, value, { zThreshold = 3, minDeviation = 0.2 } = {}) {
  const base = baselineFor(key);
  if (!base) return null;
  const deviation = base.mean > 0 ? (value - base.mean) / base.mean : 0;
  if (base.stddev === 0) {
    if (Math.abs(deviation) < minDeviation) return null;
    return { key, value, mean: base.mean, deviation, severity: Math.abs(deviation) > 1 ? "critical" : "warning" };
  }
  const z = (value - base.mean) / base.stddev;
  if (Math.abs(z) < zThreshold) return null;
  return {
    key, value, mean: base.mean, stddev: base.stddev, z: Number(z.toFixed(2)),
    deviation: Number(deviation.toFixed(3)),
    severity: Math.abs(z) > zThreshold * 1.5 ? "critical" : "warning",
    direction: z > 0 ? "spike" : "drop",
  };
}

// Classify anomaly type from the metric key prefix.
export function classifyAnomaly(key) {
  if (key.startsWith("cost")) return "cost";
  if (key.startsWith("latency")) return "latency";
  if (key.startsWith("errors")) return "errors";
  if (key.startsWith("usage")) return "usage";
  if (key.startsWith("quota")) return "quota";
  return "other";
}
```

**Acceptance criteria:** z-score gates detection; zero-stddev handled; type classified.

### M3 — Smart alerts + dedupe

**Reference code (`src/lib/anomaly/alerts.js`):**

```js
import { detectAnomaly, classifyAnomaly } from "./detect.js";
import { emit, EVENT_TYPES } from "@/lib/events/bus.js";

const recent = new Map(); // dedupeKey -> lastFiredAt
const DEDUPE_MS = Number(process.env.ANOMALY_DEDUPE_MS ?? 15 * 60_000);

// Evaluate a metric sample → maybe fire alert (deduped + severity-ranked).
export function evaluateAlert(key, value, { dedupeMs = DEDUPE_MS } = {}) {
  const anomaly = detectAnomaly(key, value);
  if (!anomaly) return { fired: false };

  const type = classifyAnomaly(key);
  const dedupeKey = `${key}:${anomaly.direction}`;
  const last = recent.get(dedupeKey) ?? 0;
  const now = Date.now();
  if (now - last < dedupeMs) return { fired: false, reason: "deduped", anomaly };

  recent.set(dedupeKey, now);
  const alert = {
    type, severity: anomaly.severity, key,
    message: `${type} ${anomaly.direction}: ${anomaly.value} vs mean ${anomaly.mean.toFixed(2)} (z=${anomaly.z})`,
    context: anomaly,
    at: new Date().toISOString(),
  };
  emit(EVENT_TYPES.ANOMALY_DETECTED, alert);
  return { fired: true, alert };
}

export function resetDedupe() { recent.clear(); }
```

**Acceptance criteria:** alerts deduped per key+direction; severity from z-score; context included.

### M4 — Integration + API + dashboard + tests

**Reference code (migration `src/lib/db/migrations/20260915-anomalies.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      value REAL,
      mean REAL,
      z REAL,
      message TEXT,
      acknowledged INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_anomalies_ts ON anomalies (ts);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS anomalies"); };
```

```js
// src/lib/db/repos/anomalyRepo.js
export async function recordAnomaly(db, alert) {
  db.run(`INSERT INTO anomalies (ts, type, severity, metric_key, value, mean, z, message)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [alert.at, alert.type, alert.severity, alert.key, alert.context.value, alert.context.mean, alert.context.z ?? null, alert.message]);
}
export async function listAnomalies(db, { limit = 100, unacknowledgedOnly = false } = {}) {
  const where = unacknowledgedOnly ? "WHERE acknowledged = 0" : "";
  return db.all(`SELECT * FROM anomalies ${where} ORDER BY id DESC LIMIT ?`, [limit]);
}
export async function acknowledgeAnomaly(db, id) {
  return db.run("UPDATE anomalies SET acknowledged = 1 WHERE id = ?", [id]);
}
```

**Files touched:** `src/lib/anomaly/` (new: baselines, detect, alerts), `src/lib/db/migrations/20260915-anomalies.js` (new), `src/lib/db/repos/anomalyRepo.js` (new), `src/app/api/v1/anomalies/route.js` (new), dashboard anomalies page (new), `tests/unit/anomaly.test.js` (new).

**Acceptance criteria:** anomalies persisted; API lists/acknowledges; dashboard shows with links to traces.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| False positives | Alert fatigue | z-threshold + min deviation + dedupe |
| Alert fatigue | Ignored alerts | Dedupe + severity + acknowledge |
| Baseline drift | Stale baselines | Rolling window |
| ML complexity | Over-engineering | Statistical first |

## Verification

- Unit: baselines, detect, dedupe, severity
- Manual: inject cost spike → alert fires → deduped on repeat
- Regression: `tests/__baseline__/verify-no-regression.mjs`