---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, testing, coverage, ci, quality
---

# Implementation Plan 32 — Test Coverage & CI Hardening

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "testing/CI" option: comprehensive test coverage and CI hardening.

## 1. Goal

Harden 9Router's testing and CI: comprehensive unit/integration coverage, CI pipeline with regression baselines, and test reliability — so regressions are caught before release.

## 2. Background (from research)

- **9Router current state**: vitest suite (~938 pass, ~64 known-fail); regression baselines (`tests/__baseline__/verify-*.mjs`); tests are an independent ESM package.
- **Research findings**: known-fails must be tracked; regression baselines must be enforced; CI must run baselines; test reliability (no flaky tests).

## 3. Design

### 3.1 Coverage Expansion

- **Coverage targets**: routing, translation, executors, error handling, DB repos.
- **Coverage measurement**: vitest coverage reports.
- **Coverage gates**: per-area minimums.

### 3.2 Known-Fail Management

- **Known-fail registry**: tracked with reasons.
- **Known-fail reduction**: fix prioritized known-fails.
- **Known-fail verification**: verify still-failing.

### 3.3 CI Pipeline

- **CI stages**: lint → unit → baselines → coverage.
- **Baseline enforcement**: verify-*.mjs in CI.
- **CI caching**: dependency caching for speed.

### 3.4 Test Reliability

- **Flaky test detection**: rerun detection.
- **Test isolation**: no shared state.
- **Test timeouts**: per-test timeouts.

## 4. Implementation Steps

1. Measure current coverage.
2. Add coverage for gaps.
3. Track known-fails.
4. Build CI pipeline.
5. Add flaky detection.
6. Tests: coverage gates, baselines.

## 5. Files Touched

- `tests/` (coverage, new tests)
- `tests/__baseline__/` (extend)
- `.github/workflows/ci.yml` (new)
- `vitest.config.js` (coverage)
- `scripts/check-known-fails.mjs` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Coverage theater | Meaningful assertions |
| CI flakiness | Isolation; retries |
| Baseline staleness | Update with review |
| Time cost | Parallel CI |

## 7. Success Criteria

- Coverage targets met.
- Known-fails tracked + reduced.
- CI runs baselines.
- No flaky tests.

## 8. Related Plans
- Plan 7 (Eval Harness) — evaluation synergy.
- Plan 20 (Master Rules) — testing rules.
- Plan 31 (Performance) — perf tests.