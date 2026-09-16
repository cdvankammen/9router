---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-context-engineering, system-prompts, routing-context
---

# Implementation Plan 76 — Routing Context Engineering

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "routing context" option: engineering routing context for better decisions.

## 1. Goal

Add routing context engineering to 9Router: enrich routing decisions with context (user preferences, history, environment) — so routing is personalized and informed.

## 2. Background (from research)

- **9Router current state**: routing by request content only.
- **Research findings**: context dimensions — user preferences, usage history, time-of-day, device, environment; context enrichment improves routing precision.

## 3. Design

### 3.1 Context Dimensions

- **User context**: preferences, tier, history.
- **Request context**: task type, complexity, urgency.
- **Environment context**: time, load, provider health.

### 3.2 Context Collection

- **Collection points**: request, user store, environment.
- **Context freshness**: staleness handling.
- **Context privacy**: redaction.

### 3.3 Context Enrichment

- **Enrichment pipeline**: raw context → routing features.
- **Feature extraction**: derived features.
- **Feature weighting**: per-feature weights.

### 3.4 Integration

- **Routing integration**: context-aware selection.
- **Observability**: context telemetry.
- **Feedback**: outcome-based context tuning.

## 4. Implementation Steps

1. Define context dimensions.
2. Build context collection.
3. Add enrichment.
4. Integrate routing.
5. Tests: collection, enrichment.

## 5. Files Touched

- `src/lib/context/` (extend: enrichment)
- `src/sse/handlers/chat.js` (integration)
- `src/lib/db/repos/contextRepo.js` (extend)
- `open-sse/config/contextConfig.js` (extend)
- `tests/unit/context-engineering.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Privacy | Redaction |
| Stale context | Freshness handling |
| Feature noise | Weighting |
| Complexity | Progressive |

## 7. Success Criteria

- Context collected.
- Enrichment works.
- Routing context-aware.
- Telemetry visible.

## 8. Related Plans
- Plan 56 (Task Classification) — task context.
- Plan 76 (Context) — synergy.
- Plan 8 (Observability) — context telemetry.