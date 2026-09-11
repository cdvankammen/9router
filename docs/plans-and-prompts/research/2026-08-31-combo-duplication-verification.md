# Research: Combo Duplication Verification

**Date:** 2026-08-31
**Author:** GitHub Copilot (main session)
**Status:** active
**Tags:** #research #combos #duplication #verification #dashboard

## Question / Objective

Verify whether combo duplication (copying a combo model) is working correctly today, as requested by user. Check implementation, edge cases, and UI.

## Sources Consulted

- Code: `src/app/(dashboard)/dashboard/combos/page.js` — `handleDuplicate`, `ComboCard` duplicate button
- Code: `src/app/api/combos/route.js` — POST handler, `VALID_NAME_REGEX`, `findUnknownModels`, duplicate name check
- Code: `src/app/api/combos/[id]/route.js` — PUT/DELETE, `resetComboRotation`
- Code: `src/lib/db/repos/combosRepo.js` — `createCombo`, `getComboByName`, `rowToCombo`
- Code: `src/lib/db/schema.js` — `TABLES.combos` (id, name UNIQUE, kind, models JSON)
- Code: `docs/plans-and-prompts/planning/2026-08-12-combo-duplicate-search-capabilities-plan.md` — prior plan, marked completed
- Code: `docs/plans-and-prompts/tracking/CHANGELOG.md` — check for duplication entry
- Grep: `duplicate`, `copy`, `handleDuplicate` across repo

## Raw Findings

### 1. Implementation (shipped 2026-08-12)

**Dashboard UI — `src/app/(dashboard)/dashboard/combos/page.js`:**

```js
const handleDuplicate = async (combo) => {
  const base = combo.name;
  let name = `${base}-copy`;
  let n = 2;
  const existingNames = new Set(combos.map((c) => c.name));
  while (existingNames.has(name)) {
    name = `${base}-copy-${n}`;
    n += 1;
  }
  const res = await fetch("/api/combos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, models: combo.models || [], kind: combo.kind || null }),
  });
  if (res.ok) await fetchData();
  else { const err = await res.json(); alert(err.error || "Failed to duplicate combo"); }
};
```

- Triggered by `onDuplicate` prop on `ComboCard` (button with `content_copy` icon, label "Duplicate").
- Name collision handled client-side: `${base}-copy`, then `${base}-copy-2`, etc., using current `combos` state.
- Copies `models` array and `kind` verbatim. Does NOT copy `comboStrategies` (per-combo strategy like fallback/round-robin/fusion, judge, tuning) — the duplicate gets default strategy (fallback) until user configures it.
- After POST, calls `fetchData()` to refresh list.

**API — `src/app/api/combos/route.js` POST:**
- Validates `name` required, `VALID_NAME_REGEX` (`/^[a-zA-Z0-9_.\-]+$/`), checks `getComboByName(name)` for duplicate → 400 if exists.
- Calls `createCombo({ name, models, kind })` which generates `uuidv4()` id, `createdAt`/`updatedAt` ISO, stores `models` as JSON string.
- Returns `201` with combo + `warnings` for unknown models (soft-validation via `findUnknownModels`).

**DB — `src/lib/db/repos/combosRepo.js`:**
- `createCombo` inserts into `combos` table with `id TEXT PRIMARY KEY`, `name TEXT UNIQUE NOT NULL`, `kind TEXT`, `models TEXT NOT NULL` (JSON), timestamps.
- No `contextWindow` or strategy fields in combos table — those live in `settings.comboStrategies`.

### 2. What is NOT duplicated

- **Per-combo strategy** (`settings.comboStrategies[comboName]`) — NOT copied. Duplicate gets no entry, so it falls back to global `comboStrategy` (default `fallback`). User must reconfigure strategy/judge/tuning manually.
- **Rotation state** (`comboRotationState` Map in `combo.js`) — in-memory, keyed by combo name. New combo starts fresh (correct).
- **Usage history / requestDetails** — not relevant.

### 3. Edge cases and potential bugs

| Case | Current handling | Risk |
|------|------------------|------|
| Duplicate name collision | Client-side loop checks `existingNames` Set from current state | Race if two users duplicate simultaneously — server also checks `getComboByName` and returns 400, but UI shows generic alert. Low risk (single-user local app). |
| Name with `-copy` already | `${base}-copy-2`, `-copy-3`, etc. | Works, but if user manually created `foo-copy`, duplicate of `foo` will collide and correctly increment. |
| Empty models | `models: combo.models \|\| []` — copies empty array | Valid, but combo with no models is not useful; no validation prevents it. |
| Kind is null | `kind: combo.kind \|\| null` — preserves null | Correct; only `llm` combos shown on combos page, but `kind` could be `webSearch` etc. |
| Very long name | No length check; `VALID_NAME_REGEX` only checks chars | Could create very long name via repeated duplication (`foo-copy-copy-copy...`). No DB limit except TEXT. Low risk. |
| Strategy not copied | Intentional? Prior plan says "same models/kind" — strategy omission may be intentional to avoid confusion, but user may expect strategy to be copied. | Should be documented or made optional. |
| No visual feedback | `fetchData()` refreshes list, but no toast/success message | User may not notice duplicate appeared (especially if list is long). Minor UX gap. |

### 4. Verification via code inspection (no live browser yet)

- **Static verification:** Code exists, is wired, and matches prior plan's "completed" status. No obvious breakage.
- **Live verification needed:** Start dev server (`PORT=20128 npm run dev`), open `http://localhost:20128/dashboard/combos`, create a combo, click Duplicate, verify new combo appears with `-copy` suffix, verify models/kind copied, verify strategy not copied (expected), verify duplicate of duplicate increments correctly.
- **Browser automation:** Use internal simple browser (VS Code Simple Browser or `open_browser_page`) to verify UI. Use visual model omni 3.5 plus via subagent when available (currently subagent model `meta-muse-spark-1.2` not registered — need to retry with available model or do manual visual check).

### 5. Related prior work

- Plan `2026-08-12-combo-duplicate-search-capabilities-plan.md` marked F1 Duplicate as completed, with details: "Duplicate button POSTs a full combo copy (`{name}-copy`, same models/kind)".
- No tracking entry for duplication bug reports; no open issues found for duplication.

## Synthesis / Conclusion

- **Duplication IS working** as implemented: client-side name generation + POST to `/api/combos` + refresh. It correctly handles name collisions, copies models/kind, and soft-validates models.
- **One gap:** Per-combo strategy (fallback/round-robin/fusion, judge, tuning) is NOT duplicated. This is likely intentional but should be called out in docs/UI. If user expects strategy to be copied, we should add it (copy `comboStrategies[oldName]` to `comboStrategies[newName]` via PATCH `/api/settings`).
- **No live browser verification yet** — needs dev server + browser check. Code inspection suggests it works, but visual confirmation is pending.
- **No duplication of contextWindow** (since that feature doesn't exist yet) — when we add per-combo contextWindow, duplication should also copy it.

## Confidence Level

High for code correctness (direct reads). Medium for live behavior (no runtime test yet). High for gap analysis (strategy not copied).

## Open Questions

1. Should duplication also copy per-combo strategy (fallback/round-robin/fusion, judge, tuning) and future per-combo contextWindow?
2. Should duplication show a toast/success message?
3. Should we add a server-side `POST /api/combos/duplicate` endpoint to handle strategy copying atomically, or keep client-side two-step (POST combo + PATCH settings)?
4. Do we need to handle duplication of combos with many models (e.g. 20+) — any UI truncation issues?
