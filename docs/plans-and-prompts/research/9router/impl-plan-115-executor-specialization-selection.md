---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, executor-specialization, executor-registry, provider-executors, executor-selection
---

# Implementation Plan 115 — Executor Specialization & Selection

> Mined from branch docs: `47-branch-9router-internal-threads.md` (executor specialization, executor retry semantics) and `06-executors-deep-dive.md`.

## 1. Goal

Add executor specialization and selection to 9Router: formalize executor capabilities (streaming, binary, protobuf, retry semantics), select executors by provider + request features, and track executor quality — so each provider gets the right executor with the right behavior.

## 2. Background (from research)

- **9Router current state**: executors exist per provider; selection is implicit.
- **Research findings** (47-branch):
  - Executor specialization: executors specialized per provider/protocol.
  - Executor retry semantics: per-executor retry rules.
  - (06) Executors deep dive: executor architecture.

## 3. Design

### 3.1 Executor Registry

- **Executor model**: id, providers, protocols, capabilities, retry policy.
- **Capabilities**: streaming, binary, protobuf, NDJSON, SSE, tool-calls.
- **Registry**: provider → executor mapping.

### 3.2 Executor Selection

- **Selection logic**: provider + request features → executor.
- **Feature matching**: streaming request → streaming-capable executor.
- **Fallback**: default executor for unknown providers.

### 3.3 Executor Quality Tracking

- **Quality metrics**: per-executor success, latency, error distribution.
- **Executor comparison**: same provider, different executors.
- **Executor health**: degradation detection.

### 3.4 Executor Retry Semantics

- **Per-executor retry**: executor-specific retry policies.
- **Unified retry integration**: plan 89 retry engine.
- **Retry telemetry**: per-executor retry stats.

### 3.5 Integration

- **Dispatch integration**: executor selection in dispatch.
- **Observability**: executor telemetry.
- **Dashboard**: executor view.

## 4. Implementation Steps

1. Build executor registry (`open-sse/executors/registry.js`).
2. Add capability metadata.
3. Build executor selection.
4. Add quality tracking.
5. Integrate retry semantics.
6. Dashboard: executor view.
7. Tests: selection, capabilities, quality.

## 5. Files Touched

- `open-sse/executors/registry.js` (new)
- `open-sse/executors/*` (capability metadata)
- `open-sse/handlers/chatCore.js` (selection integration)
- `open-sse/config/executorConfig.js` (new)
- Dashboard executors page (new)
- `tests/unit/executors.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Wrong executor | Feature matching |
| Capability gaps | Default fallback |
| Quality noise | EWMA |
| Retry divergence | Unified engine |

## 7. Success Criteria

- Executors registered with capabilities.
- Selection matches features.
- Quality tracked.
- Retry semantics unified.

## 8. Related Plans

- Plan 89 (Error Classification) — retry semantics.
- Plan 34 (Provider Registry) — provider metadata.
- Plan 6 (Executors Deep Dive) — executor architecture.
- Plan 104 (Capability Matching) — capability detection.