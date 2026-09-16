---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, request-tracing, distributed, correlation, debugging
---

# Implementation Plan 66 — Request Tracing & Correlation

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "request tracing" option: end-to-end request tracing and correlation.

## 1. Goal

Add end-to-end request tracing to 9Router: trace every request through the full lifecycle, correlate related events, and provide trace views — for debugging and analysis.

## 2. Background (from research)

- **9Router current state**: request_id exists in some paths; no tracing.
- **Research findings**: tracing spans (parse, classify, route, execute, stream); correlation (request_id across logs, DB, errors); trace views (timeline, spans, logs).

## 3. Design

### 3.1 Trace Model

- **Trace**: request_id → spans.
- **Span types**: parse, classify, route, execute, stream, fallback.
- **Span fields**: start, end, duration, status, metadata.

### 3.2 Tracing Pipeline

- **Trace start**: request entry.
- **Span recording**: at each stage.
- **Trace end**: request completion.
- **Trace storage**: trace store.

### 3.3 Correlation

- **Correlation keys**: request_id, session_id, user_id.
- **Cross-system correlation**: logs, DB, errors, usage.
- **Correlation queries**: find related events.

### 3.4 Trace Views

- **Timeline view**: span timeline.
- **Detail view**: span details.
- **Log view**: correlated logs.
- **Trace export**: exportable traces.

## 4. Implementation Steps

1. Define trace model.
2. Build tracing pipeline.
3. Add correlation.
4. Build trace views.
5. Tests: spans, correlation.

## 5. Files Touched

- `src/lib/tracing/` (new: model, pipeline)
- `open-sse/handlers/chatCore.js` (span recording)
- `src/lib/db/repos/traceRepo.js` (new)
- Dashboard traces page (new)
- `tests/unit/tracing.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Overhead | Sampling; async |
| Storage | Retention |
| Correlation gaps | Key discipline |
| Privacy | Redaction |

## 7. Success Criteria

- Traces recorded end-to-end.
- Correlation works.
- Trace views functional.
- Export available.

## 8. Related Plans
- Plan 8 (Observability) — telemetry synergy.
- Plan 47 (Audit) — traceability.
- Plan 54 (Traffic Inspection) — debugging.