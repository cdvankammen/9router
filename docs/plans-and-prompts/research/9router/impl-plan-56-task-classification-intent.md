---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, task-classification, intent, detection, routing
---

# Implementation Plan 56 — Task Classification & Intent Detection

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `45-branch-semantic-and-embedding-routing.md`).
> This plan covers the "task classification" option: robust task classification and intent detection for routing.

## 1. Goal

Add robust task classification to 9Router: classify requests by task type (code, chat, reasoning, translation, etc.) and route accordingly — improving routing precision.

## 2. Background (from research)

- **9Router current state**: task-type detection exists in some form (16-decision-points); no dedicated classifier.
- **Research findings** (45-branch): classification methods — keyword, embedding, LLM-based; classifier quality determines routing quality; confidence thresholds with fallback.

## 3. Design

### 3.1 Classification Methods

- **Keyword classifier**: fast, cheap, baseline.
- **Embedding classifier**: semantic, better recall.
- **LLM classifier**: best quality, expensive (opt-in).
- **Ensemble**: combine methods.

### 3.2 Task Taxonomy

- **Task types**: code, chat, reasoning, translation, summarization, extraction, creative, analysis.
- **Task metadata**: per-type routing preferences.
- **Taxonomy evolution**: extensible.

### 3.3 Confidence & Fallback

- **Confidence scores**: per-classification.
- **Thresholds**: route only above threshold.
- **Fallback**: default routing below threshold.

### 3.4 Integration

- **Routing integration**: task type → routing strategy.
- **Observability**: classification telemetry.
- **Feedback**: outcome-based classifier improvement.

## 4. Implementation Steps

1. Define task taxonomy.
2. Build keyword classifier.
3. Add embedding classifier.
4. Add LLM classifier (opt-in).
5. Integrate routing.
6. Tests: classification, thresholds.

## 5. Files Touched

- `src/lib/classify/` (new: methods, taxonomy)
- `src/sse/handlers/chat.js` (integration)
- `open-sse/config/taskConfig.js` (new)
- `src/lib/db/repos/classifyRepo.js` (new)
- `tests/unit/classification.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Misclassification | Confidence thresholds |
| Classifier cost | Method tiers |
| Taxonomy gaps | Extensible taxonomy |
| Feedback loops | Outcome tracking |

## 7. Success Criteria

- Classification works (all methods).
- Confidence thresholds effective.
- Routing uses task type.
- Telemetry visible.

## 8. Related Plans
- Plan 3 (Semantic Routing) — embedding classifier.
- Plan 28 (Embeddings) — embedding service.
- Plan 27 (Rules Engine) — task conditions.