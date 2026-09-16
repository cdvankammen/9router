---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, intent-classification, task-taxonomy, step-classification, difficulty-prediction
---

# Implementation Plan 81 — Request Intent Classification & Task Taxonomy

> Mined from branch docs: `47-branch-9router-internal-threads.md` (intent classification, task taxonomy, step classification, difficulty prediction, code task routing, math routing, agent task routing).

## 1. Goal

Add a request-intent classification layer to 9Router: classify each request into a task taxonomy (chat, code, math, analysis, tool-use, agent-step), predict difficulty, and use the taxonomy for routing decisions — so each task type gets the best-suited model.

## 2. Background (from research)

- **9Router current state**: routing is model-name/combo based; no task-type awareness.
- **Research findings** (47-branch):
  - Intent classification: classify user intent upfront (chat vs. code vs. math vs. analysis).
  - Task taxonomy: hierarchical task types with routing implications.
  - Step classification: multi-step agent workflows need per-step classification.
  - Difficulty prediction: predict task difficulty → route hard tasks to stronger models.
  - Code task routing: code tasks → code-specialized models.
  - Math routing: math tasks → math-strong models.
  - Agent task routing: agent tasks → tool-capable, long-context models.

## 3. Design

### 3.1 Task Taxonomy

```
TASK_TAXONOMY = {
  chat:        { default: 'gpt-4o-mini', features: ['fast'] },
  code:        { default: 'claude-sonnet', features: ['code'] },
  math:        { default: 'gpt-4o', features: ['math'] },
  analysis:    { default: 'claude-opus', features: ['deep'] },
  tool-use:    { default: 'gpt-4o', features: ['tools'] },
  agent-step:  { default: 'claude-sonnet', features: ['tools','long-context'] },
  creative:    { default: 'gpt-4o', features: ['creative'] },
}
```

### 3.2 Classifier

- **Heuristic classifier** (fast, no LLM): keyword/pattern matching on messages.
- **Optional LLM classifier**: when heuristic confidence < threshold, use a cheap model to classify.
- **Confidence scoring**: each classification carries confidence.
- **Cache**: per-session classification cache.

### 3.3 Difficulty Prediction

- **Features**: message length, code markers, math symbols, tool count, language.
- **Predictor**: lightweight scoring model (logistic regression on features).
- **Routing impact**: high difficulty → stronger model tier.

### 3.4 Routing Integration

- **Taxonomy → model mapping**: configurable per taxonomy node.
- **Combo integration**: taxonomy-aware combos.
- **Fallback**: taxonomy-aware fallback chains.
- **Override**: explicit model selection overrides taxonomy.

### 3.5 Observability

- **Classification telemetry**: taxonomy distribution, confidence, accuracy.
- **Feedback loop**: user model-switch events → classification tuning.

## 4. Implementation Steps

1. Define task taxonomy (`src/lib/intent/taxonomy.js`).
2. Build heuristic classifier (`src/lib/intent/classifier.js`).
3. Add optional LLM classifier.
4. Build difficulty predictor.
5. Integrate routing in `src/sse/handlers/chat.js`.
6. Add taxonomy-aware combos.
7. Dashboard: taxonomy config + telemetry.
8. Tests: classification accuracy, routing impact.

## 5. Files Touched

- `src/lib/intent/` (new: taxonomy, classifier, difficulty)
- `src/sse/handlers/chat.js` (taxonomy-aware selection)
- `open-sse/config/intentConfig.js` (new)
- Dashboard intent page (new)
- `tests/unit/intent.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Misclassification | Confidence threshold + fallback to default |
| LLM classifier cost | Only when heuristic confidence low |
| Taxonomy rigidity | Configurable taxonomy |
| Difficulty misprediction | Conservative tier bump only |

## 7. Success Criteria

- Requests classified into taxonomy with confidence.
- Routing respects taxonomy mappings.
- Difficulty prediction influences tier selection.
- Classification telemetry visible.
- No regression for unclassified requests.

## 8. Related Plans

- Plan 80 (Tool Routing) — tool-use classification.
- Plan 56 (Task Classification) — earlier related plan.
- Plan 3 (Semantic Routing) — embedding-based classification.
- Plan 8 (Observability) — classification telemetry.