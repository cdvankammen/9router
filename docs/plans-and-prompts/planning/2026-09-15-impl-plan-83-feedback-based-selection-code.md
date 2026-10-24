# Implementation Plan 83 — Feedback-Based Model Selection — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #feedback #llm-judge #quality-scoring #weight-adjustment #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (calibration from plan 82; quality evaluation from plan 67; guardrails from plan 75; combo ordering in `src/sse/handlers/chat.js`; usage tracking in `src/lib/usageDb.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — submit feedback; confirm score updates; confirm weights shift combo ordering.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-83-feedback-based-selection.md`, `../research/9router/impl-plan-82-router-calibration-confidence.md`, `../research/9router/impl-plan-67-model-quality-evaluation.md`.

## Scope

**In scope:** feedback collection (explicit thumbs/ratings/regenerate, implicit copy/continue/edit/abandon, LLM-judge sampled scoring); quality scoring (rubric: helpfulness, correctness, formatting, safety; sampling rate; normalization; per-task thresholds); weight adjustment (per task-type/model quality with confidence, Bayesian-style update, epsilon-greedy exploration, smoothing caps); routing integration (weights influence combo ordering, explicit override bypasses); observability + dashboard.
**Out of scope:** learned routing via ML training (heuristic Bayesian updates only); cross-user feedback sharing.

## Milestones

### M1 — Feedback collection

**Reference code (`src/lib/feedback/collect.js`):**

```js
// Feedback store: explicit + implicit signals per (request, model, task).
export const FEEDBACK_TYPES = ["thumbs_up", "thumbs_down", "star", "regenerate", "copy", "continue", "edit", "abandon"];

export function normalizeFeedback({ type, value = null, requestId, model, taskType = null, userId = null }) {
  if (!FEEDBACK_TYPES.includes(type)) return { ok: false, reason: "unknown-type" };
  let score = null;
  if (type === "thumbs_up") score = 1;
  if (type === "thumbs_down") score = 0;
  if (type === "star" && value != null) score = Math.min(1, Math.max(0, value / 5));
  if (type === "regenerate") score = 0.3;   // implicit: user wanted something else
  if (type === "copy" || type === "continue") score = 0.8; // implicit positive
  if (type === "edit") score = 0.5;
  if (type === "abandon") score = 0.2;
  return { ok: true, entry: { type, score, requestId, model, taskType, userId, at: new Date().toISOString() } };
}

// Anti-gaming: rate limit feedback per user.
export function makeFeedbackLimiter({ maxPerMinute = 20 } = {}) {
  const stamps = new Map(); // userId -> [timestamps]
  return {
    allow(userId, now = Date.now()) {
      const arr = (stamps.get(userId) ?? []).filter((t) => now - t < 60_000);
      if (arr.length >= maxPerMinute) return false;
      arr.push(now);
      stamps.set(userId, arr);
      return true;
    },
  };
}
```

**Acceptance criteria:** all feedback types normalized to scores; rate limit enforced.

### M2 — LLM-judge + quality scoring

**Reference code (`src/lib/feedback/judge.js`):**

```js
// LLM-judge: score a sampled response on a rubric via the gateway itself.
export const JUDGE_RUBRIC = ["helpfulness", "correctness", "formatting", "safety"];

export async function judgeResponse({ callModel, prompt, response, rubric = JUDGE_RUBRIC }) {
  const judgePrompt = `Score the response 0-1 on each of: ${rubric.join(", ")}. Reply with JSON only: {"helpfulness":0.9,...}`;
  const out = await callModel(judgePrompt);
  let parsed = {};
  try { parsed = JSON.parse(String(out).match(/\{[\s\S]*\}/)?.[0] ?? "{}"); } catch { /* fall through */ }
  const scores = rubric.map((dim) => ({ dim, score: Number.isFinite(parsed[dim]) ? Math.min(1, Math.max(0, parsed[dim])) : null }));
  const valid = scores.filter((s) => s.score != null);
  return { scores, overall: valid.length ? valid.reduce((a, s) => a + s.score, 0) / valid.length : null };
}

// Sampling: judge only a configurable fraction of traffic.
export function shouldJudge(sampleRate = 0.05) {
  return Math.random() < sampleRate;
}
```

**Acceptance criteria:** judge returns per-dimension + overall; sampling gate.

### M3 — Weight adjustment

**Reference code (`src/lib/feedback/weights.js`):**

```js
// Per (taskType, model) quality estimate with confidence (Bayesian-style).
const weights = new Map(); // `${task}|${model}` -> { alpha, beta }  (Beta distribution)

export function priorFor(taskType, model) {
  return { alpha: 2, beta: 2 }; // weak prior → smooth start
}

export function updateWeight(taskType, model, score, { weight = 1 } = {}) {
  const key = `${taskType ?? "chat"}|${model}`;
  const w = weights.get(key) ?? priorFor(taskType, model);
  // Beta update: score in [0,1] treated as success fraction.
  w.alpha += score * weight;
  w.beta += (1 - score) * weight;
  weights.set(key, w);
}

export function qualityFor(taskType, model) {
  const w = weights.get(`${taskType ?? "chat"}|${model}`);
  if (!w) return null;
  const mean = w.alpha / (w.alpha + w.beta);
  const n = w.alpha + w.beta;
  return { mean: Number(mean.toFixed(3)), confidence: Number(Math.min(1, n / 20).toFixed(3)) };
}

// Epsilon-greedy exploration: occasionally try untested models.
export function maybeExplore(candidates, { epsilon = 0.05 } = {}) {
  if (Math.random() >= epsilon) return null;
  const untested = candidates.filter((c) => !weights.has(`chat|${c.model}`));
  return untested.length ? untested[Math.floor(Math.random() * untested.length)].model : null;
}

// Smoothing caps: limit single-update impact.
export function clampUpdate(score, { maxDelta = 0.2, current = null } = {}) {
  if (current == null) return score;
  return Math.min(1, Math.max(0, current + Math.max(-maxDelta, Math.min(maxDelta, score - current))));
}
```

**Acceptance criteria:** Beta updates; quality mean + confidence; exploration; clamping.

### M4 — Integration + API + tests

**Reference code (`src/app/api/v1/feedback/route.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { normalizeFeedback, makeFeedbackLimiter } from "@/lib/feedback/collect.js";
import { updateWeight } from "@/lib/feedback/weights.js";

const limiter = makeFeedbackLimiter();

export async function POST(req) {
  const db = getAdapter();
  const body = await req.json();
  if (!limiter.allow(body.userId)) return Response.json({ error: "rate-limited" }, { status: 429 });
  const { ok, entry, reason } = normalizeFeedback(body);
  if (!ok) return Response.json({ error: reason }, { status: 400 });
  db.run(`INSERT INTO feedback (type, score, request_id, model, task_type, user_id, at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entry.type, entry.score, entry.requestId, entry.model, entry.taskType, entry.userId, entry.at]);
  if (entry.score != null) updateWeight(entry.taskType, entry.model, entry.score);
  return Response.json({ ok: true });
}
```

**Files touched:** `src/lib/feedback/` (new: collect, judge, score, weights), `src/app/api/v1/feedback/route.js` (new), `src/sse/handlers/chat.js` (weight integration in combo ordering), `src/lib/db/repos/feedbackRepo.js` (new), dashboard feedback page (new), `tests/unit/feedback.test.js` (new).

**Acceptance criteria:** feedback persisted; weights updated; combo ordering weight-aware; explicit override bypasses.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Judge bias | Skewed scores | Multiple judges + calibration |
| Feedback sparsity | Slow learning | Bayesian priors |
| Weight swings | Unstable routing | Smoothing + caps |
| Gaming feedback | Manipulated weights | Rate limits + anomaly detection |

## Verification

- Unit: normalizeFeedback, judgeResponse, updateWeight, qualityFor, maybeExplore
- Manual: thumbs-down on a model → weight drops → combo order shifts
- Regression: `tests/__baseline__/verify-no-regression.mjs`