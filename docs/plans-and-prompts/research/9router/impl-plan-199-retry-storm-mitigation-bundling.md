---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, retry-storm-prevention, retry-storm-control, bundling, storm-mitigation
---

# Implementation Plan 199 — Retry Storm Mitigation & Bundling

> Mined from branch docs: `44-branch-gateways-and-serving.md` (Level 3: BAA — Retry Storm Mitigation).

## 1. Goal

Implement retry storm mitigation for 9Router: detect retry storms (sudden retry amplification), throttle during storms, and bundle retries (coalesce identical retries) — preventing retry storms from amplifying load and cost.

## 2. Background (from research)

- **9Router current state**: No retry storm mitigation (plan 138 retry amplification exists).
- **Research findings** (44-branch):
  - Retry storm mitigation (BAA): storm prevention.
  - Retry storm detection (BAA-A): detect storms.
  - Retry storm response (BAA-B): respond to storms.
  - Retry bundling (BAB): coalesce retries.

## 3. Design

### 3.1 Storm Detection

- **Storm signals**: retry rate spikes, amplification.
- **Storm detection**: threshold-based detection.
- **Storm classification**: minor/major/severe.

### 3.2 Storm Response

- **Storm throttle**: throttle during storm.
- **Storm queue**: queue during storm.
- **Storm priority**: priority classes during storm.

### 3.3 Retry Bundling

- **Bundling**: coalesce identical retries.
- **Bundle scope**: per-request, per-key.
- **Bundle window**: bundling window.

### 3.4 Integration

- **Retry integration**: storm hooks.
- **Observability**: storm metrics.
- **Dashboard**: storm view.

## 4. Implementation Steps

1. Build storm detection.
2. Add storm response.
3. Add retry bundling.
4. Integrate retry system.
5. Dashboard: storm view.
6. Tests: detection, response, bundling.

## 5. Files Touched

- `src/lib/storms/` (new: detect, respond, bundle)
- `open-sse/handlers/chatCore.js` (storm hooks)
- Dashboard storm page (new)
- `tests/unit/storms.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Missed storms | Multiple signals |
| False alarms | Threshold tuning |
| Bundle delay | Window bounds |
| Complexity | Simple rules |

## 7. Success Criteria

- Storms detected.
- Storms responded to.
- Bundling works.
- Amplification controlled.

## 8. Related Plans

- Plan 138 (Retry Amplification) — foundations.
- Plan 23 (Fallback Retry) — retry semantics.
- Plan 105 (Storm Protection) — protection.
- Plan 187 (Rate Limiting) — rate limits.