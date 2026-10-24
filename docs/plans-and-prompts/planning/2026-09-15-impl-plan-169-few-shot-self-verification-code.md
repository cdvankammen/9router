# Implementation Plan 169 — Few-Shot Self-Verification Pipeline — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #verification #few-shot #self-verification #quality #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (response verification from plan 102; LLM approximation from plan 151 (`src/lib/approximation/`); cascade judges from plan 133 (`src/lib/judges/`); POMDP self-verification from plan 132 (`src/lib/pomdp/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — verification model; pipeline; quality integration.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-169-few-shot-self-verification.md`, `../research/9router/impl-plan-102-response-verification.md`, `../research/9router/impl-plan-151-llm-approximation-judges.md`.

## Scope

**In scope:** verification model (verifier, criteria, output); verification pipeline (pre/post, cost); quality integration (pass/fail handling, logging); integration.
**Out of scope:** judge cascades (plan 133); POMDP self-verification (plan 132).

## Milestones

### M1 — Verification model

**Reference code (`src/lib/verification/model.js`):**

```js
// Verification criteria: correctness, coherence, completeness.
export const CRITERIA = ["correctness", "coherence", "completeness"];

// Verification output: pass/fail with confidence.
export function makeVerifier({ judge = null, fewShot = [] } = {}) {
  return {
    // verify: {text, criteria} → {pass, confidence, scores}
    verify({ text = "", criteria = CRITERIA } = {}) {
      if (!judge) return { pass: true, confidence: 0.5, scores: {}, source: "no-judge" };
      const scores = {};
      for (const c of criteria) scores[c] = judge(text, c);
      const avg = criteria.reduce((s, c) => s + (scores[c] ?? 0), 0) / (criteria.length || 1);
      return { pass: avg >= 0.6, confidence: avg, scores, source: "judge" };
    },
    // Few-shot examples: {text, pass} pairs.
    fewShot,
  };
}

// Few-shot prompt scaffold.
export function fewShotPrompt({ examples = [], text = "" } = {}) {
  const shots = examples.map((e) => `Input: ${e.text}\nVerdict: ${e.pass ? "PASS" : "FAIL"}`).join("\n\n");
  return `${shots}\n\nInput: ${text}\nVerdict:`;
}
```

**Acceptance criteria:** verifier; criteria; few-shot.

### M2 — Verification pipeline

**Reference code (`src/lib/verification/pipeline.js`):**

```js
// Pipeline: pre-verification + post-verification.
export function makeVerificationPipeline({ verifier, onFail = null } = {}) {
  return {
    // Pre: verify before routing (e.g., verify the query is well-formed).
    pre({ text = "" } = {}) {
      const result = verifier.verify({ text, criteria: ["coherence"] });
      return { stage: "pre", ...result };
    },
    // Post: verify after response.
    post({ text = "" } = {}) {
      const result = verifier.verify({ text });
      if (!result.pass && onFail) onFail(result);
      return { stage: "post", ...result };
    },
  };
}

// Verification cost: per-verification cost.
export function verificationCost({ verifier, tokens = 0, costPerToken = 0.0001 } = {}) {
  return verifier.source === "no-judge" ? 0 : tokens * costPerToken;
}
```

**Acceptance criteria:** pipeline; cost.

### M3 — Quality integration

**Reference code (`src/lib/verification/quality.js`):**

```js
// Pass output: serve to client.
export function passOutput({ result, output } = {}) {
  return result.pass ? { serve: true, output } : { serve: false, output: null };
}

// Fail output: re-route or retry.
export function failAction({ result, retry = null, reroute = null } = {}) {
  if (result.pass) return { action: "serve" };
  return { action: retry ? "retry" : reroute ? "reroute" : "serve-degraded", target: retry ?? reroute };
}

// Verification logging: all verifications logged.
export function makeVerificationLog() {
  const entries = [];
  return {
    log(e) { entries.push({ ...e, at: Date.now() }); },
    report() {
      return {
        total: entries.length,
        passRate: entries.length ? entries.filter((e) => e.pass).length / entries.length : 0,
        byStage: entries.reduce((acc, e) => { acc[e.stage] = (acc[e.stage] ?? 0) + 1; return acc; }, {}),
      };
    },
  };
}
```

**Acceptance criteria:** pass/fail; logging.

### M4 — Integration + tests

**Reference code (`src/lib/verification/integrate.js`):**

```js
// Routing integration: verification hooks.
export function verifyResponse({ verifier, pipeline, text = "", output = null } = {}) {
  const result = pipeline.post({ text });
  return { result, action: failAction({ result, retry: output }) };
}

// Fail-open: never block serving on verification errors.
export function safeVerify(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/verification/` (new: model, pipeline, quality, integrate), `open-sse/handlers/chatCore.js` (verification hooks), dashboard verification page (new), `tests/unit/verification.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Verification errors | Wrong verdicts | Few-shot quality |
| Cost overhead | Expensive verification | Lightweight verifier |
| Latency | Slow verification | Async verification |
| False failures | Unnecessary retries | Threshold tuning |

## Verification

- Unit: makeVerifier, fewShotPrompt, makeVerificationPipeline, verificationCost, passOutput, failAction, makeVerificationLog, verifyResponse
- Manual: verify response → pass/fail → serve/retry
- Regression: `tests/__baseline__/verify-no-regression.mjs`