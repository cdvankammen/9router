---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, response-quality, output-validation, guardrails, safety
---

# Implementation Plan 75 — Response Quality & Output Guardrails

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `46-branch-evaluation-and-cost-quality.md`).
> This plan covers the "output guardrails" option: response quality checks and output guardrails.

## 1. Goal

Add response quality checks and output guardrails to 9Router: output validation, quality checks, and safety guardrails — so bad outputs are caught before delivery.

## 2. Background (from research)

- **9Router current state**: no output validation.
- **Research findings** (46-branch): output checks (schema, length, format); quality checks (relevance, coherence); safety guardrails (content policy, PII).

## 3. Design

### 3.1 Output Validation

- **Schema checks**: response schema validation.
- **Length checks**: min/max length.
- **Format checks**: expected format (JSON, code).

### 3.2 Quality Checks

- **Relevance**: response relevance to request.
- **Coherence**: response coherence.
- **Completeness**: response completeness.

### 3.3 Safety Guardrails

- **Content policy**: policy violations detected.
- **PII detection**: PII in outputs.
- **Guardrail actions**: block, redact, warn.

### 3.4 Integration

- **Streaming integration**: checks during streaming.
- **Fallback integration**: bad output → fallback.
- **Observability**: guardrail telemetry.

## 4. Implementation Steps

1. Build output validation.
2. Add quality checks.
3. Add safety guardrails.
4. Integrate streaming + fallback.
5. Tests: validation, guardrails.

## 5. Files Touched

- `src/lib/guardrails/` (new: validation, safety)
- `open-sse/handlers/chatCore.js` (integration)
- `open-sse/config/guardrailConfig.js` (new)
- `src/lib/db/repos/guardrailRepo.js` (new)
- `tests/unit/guardrails.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| False positives | Threshold tuning |
| Latency | Lightweight checks |
| Over-blocking | Configurable actions |
| Complexity | Progressive |

## 7. Success Criteria

- Outputs validated.
- Quality checked.
- Guardrails enforced.
- Telemetry visible.

## 8. Related Plans
- Plan 16 (Divergence) — response validation.
- Plan 35 (Privacy) — PII detection.
- Plan 9 (Error System) — guardrail errors.