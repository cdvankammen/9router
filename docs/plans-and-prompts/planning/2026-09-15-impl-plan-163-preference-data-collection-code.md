# Implementation Plan 163 — Preference Data Collection Pipeline — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #preferences #arena #feedback #pipeline #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (feedback selection from plan 83; human preference learning from plan 103; classifier training data from plan 131 (`src/lib/classifier/data.js`); dataset construction from plan 148 (`tests/benchmarks/datasets/`); SQLite repos in `src/lib/db/repos/`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — collection; storage; export.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-163-preference-data-collection.md`, `../research/9router/impl-plan-83-feedback-selection.md`, `../research/9router/impl-plan-103-human-preference-learning.md`.

## Scope

**In scope:** collection (dashboard/API/CLI points, thumbs/pairwise UI, metadata); storage (SQLite-backed, schema, PII filtering); pipeline (export, analysis, feedback to routers); integration.
**Out of scope:** preference learning internals (plan 103); dataset construction (plan 148).

## Milestones

### M1 — Collection

**Reference code (`src/lib/preferences/collect.js`):**

```js
// Collection: record a preference vote.
export function makePreferenceCollector() {
  const votes = [];
  return {
    // vote: {query, modelA, modelB, winner, context}
    record(vote) {
      const clean = sanitize(vote);
      if (!validate(clean)) return { ok: false, reason: "invalid" };
      votes.push({ ...clean, at: Date.now() });
      return { ok: true, vote: clean };
    },
    all() { return votes; },
    count() { return votes.length; },
  };
}

// PII filtering: strip emails, phones, keys.
export function sanitize(vote) {
  const text = JSON.stringify(vote);
  const cleaned = text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[phone]")
    .replace(/(sk-[A-Za-z0-9]{8,})/g, "[key]");
  return JSON.parse(cleaned);
}

// Validation: winner must be A or B.
export function validate(vote) {
  return Boolean(vote?.query && vote?.modelA && vote?.modelB && ["A", "B"].includes(vote?.winner));
}
```

**Acceptance criteria:** collector; sanitize; validate.

### M2 — Storage

**Reference code (`src/lib/db/repos/preferences.js`):**

```js
// Preference store: SQLite-backed.
import { getAdapter } from "@/lib/db/driver.js";

export function makePreferenceRepo(db = getAdapter()) {
  db.exec(`CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    model_a TEXT NOT NULL,
    model_b TEXT NOT NULL,
    winner TEXT NOT NULL CHECK (winner IN ('A','B')),
    context TEXT,
    created_at INTEGER NOT NULL
  )`);
  return {
    insert(vote) {
      const stmt = db.prepare(`INSERT INTO preferences (query, model_a, model_b, winner, context, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
      return stmt.run(vote.query, vote.modelA, vote.modelB, vote.winner, JSON.stringify(vote.context ?? {}), Date.now());
    },
    all() {
      return db.prepare(`SELECT * FROM preferences ORDER BY created_at DESC`).all();
    },
    count() {
      return db.prepare(`SELECT COUNT(*) AS n FROM preferences`).get().n;
    },
    // Win rates: per-model.
    winRates() {
      const rows = db.prepare(`SELECT model_a AS model, COUNT(*) AS n FROM preferences WHERE winner='A' GROUP BY model_a`).all();
      const totals = db.prepare(`SELECT model_a AS model, COUNT(*) AS n FROM preferences GROUP BY model_a`).all();
      return rows.map((r) => ({ model: r.model, wins: r.n, total: totals.find((t) => t.model === r.model)?.n ?? 0 }));
    },
  };
}
```

**Acceptance criteria:** schema; insert; win rates.

### M3 — Pipeline

**Reference code (`src/lib/preferences/export.js`):**

```js
// Export: preferences for training.
export function exportPreferences({ votes = [], format = "jsonl" } = {}) {
  if (format === "jsonl") return votes.map((v) => JSON.stringify(v)).join("\n");
  return JSON.stringify(votes, null, 2);
}

// Analysis: win rates + patterns.
export function analyze({ votes = [] } = {}) {
  const wins = new Map();
  for (const v of votes) {
    const winner = v.winner === "A" ? v.modelA : v.modelB;
    wins.set(winner, (wins.get(winner) ?? 0) + 1);
  }
  const total = votes.length || 1;
  return {
    total: votes.length,
    winRates: Object.fromEntries([...wins.entries()].map(([m, n]) => [m, n / total])),
    byDomain: votes.reduce((acc, v) => { const d = v.context?.domain ?? "unknown"; acc[d] = (acc[d] ?? 0) + 1; return acc; }, {}),
  };
}

// Feedback: feed win rates to routers.
export function feedbackSignal({ analysis, minVotes = 10 } = {}) {
  if (analysis.total < minVotes) return { ready: false, reason: "insufficient" };
  return { ready: true, signal: analysis.winRates };
}
```

**Acceptance criteria:** export; analysis; feedback.

### M4 — Integration + tests

**Reference code (`src/lib/preferences/integrate.js`):**

```js
// Routing integration: preference signals.
export function preferenceBoost({ signal = {}, modelId = null } = {}) {
  const rate = signal[modelId] ?? 0.5;
  return { boost: (rate - 0.5) * 2, rate }; // [-1, 1]
}

// Fail-open.
export function safePreference(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/preferences/` (new: collect, export, integrate), `src/lib/db/repos/preferences.js` (new), dashboard preference UI (new), `tests/unit/preferences.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Low volume | Weak signal | Multiple collection points |
| Bias | Skewed data | Balanced collection |
| Privacy | PII leaks | PII filtering |
| Quality | Bad labels | Validation |

## Verification

- Unit: makePreferenceCollector, sanitize, validate, makePreferenceRepo, exportPreferences, analyze, feedbackSignal, preferenceBoost
- Manual: vote → store → export → win rates
- Regression: `tests/__baseline__/verify-no-regression.mjs`