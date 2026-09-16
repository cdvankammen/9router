---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, gap-analysis, merge, master-coding-rule, consolidation
---

# Implementation Plan 20 — Gap Merge & Master Coding Rule

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md` — `32-gap-analysis.md`, `33-gap-analysis-v2.md`, `36-gap-merge.md`).
> This plan covers the "gap merge/master coding rule" option: consolidate gap analyses into a master coding rule set.

## 1. Goal

Merge all gap analyses into a single master coding rule set: consolidated findings, prioritized gaps, and a master rule document that guides all future 9Router development.

## 2. Background (from research)

- **9Router gap analyses** (docs 32, 33): gap findings; missing features; evaluation gaps.
- **9Router gap merge** (doc 36): merging gap analyses; consolidated view.
- **Research findings**: gap analyses overlap; merging reveals priorities; a master rule set prevents regression.

## 3. Design

### 3.1 Gap Consolidation

- **Gap inventory**: all gaps from all analyses (deduplicated).
- **Gap classification**: by area (routing, errors, security, UX, ...).
- **Gap prioritization**: impact × effort scoring.
- **Gap ownership**: assign gaps to implementation plans.

### 3.2 Master Coding Rule Set

- **Rule categories**: architecture, conventions, security, testing, docs.
- **Rule format**: `RULE-XXX: statement` with rationale.
- **Rule enforcement**: lint rules where possible; review checklist.
- **Rule evolution**: versioned rule set with changelog.

### 3.3 Integration

- **AGENTS.md integration**: master rules referenced from AGENTS.md.
- **Plan alignment**: every implementation plan maps to rules.
- **Regression prevention**: rules prevent known regressions.

### 3.4 Verification

- **Rule coverage**: every gap maps to a rule or plan.
- **Rule testing**: rules testable where possible.
- **Rule review**: periodic rule review.

## 4. Implementation Steps

1. Consolidate gap analyses (docs 32, 33, 36).
2. Build gap inventory + prioritization.
3. Write master coding rule set.
4. Integrate with AGENTS.md.
5. Map gaps to implementation plans.
6. Tests: rule coverage check.

## 5. Files Touched

- `docs/plans-and-prompts/research/9router/master-coding-rules.md` (new)
- `docs/plans-and-prompts/research/9router/gap-inventory.md` (new)
- `AGENTS.md` (rule reference)
- `scripts/check-rule-coverage.mjs` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Rule bloat | Prioritized; minimal set |
| Stale rules | Versioned; review cycle |
| Enforcement gaps | Lint where possible |
| Overlap with plans | Clear ownership |

## 7. Success Criteria

- All gaps consolidated and prioritized.
- Master rule set written.
- Rules referenced from AGENTS.md.
- Every gap mapped to a plan or rule.

## 8. Related Plans
- All plans (1–19) — gap ownership.
- Plan 13 (Runtime Enforcement) — rule enforcement.