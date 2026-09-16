# Implementation Plan 32 — Test Coverage & CI Pipeline — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #test-coverage #ci #known-fails #flaky-tests #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `tests/vitest.config.js`, `tests/__baseline__/verify-no-regression.mjs`, `tests/__baseline__/known-fails.txt`, root `package.json` scripts).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the pipeline steps, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-32-test-coverage-ci.md`, `../research/9router/47-branch-9router-internal-threads.md` (CI tie-in)

## Scope

**In scope:** coverage measurement + per-area gates; known-fail registry (tracked with reasons, reduction prioritized); CI pipeline (lint → unit → baselines → coverage) with verify-*.mjs enforcement; flaky test detection (rerun), isolation, per-test timeouts.
**Out of scope:** e2e browser suite (separate); coverage of `cli/` (separate pipeline).

## Milestones

### M1 — Coverage measurement + gates

**Reference code (`tests/vitest.config.js` extension):**

```js
// Enable coverage with per-area thresholds.
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        // Per-area gates (relaxed initially, tightened over time):
        "src/sse/": { lines: 60, functions: 60, branches: 40 },
        "open-sse/handlers/": { lines: 70, functions: 70, branches: 50 },
        "open-sse/translator/": { lines: 80, functions: 80, branches: 60 },
        "src/lib/db/": { lines: 65, functions: 65, branches: 45 },
      },
    },
  },
});
```

**Acceptance criteria:** coverage measured; per-area thresholds enforced; report generated.

### M2 — Known-fail registry

**Reference code (`scripts/check-known-fails.mjs`):**

```js
// Parse known-fails.txt; verify each entry still fails (or is fixed).
import { readFileSync } from "node:fs";

export async function checkKnownFails() {
  const lines = readFileSync("tests/__baseline__/known-fails.txt", "utf8")
    .split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  const results = [];
  for (const line of lines) {
    const [file, reason] = line.split("|").map((s) => s.trim());
    const stillFails = await testFileFails(file);
    results.push({ file, reason, stillFails });
    if (!stillFails) {
      console.log(`[known-fails] FIXED: ${file} — remove from registry!`);
    }
  }
  return results;
}

async function testFileFails(file) {
  // Run vitest on the file; return true if it fails.
  const { execSync } = await import("node:child_process");
  try {
    execSync(`npx vitest run ${file}`, { cwd: "tests", stdio: "pipe" });
    return false; // passes now
  } catch {
    return true;
  }
}
```

**Acceptance criteria:** registry parsed; fixed entries flagged; reduction tracked.

### M3 — CI pipeline

**Reference code (`.github/workflows/ci.yml`):**

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx eslint .
      - run: cd tests && npm ci
      - run: npx vitest run --coverage
      - run: node tests/__baseline__/verify-no-regression.mjs
      - run: node scripts/check-known-fails.mjs
      - run: node scripts/check-rule-coverage.mjs
```

**Acceptance criteria:** pipeline runs all gates; baselines enforced; known-fails checked.

### M4 — Flaky test handling + tests

**Reference code (`tests/vitest.config.js` extension):**

```js
// Flaky detection: rerun failed tests up to 2x; per-test timeout.
test: {
  retry: 2,
  testTimeout: 10_000,
  hookTimeout: 15_000,
  // Isolation: each test file in its own worker by default (vitest default).
}
```

**Files touched:** `tests/unit/ci-pipeline.test.js` (new — tests the check scripts).

**Acceptance criteria:** retries configured; timeouts set; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Coverage thresholds too strict | Start relaxed; tighten |
| Known-fail registry drift | CI check flags fixed entries |
| CI runtime | Parallel jobs; caching |

## Verification

- Local: `npx vitest run --coverage` → thresholds pass
- CI: pipeline green
- Scripts: `node scripts/check-known-fails.mjs` → registry accurate