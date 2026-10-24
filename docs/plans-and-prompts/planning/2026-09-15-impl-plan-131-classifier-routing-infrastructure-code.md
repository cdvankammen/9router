# Implementation Plan 131 — Classifier-Based Routing Infrastructure — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #classifier #bert #learned-routing #onnx #pre-routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (learned routing from plan 1; calibration from plan 82 (`src/lib/calibration/`); feedback data from plan 83; preference data from plan 103 (`src/lib/preferences/`); pre-routing hook in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — data pipeline; classifier inference; fallback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-131-classifier-routing-infrastructure.md`, `../research/9router/impl-plan-1-learned-routing.md`, `../research/9router/impl-plan-82-router-calibration.md`.

## Scope

**In scope:** classifier architecture (DistilBERT, provider scores softmax, <10ms CPU inference); training pipeline (query-provider-preference triples, fine-tune, evaluation accuracy/latency/calibration, ONNX export); integration (pre-routing before provider selection, rule-based fallback, confidence/accuracy observability, dashboard classifier view).
**Out of scope:** actual model training runs (needs data + infra); calibration internals (plan 82).

## Milestones

### M1 — Data collection pipeline

**Reference code (`src/lib/classifier/data.js`):**

```js
// Training data: query-provider-preference triples.
export function makeDataCollector() {
  const triples = [];
  return {
    // Record a preference: query → provider chosen (and why).
    record({ query, providerId, outcome = "success", qualityScore = null, at = Date.now() } = {}) {
      triples.push({ query, providerId, outcome, qualityScore, at });
    },
    // Filtering: only successful, high-quality outcomes.
    trainingSet({ minQuality = 0.6, maxAgeMs = 30 * 24 * 3600 * 1000 } = {}) {
      const cutoff = Date.now() - maxAgeMs;
      return triples.filter((t) =>
        t.outcome === "success" &&
        (t.qualityScore == null || t.qualityScore >= minQuality) &&
        t.at >= cutoff);
    },
    // Validation: holdout split.
    split(ratio = 0.8) {
      const set = this.trainingSet();
      const n = Math.floor(set.length * ratio);
      return { train: set.slice(0, n), eval: set.slice(n) };
    },
    count() { return triples.length; },
  };
}

// Feature: query text → classifier input.
export function queryFeatures(query) {
  return { text: query?.slice(0, 512) ?? "", length: query?.length ?? 0 };
}
```

**Acceptance criteria:** triples; filtering; split.

### M2 — Classifier serve + inference

**Reference code (`src/lib/classifier/serve.js`):**

```js
// Classifier interface: provider scores (softmax over N providers).
export function makeClassifier({ predict = null, labels = [] } = {}) {
  return {
    // Inference: query → provider scores.
    async score(query) {
      if (!predict) return { ok: false, reason: "no-model" };
      const start = Date.now();
      const logits = await predict(query);
      return { ok: true, scores: softmax(logits), latencyMs: Date.now() - start, labels };
    },
    // Top provider.
    async top(query) {
      const r = await this.score(query);
      if (!r.ok) return r;
      const idx = r.scores.indexOf(Math.max(...r.scores));
      return { ok: true, providerId: r.labels[idx], confidence: r.scores[idx], latencyMs: r.latencyMs };
    },
  };
}

// Softmax over logits.
export function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// Fallback: rule-based if classifier unavailable.
export function fallbackDecision({ classifierOk = false, ruleDecision = null } = {}) {
  return classifierOk ? "classifier" : ruleDecision ?? "rules";
}
```

**Acceptance criteria:** scoring; top provider; fallback.

### M3 — Evaluation

**Reference code (`src/lib/classifier/eval.js`):**

```js
// Evaluation: accuracy, latency, calibration.
export function evaluateClassifier({ predictions = [], groundTruth = [] } = {}) {
  const correct = predictions.filter((p, i) => p === groundTruth[i]).length;
  return {
    accuracy: groundTruth.length ? correct / groundTruth.length : 0,
    samples: groundTruth.length,
  };
}

// Calibration: confidence vs. accuracy (plan 82).
export function calibrationReport({ confidences = [], correct = [] } = {}) {
  const bins = [0, 0.25, 0.5, 0.75, 1];
  const report = [];
  for (let i = 0; i < bins.length - 1; i++) {
    const lo = bins[i], hi = bins[i + 1];
    const idx = confidences.map((c, j) => (c >= lo && c < hi ? j : -1)).filter((j) => j >= 0);
    const acc = idx.length ? idx.filter((j) => correct[j]).length / idx.length : null;
    report.push({ bin: `${lo}-${hi}`, count: idx.length, accuracy: acc });
  }
  return report;
}

// Latency: inference time stats.
export function latencyStats(latencies) {
  if (!latencies.length) return null;
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
  };
}
```

**Acceptance criteria:** accuracy; calibration; latency.

### M4 — Integration + tests

**Reference code (`src/lib/classifier/integrate.js`):**

```js
// Pre-routing: classifier runs before provider selection.
export async function preRoute({ classifier, query, ruleDecision = null, minConfidence = 0.6 } = {}) {
  const top = await classifier.top(query);
  if (!top.ok || top.confidence < minConfidence) {
    return { source: "rules", providerId: ruleDecision, confidence: null };
  }
  return { source: "classifier", providerId: top.providerId, confidence: top.confidence, latencyMs: top.latencyMs };
}

// Telemetry: classifier performance view.
export function makeClassifierTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      const used = events.filter((e) => e.source === "classifier");
      return {
        total: events.length,
        classifierUsed: used.length,
        fallbackRate: events.length ? (events.length - used.length) / events.length : 0,
        avgConfidence: used.length ? used.reduce((a, e) => a + (e.confidence ?? 0), 0) / used.length : null,
      };
    },
  };
}
```

**Files touched:** `src/lib/classifier/` (new: data, serve, eval, integrate), `open-sse/handlers/chatCore.js` (pre-routing hook), dashboard classifier page (new), `tests/unit/classifier.test.js` (new).

**Acceptance criteria:** pre-routing; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Training data quality | Bad classifier | Filtering + validation |
| Model drift | Stale predictions | Regular retraining |
| Latency overhead | Slow routing | ONNX + CPU |
| Cold start | No model | Rule-based fallback |

## Verification

- Unit: makeDataCollector, makeClassifier, softmax, evaluateClassifier, preRoute
- Manual: classifier unavailable → rules fallback; confidence below threshold → rules
- Regression: `tests/__baseline__/verify-no-regression.mjs`