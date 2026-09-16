# Implementation Plan 02 — Cascade & Fallback Enhancements — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cascade #fallback #frugalgpt #automix #judge #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/services/combo.js` handleComboChat, `open-sse/config/runtimeConfig.js` DEFAULT_RETRY_CONFIG, fusion judge in `handleFusionChat`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-02-cascade-fallback-enhancements.md`, `../research/9router/42-branch-cascades-and-fallbacks.md`

## Scope

**In scope:** `cascade` combo strategy (cheap→expensive with judge); LiteLLM-style fallback hardening (weighted failover, cooldowns, max_fallbacks cap, no-retry errors).
**Out of scope:** POMDP full implementation (confidence tracking only); AutoMix self-verification as optional phase 2.

## Milestones

### M1 — Cascade strategy + judge

**Reference code (`open-sse/services/combo.js` extension):**

```js
// Cascade: models ordered cheap→expensive; escalate when judge confidence < threshold.
export async function handleCascadeChat({ models, messages, settings, judge }) {
  const threshold = settings.cascade?.judgeThreshold ?? 0.7;
  let lastOutput = null;
  for (const model of models) {
    const result = await executeModel(model, messages);
    if (result.error) continue; // hard failure → next in cascade
    const verdict = await judge.evaluate({
      output: result.output,
      task: messages,
      model,
    });
    if (verdict.confidence >= threshold || model === models[models.length - 1]) {
      return { ...result, cascade: { model, confidence: verdict.confidence, escalated: false } };
    }
    lastOutput = result;
    // escalate: append cheap output as context for the next model
    messages = [...messages, { role: "assistant", content: lastOutput.output }];
  }
  return lastOutput;
}
```

**Judge calibration (RouterBench: judge error must be ≤ 0.1):**

```js
// Calibrate the judge against a labeled set; if error > 0.2, cascade collapses — disable.
export async function calibrateJudge(judge, labeledSet) {
  let errors = 0;
  for (const { output, expected } of labeledSet) {
    const v = await judge.evaluate({ output, task: null, model: "calibration" });
    if (Math.abs(v.confidence - expected) > 0.2) errors++;
  }
  return { errorRate: errors / labeledSet.length, viable: errors / labeledSet.length <= 0.1 };
}
```

**Acceptance criteria:** `cascade` strategy selectable per combo; judge confidence gates escalation; calibration reports viability.

### M2 — Fallback hardening (LiteLLM patterns)

**Reference code (`open-sse/config/runtimeConfig.js` extension):**

```js
// Add to DEFAULT_RETRY_CONFIG:
cooldowns: {
  "429": 5000,            // rate limit → 5s cooldown
  "401": 5000, "404": 5000, "408": 5000,
  highFailureRate: 5000,  // >50% failures in current minute → 5s
},
maxFallbacks: 5,          // LiteLLM default cap
noRetryErrors: ["context_window", "content_policy"],  // fail fast, don't retry
```

**Reference code (`open-sse/executors/default.js` retry logic):**

```js
// Pin provider client to max_retries:0 to avoid (1+N)² amplification:
const client = createClient({ ...opts, maxRetries: 0 });
// Retry loop with exponential backoff for RateLimitError only:
for (let attempt = 0; attempt <= retries; attempt++) {
  try { return await client.chat(req); }
  catch (err) {
    if (isNoRetryError(err)) throw err;               // fail fast
    if (attempt === retries) throw err;
    await sleep(backoffMs(attempt, err));             // 1s, 2s, 4s...
  }
}
```

**Acceptance criteria:** cooldown map applied; max_fallbacks cap; no-retry errors fail fast; weighted failover re-picks by weights excluding failed model.

### M3 — Tests + docs

**Files touched:** `tests/unit/cascade.test.js` (new), `tests/unit/fallback-hardening.test.js` (new), `docs/ARCHITECTURE.md` (cascade + cooldown docs).

**Acceptance criteria:** unit tests pass; no regressions vs baseline.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Fusion judge | Judge error > 0.2 collapses cascade | Calibration gate; disable if not viable |
| `handleComboChat` signature | Must thread cascade | Verify before wiring |
| Cooldown state | In-memory only | Acceptable single-node; Redis later |

## Verification

- Unit: cascade escalation, judge calibration, cooldown map, no-retry classification
- Manual: combo with cascade strategy → verify escalation via `x-9r-fallback-chain` header
- Regression: `tests/__baseline__/verify-no-regression.mjs`