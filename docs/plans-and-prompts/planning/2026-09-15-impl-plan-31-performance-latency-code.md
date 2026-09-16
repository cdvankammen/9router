# Implementation Plan 31 — Performance & Latency Optimization — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #performance #latency #benchmark #profiling #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/handlers/chatCore.js` stages, `open-sse/translator/` hot paths, `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the benchmark, check budgets, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-31-performance-latency.md`, `../research/9router/46-branch-evaluation-and-cost-quality.md` (perf tie-in)

## Scope

**In scope:** per-stage latency profiling (parse/classify/score/select/execute); routing overhead target <10ms; streaming chunk overhead target <5ms; translation hot paths + direct routes; connection reuse; benchmark suite (p50/p95/p99); performance tests in CI with budgets.
**Out of scope:** upstream provider latency (external); network tuning.

## Milestones

### M1 — Per-stage profiling

**Reference code (`open-sse/services/latencyProfiler.js`):**

```js
// Profile each routing stage; record to latencyRepo.
export class LatencyProfiler {
  constructor() {
    this.stages = new Map(); // stage -> [durations]
  }

  async measure(stage, fn) {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const dur = performance.now() - start;
      const list = this.stages.get(stage) ?? [];
      list.push(dur);
      this.stages.set(stage, list);
    }
  }

  summary() {
    const out = {};
    for (const [stage, list] of this.stages) {
      const sorted = [...list].sort((a, b) => a - b);
      out[stage] = {
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
        count: list.length,
      };
    }
    return out;
  }
}

// Wiring in chatCore: wrap parse/classify/score/select/execute stages.
export const profiler = new LatencyProfiler();
```

**Acceptance criteria:** stages profiled; p50/p95/p99 computed; recorded.

### M2 — Routing overhead budget

**Reference code (`open-sse/services/smartRouter.js` optimization):**

```js
// Budget: routing overhead (classify + score + select) must stay < 10ms.
// Techniques: precompiled scoring closures, cached model metadata, avoid JSON.parse in hot path.
export function scoreModelFast(model, taskType, settings) {
  // Precompiled: metadata loaded once at startup into a Map.
  const meta = MODEL_META_CACHE.get(model);
  if (!meta) return 0;
  let score = meta.baseScore;
  if (meta.taskScores?.[taskType]) score += meta.taskScores[taskType];
  if (settings.costQualityTradeoff) score *= settings.costQualityTradeoff;
  return score;
}

// Streaming chunk overhead: < 5ms per chunk (normalize + write).
export function fastNormalizeChunk(raw) {
  // Avoid regex-heavy paths; direct string ops.
  if (raw.startsWith("data: [DONE]")) return { done: true };
  if (!raw.startsWith("data:")) return null;
  const json = raw.slice(5).trim();
  if (!json) return null;
  try {
    return { done: false, chunk: JSON.parse(json) };
  } catch {
    return null;
  }
}
```

**Acceptance criteria:** routing <10ms p95; chunk overhead <5ms p95; measured in benchmark.

### M3 — Translation hot paths + connection reuse

**Reference code (`open-sse/translator/` optimization):**

```js
// Direct routes: skip double-hop translation for fragile pairs (already exists — extend).
// Hot path: cache compiled translators; avoid re-registration lookups.
const translatorCache = new Map(); // "source:target" -> { reqFn, resFn }

export function getTranslatorCached(source, target) {
  const key = `${source}:${target}`;
  if (translatorCache.has(key)) return translatorCache.get(key);
  const t = findTranslator(source, target);
  translatorCache.set(key, t);
  return t;
}

// Connection reuse: keep-alive agent for upstream fetches.
import { Agent } from "undici";
export const sharedAgent = new Agent({ connections: 50, keepAliveTimeout: 60_000 });
// Use: fetch(url, { dispatcher: sharedAgent })
```

**Acceptance criteria:** translator cache; direct routes preferred; connection reuse via shared agent.

### M4 — Benchmark suite + CI budgets

**Reference code (`scripts/benchmark-routing.mjs`):**

```js
// Benchmark: synthetic request mix; report p50/p95/p99 per stage.
import { profiler } from "../open-sse/services/latencyProfiler.js";

export async function runBenchmark({ iterations = 10_000 } = {}) {
  for (let i = 0; i < iterations; i++) {
    const req = syntheticRequest(i);
    await profiler.measure("parse", () => parseRequest(req));
    await profiler.measure("classify", () => classifyTask(req));
    await profiler.measure("score", () => scoreCandidates(req));
    await profiler.measure("select", () => selectWinner(req));
  }
  const summary = profiler.summary();
  const budgets = {
    parse: 2, classify: 3, score: 3, select: 2, // ms p95
  };
  const failures = [];
  for (const [stage, budget] of Object.entries(budgets)) {
    if (summary[stage]?.p95 > budget) failures.push(`${stage}: ${summary[stage].p95.toFixed(2)}ms > ${budget}ms`);
  }
  if (failures.length) {
    console.error("BUDGET FAILURES:", failures.join(", "));
    process.exit(1);
  }
  console.log("Benchmark OK:", JSON.stringify(summary, null, 2));
}
```

**Files touched:** `tests/performance/` (perf tests with budgets), CI step.

**Acceptance criteria:** benchmark runs; budgets enforced in CI; no regressions.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Profiling overhead | Sampling; async recording |
| Budget flakiness | p95 with warmup; CI variance allowance |
| Connection reuse leaks | Agent lifecycle management |

## Verification

- Benchmark: `node scripts/benchmark-routing.mjs` → budgets pass
- CI: perf step enforces budgets
- Regression: `tests/__baseline__/verify-no-regression.mjs`