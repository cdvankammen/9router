# Implementation Plan 97 — Quality Tiers & Thresholds — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #quality-tiers #thresholds #verification #escalation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (quality guardrails from plan 75 (`src/lib/guardrails/`); feedback selection from plan 83 (`src/lib/feedback/`); cost tiers from plan 87 (`src/lib/cost/`); intent classification from plan 81 (`src/lib/intent/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — assign tiers; run verification modes; confirm escalation with caps.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-97-quality-tiers-thresholds.md`, `../research/9router/impl-plan-75-response-quality-guardrails.md`, `../research/9router/impl-plan-87-cost-heuristics-estimation.md`.

## Scope

**In scope:** quality tier model (draft/standard/premium/critical with minQuality, model pools, verify modes); tier assignment (task-type defaults, user override, route override, dynamic difficulty bump); quality verification (none/sample/always modes, LLM-judge/self-check/rule methods, failure → escalation); tier enforcement (model gating, cost gating, escalation caps); routing integration + dashboard.
**Out of scope:** learned tier optimization; per-request quality scoring internals (plan 67).

## Milestones

### M1 — Tier model

**Reference code (`src/lib/tiers/model.js`):**

```js
// Quality tier model.
export const TIERS = {
  draft: { minQuality: 0.3, verify: "none", costCap: 0.001 },
  standard: { minQuality: 0.6, verify: "none", costCap: 0.01 },
  premium: { minQuality: 0.8, verify: "sample", costCap: 0.05 },
  critical: { minQuality: 0.9, verify: "always", costCap: 1.0 },
};

export const TIER_ORDER = ["draft", "standard", "premium", "critical"];

export function tierFor({ taskType, userTier = null, routeTier = null, difficulty = "medium", taskTierDefaults = {} } = {}) {
  const base = routeTier ?? userTier ?? taskTierDefaults[taskType] ?? "standard";
  // Dynamic tiering: difficulty prediction → tier bump.
  if (difficulty === "hard" && TIER_ORDER.indexOf(base) < TIER_ORDER.indexOf("premium")) {
    return TIER_ORDER[TIER_ORDER.indexOf(base) + 1];
  }
  return base;
}

export function tierConfig(tier) {
  return TIERS[tier] ?? TIERS.standard;
}
```

**Acceptance criteria:** tiers defined; assignment with overrides + bump.

### M2 — Quality verification

**Reference code (`src/lib/tiers/verify.js`):**

```js
// Verification modes: none | sample | always.
export function shouldVerify(tier, { sampleRate = 0.1, rand = Math.random } = {}) {
  const mode = TIERS[tier]?.verify ?? "none";
  if (mode === "always") return true;
  if (mode === "sample") return rand() < sampleRate;
  return false;
}

// Verification methods: rule checks (deterministic), self-check, LLM-judge.
export function ruleCheck({ output, minLength = 1, required = [] } = {}) {
  if (!output || output.length < minLength) return { ok: false, reason: "too-short" };
  for (const r of required) {
    if (!output.includes(r)) return { ok: false, reason: `missing:${r}` };
  }
  return { ok: true };
}

export function selfCheck({ output, model }) {
  // Simplified: ask the same model to rate its own output 0..1.
  return { ok: true, score: 0.7, method: "self-check" }; // real impl calls model
}

export function llmJudge({ output, rubric = "accuracy, helpfulness, safety" }) {
  // Simplified: external judge model scores 0..1.
  return { ok: true, score: 0.8, method: "llm-judge", rubric }; // real impl calls judge
}

export async function verifyOutput({ tier, output, methods = ["ruleCheck"] }) {
  if (!shouldVerify(tier)) return { verified: true, skipped: true };
  for (const m of methods) {
    const res = m === "ruleCheck" ? ruleCheck({ output }) : m === "selfCheck" ? selfCheck({ output }) : llmJudge({ output });
    if (!res.ok) return { verified: false, reason: res.reason, method: m };
  }
  return { verified: true };
}
```

**Acceptance criteria:** modes; methods; failure detection.

### M3 — Escalation

**Reference code (`src/lib/tiers/escalate.js`):**

```js
// Escalation: verified failure → higher tier, with caps.
export function escalate({ tier, maxTier = "critical", escalations = 0, maxEscalations = 2 } = {}) {
  if (escalations >= maxEscalations) return { tier, escalated: false, reason: "cap-reached" };
  const idx = TIER_ORDER.indexOf(tier);
  const next = TIER_ORDER[Math.min(idx + 1, TIER_ORDER.indexOf(maxTier))];
  if (next === tier) return { tier, escalated: false, reason: "already-max" };
  return { tier: next, escalated: true, escalations: escalations + 1 };
}

// Cost gating: tier caps cost.
export function withinCostCap(tier, costUsd) {
  return costUsd <= (TIERS[tier]?.costCap ?? 0.01);
}

// Model gating: tier restricts model pool.
export function modelsForTier(tier, { modelTiers = {} } = {}) {
  const min = TIERS[tier]?.minQuality ?? 0.6;
  return Object.entries(modelTiers).filter(([, q]) => q >= min).map(([m]) => m);
}
```

**Acceptance criteria:** escalation with caps; cost gating; model gating.

### M4 — Integration + tests

**Reference code (`src/lib/tiers/integrate.js`):**

```js
// Routing integration: tier-aware selection.
export function selectForTier({ tier, candidates, modelTiers = {} }) {
  const pool = modelsForTier(tier, { modelTiers });
  return candidates.filter((c) => pool.includes(c));
}

// Telemetry: tier distribution + escalation rate.
export function makeTierTelemetry() {
  const counts = new Map();
  let escalations = 0, total = 0;
  return {
    record(tier, { escalated = false } = {}) {
      counts.set(tier, (counts.get(tier) ?? 0) + 1);
      total += 1; if (escalated) escalations += 1;
    },
    report() {
      return { distribution: Object.fromEntries(counts), escalationRate: total ? escalations / total : 0 };
    },
  };
}
```

**Files touched:** `src/lib/tiers/` (new: model, verify, escalate, integrate), `src/sse/handlers/chat.js` (tier integration), `open-sse/config/tierConfig.js` (new), dashboard tiers page (new), `tests/unit/tiers.test.js` (new).

**Acceptance criteria:** tiers assigned; verification per mode; escalation with caps; telemetry.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Tier misassignment | Wrong quality | Conservative defaults |
| Verification cost | Expensive evals | Sample mode |
| Escalation loops | Cost blowup | Escalation caps |
| Overpay | Waste | Cost gating |

## Verification

- Unit: tierFor, shouldVerify, verifyOutput, escalate, modelsForTier
- Manual: critical task → premium model; failed verify → escalate once → cap
- Regression: `tests/__baseline__/verify-no-regression.mjs`