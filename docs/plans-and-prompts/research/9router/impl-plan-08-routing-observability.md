---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, observability, telemetry, routing-decisions, tracing, monitoring
---

# Implementation Plan 8 — Routing Observability & Telemetry

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "observability" option: full telemetry for routing decisions — why did the router pick this model?

## 1. Goal

Add **routing observability**: record every routing decision with its rationale (task type, scores, filters, fallbacks), expose it via dashboard + API, and enable tracing of the full request lifecycle. This turns routing from a black box into an auditable, debuggable, improvable system.

## 2. Background (from research)

- **vLLM Semantic Router**: three-view model — Workload × Router policy × Model pool. Detection ≠ enforcement (signal reports; policy decides).
- **ClawRouter**: 15-dimension scorer with per-profile weights; routing profiles (eco/auto/premium).
- **LiteLLM**: alerting (Slack/webhook); traffic mirroring for A/B evaluation.
- **9Router current state**: usageDb logs requests; no routing-decision telemetry; no decision rationale recording.

## 3. Design

### 3.1 Decision Recording

- **New**: `src/lib/db/repos/routingDecisionRepo.js` — per-request routing decision record:
  - request_id, timestamp, task_type, strategy, candidate models with scores, filters applied, winner, fallback chain, cost, latency, outcome.
- **Recording point**: `src/sse/handlers/chat.js` — after routing decision, before execution.
- **Schema**: JSON column for full decision detail (scores, filters, rationale).

### 3.2 Decision API

- **New**: `src/app/api/v1/routing-decisions/route.js` — query API:
  - By request_id, model, task_type, strategy, time range.
  - Aggregations: strategy usage, model win rate, filter rejection rate.

### 3.3 Dashboard

- **Routing decisions page**: table of decisions with expandable rationale.
- **Strategy comparison**: strategy usage + outcomes.
- **Model win rate**: per-model success/cost/latency.
- **Filter analysis**: which filters reject which models.
- **Fallback analysis**: fallback chain usage + success.

### 3.4 Tracing

- **Request trace**: full lifecycle trace (parse → classify → score → select → execute → fallback).
- **Trace export**: JSON trace per request (debuggable).
- **Trace correlation**: request_id correlation across logs.

## 4. Implementation Steps

1. Create routing decision repo + schema.
2. Record decisions in chat.js.
3. Build decision query API.
4. Build dashboard pages (decisions, strategy, win rate, filters, fallbacks).
5. Add request tracing.
6. Tests: decision recording, query API.

## 5. Files Touched

- `src/lib/db/repos/routingDecisionRepo.js` (new)
- `src/sse/handlers/chat.js` (recording)
- `src/app/api/v1/routing-decisions/route.js` (new)
- Dashboard routing-decisions page (new)
- `tests/unit/routing-decisions.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Storage growth | Retention policy; aggregation tables |
| Recording overhead | Async recording; batched writes |
| PII in decisions | Redact prompts; store hashes only |
| Dashboard complexity | Progressive disclosure; filters |

## 7. Success Criteria

- Every routing decision recorded with rationale.
- Decision API queryable.
- Dashboard shows strategy usage, win rates, filter analysis.
- Request tracing available.

## 8. Related Plans
- Plan 7 (Eval Harness) — evaluation data source.
- Plan 5 (Gateway Interop) — mirror comparison.
- Plan 4 (Cost-Quality Optimizer) — cost tracking.