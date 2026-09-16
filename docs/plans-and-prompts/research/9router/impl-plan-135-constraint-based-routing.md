---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, constraint-routing, hard-requirements, compliance-routing, policy-engine
---

# Implementation Plan 135 — Constraint-Based Routing with Hard Requirements

> Mined from branch docs: `45-branch-semantic-and-embedding-routing.md` (Level 3: BAB — Hard Requirements).

## 1. Goal

Implement constraint-based routing for 9Router: support hard requirements (data residency, latency SLAs, cost caps, model allowlists) that must be satisfied before a model is eligible for routing — ensuring compliance and policy enforcement.

## 2. Background (from research)

- **9Router current state**: Soft preferences only; no hard constraints.
- **Research findings** (45-branch):
  - Hard requirements (BAB): authorization rules, compliance constraints.
  - Rule evaluation (BAA-A): rule evaluation engine.
  - Authorization rules (BAB-A): access control constraints.
  - Rule-based vs learned (BAA-B): rule systems.

## 3. Design

### 3.1 Constraint Model

- **Constraint types**: data-residency, latency, cost, model-allowlist, capability.
- **Constraint evaluation**: must-all vs any-of.
- **Constraint scope**: per-request, per-user, per-organization.

### 3.2 Rule Engine

- **Rule definition**: declarative constraint rules.
- **Rule evaluation**: fast constraint filtering.
- **Rule precedence**: priority ordering.
- **Rule conflict**: conflict resolution.

### 3.3 Compliance

- **Audit**: constraint evaluation audit.
- **Reporting**: compliance reports.
- **Override**: admin override with audit.

### 3.4 Integration

- **Pre-routing filter**: constraints before provider selection.
- **Observability**: constraint evaluation metrics.
- **Dashboard**: compliance view.

## 4. Implementation Steps

1. Build constraint model.
2. Add rule engine.
3. Add compliance audit.
4. Integrate pre-routing.
5. Dashboard: compliance view.
6. Tests: constraints, rules, compliance.

## 5. Files Touched

- `src/lib/constraints/` (new: model, rules, audit)
- `open-sse/handlers/chatCore.js` (pre-routing filter)
- Dashboard compliance page (new)
- `tests/unit/constraints.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Rule conflicts | Conflict resolution |
| Performance | Fast filtering |
| Override abuse | Audit logging |
| Rule maintenance | Declarative rules |

## 7. Success Criteria

- Constraints enforced.
- Rule engine fast.
- Compliance auditable.
- Dashboard functional.

## 8. Related Plans

- Plan 13 (Runtime Enforcement) — enforcement foundations.
- Plan 56 (Task Classification) — intent classification.
- Plan 88 (Rule Engine v2) — rule engine.
- Plan 109 (Safety Guardrails) — safety constraints.