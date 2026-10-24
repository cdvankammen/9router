# Implementation Plan 132 — POMDP & Self-Verification Routing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #pomdp #self-verification #belief-state #escalation #uncertainty #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (learned routing from plan 1; calibration from plan 82 (`src/lib/calibration/`); oracle gap from plan 98 (`src/lib/oracle/`); cost heuristics from plan 87; hooks in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — belief updates; verification; escalation.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-132-pomdp-self-verification-routing.md`, `../research/9router/impl-plan-1-learned-routing.md`, `../research/9router/impl-plan-98-oracle-gap-analysis.md`.

## Scope

**In scope:** POMDP model (states query difficulty/model capability, actions route/verify/escalate, observations output/confidence, belief state posterior over difficulty); self-verification (lightweight verifier, calibrated confidence, escalate when confidence < threshold); policy (belief-state → action, offline RL from logs, per-cost-tier thresholds); pre/post routing integration + dashboard POMDP view.
**Out of scope:** actual offline RL training runs; calibration internals (plan 82).

## Milestones

### M1 — POMDP model

**Reference code (`src/lib/pomdp/model.js`):**

```js
// Difficulty levels (hidden state).
export const DIFFICULTY = ["easy", "medium", "hard"];

// Belief state: posterior over difficulty.
export function makeBelief(initial = { easy: 0.4, medium: 0.4, hard: 0.2 }) {
  let belief = { ...initial };
  return {
    get belief() { return belief; },
    // Update: observation → posterior (Bayes).
    update(observation, { likelihoodOf } = {}) {
      const posterior = {};
      let sum = 0;
      for (const d of DIFFICULTY) {
        const like = likelihoodOf?.(d, observation) ?? 1;
        posterior[d] = belief[d] * like;
        sum += posterior[d];
      }
      if (sum > 0) for (const d of DIFFICULTY) posterior[d] /= sum;
      belief = posterior;
      return belief;
    },
    // Difficulty estimate: argmax.
    estimate() {
      return DIFFICULTY.reduce((best, d) => (belief[d] > belief[best] ? d : best), DIFFICULTY[0]);
    },
    uncertainty() {
      const max = Math.max(...Object.values(belief));
      return 1 - max; // 0 = certain, higher = uncertain
    },
  };
}

// Actions.
export const ACTIONS = ["route", "verify", "escalate"];
```

**Acceptance criteria:** belief states; Bayes update; uncertainty.

### M2 — Self-verification

**Reference code (`src/lib/pomdp/verify.js`):**

```js
// Verifier: lightweight model checks output.
export function makeVerifier({ check = null } = {}) {
  return {
    // Verify: output → verdict + confidence.
    async verify(output, query) {
      if (!check) return { ok: true, verdict: "pass", confidence: 0.5, reason: "no-verifier" };
      const r = await check(output, query);
      return { ok: true, verdict: r.verdict ?? "pass", confidence: r.confidence ?? 0.5, reason: r.reason ?? null };
    },
  };
}

// Escalation: escalate when confidence < threshold.
export function shouldEscalate({ confidence, threshold = 0.6, escalations = 0, maxEscalations = 2 } = {}) {
  if (escalations >= maxEscalations) return { escalate: false, reason: "max-depth" };
  return { escalate: confidence < threshold, reason: confidence < threshold ? "low-confidence" : "confident" };
}

// Confidence: calibrated scores (plan 82).
export function calibratedConfidence(raw, { calibration = null } = {}) {
  return calibration ? calibration(raw) : raw;
}
```

**Acceptance criteria:** verifier; escalation; calibration hook.

### M3 — Policy

**Reference code (`src/lib/pomdp/policy.js`):**

```js
// Policy: belief-state → action mapping.
export function makePolicy({ thresholds = { easy: 0.4, medium: 0.6, hard: 0.8 } } = {}) {
  return {
    // Decide: route / verify / escalate.
    decide({ belief, confidence, costTier = "standard" } = {}) {
      const difficulty = belief.estimate();
      const threshold = thresholds[difficulty] ?? 0.6;
      if (confidence == null) return { action: "route", difficulty };
      if (confidence < threshold) return { action: "escalate", difficulty, threshold };
      if (difficulty === "hard" && confidence < threshold + 0.1) return { action: "verify", difficulty };
      return { action: "route", difficulty };
    },
    // Per-cost-tier escalation thresholds.
    thresholdFor(costTier, difficulty) {
      const tierAdj = { cheap: -0.1, standard: 0, premium: 0.1 }[costTier] ?? 0;
      return (thresholds[difficulty] ?? 0.6) + tierAdj;
    },
  };
}

// Offline RL: learn thresholds from logs.
export function learnFromLogs(logs, { alpha = 0.05 } = {}) {
  const agg = {};
  for (const l of logs) {
    const key = l.difficulty ?? "medium";
    agg[key] = agg[key] ?? { n: 0, escalations: 0 };
    agg[key].n += 1;
    if (l.escalated) agg[key].escalations += 1;
  }
  // Escalation rate → threshold adjustment.
  return Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, 0.5 + (v.escalations / Math.max(1, v.n)) * alpha]));
}
```

**Acceptance criteria:** decision policy; tier thresholds; log learning.

### M4 — Integration + tests

**Reference code (`src/lib/pomdp/integrate.js`):**

```js
// Pre-routing: POMDP policy before provider selection.
export function preRouteDecision({ belief, confidence, policy, costTier } = {}) {
  const d = policy.decide({ belief, confidence, costTier });
  return { ...d, usePomdp: true };
}

// Post-routing: verification after first response.
export async function postRouteVerify({ verifier, output, query, belief, policy, escalations = 0 } = {}) {
  const v = await verifier.verify(output, query);
  const esc = shouldEscalate({ confidence: v.confidence, escalations });
  if (esc.escalate) belief.update("hard", { likelihoodOf: () => 1.5 }); // evidence of difficulty
  return { verdict: v.verdict, confidence: v.confidence, escalate: esc.escalate, belief: belief.belief };
}

// Telemetry: POMDP view.
export function makePomdpTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        routed: events.filter((e) => e.action === "route").length,
        verified: events.filter((e) => e.action === "verify").length,
        escalated: events.filter((e) => e.action === "escalate").length,
        avgUncertainty: events.length ? events.reduce((a, e) => a + (e.uncertainty ?? 0), 0) / events.length : null,
      };
    },
  };
}
```

**Files touched:** `src/lib/pomdp/` (new: model, verify, policy, integrate), `open-sse/handlers/chatCore.js` (hooks), dashboard pomdp page (new), `tests/unit/pomdp.test.js` (new).

**Acceptance criteria:** pre/post routing; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Policy complexity | Wrong actions | Simple belief states |
| Verification cost | Latency | Lightweight verifier |
| Escalation loops | Cost blowup | Max escalation depth |
| Training data | Bad policy | Log-based offline RL |

## Verification

- Unit: makeBelief, makeVerifier, shouldEscalate, makePolicy, learnFromLogs, postRouteVerify
- Manual: low confidence → escalate; hard difficulty → verify first
- Regression: `tests/__baseline__/verify-no-regression.mjs`