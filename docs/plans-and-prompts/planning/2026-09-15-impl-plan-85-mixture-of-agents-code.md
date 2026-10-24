# Implementation Plan 85 — Mixture-of-Agents & Expert Orchestration — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #mixture-of-agents #expert-orchestration #merging #cost-control #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (combo expansion in `src/sse/handlers/chat.js`; intent classification from plan 81; cost tracking from plan 45; performance work from plan 31 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run a high-stakes request through MoA; confirm proposals + aggregation; confirm cost cap enforced.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-85-mixture-of-agents.md`, `../research/9router/impl-plan-81-request-intent-classification.md`, `../research/9router/impl-plan-45-cost-tracking-budgets.md`.

## Scope

**In scope:** MoA mode (N proposers in parallel + aggregator; trigger rules: complexity, opt-in, route config); expert orchestration (registry of specialized models, taxonomy dispatch, weighted voting/best-of-N merging, utilization tracking); efficiency (prefix caching, continuous batching, optional KV quantization/draft models for local); cost control (caps + warnings); telemetry + dashboard.
**Out of scope:** actual model training/merging (orchestration only); speculative decoding implementation for remote providers.

## Milestones

### M1 — MoA orchestrator

**Reference code (`src/lib/moa/orchestrator.js`):**

```js
import { DEFAULT_MOA_CONFIG } from "../../open-sse/config/moaConfig.js";

// Trigger rules: when to use MoA.
export function shouldUseMoA({ complexity, optIn, routeConfig = {}, config = DEFAULT_MOA_CONFIG } = {}) {
  if (routeConfig.moa === "on") return true;
  if (routeConfig.moa === "off") return false;
  if (optIn) return true;
  return (complexity ?? "medium") === "high" && config.autoTriggerOnComplex;
}

// Run proposers in parallel, aggregate with the aggregator model.
export async function runMoA({ request, proposers, aggregatorModel, callModel, config = DEFAULT_MOA_CONFIG }) {
  const started = Date.now();
  const proposals = await Promise.allSettled(
    proposers.map((model) => callModel(request, { model }).catch((e) => ({ error: e.message })))
  );
  const ok = proposals.filter((p) => p.status === "fulfilled" && !p.value?.error).map((p) => p.value);
  if (!ok.length) return { ok: false, reason: "all-proposers-failed", latencyMs: Date.now() - started };
  if (ok.length === 1) return { ok: true, response: ok[0], usedAggregator: false, latencyMs: Date.now() - started };
  const aggregatePrompt = `${request}\n\n---\nProposals:\n${ok.map((p, i) => `[${i + 1}] ${p}`).join("\n\n")}\n\n---\nSynthesize the best answer.`;
  const response = await callModel(aggregatePrompt, { model: aggregatorModel });
  return { ok: true, response, usedAggregator: true, proposalCount: ok.length, latencyMs: Date.now() - started };
}
```

**Acceptance criteria:** triggers correct; parallel proposals; aggregator fallback to best proposal on failure.

### M2 — Expert registry + dispatch

**Reference code (`src/lib/moa/experts.js`):**

```js
// Expert registry: specialized models per domain.
export const DEFAULT_EXPERTS = {
  code: { model: "claude-sonnet-4-5", features: ["code"] },
  math: { model: "gpt-4o", features: ["math"] },
  creative: { model: "gpt-4o", features: ["creative"] },
  analysis: { model: "claude-opus-4-1", features: ["deep"] },
};

// Dispatch: taxonomy → expert model (with confidence gate).
export function dispatchExpert(taskType, { experts = DEFAULT_EXPERTS, confidence = 1, minConfidence = 0.65 } = {}) {
  if (confidence < minConfidence) return null;
  return experts[taskType] ?? null;
}

// Utilization tracking.
export function makeUtilizationTracker() {
  const counts = new Map();
  return {
    record(expert, model) { const k = `${expert}|${model}`; counts.set(k, (counts.get(k) ?? 0) + 1); },
    stats() { return Object.fromEntries(counts); },
  };
}
```

**Acceptance criteria:** dispatch gated by confidence; utilization tracked.

### M3 — Expert merging

**Reference code (`src/lib/moa/merge.js`):**

```js
// Best-of-N: pick the highest-scored proposal (scores from judge or heuristic).
export function bestOfN(proposals, { scoreBy }) {
  return [...proposals].sort((a, b) => (scoreBy(b) ?? 0) - (scoreBy(a) ?? 0))[0] ?? null;
}

// Weighted voting: combine proposals by weights (e.g., expert confidence).
export function weightedVote(proposals, { weightBy }) {
  const total = proposals.reduce((a, p) => a + (weightBy(p) ?? 1), 0);
  if (!total) return null;
  // For text outputs, weighted voting picks the highest-weighted proposal
  // (true token-level voting is out of scope).
  return [...proposals].sort((a, b) => (weightBy(b) ?? 1) - (weightBy(a) ?? 1))[0];
}

// Cost control: estimate MoA cost vs single-model baseline.
export function costMultiplier({ proposalCount, aggregatorUsed, baselineCost, costPerProposal }) {
  const total = proposalCount * costPerProposal + (aggregatorUsed ? costPerProposal : 0);
  return { total, multiplier: baselineCost ? Number((total / baselineCost).toFixed(2)) : null };
}
```

**Acceptance criteria:** best-of-N; weighted vote; cost multiplier computed.

### M4 — Prefix caching + integration + tests

**Reference code (`src/lib/moa/cache.js`):**

```js
// Prefix caching: cache shared system-prompt prefixes keyed by hash.
const cache = new Map(); // hash -> { prefix, hits }
const MAX_ENTRIES = 100;

export function cachePrefix(prefix) {
  const hash = simpleHash(prefix);
  if (!cache.has(hash) && cache.size < MAX_ENTRIES) cache.set(hash, { prefix, hits: 0 });
  return hash;
}
export function cachedPrefix(hash) {
  const e = cache.get(hash);
  if (e) e.hits += 1;
  return e?.prefix ?? null;
}
export function cacheStats() {
  return { entries: cache.size, hits: [...cache.values()].reduce((a, e) => a + e.hits, 0) };
}
function simpleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
```

**Files touched:** `src/lib/moa/` (new: orchestrator, experts, merge, cache), `open-sse/config/moaConfig.js` (new), `src/sse/handlers/chat.js` (MoA mode), dashboard MoA page (new), `tests/unit/moa.test.js` (new).

**Acceptance criteria:** MoA flow works; experts dispatched; merging picks best; cost caps enforced.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| MoA cost explosion | High spend | Cost caps + opt-in |
| Aggregator failure | No output | Fallback to best proposal |
| Latency | Slow responses | Parallel execution + timeouts |
| Expert misdispatch | Wrong expert | Taxonomy confidence gates |

## Verification

- Unit: shouldUseMoA, runMoA, dispatchExpert, bestOfN, costMultiplier
- Manual: high-complexity request → MoA; kill one proposer → still aggregates
- Regression: `tests/__baseline__/verify-no-regression.mjs`