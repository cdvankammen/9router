# Implementation Plan 164 — Data Augmentation for OOD Generalization — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #augmentation #ood #synthetic #robustness #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (classifier training from plan 131 (`src/lib/classifier/data.js`); dataset construction from plan 148 (`tests/benchmarks/datasets/`); preference collection from plan 163 (`src/lib/preferences/`); causal routers from plan 136 (`src/lib/causal/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — augmentation; OOD detection; robustness.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-164-data-augmentation-ood.md`, `../research/9router/impl-plan-131-classifier-routing-infrastructure.md`, `../research/9router/impl-plan-163-preference-data-collection.md`.

## Scope

**In scope:** augmentation techniques (synthetic, transformation, adversarial, cross-domain); OOD detection (signals, threshold, handling); robustness evaluation (benchmarks, metrics, regression); integration.
**Out of scope:** preference collection (plan 163); causal adaptation (plan 136).

## Milestones

### M1 — Augmentation pipeline

**Reference code (`src/lib/augmentation/generate.js`):**

```js
// Augmentation: synthetic + transformed examples.
export function paraphrase(text) {
  // Simple transformation: reorder clauses, swap synonyms (scaffold).
  const reordered = text.split(/(?<=[.!?])\s+/).reverse().join(" ");
  return reordered !== text ? reordered : `${text} (in other words)`;
}

export function reorder(text) {
  const words = text.split(/\s+/);
  if (words.length < 4) return text;
  const [first, ...rest] = words;
  return [...rest, first].join(" ");
}

// Adversarial: hard negatives.
export function hardNegative({ text, label, otherLabels = [] } = {}) {
  // Take a similar query from another label as a hard negative.
  return otherLabels.map((l) => ({ text: `${text} (but actually about ${l})`, label: l }));
}

// Cross-domain: domain mixing.
export function crossDomain({ text, domains = [] } = {}) {
  return domains.map((d) => ({ text: `[${d}] ${text}`, domain: d }));
}

// Pipeline: apply augmentations with quality filter.
export function augment({ samples = [], transforms = [paraphrase, reorder], maxPerSample = 3 } = {}) {
  const out = [];
  for (const s of samples) {
    out.push(s);
    const variants = transforms.slice(0, maxPerSample).map((t) => ({ ...s, text: t(s.text) }));
    out.push(...variants.filter((v) => v.text !== s.text));
  }
  return out;
}
```

**Acceptance criteria:** transforms; adversarial; pipeline.

### M2 — OOD detection

**Reference code (`src/lib/ood/detect.js`):**

```js
// OOD signals: embedding distance, confidence.
export function oodScore({ distance = 0, confidence = 0.5, maxDistance = 1 } = {}) {
  // Higher distance + lower confidence → more OOD.
  return 0.6 * (distance / maxDistance) + 0.4 * (1 - confidence);
}

// Threshold-based detection.
export function detectOod({ score = 0, threshold = 0.7 } = {}) {
  return { ood: score >= threshold, score, threshold };
}

// OOD handling: fallback routing on OOD.
export function handleOod({ ood = false, fallback = null, normal = null } = {}) {
  return ood ? fallback : normal;
}

// Distance from training distribution (scaffold: mean embedding distance).
export function distanceFromTrain({ embedding = [], centroids = [] } = {}) {
  if (!centroids.length) return 0;
  const d = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
  return Math.min(...centroids.map((c) => d(embedding, c)));
}
```

**Acceptance criteria:** score; detection; handling.

### M3 — Robustness evaluation

**Reference code (`src/lib/ood/eval.js`):**

```js
// OOD benchmarks: novel query sets.
export function oodAccuracy({ predictions = [], labels = [] } = {}) {
  const correct = predictions.filter((p, i) => p === labels[i]).length;
  return { accuracy: labels.length ? correct / labels.length : 0, correct, total: labels.length };
}

// Robustness metrics: accuracy on OOD vs in-distribution.
export function robustnessGap({ oodAcc = 0, idAcc = 0 } = {}) {
  return { gap: idAcc - oodAcc, robust: oodAcc >= idAcc - 0.1 };
}

// Regression testing: OOD regressions.
export function regressionCheck({ current = 0, baseline = 0, tolerance = 0.05 } = {}) {
  const drop = baseline - current;
  return { ok: drop <= tolerance, drop };
}
```

**Acceptance criteria:** accuracy; gap; regression.

### M4 — Integration + tests

**Reference code (`src/lib/ood/integrate.js`):**

```js
// Inference: OOD detection before routing.
export function preRouteOod({ embedding = [], centroids = [], threshold = 0.7, fallback = null, normal = null } = {}) {
  const distance = distanceFromTrain({ embedding, centroids });
  const score = oodScore({ distance });
  const { ood } = detectOod({ score, threshold });
  return { ood, score, target: handleOod({ ood, fallback, normal }) };
}

// Fail-open.
export function safeOod(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/augmentation/` (new: generate), `src/lib/ood/` (new: detect, eval, integrate), dashboard ood page (new), `tests/unit/augmentation.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Augmentation noise | Bad training data | Quality filtering |
| OOD false positives | Wrong fallback | Threshold tuning |
| Overfitting | Narrow generalization | Validation |
| Cost | Expensive generation | Budgeted generation |

## Verification

- Unit: paraphrase, reorder, hardNegative, crossDomain, augment, oodScore, detectOod, handleOod, distanceFromTrain, oodAccuracy, robustnessGap, regressionCheck, preRouteOod
- Manual: augment dataset → OOD query → fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`