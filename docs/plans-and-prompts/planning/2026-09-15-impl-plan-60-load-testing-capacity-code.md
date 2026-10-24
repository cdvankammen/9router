# Implementation Plan 60 — Load Testing & Capacity Planning — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #load-testing #capacity #benchmark #scaling #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (dev server startup via `npm run dev`/`start`; `custom-server.js`; rate limiter limits (`general: 120`, `chat: 20` per 60s) — load tests must account for these; `scripts/smoke-test.mjs` as a pattern).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the load generator against a local instance; confirm metrics; record a baseline.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-60-load-testing-capacity.md`, `../research/9router/impl-plan-31-performance.md`, `../research/9router/impl-plan-41-docker-deployment.md`.

## Scope

**In scope:** load generator (configurable concurrency, rate, duration); scenarios (chat, streaming, embeddings, mixed); metrics (throughput, latency percentiles, error rate); repeatable capacity benchmarks (max RPS, max concurrent, saturation point); baseline tracking across versions; `docs/SCALING.md`; CI smoke load test.
**Out of scope:** distributed load generation; production traffic replay.

## Milestones

### M1 — Load generator

**Reference code (`scripts/load-test.mjs`):**

```js
// Usage: node scripts/load-test.mjs --url http://127.0.0.1:20128 --concurrency 10 --duration 30 --scenario chat
import { performance } from "node:perf_hooks";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const URL = args.url ?? "http://127.0.0.1:20128";
const CONCURRENCY = Number(args.concurrency ?? 10);
const DURATION = Number(args.duration ?? 30);
const SCENARIO = args.scenario ?? "chat";

const SCENARIOS = {
  chat: () => ({
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Say hello" }], max_tokens: 8 }),
  }),
  streaming: () => ({
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Count to 10" }], max_tokens: 32, stream: true }),
  }),
  embeddings: () => ({
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: "hello world" }),
  }),
};

const latencies = [];
let errors = 0;
let requests = 0;
const start = performance.now();

async function worker() {
  while (performance.now() - start < DURATION * 1000) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${URL}/v1/chat/completions`, SCENARIOS[SCENARIO]());
      if (!res.ok) errors++;
    } catch { errors++; }
    latencies.push(performance.now() - t0);
    requests++;
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
const sorted = [...latencies].sort((a, b) => a - b);
const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;

console.log(JSON.stringify({
  scenario: SCENARIO, concurrency: CONCURRENCY, duration: DURATION,
  requests, errors, errorRate: (errors / requests).toFixed(3),
  rps: (requests / DURATION).toFixed(1),
  latency: { p50: pct(0.5).toFixed(0), p95: pct(0.95).toFixed(0), p99: pct(0.99).toFixed(0), max: pct(1).toFixed(0) },
}, null, 2));
```

**Acceptance criteria:** generator runs all scenarios; metrics reported; exit code non-zero on high error rate.

### M2 — Capacity benchmark

**Reference code (`scripts/capacity-bench.mjs`):**

```js
// Sweep concurrency to find saturation point.
import { execSync } from "node:child_process";

const URL = process.argv[2] ?? "http://127.0.0.1:20128";
const results = [];
for (const concurrency of [1, 5, 10, 25, 50, 100]) {
  const out = execSync(`node scripts/load-test.mjs --url ${URL} --concurrency ${concurrency} --duration 15 --scenario chat`, { encoding: "utf8" });
  const r = JSON.parse(out);
  results.push({ concurrency, rps: Number(r.rps), p95: Number(r.latency.p95), errorRate: Number(r.errorRate) });
  if (r.errorRate > 0.05) { console.log("Saturation reached at concurrency", concurrency); break; }
}
console.table(results);
// Write baseline to tests/performance/baseline.json for drift tracking.
```

**Acceptance criteria:** sweep repeatable; saturation identified; baseline recorded.

### M3 — Scaling guide

**Reference code (`docs/SCALING.md`):**

```markdown
# Scaling 9Router

## Vertical
- Node 22+, 2 vCPU / 2 GB minimum; 4 vCPU / 4 GB recommended for 50+ concurrent.
- SQLite WAL (plan 43) handles single-writer concurrency; keep DB on local SSD.
- Rate limiter defaults (120 general / 20 chat per 60s) are per-instance.

## Horizontal
- Stateless app + shared volume for ~/.9router (SQLite needs single-writer — use one primary + read replicas later).
- Put instances behind a reverse proxy (Caddy/Nginx) with sticky sessions for dashboard.
- Health checks (/healthz, /readyz — plan 49) for orchestrator routing.

## Bottlenecks
- Upstream provider latency dominates (not the gateway) — measure with plan 53 analytics.
- SQLite writes under load — batch usage writes (plan 43 hygiene).
- Streaming memory — monitor RSS; tune Node heap if needed.
```

**Acceptance criteria:** guide covers vertical/horizontal/bottlenecks; reviewed by implementing agent.

### M4 — CI smoke + baseline tracking

**Reference code (`tests/performance/load/smoke.test.js`):**

```js
import { describe, it, expect } from "vitest";

// CI smoke: tiny load run against a booted dev server (skipped unless LOAD_TEST_URL set).
const URL = process.env.LOAD_TEST_URL;
const skip = URL ? describe : describe.skip;

skip("Load smoke", () => {
  it("handles 5 concurrent chat requests with <5% errors", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, async () => {
      try {
        const res = await fetch(`${URL}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }], max_tokens: 4 }),
        });
        return res.ok;
      } catch { return false; }
    }));
    const errors = results.filter((r) => !r).length;
    expect(errors / results.length).toBeLessThan(0.05);
  });
});
```

**Files touched:** `scripts/load-test.mjs` (new), `scripts/capacity-bench.mjs` (new), `docs/SCALING.md` (new), `tests/performance/load/` (new), `src/lib/db/repos/capacityRepo.js` (new: baseline storage).

**Acceptance criteria:** smoke test in CI; baseline drift check compares capacity over versions.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Test flakiness | False alarms | Repeatable harness + fixed durations |
| Resource cost | CI slowdown | Scoped smoke runs only |
| Benchmark drift | Misleading trends | Baseline tracking |
| Rate limiter interference | Wrong numbers | Document + bypass via config |

## Verification

- Scripts: load-test, capacity-bench
- Manual: run sweep → saturation point → scaling guide
- CI: smoke test
- Regression: `tests/__baseline__/verify-no-regression.mjs`