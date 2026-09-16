---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, error-classification, error-registry, executor-retry-semantics, failure-detection
---

# Implementation Plan 89 — Error Classification & Executor Retry Semantics

> Mined from branch docs: `47-branch-9router-internal-threads.md` (error classification, error registry, executor retry semantics, failure detection) and `42-branch-cascades-and-fallbacks.md` (failure detection, backoff strategies).

## 1. Goal

Unify error classification and executor retry semantics in 9Router: classify every upstream error into a typed taxonomy (transient, permanent, rate-limit, auth, timeout, malformed), define per-type retry semantics, and centralize failure detection — so retries are correct and predictable.

## 2. Background (from research)

- **9Router current state**: error handling exists (plan 19 unified error system) but retry semantics vary per executor.
- **Research findings** (47-branch):
  - Error classification: typed error taxonomy.
  - Error registry: centralized error definitions.
  - Executor retry semantics: per-executor retry rules.
  - Failure detection: detect failures early (health checks, timeouts).

## 3. Design

### 3.1 Error Taxonomy

```
ERROR_TYPES = {
  transient:      retryable, backoff
  rate_limit:     retryable, respect Retry-After
  timeout:        retryable, shorter timeout on retry
  auth:           NOT retryable (refresh token first)
  quota:          NOT retryable (switch account)
  malformed:      NOT retryable (fix request)
  permanent:      NOT retryable (fail fast)
  unknown:        retryable once, then classify
}
```

### 3.2 Error Registry

- **Registry**: centralized error definitions (code, type, message template, retry policy).
- **Classification**: classifier maps upstream errors → registry entries.
- **Extension**: providers register custom errors.

### 3.3 Retry Semantics

- **Per-type policy**: max retries, backoff, jitter, Retry-After respect.
- **Per-executor policy**: executor-specific overrides.
- **Retry budget**: total retry time budget per request.
- **Retry logging**: full retry trace.

### 3.4 Failure Detection

- **Early detection**: health checks, pre-flight checks.
- **Timeout detection**: per-phase timeouts.
- **Stream failure detection**: mid-stream error detection.

### 3.5 Integration

- **Executor integration**: all executors use unified retry.
- **Observability**: error-type distribution, retry stats.
- **Dashboard**: error registry view.

## 4. Implementation Steps

1. Define error taxonomy (`open-sse/errors/`).
2. Build error registry.
3. Build classifier.
4. Build unified retry engine.
5. Migrate executors to unified retry.
6. Add failure detection.
7. Dashboard: error registry view.
8. Tests: classification, retry policies.

## 5. Files Touched

- `open-sse/errors/` (new: taxonomy, registry, classifier, retry)
- `open-sse/executors/*` (retry migration)
- `open-sse/handlers/chatCore.js` (retry integration)
- Dashboard errors page (new)
- `tests/unit/errors.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Misclassification | Unknown → retry once |
| Retry storms | Retry budget + backoff |
| Executor divergence | Migration tests |
| Retry-After abuse | Cap wait time |

## 7. Success Criteria

- Errors classified into taxonomy.
- Retry semantics per type.
- All executors use unified retry.
- Failure detection active.
- Error telemetry visible.

## 8. Related Plans

- Plan 19 (Unified Error System) — error foundations.
- Plan 57 (Retry Semantics) — retry policies.
- Plan 9 (Error Failover) — failover integration.
- Plan 22 (Error Sweep) — error cleanup.