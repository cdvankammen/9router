---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, safety-signals, content-safety, model-safety, guardrails
---

# Implementation Plan 109 — Safety Signals & Content Guardrails

> Mined from branch docs: `41-branch-learned-routing.md` (safety signals) and `46-branch-evaluation-and-cost-quality.md` (safety signals).

## 1. Goal

Add safety signals and content guardrails to 9Router: detect unsafe content in requests and responses, enforce model safety constraints, and route safety-sensitive requests to safe models — so the gateway enforces content safety consistently.

## 2. Background (from research)

- **9Router current state**: no content safety layer.
- **Research findings** (41-branch):
  - Safety signals: content safety, model safety constraints.
  - (46-branch) Safety signals: safety evaluation.

## 3. Design

### 3.1 Safety Detection

- **Input safety**: detect unsafe request content (prompt injection, harmful content).
- **Output safety**: detect unsafe response content.
- **Detection methods**: blocklists, classifiers, LLM-safety checks.
- **Detection confidence**: per-signal confidence.

### 3.2 Safety Actions

- **Block**: reject unsafe requests.
- **Sanitize**: strip unsafe content.
- **Warn**: flag with warning.
- **Route**: route to safer model.

### 3.3 Model Safety Constraints

- **Safety registry**: per-model safety ratings.
- **Safety routing**: safety-sensitive requests → safe models.
- **Safety overrides**: admin overrides with audit.

### 3.4 Safety Policy

- **Policy config**: per-route safety policies.
- **Policy modes**: strict, moderate, permissive.
- **Policy enforcement**: consistent enforcement.

### 3.5 Integration

- **Gateway integration**: safety checks in request/response path.
- **Observability**: safety event telemetry.
- **Dashboard**: safety view.

## 4. Implementation Steps

1. Build safety detection (`src/lib/safety/`).
2. Add safety actions.
3. Build model safety registry.
4. Add safety policies.
5. Integrate gateway.
6. Dashboard: safety view.
7. Tests: detection, actions, policies.

## 5. Files Touched

- `src/lib/safety/` (new: detect, actions, registry, policy)
- `src/sse/handlers/chat.js` (safety integration)
- `src/app/api/v1/` (safety endpoints)
- `open-sse/config/safetyConfig.js` (new)
- Dashboard safety page (new)
- `tests/unit/safety.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| False positives | Confidence thresholds |
| False negatives | Layered detection |
| Policy bypass | Gateway enforcement |
| Over-blocking | Warn mode |

## 7. Success Criteria

- Unsafe content detected.
- Safety actions enforced.
- Safety routing works.
- Safety view visible.

## 8. Related Plans

- Plan 58 (Security Audit) — security hardening.
- Plan 88 (Rule Engine v2) — safety rules.
- Plan 35 (Privacy/Compliance) — compliance.
- Plan 75 (Quality Guardrails) — output guardrails.