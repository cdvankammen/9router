# Implementation Plan 102 — Response Verification Methods (Greedy vs Sampled, LLM-Judge) — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #verification #llm-judge #self-check #retry #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (quality guardrails from plan 75 (`src/lib/guardrails/`); quality tiers from plan 97 (`src/lib/tiers/`); feedback judge from plan 83 (`src/lib/feedback/`); calibration from plan 82 (`src/lib/calibration/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run verification pipeline; confirm retry-on-failure; confirm caps.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-102-response-verification-methods.md`, `../research/9router/impl-plan-97-quality-tiers-thresholds.md`, `../research/9router/impl-plan-75-response-quality-guardrails.md`.

## Scope

**In scope:** verification methods (greedy self-check, sampled verification, LLM-judge scoring, rule checks); verification pipeline (mode none/sample/always → rule checks always → self-check sample → LLM-judge sample → verdict pass/fail/uncertain); retry on failure (same or higher-tier model, retry caps, tier escalation); verification config (per-route and per-tier modes, sampling rates); streaming integration + dashboard.
**Out of scope:** human preference evaluation infrastructure (uses existing feedback from plan 83); training judge models.

## Milestones

### M1 — Verification core

**Reference code (`src/lib/verify/methods.js`):**

```js
// Verification modes.
export const VERIFY_MODE = { NONE: "none", SAMPLE: "sample", ALWAYS: "always" };

export function shouldVerify(mode, { sampleRate = 0.1, rand = Math.random } = {}) {
  if (mode === VERIFY_MODE.ALWAYS) return true;
  if (mode === VERIFY_MODE.SAMPLE) return rand() < sampleRate;
  return false;
}

// Rule checks: structural (always run).
export function ruleChecks({ output, minLength = 1, required = [], maxLength = null } = {}) {
  const failures = [];
  if (!output || output.length < minLength) failures.push("too-short");
  if (maxLength != null && output.length > maxLength) failures.push("too-long");
  for (const r of required) if (!output.includes(r)) failures.push(`missing:${r}`);
  return { ok: failures.length === 0, failures };
}

// Greedy self-check: model verifies own output (fast, cheap).
export function greedySelfCheck({ output, model }) {
  // Simplified: deterministic heuristic; real impl asks the model.
  return { ok: true, score: 0.7, method: "self-check" };
}

// LLM-judge: separate judge model scores output.
export function llmJudge({ output, rubric = "accuracy, helpfulness, safety" }) {
  // Simplified: real impl calls a judge model and clamps 0..1.
  return { ok: true, score: 0.8, method: "llm-judge", rubric };
}
```

**Acceptance criteria:** modes; rule checks; self-check; judge.

### M2 — Verification pipeline

**Reference code (`src/lib/verify/pipeline.js`):**

```js
// Pipeline: rule checks (always) → self-check (sample) → judge (sample) → verdict.
export async function verifyResponse({ output, mode = VERIFY_MODE.SAMPLE, sampleRate = 0.1, judge = null, selfCheck = null } = {}) {
  const rules = ruleChecks({ output });
  if (!rules.ok) return { verdict: "fail", reason: rules.failures.join(","), stage: "rules" };

  if (!shouldVerify(mode, { sampleRate })) return { verdict: "pass", skipped: true };

  if (selfCheck) {
    const s = await selfCheck({ output });
    if (s.score != null && s.score < 0.4) return { verdict: "fail", reason: "self-check-low", stage: "self-check", score: s.score };
  }
  if (judge) {
    const j = await judge({ output });
    if (j.score != null && j.score < 0.5) return { verdict: "fail", reason: "judge-low", stage: "judge", score: j.score };
    if (j.score != null && j.score < 0.7) return { verdict: "uncertain", stage: "judge", score: j.score };
  }
  return { verdict: "pass" };
}

// Uncertain → pass (fail-open).
export function resolveVerdict(verdict) {
  return verdict === "fail" ? "fail" : "pass";
}
```

**Acceptance criteria:** pipeline order; verdicts; fail-open uncertain.

### M3 — Retry on failure

**Reference code (`src/lib/verify/retry.js`):**

```js
// Retry on failed verification: same or higher-tier model, with caps.
export function makeVerifyRetry({ maxRetries = 2, escalateAfter = 1 } = {}) {
  let retries = 0;
  return {
    nextModel({ currentTier, tiers = ["standard", "premium", "critical"] } = {}) {
      if (retries >= maxRetries) return null;
      retries += 1;
      const idx = tiers.indexOf(currentTier);
      if (retries > escalateAfter && idx < tiers.length - 1) return { model: null, tier: tiers[idx + 1], escalated: true };
      return { model: null, tier: currentTier, escalated: false };
    },
    reset() { retries = 0; },
    used() { return retries; },
  };
}

// Escalation: repeated failure → higher tier.
export function escalateTier(tier, { tiers = ["standard", "premium", "critical"], max = "critical" } = {}) {
  const idx = tiers.indexOf(tier);
  const next = tiers[Math.min(idx + 1, tiers.indexOf(max))];
  return next === tier ? null : next;
}
```

**Acceptance criteria:** retry caps; escalation; reset.

### M4 — Config + integration + tests

**Reference code (`src/lib/verify/config.js`):**

```js
// Per-route and per-tier verification config.
export const DEFAULT_VERIFY_CONFIG = {
  routes: {}, // route -> mode
  tiers: { draft: "none", standard: "none", premium: "sample", critical: "always" },
  sampleRate: 0.1,
};

export function modeFor({ route, tier, config = DEFAULT_VERIFY_CONFIG } = {}) {
  return config.routes[route] ?? config.tiers[tier] ?? VERIFY_MODE.NONE;
}

// Streaming integration: verify after stream completes.
export function afterStream(streamResult, verify) {
  return verify(streamResult);
}
```

**Files touched:** `src/lib/verify/` (new: methods, pipeline, retry, config), `src/sse/handlers/chat.js` (verification integration), `open-sse/config/verifyConfig.js` (new), dashboard verify page (new), `tests/unit/verify.test.js` (new).

**Acceptance criteria:** verification per config; retries; pass/fail rates visible.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Verification latency | Slow responses | Sample mode |
| Judge cost | Expensive evals | Sampling rates |
| False failures | Wasted retries | Uncertain → pass |
| Retry loops | Cost blowup | Retry caps |

## Verification

- Unit: shouldVerify, ruleChecks, verifyResponse, makeVerifyRetry, modeFor
- Manual: premium tier → sampled judge; failed verify → retry → escalate once → cap
- Regression: `tests/__baseline__/verify-no-regression.mjs`