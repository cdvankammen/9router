# Implementation Plan 170 — Answer Confidence Estimation & Routing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #confidence #calibration #routing #quality #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (router calibration from plan 82; POMDP belief state from plan 132 (`src/lib/pomdp/`); response verification from plan 102; quality tiers from plan 97).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — confidence model; confidence routing; calibration.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-170-answer-confidence-estimation.md`, `../research/9router/impl-plan-82-router-calibration.md`, `../research/9router/impl-plan-132-pomdp-self-verification-routing.md`.

## Scope

**In scope:** confidence model (signals, scoring, thresholds); confidence-based routing (serve/escalate/verify); calibration (data, mapping, drift); integration.
**Out of scope:** POMDP belief state (plan 132); response verification (plan 102).

## Milestones

### M1 — Confidence model

**Reference code (`src/lib/confidence/model.js`):**

```js
// Confidence signals: logprobs, coherence, length.
export function confidenceSignals({ logprobs = [], coherence = 0.5, length = 0 } = {}) {
  const avgLogprob = logprobs.length ? logprobs.reduce((a, b) => a + b, 0) / logprobs.length : 0;
  const lenScore = Math.min(1, length / 2000);
  return { avgLogprob, coherence, lenScore };
}

// Confidence scoring: calibrated score.
export function confidenceScore({ signals = {}, weights = { logprob: 0.5, coherence: 0.3, length: 0.2 } } = {}) {
  const { avgLogprob = 0, coherence = 0.5, lenScore = 0 } = signals;
  // Normalize logprob to [0,1]: -1 → 0, 0 → 1.
  const logprobScore = Math.max(0, Math.min(1, 1 + avgLogprob));
  return weights.logprob * logprobScore + weights.coherence * coherence + weights.length * lenScore;
}

// Confidence thresholds: per-task thresholds.
export const CONFIDENCE_THRESHOLDS = { code: 0.7, math: 0.75, general: 0.6, chat: 0.5 };

export function thresholdFor(task, thresholds = CONFIDENCE_THRESHOLDS) {
  return thresholds[task] ?? 0.6;
}
```

**Acceptance criteria:** signals; score; thresholds.

### M2 — Confidence-based routing

**Reference code (`src/lib/confidence/route.js`):**

```js
// Confidence-based routing: serve / escalate / verify.
export function confidenceAction({ score = 0.5, threshold = 0.6, verifyThreshold = 0.4 } = {}) {
  if (score >= threshold) return { action: "serve", reason: "high-confidence" };
  if (score >= verifyThreshold) return { action: "verify", reason: "uncertain" };
  return { action: "escalate", reason: "low-confidence" };
}

// Escalate: move to stronger model.
export function escalate({ candidates = [], current = null } = {}) {
  const idx = candidates.indexOf(current);
  return candidates[idx + 1] ?? candidates[0] ?? null;
}

// Serve decision: should we serve this response?
export function shouldServe({ score, threshold = 0.6 } = {}) {
  return score >= threshold;
}
```

**Acceptance criteria:** actions; escalation; serve decision.

### M3 — Confidence calibration

**Reference code (`src/lib/confidence/calibrate.js`):**

```js
// Calibration: raw → calibrated mapping.
export function calibrate({ pairs = [], buckets = 10 } = {}) {
  // pairs: [{raw, label}]
  const map = new Map();
  for (const p of pairs) {
    const key = Math.round(p.raw * buckets) / buckets;
    const list = map.get(key) ?? [];
    list.push(p.label ? 1 : 0);
    map.set(key, list);
  }
  return {
    // Calibrated: expected accuracy for a raw score.
    calibrated(raw) {
      const key = Math.round(raw * buckets) / buckets;
      const list = map.get(key);
      return list?.length ? list.reduce((a, b) => a + b, 0) / list.length : raw;
    },
    // Reliability: |raw - calibrated|.
    reliability() {
      let err = 0, n = 0;
      for (const [key, list] of map) {
        const acc = list.reduce((a, b) => a + b, 0) / list.length;
        err += Math.abs(Number(key) - acc) * list.length;
        n += list.length;
      }
      return n ? err / n : 0;
    },
  };
}

// Drift: monitor calibration over time.
export function makeCalibrationMonitor({ window = 200 } = {}) {
  const recent = [];
  return {
    record(pair) { recent.push(pair); if (recent.length > window) recent.shift(); },
    reliability() { return calibrate({ pairs: recent }).reliability(); },
    drift(baseline = 0.1) { return this.reliability() - baseline; },
  };
}
```

**Acceptance criteria:** calibration; reliability; drift.

### M4 — Integration + tests

**Reference code (`src/lib/confidence/integrate.js`):**

```js
// Routing integration: confidence hooks.
export function confidenceForResponse({ signals, task = "general", calibrator = null } = {}) {
  const raw = confidenceScore({ signals });
  const score = calibrator ? calibrator.calibrated(raw) : raw;
  const threshold = thresholdFor(task);
  return { raw, score, threshold, action: confidenceAction({ score, threshold }) };
}

// Fail-open.
export function safeConfidence(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/confidence/` (new: model, route, calibrate, integrate), `open-sse/handlers/chatCore.js` (confidence hooks), dashboard confidence page (new), `tests/unit/confidence.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Poor calibration | Wrong decisions | Calibration pipeline |
| Threshold drift | Stale routing | Monitoring |
| False confidence | Bad serves | Verification |
| Complexity | Confusion | Simple model |

## Verification

- Unit: confidenceSignals, confidenceScore, thresholdFor, confidenceAction, escalate, shouldServe, calibrate, makeCalibrationMonitor, confidenceForResponse
- Manual: low confidence → escalate; high → serve
- Regression: `tests/__baseline__/verify-no-regression.mjs`