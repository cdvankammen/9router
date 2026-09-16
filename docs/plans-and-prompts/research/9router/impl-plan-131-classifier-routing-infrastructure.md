---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, classifier-routing, bert-classifier, learned-router, classification-infrastructure
---

# Implementation Plan 131 — Classifier-Based Routing Infrastructure

> Mined from branch docs: `41-branch-learned-routing.md` (Level 3: ABA — BERT Classifiers for Routing).

## 1. Goal

Build classifier-based routing infrastructure for 9Router: train and serve lightweight BERT/RoBERTa classifiers that predict the best provider for a given query, enabling sub-millisecond routing decisions without LLM-based judges.

## 2. Background (from research)

- **9Router current state**: Rule-based routing; no ML classifiers.
- **Research findings** (41-branch):
  - BERT classifiers: RouteLLM lineage includes BERT-based routers that classify queries into provider buckets with 95%+ accuracy at <10ms inference.
  - Bradley-Terry models (AAB): pairwise preference models for routing.
  - Few-shot self-verification (ABAA): lightweight self-verification.

## 3. Design

### 3.1 Classifier Architecture

- **Model**: DistilBERT (66M params) for speed.
- **Training data**: chatbot Arena + 9Router usage logs.
- **Output**: provider scores (softmax over N providers).
- **Inference**: <10ms on CPU.

### 3.2 Training Pipeline

- **Data collection**: query-provider-preference triples.
- **Training**: fine-tune DistilBERT.
- **Evaluation**: accuracy, latency, calibration.
- **Deployment**: ONNX export for inference.

### 3.3 Integration

- **Pre-routing**: classifier runs before provider selection.
- **Fallback**: rule-based if classifier unavailable.
- **Observability**: classifier confidence, accuracy.
- **Dashboard**: classifier performance view.

## 4. Implementation Steps

1. Build data collection pipeline.
2. Train DistilBERT classifier.
3. Export to ONNX.
4. Integrate pre-routing.
5. Add fallback logic.
6. Dashboard: classifier view.
7. Tests: accuracy, latency, fallback.

## 5. Files Touched

- `src/lib/classifier/` (new: train, serve, data)
- `open-sse/handlers/chatCore.js` (pre-routing hook)
- Dashboard classifier page (new)
- `tests/unit/classifier.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Training data quality | Filtering + validation |
| Model drift | Regular retraining |
| Latency overhead | ONNX + CPU |
| Cold start | Rule-based fallback |

## 7. Success Criteria

- Classifier accuracy >90%.
- Inference <10ms.
- Fallback works.
- Performance visible.

## 8. Related Plans

- Plan 1 (Learned Routing) — routing foundations.
- Plan 82 (Router Calibration) — calibration.
- Plan 83 (Feedback Selection) — feedback data.
- Plan 103 (Human Preference Learning) — preference data.