# Implementation Plan 118 — Feature Gap Tracking & Coverage Analysis — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #gaps #coverage #roadmap #prioritization #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (SQLite repos in `src/lib/db/repos/*` exported from `src/lib/db/index.js`; migrations with `up`/`down` in `src/lib/db/migrations/`; roadmap from plan 50).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — register gaps; compute coverage; rank priorities.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-118-feature-gap-tracking.md`, `../research/9router/impl-plan-50-roadmap.md`, `../research/9router/impl-plan-18-feature-gap-review.md`.

## Scope

**In scope:** gap registry (id, area, description, severity, evidence, status; lifecycle identified → triaged → planned → done; dedup); coverage analysis (feature areas × implementation status, % covered per area); prioritization (severity × demand × effort scoring, ranked backlog); roadmap integration + dashboard gap tracker.
**Out of scope:** competitor research itself (plan 18); roadmap planning (plan 50).

## Milestones

### M1 — Gap registry

**Reference code (`src/lib/gaps/registry.js`):**

```js
// Gap model + lifecycle.
export const GAP_STATUS = ["identified", "triaged", "planned", "done"];

export function makeGap({ id, area, description, severity = "medium", evidence = [], status = "identified" } = {}) {
  if (!GAP_STATUS.includes(status)) throw new Error(`invalid gap status: ${status}`);
  return { id, area, description, severity, evidence, status, createdAt: Date.now() };
}

export function makeGapRegistry() {
  const gaps = new Map();
  return {
    add(gap) {
      if (gaps.has(gap.id)) return { ok: false, reason: "duplicate" }; // dedup
      gaps.set(gap.id, gap);
      return { ok: true, gap };
    },
    transition(id, to) {
      const g = gaps.get(id);
      if (!g) return { ok: false, reason: "not-found" };
      if (!GAP_STATUS.includes(to)) return { ok: false, reason: "invalid-status" };
      g.status = to;
      return { ok: true, gap: g };
    },
    byArea(area) { return [...gaps.values()].filter((g) => g.area === area); },
    all() { return [...gaps.values()]; },
  };
}
```

**Acceptance criteria:** lifecycle; dedup; area queries.

### M2 — Coverage analysis

**Reference code (`src/lib/gaps/coverage.js`):**

```js
// Coverage: feature areas × implementation status.
export function coverageReport(gaps, { areas = [] } = {}) {
  const report = {};
  for (const area of areas) {
    const inArea = gaps.filter((g) => g.area === area);
    const done = inArea.filter((g) => g.status === "done").length;
    report[area] = { total: inArea.length, done, pct: inArea.length ? done / inArea.length : 1 };
  }
  return report;
}

// Coverage metrics: % covered per area.
export function overallCoverage(gaps) {
  if (!gaps.length) return 1;
  return gaps.filter((g) => g.status === "done").length / gaps.length;
}

// Coverage reports: per-area dashboard data.
export function coverageSeries(gaps, { areas = [] } = {}) {
  const rep = coverageReport(gaps, { areas });
  return areas.map((a) => ({ area: a, ...rep[a] }));
}
```

**Acceptance criteria:** per-area coverage; overall metric.

### M3 — Prioritization

**Reference code (`src/lib/gaps/priority.js`):**

```js
// Priority scoring: severity × demand × effort.
export const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3, critical: 4 };

export function priorityScore(gap, { demand = 1, effort = 1 } = {}) {
  const severity = SEVERITY_WEIGHT[gap.severity] ?? 2;
  return { score: severity * demand / Math.max(0.1, effort), severity, demand, effort };
}

// Priority queue: ranked backlog.
export function rankGaps(gaps, { demandOf = () => 1, effortOf = () => 1 } = {}) {
  return gaps
    .map((g) => ({ gap: g, ...priorityScore(g, { demand: demandOf(g), effort: effortOf(g) }) }))
    .sort((a, b) => b.score - a.score);
}

// Roadmap integration: planned gaps → roadmap items.
export function toRoadmapItems(ranked, { topN = 10 } = {}) {
  return ranked.slice(0, topN).map((r) => ({ id: r.gap.id, area: r.gap.area, description: r.gap.description, priority: r.score }));
}
```

**Acceptance criteria:** scoring; ranking; roadmap items.

### M4 — Persistence + dashboard + tests

**Reference code (`src/lib/db/repos/gapRepo.js`):**

```js
// SQLite persistence for gaps.
export function makeGapRepo(db) {
  return {
    async init() {
      await db.exec(`CREATE TABLE IF NOT EXISTS gaps (
        id TEXT PRIMARY KEY, area TEXT, description TEXT, severity TEXT,
        evidence TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now'))
      )`);
    },
    async insert(gap) { await db.run(`INSERT INTO gaps (id, area, description, severity, evidence, status) VALUES (?, ?, ?, ?, ?, ?)`, [gap.id, gap.area, gap.description, gap.severity, JSON.stringify(gap.evidence ?? []), gap.status]); },
    async all() { return (await db.all(`SELECT * FROM gaps`)).map((r) => ({ ...r, evidence: JSON.parse(r.evidence ?? "[]") })); },
    async updateStatus(id, status) { await db.run(`UPDATE gaps SET status = ? WHERE id = ?`, [status, id]); },
  };
}
```

**Files touched:** `src/lib/gaps/` (new: registry, coverage, priority), `src/lib/db/repos/gapRepo.js` (new), dashboard gaps page (new), `docs/plans-and-prompts/research/9router/` (gap docs), `tests/unit/gaps.test.js` (new).

**Acceptance criteria:** persistence; dashboard; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Registry staleness | Outdated gaps | Review cadence |
| Coverage bias | Single source | Multiple sources |
| Priority noise | Bad rankings | Scoring model |
| Duplication | Double entries | Dedup checks |

## Verification

- Unit: makeGapRegistry, coverageReport, priorityScore, rankGaps, makeGapRepo
- Manual: add gap → triage → plan; coverage % updates
- Regression: `tests/__baseline__/verify-no-regression.mjs`