# Smart Router Observability — Code-Bearing Implementation Plan (Remaining Milestones)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #smart-router #observability #fallbacks #ui #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, existing UI components in `src/app/(dashboard)/dashboard/`, settings shape, Next.js route conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation (read before implementing each milestone):
> - `../planning/smart-router-observability-plan.md` (original plan with progress)
> - `../tracking/learnings/2026-08-06-sse-done-duplicate-leak.md` (SSE leak fix details)
> - `../tracking/decisions/ADR-001..005.md` (architecture decisions)
> - `src/sse/handlers/chat.js` (smart router interception + combo path)
> - `open-sse/services/combo.js` (handleComboChat retry loop)
> - `src/lib/db/repos/settingsRepo.js` (modelFallbacks shape)

## Scope

**In scope (remaining from original plan):**
- **M3:** Visual Fallback Rule Builder UI (form modal + rules table)
- **M4:** Markdown log flush explanation (overwrite vs append semantics)
- **M4:** SSE leak fix verification (already fixed in `open-sse/utils/stream.js` — verify no regression)
- **M4:** Rebuild + E2E verify all
- **M4:** Full test suite + commit

**Out of scope:**
- Fusion strategy (judgeModel/fusionTuning) — schema reserved, not implemented
- Dynamic `sr-*` combo TTL cleanup — separate task

---

## M3 — Visual Fallback Rule Builder UI

**Goal:** Dashboard UI to create/edit/delete `settings.modelFallbacks` rules visually (form modal + rules table).

### Reference code

**Current `modelFallbacks` shape** (from `src/lib/db/repos/settingsRepo.js`):

```js
// DEFAULT_SETTINGS.modelFallbacks = {
//   "openai/gpt-4o": [
//     { provider: "anthropic", models: ["claude-3-5-sonnet"], retries: 2 },
//     { provider: "google", models: ["gemini-1.5-pro"], retries: 1 }
//   ]
// };
```

**UI Components** (new files under `src/app/(dashboard)/dashboard/smart-router/`):

```jsx
// FallbackRuleBuilder.jsx — form modal
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FallbackRuleBuilder({ initialRule, onSave, onCancel }) {
  const [provider, setProvider] = useState(initialRule?.provider || "");
  const [models, setModels] = useState(initialRule?.models?.join(", ") || "");
  const [retries, setRetries] = useState(initialRule?.retries ?? 1);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const modelList = models.split(",").map((m) => m.trim()).filter(Boolean);
    if (!provider || modelList.length === 0) {
      setError("Provider and at least one model required");
      return;
    }
    if (retries < 0 || retries > 10) {
      setError("Retries must be 0–10");
      return;
    }
    onSave({ provider, models: modelList, retries });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <select value={provider} onChange={(e) => setProvider(e.target.value)} required>
        <option value="">Select provider</option>
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="google">Google</option>
        <option value="xai">xAI</option>
        <option value="deepseek">DeepSeek</option>
        <option value="groq">Groq</option>
        <option value="openrouter">OpenRouter</option>
        {/* ... all providers from registry */}
      </select>
      <input
        type="text"
        placeholder="model1, model2, ..."
        value={models}
        onChange={(e) => setModels(e.target.value)}
        required
      />
      <input
        type="number"
        min="0"
        max="10"
        value={retries}
        onChange={(e) => setRetries(Number(e.target.value))}
      />
      {error && <div className="text-red-500">{error}</div>}
      <div className="flex gap-2">
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
```

```jsx
// FallbackRulesTable.jsx — rules table with edit/delete
export default function FallbackRulesTable({ rules, onEdit, onDelete }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Source Model</th>
          <th>Fallback Provider</th>
          <th>Fallback Models</th>
          <th>Retries</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(rules).flatMap(([sourceModel, fallbacks]) =>
          fallbacks.map((fb, i) => (
            <tr key={`${sourceModel}-${i}`}>
              <td>{i === 0 ? sourceModel : ""}</td>
              <td>{fb.provider}</td>
              <td>{fb.models.join(", ")}</td>
              <td>{fb.retries}</td>
              <td>
                <button onClick={() => onEdit(sourceModel, i, fb)}>Edit</button>
                <button onClick={() => onDelete(sourceModel, i)}>Delete</button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
```

**Page** (`src/app/(dashboard)/dashboard/smart-router/fallbacks/page.js`):

```js
// Reference sketch — full page with state + PATCH to /api/settings
"use client";
import { useState, useEffect } from "react";
import FallbackRuleBuilder from "@/components/smart-router/FallbackRuleBuilder";
import FallbackRulesTable from "@/components/smart-router/FallbackRulesTable";

export default function FallbacksPage() {
  const [rules, setRules] = useState({});
  const [editing, setEditing] = useState(null); // { sourceModel, index, rule }
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => setRules(s.modelFallbacks || {}));
  }, []);

  const saveRule = async (rule) => {
    const newRules = { ...rules };
    if (editing) {
      newRules[editing.sourceModel] = [...newRules[editing.sourceModel]];
      newRules[editing.sourceModel][editing.index] = rule;
    } else {
      // Add new rule — need sourceModel from a parent selector (simplified)
    }
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelFallbacks: newRules }),
    });
    setRules(newRules);
    setShowModal(false);
    setEditing(null);
  };

  return (
    <div className="p-4">
      <h1>Fallback Rules</h1>
      <FallbackRulesTable rules={rules} onEdit={setEditing} onDelete={...} />
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <FallbackRuleBuilder
            initialRule={editing?.rule}
            onSave={saveRule}
            onCancel={() => setShowModal(false)}
          />
        </div>
      )}
    </div>
  );
}
```

**Files touched:**
- `src/app/(dashboard)/dashboard/smart-router/fallbacks/page.js` (new)
- `src/components/smart-router/FallbackRuleBuilder.jsx` (new)
- `src/components/smart-router/FallbackRulesTable.jsx` (new)
- `src/app/api/settings/route.js` — ensure PATCH validates `modelFallbacks` shape (already generic)

**Acceptance criteria:**
- Form modal: provider dropdown (all providers from registry), models comma-separated, retries 0–10
- Rules table: grouped by source model, edit/delete per row
- PATCH `/api/settings` persists `modelFallbacks` correctly
- Visual feedback (toast/success) on save

---

## M4 — Markdown log flush explanation + SSE leak verification + rebuild + tests

### M4a — Markdown log flush semantics

**Current behavior** (from `src/lib/usageDb.js` / `appendRequestLog`): daily file at `~/.9router/logs/YYYY-MM-DD.md` is **overwritten** on each flush (not appended).

**Decision needed:** Overwrite (current) vs Append. Document the decision in `docs/ARCHITECTURE.md` and `docs/plans-and-prompts/tracking/CHANGELOG.md`.

**Reference code** (documentation only — no code change unless decision is "append"):

```js
// In appendRequestLog (src/lib/usageDb.js):
// Current: fs.writeFileSync(logPath, markdown, "utf8"); // OVERWRITE
// If append: fs.appendFileSync(logPath, markdown + "\n", "utf8");
```

**Files touched:**
- `docs/ARCHITECTURE.md` — document flush semantics (overwrite vs append)
- `docs/plans-and-prompts/tracking/CHANGELOG.md` — record decision

**Acceptance criteria:**
- Decision documented; behavior matches documentation

### M4b — SSE leak fix verification

**Fix already applied** (commit in `open-sse/utils/stream.js` passthrough transform):
- Root cause: passthrough forwarded `data: [DONE]` without setting `streamDoneSent`
- Verified: single=1×, combo=1×, non-stream=clean JSON

**Verification steps:**
1. Start dev server
2. `curl -N -H "Authorization: Bearer <key>" -d '{"model":"sr-test","messages":[{"role":"user","content":"hi"}],"stream":true}' http://localhost:20128/v1/chat/completions`
3. Count `[DONE]` occurrences — must be exactly 1
4. Test combo path (model=`sr-*`) — must be exactly 1
5. Test non-stream — clean JSON, no SSE framing

**Files touched:**
- None (verification only)

**Acceptance criteria:**
- Single stream: exactly 1 `[DONE]`
- Combo stream: exactly 1 `[DONE]`
- Non-stream: clean JSON

### M4c — Rebuild + E2E verify all

**Steps:**
1. `npm run build` (or `npm run build:bun`)
2. `PORT=20128 HOSTNAME=0.0.0.0 npm run start`
3. Browser E2E:
   - `/dashboard` — loads
   - `/dashboard/smart-router/fallbacks` — UI works, save persists
   - `/dashboard/providers/[id]` — contextWindow inputs work
   - `/dashboard/combos` — hybrid strategy, duplication, contextWindow
   - `/dashboard/messages` — filters, facets, annotations, saved views
   - `/dashboard/webhooks` — webhook config, rules, event log
   - Send chat request → verify `x-9r-fallback-chain` header, markdown log written

**Files touched:**
- None (verification only)

**Acceptance criteria:**
- Build succeeds
- All dashboard pages load and function
- Chat request → correct headers, logs, fallbacks

### M4d — Full test suite

**Commands:**
```bash
npx vitest run                    # all tests
npx vitest run unit/capabilities.test.js
npx vitest run unit/combo.test.js
npx vitest run unit/settings.test.js
npx vitest run unit/webhooks.test.js   # if added
npx vitest run unit/messages.test.js   # if added
```

**Baseline comparison:**
```bash
node tests/__baseline__/verify-no-regression.mjs
```

**Acceptance criteria:**
- No new regressions vs baseline
- New tests pass (capabilities, combo, settings, webhooks, messages)

---

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| `modelFallbacks` shape | Must match existing settings | Verify against `settingsRepo.js` before UI |
| Provider list for dropdown | Must come from registry | Import from `open-sse/providers/registry/index.js` |
| SSE leak fix | Already applied — verify no regression | Run the curl verification steps |
| Markdown flush | Decision affects user data | Document clearly; if append, migrate existing logs |
| Test baseline | ~64 expected failures | Compare to `verify-no-regression.mjs`, not raw pass/fail |

## Verification

- Unit: `parseJsonPath`, `extractFacets`, `verifySignature`, `matchCondition`, `normalizeContextWindowOverride`, `getComboStrategyWithExpiry`
- Manual: all dashboard pages, chat requests, webhook POST, fallback chain header
- Regression: `tests/__baseline__/verify-no-regression.mjs`
- Lint: `npx eslint .`