# Implementation Plan Import-20 — Quality, Verification & Rollout — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #quality #verification #rollout #testing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (parser registry from plan import-14; matcher from plan import-02; fingerprint from plan import-13; test conventions from `tests/` — vitest, independent ESM package; regression gate `tests/__baseline__/verify-no-regression.mjs`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — fixtures; accuracy; round-trip; rollout.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-20-quality-rollout.md`, `../research/9router/impl-plan-import-14-format-adapters.md`, `../research/9router/impl-plan-import-02-provider-matching.md`.

## Scope

**In scope:** acceptance criteria (functional + non-functional); fixture corpus + golden files; round-trip and property tests; staged rollout checklist; regression baselines.
**Out of scope:** format adapters (import-14); provider matching (import-02).

## Milestones

### M1 — Fixture harness

**Reference code (`tests/unit/import/fixtures.test.js`):**

```js
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { detectAndParse } from "@/lib/import/parsers/registry.js";

const FIXTURES_DIR = path.join(process.cwd(), "tests", "fixtures", "import");

function loadFixtures() {
  const dirs = fs.readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  return dirs.map((dir) => ({
    name: dir,
    input: fs.readFileSync(path.join(FIXTURES_DIR, dir, "input.jsonl"), "utf-8"),
    expected: JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, dir, "expected.json"), "utf-8")),
  }));
}

describe("import format adapters", () => {
  const fixtures = loadFixtures();

  for (const fixture of fixtures) {
    it(`parses ${fixture.name} correctly`, async () => {
      const messages = await detectAndParse(fixture.input);
      expect(messages.length).toBe(fixture.expected.length);
      for (let i = 0; i < messages.length; i++) {
        expect(messages[i].model).toBe(fixture.expected[i].model);
        expect(messages[i].provider).toBe(fixture.expected[i].provider);
        expect(messages[i].status).toBe(fixture.expected[i].status);
        expect(messages[i].conversationId).toBe(fixture.expected[i].conversationId);
      }
    });
  }
});
```

**Acceptance criteria:** fixtures load; golden files match.

### M2 — Matcher accuracy test

**Reference code (`tests/unit/import/matcher.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { matchModelToProvider } from "@/lib/import/matcher.js";

const KNOWN_MODELS = [
  ["claude-3-5-sonnet-20241022", "anthropic", 1.0],
  ["claude-3-5-sonnet", "anthropic", 1.0],
  ["gpt-4o", "openai", 1.0],
  ["gpt-4o-mini", "openai", 1.0],
  ["gemini-2.5-pro", "google", 1.0],
  ["gemini-2.5-flash", "google", 1.0],
  ["anthropic/claude-3-5-sonnet", "anthropic", 1.0],
  ["deepseek-chat", "deepseek", 1.0],
  ["llama-3.3-70b-instruct", "meta", 1.0],
];

describe("model → provider matching", () => {
  for (const [model, provider, confidence] of KNOWN_MODELS) {
    it(`matches ${model} → ${provider}`, async () => {
      const result = await matchModelToProvider(model);
      expect(result.provider).toBe(provider);
      expect(result.confidence).toBeGreaterThanOrEqual(confidence);
    });
  }

  it("returns unknown for unrecognized models", async () => {
    const result = await matchModelToProvider("totally-unknown-model-xyz");
    expect(result.provider).toBeNull();
    expect(result.confidence).toBe(0);
  });
});
```

**Acceptance criteria:** known models match; unknown handled.

### M3 — Round-trip test

**Reference code (`tests/unit/import/roundtrip.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { computeFingerprint } from "@/lib/import/fingerprint.js";

describe("export → import round-trip", () => {
  it("fingerprint is stable across serialization", () => {
    const msg = {
      model: "gpt-4o",
      request: { messages: [{ role: "user", content: "hi" }] },
      response: { content: "hello" },
      timestamp: "2026-09-17T00:00:00.000Z",
    };
    const fp1 = computeFingerprint(msg);
    // Same message after JSON round-trip (key order may change).
    const fp2 = computeFingerprint(JSON.parse(JSON.stringify(msg)));
    expect(fp1).toBe(fp2);
  });
});
```

**Acceptance criteria:** stable fingerprint; canonical JSON.

### M4 — Rollout checklist + regression

**Reference code (`docs/import-rollout-checklist.md`):**

```markdown
# Import System — Staged Rollout Checklist

## Stage 1 — Schema (import-01)
- [ ] Migration 005 runs on fresh + existing DBs
- [ ] `imported_messages` visible in declarative TABLES
- [ ] Repo insert/paginate tests pass

## Stage 2 — Pipeline (import-02/03/06/07)
- [ ] Matcher accuracy ≥ 95% on fixture corpus
- [ ] Import API auth + validation tests pass
- [ ] Cost formula verified against pricing table

## Stage 3 — Channels (import-04/05/15)
- [ ] Log watcher imports appended lines
- [ ] Hermes hook posts successfully
- [ ] NDJSON stream imports with backpressure

## Stage 4 — Hardening (import-10/11/12/13)
- [ ] Tenant scoping enforced in queries
- [ ] Scheduler retries + dead-letters
- [ ] Retention archives before purge
- [ ] Dedupe prevents double imports

## Stage 5 — UX (import-08/16/17/18/19)
- [ ] Messages page shows source badges
- [ ] Analytics UNION queries correct
- [ ] Agent recipes documented
- [ ] SDK import works end-to-end

## Regression gate
- [ ] `tests/__baseline__/verify-no-regression.mjs` passes
```

**Files touched:** `tests/fixtures/import/*/input.jsonl` + `expected.json` (new), `tests/unit/import/fixtures.test.js` (new), `tests/unit/import/matcher.test.js` (new), `tests/unit/import/roundtrip.test.js` (new), `docs/import-rollout-checklist.md` (new).

**Acceptance criteria:** checklist committed; regression gate.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Fixture drift | Stale goldens | Regenerate on change |
| Matcher accuracy | Wrong providers | Confidence thresholds |
| Round-trip loss | Data corruption | Canonical JSON |
| Rollout regressions | Broken imports | Baseline gate |

## Verification

- Unit: fixture harness, matcher accuracy, round-trip
- Manual: staged rollout checklist
- Regression: `tests/__baseline__/verify-no-regression.mjs`