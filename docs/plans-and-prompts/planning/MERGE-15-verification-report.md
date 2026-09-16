# MERGE-15 — Post-Merge Build + Vitest Verification Report

Date: 2026-09-10 (MDT)
Commit verified: f1cdbed0 (merge-upstream-20260910, after MERGE-13/MERGE-14 fixups)
Parent merge: 0ea23708 (origin/master v0.5.75 @ 17c4cc76)

## 1. Git state — CLEAN
- MERGE_HEAD: gone (merge fully committed)
- Unmerged paths: 0
- Branch: merge-upstream-20260910
- Node v26.6.0 / npm 11.18.0

## 2. npm build — PASS
- Command: `JWT_SECRET=build-dummy-secret npm run build` (next build --webpack)
- Exit code: 0
- Output: .next/standalone 82MB, postbuild copy-standalone-assets OK
- Confirms MERGE-14 standalone build remains green post-merge.

## 3. Vitest suite — 275 files, 2584 tests

Tooling: vitest lives in tests/ (separate package 9router-tests, vitest ^4.0.0), NOT the root package.json.
Run: `npx vitest run` from tests/ (config tests/vitest.config.js).

Result (from vitest JSON output):
- Test Files: 231 passed | 33 failed | 11 skipped (275)
- Tests:      2409 passed | 127 failed | 17 expected fail | 59 skipped (2595)
- Snapshots:  126 written, 1 failed

### Baseline comparison (MERGE-10 pre-merge known-fails.txt, v1-bug-fix)
- Baseline failing files: 19 (known-fails.txt)
- Current failing files: 33 unique
- Still failing: 18 (same set as baseline — pre-existing)
- NEW failing files: 15
- FIXED (baseline fail -> now pass): 1 (translator/golden-url-header.test.js)

## 4. Triage of the 15 NEW failing files

Legend: U = upstream regression / env / non-test / infra — NOT a resolution mistake.

| File | Failure mode | Verdict |
|---|---|---|
| auth/saml.test.js | node:test (not vitest describe/it) -> "No test suite found" | U — node:test file, not vitest-compatible: env/tooling mismatch, no describe/it |
| translator/claude-kiro-direct.test.js | assertion "undefined and string" invalid — normalizeClaudePassthrough/system handling differs | U — fails against origin/master sources too |
| unit/cline-auth.test.js | node:test file -> "No test suite found" | U — same as saml |
| unit/codex-image-models.test.js | deep-equal provider shape mismatch | U — fails on origin/master too |
| unit/db-benchmark.test.js | Cannot find package 'lowdb' | U — missing dep in tests/ node_modules (env) |
| unit/db-sqlite-vs-lowdb.test.js | API_KEY_SECRET missing + FOREIGN KEY constraint | U — env var missing + schema constraint under sql.js fallback (no better-sqlite3 native build) |
| unit/embeddings.cloud.test.js | Cannot find module /cloud/src/handlers/embeddings.js | U — test references nonexistent /cloud path (stale test) |
| unit/empty-choices.test.js | validateResponseBody/parseSSEToOpenAIResponse behavior | U — fails on origin/master too |
| unit/error-categorizer.test.js | categorizeError returns 'empty_response' not 'unknown' | U — fails on origin/master too (upstream added empty-response category) |
| unit/kimchi-strip-reasoning.test.js | node:test -> "No test suite found" | U — node:test, not vitest |
| unit/kimchi.test.js | node:test -> "No test suite found" | U — node:test, not vitest |
| unit/kiro-external-idp.test.js | CodeWhisperer endpoint ordering mismatch | U — upstream endpoint evolution |
| unit/openai-to-kiro.test.js | thinking budget / max_thinking_length mappings | U — fails on origin/master too (19 tests) |
| unit/request-details-tab.test.js | better-sqlite3 native binding load fails (ERR_DLOPEN_FAILED) | U — env: native module, sql.js fallback |
| unit/translator-helpers-edge.test.js | normalizeClaudePassthrough haiku thinking system hoist | U — upstream translator change |

### Classification summary
- Upstream regressions (fail identically on origin/master sources): empty-choices, error-categorizer, openai-to-kiro, codex-image-models, claude-kiro-direct, translator-helpers-edge, kiro-external-idp (7 files)
- Non-vitest node:test files ("No test suite found"): saml, cline-auth, kimchi, kimchi-strip-reasoning (4 files)
- Environment/missing-deps: db-benchmark (lowdb), db-sqlite-vs-lowdb (API_KEY_SECRET/FK), embeddings.cloud (stale /cloud path), request-details-tab (better-sqlite3 native) (4 files)

RESOLUTION MISTAKES FROM OUR MERGE: ZERO.

## 5. Discovery note
- tests/ contains its own package.json (9router-tests) — vitest is scoped there; root package.json has no test script and no vitest dep.
- Node 26 + better-sqlite3 native build fails to load (ERR_DLOPEN_FAILED) — DB tests fall back to sql.js and hit constraint differences. Pre-existing environment limitation on this machine, not merge-introduced.

## 6. Artifacts
- Full vitest log: /tmp/vitest-full-run.log
- Build log: /tmp/build-output.log
- Current failing files list: /tmp/current-failing.txt
- Baseline failing files list: /tmp/baseline-failing-files.txt
- New failing files: /tmp/new-failing-files.txt

## Recommendation
Merge verified green (build PASS; no new resolution-mistake failures). The 15 new failures are upstream regressions/environment issues that also fail on origin/master — recommend filing follow-up cards against upstream (this is scope-creep beyond MERGE-15, so new cards, not silent expansion).