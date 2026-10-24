# Implementation Plan 20: Quality, Verification & Rollout

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, quality, verification, rollout, testing

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-z-quality-rollout.md` (primary — fixtures, acceptance tests, staged rollout)
- `../2026-09-17-hermes-import-branch-j-testing-verification.md` (test harness conventions)
- `../2026-09-17-hermes-import-branch-n-migration-backward-compatibility.md` (schema-guard tests before each migration ships)

## Goal

Prove the import system works: acceptance criteria, fixture harness, staged rollout, regression protection. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| Test runner | Vitest in `tests/` (independent ESM package) — `npx vitest run` from `tests/`; `vitest.config.js` resolves `open-sse`/`@/` aliases from repo root |
| **`matchModelToProvider` is SYNCHRONOUS** | Plan 02: `matchModelToProvider(modelName)` — NOT async. Original test awaited it (would hang/undefined) |
| Adapter API | `db.run/get/all/exec` positional params — **no `.prepare()`** (original schema-guard test used `.prepare()`) |
| Baseline | `tests/__baseline__/verify-no-regression.mjs` — compares against committed snapshots; suite is NOT all-green (~938 pass, ~64 fail expected) |
| Fixtures dir | `tests/fixtures/` — does not exist yet; create `tests/fixtures/import/` |
| `computeFingerprint` | Plan 13: `computeFingerprint(message)` — canonical JSON + SHA-256, 16-hex |
| `normalizeModelName` | Plan 02: `normalizeModelName(name)` — sync, returns `""` for null/empty |

## Scope

- Acceptance criteria (functional + non-functional)
- Fixture corpus + golden files
- Round-trip and property tests
- Staged rollout checklist
- Regression baselines

## Design

### 1. Fixture Harness — `tests/unit/import/fixtures.test.js`

**Purpose:** Parse golden files and compare against expected output.

**⚠️ GROUNDING FIX:** Original used `@/lib/import/parsers/registry.js` — plan 14 defines `src/lib/import/parsers/registry.js` with `detectAndParse(content, hint)` (async). Keep the await.

```javascript
// tests/unit/import/fixtures.test.js
// SUGGESTION ONLY
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

### 2. Matcher Accuracy Test — `tests/unit/import/matcher.test.js`

**Purpose:** Verify model → provider matching on known models.

**⚠️ GROUNDING FIX:** `matchModelToProvider` is **synchronous** (plan 02) — remove `await`.

```javascript
// tests/unit/import/matcher.test.js
// SUGGESTION ONLY
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
    it(`matches ${model} → ${provider}`, () => {
      const result = matchModelToProvider(model); // SYNC — no await
      expect(result.provider).toBe(provider);
      expect(result.confidence).toBeGreaterThanOrEqual(confidence);
    });
  }

  it("returns unknown for unrecognized models", () => {
    const result = matchModelToProvider("totally-unknown-model-xyz");
    expect(result.provider).toBeNull();
    expect(result.confidence).toBe(0);
  });
});
```

### 3. Round-Trip Test — `tests/unit/import/roundtrip.test.js`

**Purpose:** Fingerprint stability across serialization.

```javascript
// tests/unit/import/roundtrip.test.js
// SUGGESTION ONLY
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
    // Same message after JSON round-trip (key order may change)
    const fp2 = computeFingerprint(JSON.parse(JSON.stringify(msg)));
    expect(fp1).toBe(fp2);
  });

  it("different messages have different fingerprints", () => {
    const a = { model: "gpt-4o", request: { messages: [{ role: "user", content: "hi" }] }, timestamp: "2026-09-17T00:00:00.000Z" };
    const b = { model: "gpt-4o", request: { messages: [{ role: "user", content: "bye" }] }, timestamp: "2026-09-17T00:00:00.000Z" };
    expect(computeFingerprint(a)).not.toBe(computeFingerprint(b));
  });
});
```

### 4. Property Test (Fuzz) — `tests/unit/import/fuzz.test.js`

**Purpose:** `normalizeModelName` never throws.

```javascript
// tests/unit/import/fuzz.test.js
// SUGGESTION ONLY
import { describe, it, expect } from "vitest";
import { normalizeModelName } from "@/lib/import/matcher.js";

function randomString(len) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789-/_.";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

describe("normalizeModelName fuzz", () => {
  it("never throws on random input", () => {
    for (let i = 0; i < 1000; i++) {
      const input = randomString(Math.floor(Math.random() * 50));
      expect(() => normalizeModelName(input)).not.toThrow();
    }
  });

  it("handles empty/null gracefully", () => {
    expect(normalizeModelName(null)).toBe("");
    expect(normalizeModelName("")).toBe("");
    expect(normalizeModelName(undefined)).toBe("");
  });
});
```

### 5. Schema Guard Test — `tests/unit/import/schema-guard.test.js`

**Purpose:** Verify `imported_messages` has the documented columns.

**⚠️ GROUNDING FIX:** Original used `db.prepare("PRAGMA table_info(...)").all()` — adapter has no `.prepare()`. Use `db.all(sql)`.

```javascript
// tests/unit/import/schema-guard.test.js
// SUGGESTION ONLY
import { describe, it, expect } from "vitest";
import { getAdapter } from "@/lib/db/driver";

describe("imported_messages schema guard", () => {
  it("has the documented columns", async () => {
    const db = await getAdapter();
    const cols = db.all("PRAGMA table_info(imported_messages)"); // no .prepare()
    const names = cols.map((c) => c.name);
    for (const expected of [
      "id", "imported_at", "source", "source_session_id", "provider", "model",
      "model_match_confidence", "status", "latency_ms", "prompt_tokens",
      "completion_tokens", "total_tokens", "cost", "request_json", "response_json",
      "error_message", "error_category", "conversation_id", "source_app", "metadata",
    ]) {
      expect(names).toContain(expected);
    }
  });
});
```

### 6. Rollout Checklist

```markdown
# Staged Rollout Checklist

## Stage 1 — Manual Only (lowest risk)
- [ ] Migration applied cleanly on fresh + existing DB
- [ ] Manual JSON import works via UI modal
- [ ] Matcher maps known models correctly
- [ ] Messages appear in Messages page with source badge
- [ ] Unknown models recorded

## Stage 2 — Log Tail (opt-in)
- [ ] Log file watcher imports new lines
- [ ] Dedupe prevents double-import
- [ ] Parsers handle real log formats
- [ ] Import jobs show progress

## Stage 3 — Hook/Proxy (real-time)
- [ ] Hermes hook payload imports
- [ ] Claude Code via proxy captured natively
- [ ] SSE live updates on dashboard
- [ ] Idempotency keys work

## Stage 4 — Automation (lifecycle)
- [ ] Scheduled imports run
- [ ] Retention purges old rows
- [ ] Archive + restore works
- [ ] Catalog sync runs daily
```

## Steps (per-part instructions)

### Step 1 — Create `tests/fixtures/import/` with golden files
1. Create `tests/fixtures/import/{hermes,claude-code,cursor,codex}/input.jsonl` + `expected.json`.
2. **Verify:** `npx vitest run unit/import/fixtures.test.js` passes.

### Step 2 — Write unit tests
1. Create `matcher.test.js`, `roundtrip.test.js`, `fuzz.test.js`, `schema-guard.test.js`.
2. **Verify:** `npx vitest run unit/import/` passes.

### Step 3 — Add import tests to baseline
1. Add import test names to `tests/__baseline__/verify-no-regression.mjs`.
2. **Verify:** baseline script runs without new regressions.

### Step 4 — Run staged rollout per checklist
1. Execute Stage 1 → 4, checking off items.
2. **Verify:** each stage's items pass before moving on.

### Step 5 — Update skill with final API + config
1. Update `skills/9router-message-import/SKILL.md` with the final endpoints + config.
2. **Verify:** skill examples match real endpoint paths.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| Fixture corpus | Needs real log samples | Collect from user's actual logs |
| Test DB | Isolation | Use in-memory DB per test |
| Baseline | Suite not all-green | Add import tests to baseline script |
| `matchModelToProvider` sync | Awaiting it breaks tests | Call without await |

## Verification (commands)

```bash
# From tests/ (independent vitest package)
npx vitest run unit/import/
# Expect: all fixture, matcher, roundtrip, fuzz, schema-guard tests pass
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.