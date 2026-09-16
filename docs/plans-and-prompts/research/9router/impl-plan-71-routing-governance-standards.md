---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-routing-policy, governance, standards, compliance
---

# Implementation Plan 71 — Routing Governance & Standards

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "routing governance" option: routing governance and standards.

## 1. Goal

Establish routing governance for 9Router: routing standards, review processes, and compliance — so routing decisions are governed and auditable.

## 2. Background (from research)

- **9Router current state**: routing logic in code; no governance layer.
- **Research findings**: governance needs — routing standards (documented policies); review process (changes reviewed); compliance (policies enforced + audited).

## 3. Design

### 3.1 Routing Standards

- **Standards doc**: routing policies, naming, conventions.
- **Standards enforcement**: lint + review checks.
- **Standards evolution**: versioned standards.

### 3.2 Review Process

- **Change review**: routing changes reviewed.
- **Impact analysis**: change impact assessment.
- **Approval workflow**: documented approvals.

### 3.3 Compliance

- **Policy compliance**: routing policies enforced.
- **Compliance audit**: routing decisions audited.
- **Compliance reports**: periodic reports.

### 3.4 Integration

- **Config integration**: standards in config.
- **CI integration**: standards checks.
- **Observability**: governance telemetry.

## 4. Implementation Steps

1. Write routing standards.
2. Add standards checks.
3. Define review process.
4. Add compliance audit.
5. Tests: standards checks.

## 5. Files Touched

- `docs/routing-standards.md` (new)
- `scripts/check-routing-standards.mjs` (new)
- `src/lib/governance/` (new: compliance)
- `src/lib/db/repos/governanceRepo.js` (new)
- `tests/unit/governance.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Standards bloat | Minimal set |
| Review friction | Automation |
| Compliance gaps | Audit |
| Staleness | Versioned |

## 7. Success Criteria

- Standards documented.
- Checks enforced.
- Review process defined.
- Compliance audited.

## 8. Related Plans
- Plan 20 (Master Rules) — rule synergy.
- Plan 47 (Audit) — compliance audit.
- Plan 32 (CI) — standards checks.