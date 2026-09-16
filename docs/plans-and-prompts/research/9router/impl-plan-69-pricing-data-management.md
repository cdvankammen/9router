---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-pricing, pricing-data, cost-model, updates
---

# Implementation Plan 69 — Model Pricing Data Management

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `46-branch-evaluation-and-cost-quality.md`).
> This plan covers the "pricing data" option: accurate model pricing data management.

## 1. Goal

Add model pricing data management to 9Router: accurate pricing registry, pricing updates, and pricing verification — so cost calculations are correct.

## 2. Background (from research)

- **9Router current state**: cost estimation regex-heuristic (per impl-plan-04).
- **Research findings** (46-branch): pricing varies by model/token-type; pricing changes frequently; pricing errors distort cost-based routing.

## 3. Design

### 3.1 Pricing Registry

- **Pricing model**: per-model input/output/cache pricing.
- **Pricing sources**: provider docs, APIs, manual.
- **Pricing metadata**: source, updated, confidence.

### 3.2 Pricing Updates

- **Update workflow**: review → update → verify.
- **Update automation**: semi-auto from provider sources.
- **Update history**: pricing change log.

### 3.3 Pricing Verification

- **Verification checks**: sanity checks (ranges, ratios).
- **Verification tests**: pricing tests.
- **Verification alerts**: suspicious pricing.

### 3.4 Integration

- **Cost integration**: pricing drives cost calc.
- **Routing integration**: pricing drives cost-based routing.
- **Observability**: pricing telemetry.

## 4. Implementation Steps

1. Build pricing registry.
2. Add update workflow.
3. Add verification.
4. Integrate cost + routing.
5. Tests: pricing, verification.

## 5. Files Touched

- `src/lib/pricing/` (new: registry, updates)
- `open-sse/config/pricing.js` (extend)
- `src/lib/cost/` (integration)
- `src/app/api/v1/pricing/route.js` (new)
- `tests/unit/pricing.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Stale pricing | Update workflow |
| Pricing errors | Verification |
| Source ambiguity | Confidence metadata |
| Integration drift | Tests |

## 7. Success Criteria

- Pricing registry accurate.
- Updates workflow works.
- Verification passes.
- Cost/routing use pricing.

## 8. Related Plans
- Plan 45 (Cost Tracking) — cost calc.
- Plan 4 (Cost-Quality) — cost model.
- Plan 34 (Provider Registry) — model metadata.