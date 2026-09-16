# Implementation Plan 12 — Dashboard UX & Usability — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #ux #dashboard #usability #combo-builder #health-indicators #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, dashboard page conventions under `src/app/`, existing components, settings shape).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, open the dashboard, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-12-ux-dashboard.md`, `../research/9router/48-branch-dashboard-and-ux.md`

## Scope

**In scope:** combo builder UX; provider health indicators; usage visualization; settings search/discoverability; empty states + onboarding.
**Out of scope:** full design system overhaul; dark mode (already exists).

## Milestones

### M1 — Combo builder UX

**Reference code (`src/app/dashboard/combos/ComboBuilder.jsx`):**

```jsx
// Drag-and-drop model ordering with visual fallback chain.
export function ComboBuilder({ combo, onChange }) {
  const [models, setModels] = useState(combo.models ?? []);
  const [strategy, setStrategy] = useState(combo.strategy ?? "sequential");

  const moveModel = (from, to) => {
    const next = [...models];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setModels(next);
    onChange({ ...combo, models: next });
  };

  return (
    <div className="combo-builder">
      <select value={strategy} onChange={(e) => { setStrategy(e.target.value); onChange({ ...combo, strategy: e.target.value }); }}>
        <option value="sequential">Sequential fallback</option>
        <option value="parallel">Parallel (first success)</option>
        <option value="weighted">Weighted</option>
        <option value="smart">Smart router</option>
      </select>
      <ul>
        {models.map((m, i) => (
          <li key={m}>
            <span>{i + 1}. {m}</span>
            <button onClick={() => moveModel(i, i - 1)} disabled={i === 0}>↑</button>
            <button onClick={() => moveModel(i, i + 1)} disabled={i === models.length - 1}>↓</button>
            <button onClick={() => setModels(models.filter((_, j) => j !== i))}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Acceptance criteria:** reorder/remove/add models; strategy selector; live preview of fallback chain.

### M2 — Provider health indicators

**Reference code (`src/app/dashboard/providers/HealthIndicator.jsx`):**

```jsx
// Health: green (healthy), yellow (degraded), red (down), gray (untested).
export function HealthIndicator({ provider }) {
  const { status, errorRate, latency, lastChecked } = provider.health ?? {};
  const cls = status === "healthy" ? "health-green"
    : status === "degraded" ? "health-yellow"
    : status === "down" ? "health-red" : "health-gray";
  return (
    <div className={`health-indicator ${cls}`} title={`Error rate: ${errorRate}% · Latency: ${latency}ms · Checked: ${new Date(lastChecked).toLocaleString()}`}>
      <span className="dot" />
      {status ?? "untested"}
    </div>
  );
}
```

**Acceptance criteria:** health dots on provider list; tooltip with metrics; refresh action.

### M3 — Usage visualization + settings search

**Reference code (`src/app/dashboard/usage/UsageChart.jsx`):**

```jsx
// Cost/request charts with time windows (24h/7d/30d) and per-model breakdown.
export function UsageChart({ data, window }) {
  // data: [{ ts, cost, requests, model }]
  const byModel = useMemo(() => groupBy(data, "model"), [data]);
  return (
    <div className="usage-chart">
      <div className="chart-toolbar">
        {["24h", "7d", "30d"].map((w) => (
          <button key={w} className={w === window ? "active" : ""} onClick={() => onWindowChange(w)}>{w}</button>
        ))}
      </div>
      {/* stacked bars: cost per model per bucket */}
    </div>
  );
}
```

**Settings search:**

```jsx
// Search across settings keys + descriptions; highlight matches; jump to section.
export function SettingsSearch({ settings, onJump }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return [];
    return Object.entries(settings)
      .filter(([k, v]) => k.toLowerCase().includes(q.toLowerCase()) || String(v).toLowerCase().includes(q.toLowerCase()))
      .slice(0, 20);
  }, [q, settings]);
  return (
    <div className="settings-search">
      <input placeholder="Search settings…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul>{results.map(([k, v]) => <li key={k} onClick={() => onJump(k)}>{k}</li>)}</ul>
    </div>
  );
}
```

**Acceptance criteria:** usage charts with windows; settings search works.

### M4 — Empty states + tests

**Files touched:** empty states for all pages (no providers, no combos, no usage); `tests/unit/ux-dashboard.test.js` (new, component-level).

**Acceptance criteria:** empty states guide next action; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Health data availability | Fallback to "untested" |
| Chart perf with large data | Aggregation; windowing |
| Settings search scope | Key + description index |

## Verification

- Unit: component tests
- Manual: open dashboard → build combo → check health dots → search settings
- Regression: `tests/__baseline__/verify-no-regression.mjs`