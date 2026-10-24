# Implementation Plan 106 — Step Context & Multi-Step Agent Routing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #steps #agent-workflows #multi-step #routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (tool routing from plan 80 (`src/lib/tool-routing/`); intent classification from plan 81 (`src/lib/intent/`); session state from plan 68 (`src/lib/sessions/`); cascade orchestration from plan 90 (`src/lib/cascade/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — track a workflow; classify steps; confirm step-aware routing; confirm stickiness within workflow.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-106-step-context-agent-routing.md`, `../research/9router/impl-plan-80-tool-routing-function-calling.md`, `../research/9router/impl-plan-68-session-management-persistence.md`.

## Scope

**In scope:** step tracking (workflow id, step index, step type, step state; agent-workflow pattern detection; per-workflow step store); step classification (types plan/act/observe/verify/refine/finalize with confidence); step-aware routing (step→model mapping, context carry, step stickiness, model transitions); workflow analytics (steps per workflow, transitions, success, end-to-end quality); session integration + dashboard.
**Out of scope:** workflow DAG execution (plan 90); cross-instance workflow state (plan 70).

## Milestones

### M1 — Step tracking

**Reference code (`src/lib/steps/track.js`):**

```js
// Step model.
export const STEP_TYPES = ["plan", "act", "observe", "verify", "refine", "finalize"];

export function makeStep({ workflowId, index, type, state = "pending", context = {} } = {}) {
  return { workflowId, index, type, state, context, at: new Date().toISOString() };
}

// Workflow store: per-workflow step records.
export function makeWorkflowStore() {
  const workflows = new Map(); // workflowId -> [steps]
  return {
    begin(workflowId) { workflows.set(workflowId, []); return workflowId; },
    add(workflowId, step) {
      const steps = workflows.get(workflowId) ?? [];
      steps.push(step);
      workflows.set(workflowId, steps);
      return step;
    },
    steps(workflowId) { return workflows.get(workflowId) ?? []; },
    update(workflowId, index, patch) {
      const steps = workflows.get(workflowId) ?? [];
      if (steps[index]) steps[index] = { ...steps[index], ...patch };
      return steps[index];
    },
    end(workflowId) { const s = workflows.get(workflowId) ?? []; workflows.delete(workflowId); return s; },
  };
}

// Agent-workflow pattern detection: tool calls + multi-turn.
export function detectWorkflow({ hasTools, turns, toolCalls = 0 } = {}) {
  return hasTools || turns > 2 || toolCalls > 0;
}
```

**Acceptance criteria:** steps recorded; workflow store; pattern detection.

### M2 — Step classification

**Reference code (`src/lib/steps/classify.js`):**

```js
// Step type detection from message + tool activity.
export const STEP_PATTERNS = {
  plan: /\b(plan|outline|approach|strategy|steps? to)\b/i,
  act: /\b(implement|write|create|execute|run|build|call)\b/i,
  observe: /\b(result|output|response|returned|saw|found|error)\b/i,
  verify: /\b(check|verify|test|confirm|validate|review)\b/i,
  refine: /\b(fix|adjust|improve|refine|retry|redo)\b/i,
  finalize: /\b(done|complete|finish|final|summary)\b/i,
};

export function classifyStep({ text = "", hasToolCall = false, toolResult = false } = {}) {
  if (hasToolCall) return { type: "act", confidence: 0.8 };
  if (toolResult) return { type: "observe", confidence: 0.8 };
  const scores = [];
  for (const [type, re] of Object.entries(STEP_PATTERNS)) {
    const m = (text.match(re) ?? []).length;
    if (m) scores.push({ type, count: m });
  }
  scores.sort((a, b) => b.count - a.count);
  if (!scores.length) return { type: "act", confidence: 0.5 };
  return { type: scores[0].type, confidence: Math.min(0.9, 0.5 + scores[0].count * 0.2) };
}
```

**Acceptance criteria:** step types; confidence.

### M3 — Step-aware routing

**Reference code (`src/lib/steps/route.js`):**

```js
// Step → model mapping.
export const STEP_MODELS = {
  plan: ["claude-sonnet", "gpt-4o"],
  act: ["gpt-4o", "claude-sonnet", "deepseek-coder"],
  observe: ["gpt-4o-mini", "claude-haiku"],
  verify: ["gpt-4o", "claude-sonnet"],
  refine: ["claude-sonnet", "gpt-4o"],
  finalize: ["gpt-4o-mini", "claude-haiku"],
};

export function modelsForStep(type, { overrides = {} } = {}) {
  return overrides[type] ?? STEP_MODELS[type] ?? [];
}

// Step context: carry goals, constraints, prior steps into routing.
export function stepContext({ workflow, index, maxSteps = 5 } = {}) {
  const steps = workflow?.slice(0, index + 1) ?? [];
  const recent = steps.slice(-maxSteps);
  return {
    workflowId: workflow?.[0]?.workflowId,
    stepIndex: index,
    priorTypes: recent.map((s) => s.type),
    priorStates: recent.map((s) => s.state),
  };
}

// Step stickiness: stick within workflow steps.
export function stickyWithinWorkflow({ workflowId, currentModel, stepType, sticky = true } = {}) {
  if (!sticky) return null;
  return currentModel; // keep model across steps unless mapping says otherwise
}

// Model transitions: change model between steps.
export function transitionModel({ prevType, nextType, currentModel, modelsForStep } = {}) {
  const preferred = modelsForStep(nextType) ?? [];
  if (preferred.includes(currentModel)) return { model: currentModel, changed: false };
  return { model: preferred[0] ?? currentModel, changed: true, from: prevType, to: nextType };
}
```

**Acceptance criteria:** step mapping; context carry; stickiness; transitions.

### M4 — Workflow analytics + integration + tests

**Reference code (`src/lib/steps/analytics.js`):**

```js
// Workflow metrics.
export function workflowMetrics(workflow) {
  const transitions = [];
  for (let i = 1; i < workflow.length; i++) {
    if (workflow[i].type !== workflow[i - 1].type) transitions.push(`${workflow[i - 1].type}->${workflow[i].type}`);
  }
  return {
    steps: workflow.length,
    types: workflow.map((s) => s.type),
    transitions,
    transitionCount: transitions.length,
    success: workflow.every((s) => s.state !== "failed"),
  };
}

// End-to-end workflow quality.
export function workflowQuality({ workflow, qualityOf }) {
  const scores = workflow.map((s) => qualityOf(s) ?? 0);
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

// Reports: per-workflow-type analytics.
export function reportByType(workflows) {
  const byType = new Map();
  for (const w of workflows) {
    for (const s of w) {
      const t = byType.get(s.type) ?? { n: 0, success: 0 };
      t.n += 1; if (s.state !== "failed") t.success += 1;
      byType.set(s.type, t);
    }
  }
  return Object.fromEntries([...byType.entries()].map(([t, v]) => [t, { ...v, successRate: v.n ? v.success / v.n : 0 }]));
}
```

**Files touched:** `src/lib/steps/` (new: track, classify, route, analytics), `src/sse/handlers/chat.js` (step integration), `src/lib/db/migrations/20260915-steps.js` (new), `src/lib/db/repos/stepRepo.js` (new), dashboard workflows page (new), `tests/unit/steps.test.js` (new).

**Acceptance criteria:** steps tracked; classified; step-aware routing; analytics.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Step misdetection | Wrong routing | Conservative detection |
| Context bloat | Token waste | Context budgets |
| Stickiness conflicts | Stale affinity | Expiry |
| Analytics noise | Bad insights | Aggregation |

## Verification

- Unit: makeWorkflowStore, classifyStep, stepContext, transitionModel, workflowMetrics
- Manual: tool-calling workflow → act/observe steps → model transitions logged
- Regression: `tests/__baseline__/verify-no-regression.mjs`