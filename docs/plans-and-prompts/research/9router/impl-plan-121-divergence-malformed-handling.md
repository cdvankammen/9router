---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, divergence-analysis, malformed-response, response-validation, output-schema
---

# Implementation Plan 121 — Divergence & Malformed Response Handling

> Mined from branch docs: `47-branch-9router-internal-threads.md` (divergence analysis) and `34-divergence-analysis.md`, `34-malformed-response-handling.md`.

## 1. Goal

Add divergence and malformed response handling to 9Router: detect when provider responses diverge from expected formats, handle malformed responses gracefully, and repair or retry — so the gateway never crashes on bad upstream output.

## 2. Background (from research)

- **9Router current state**: malformed handling exists per-executor; no unified detection.
- **Research findings** (47-branch):
  - Divergence analysis: response format divergence.
  - (34) Divergence analysis: divergence research.
  - (34) Malformed response handling: malformed handling design.

## 3. Design

### 3.1 Divergence Detection

- **Schema validation**: validate responses against expected schema.
- **Divergence types**: missing fields, wrong types, extra fields, wrong encoding.
- **Divergence severity**: fatal, warn, ignore.

### 3.2 Malformed Handling

- **Repair strategies**: field defaults, type coercion, truncation.
- **Retry triggers**: fatal malformation → retry.
- **Fallback triggers**: repeated malformation → fallback model.

### 3.3 Response Repair

- **Repair pipeline**: detect → classify → repair → validate.
- **Repair logging**: full repair trace.
- **Repair metrics**: repair rate per provider.

### 3.4 Integration

- **Executor integration**: unified validation in executors.
- **Translator integration**: validation after translation.
- **Observability**: divergence telemetry.
- **Dashboard**: divergence view.

## 4. Implementation Steps

1. Build divergence detection (`src/lib/divergence/`).
2. Build malformed handling.
3. Build repair pipeline.
4. Integrate executors + translators.
5. Dashboard: divergence view.
6. Tests: detection, repair, retry.

## 5. Files Touched

- `src/lib/divergence/` (new: detect, repair, classify)
- `open-sse/executors/` (validation integration)
- `open-sse/translator/` (post-translation validation)
- Dashboard divergence page (new)
- `tests/unit/divergence.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| False positives | Severity levels |
| Repair corruption | Validate after repair |
| Retry loops | Retry caps |
| Divergence blindness | Schema coverage |

## 7. Success Criteria

- Divergence detected.
- Malformed responses repaired.
- Retry/fallback triggers work.
- Divergence view visible.

## 8. Related Plans

- Plan 16 (Divergence/Malformed) — foundational plan.
- Plan 52 (Request Normalization) — schema validation.
- Plan 89 (Error Classification) — error taxonomy.
- Plan 19 (Unified Error System) — error handling.