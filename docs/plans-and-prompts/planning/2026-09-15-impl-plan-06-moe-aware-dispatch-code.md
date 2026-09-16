# Implementation Plan 06 — MoE-Aware Dispatch — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #moe #expert-routing #dispatch #mixture-of-experts #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/providers/registry/*`, `open-sse/config/providerModels.js`, `open-sse/services/smartRouter.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-06-moe-aware-dispatch.md`, `../research/9router/43-branch-moe-and-expert-routing.md`

## Scope

**In scope:** MoE metadata in registry; MoE-aware scoring; expert-dispatch strategy; specialization matching; quantization-aware routing.
**Out of scope:** speculative decoding integration; batch routing optimization.

## Milestones

### M1 — MoE metadata

**Reference code (`open-sse/config/providerModels.js` extension):**

```js
// Add MoE flags to model entries:
{
  "deepseek/deepseek-moe": {
    moe: true,
    experts: 64,
    activeExperts: 8,
    specialization: ["code", "math", "reasoning"],
    quantization: ["fp16", "int8"],
  },
  "mistral/mixtral-8x7b": {
    moe: true,
    experts: 8,
    activeExperts: 2,
    specialization: ["general", "code"],
    quantization: ["fp16", "int8", "int4"],
  },
}
```

**Reference code (`src/lib/db/repos/modelCapabilityRepo.js`):**

```js
export async function getModelCapabilities(modelId) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM model_capabilities WHERE model_id = ?`, [modelId]);
  if (row) return JSON.parse(row.capabilities);
  // Fallback to static registry metadata
  return getStaticCapabilities(modelId);
}
```

**Acceptance criteria:** MoE flags in registry; capability repo with fallback.

### M2 — MoE-aware scoring

**Reference code (`open-sse/services/smartRouter.js`):**

```js
// In scoreModel(): MoE models get a cost-quality bonus (dense quality at sparse compute).
export function moeBonus(model, taskType) {
  const caps = getModelCapabilities(model);
  if (!caps?.moe) return 0;
  let bonus = 0.05; // base MoE efficiency bonus
  if (caps.specialization?.includes(taskType)) bonus += 0.1; // specialization match
  return bonus;
}
```

**Acceptance criteria:** MoE bonus applied; specialization match boosts; quantization-aware (INT8/INT4 cheaper).

### M3 — Expert-dispatch strategy

**Reference code (`src/sse/handlers/chat.js`):**

```js
// New strategy: expert-dispatch
if (strategy === "expert-dispatch") {
  const candidates = await getCandidateModels(taskType, settings);
  const scored = candidates.map((m) => ({
    model: m,
    score: scoreModel(m, taskType, settings) + moeBonus(m, taskType),
  }));
  scored.sort((a, b) => b.score - a.score);
  const specialist = scored.find((s) => getModelCapabilities(s.model)?.specialization?.includes(taskType));
  return specialist?.model ?? scored[0]?.model; // fallback to generalist
}
```

**Acceptance criteria:** specialist preferred when task matches; generalist fallback.

### M4 — Tests + docs

**Files touched:** `tests/unit/moe-dispatch.test.js` (new), `docs/ARCHITECTURE.md` (MoE section).

**Acceptance criteria:** unit tests pass; no regressions.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| MoE metadata staleness | Registry regeneration scripts; manual override |
| Specialization mislabeling | Curated metadata; usage-based validation |
| Quantized model quality | Quality floor per quantization level |

## Verification

- Unit: MoE scoring, specialization matching, dispatch
- Manual: expert-dispatch strategy → verify specialist chosen for code tasks
- Regression: `tests/__baseline__/verify-no-regression.mjs`