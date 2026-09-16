---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, quantization-for-routing, model-quantization, routing-efficiency, compressed-models
---

# Implementation Plan 113 — Quantization-Aware Routing

> Mined from branch docs: `48-branch-emerging-and-frontier.md` (quantization for routing) and `43-branch-moe-and-expert-routing.md` (KV quantization).

## 1. Goal

Add quantization-aware routing to 9Router: track quantized model variants (int8, int4, fp16), route requests to appropriate quantization levels based on quality requirements, and measure quantization quality impact — so quantized models are used where quality allows.

## 2. Background (from research)

- **9Router current state**: no quantization awareness.
- **Research findings** (48-branch):
  - Quantization for routing: quantized variants as routing options.
  - (43-branch) KV quantization: KV cache quantization.

## 3. Design

### 3.1 Quantization Registry

- **Variant model**: base model + quantization level.
- **Variant metadata**: quality delta, speed, memory, cost.
- **Variant availability**: per-provider variant support.

### 3.2 Quality Impact Tracking

- **Quality delta**: quantized vs. full quality per task-type.
- **Task sensitivity**: which tasks tolerate quantization.
- **Impact updates**: continuous measurement.

### 3.3 Quantization Routing

- **Routing logic**: quality requirement → quantization level.
- **Task mapping**: low-stakes tasks → quantized variants.
- **Fallback**: quality failure → full precision.

### 3.4 Integration

- **Model registry integration**: variants in provider registry.
- **Observability**: quantization usage, quality impact.
- **Dashboard**: quantization view.

## 4. Implementation Steps

1. Build quantization registry (`src/lib/quant/`).
2. Add quality impact tracking.
3. Build quantization routing.
4. Integrate model registry.
5. Dashboard: quantization view.
6. Tests: variant routing, quality impact.

## 5. Files Touched

- `src/lib/quant/` (new: registry, impact, route)
- `open-sse/config/providerModels.js` (variant metadata)
- `src/sse/handlers/chat.js` (quant routing)
- Dashboard quant page (new)
- `tests/unit/quant.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Quality loss | Task sensitivity mapping |
| Variant confusion | Clear naming |
| Impact drift | Continuous measurement |
| Fallback gaps | Full-precision fallback |

## 7. Success Criteria

- Variants registered.
- Quality impact tracked.
- Quant routing works.
- Fallback to full precision.

## 8. Related Plans

- Plan 92 (Local Acceleration) — KV quantization.
- Plan 34 (Provider Registry) — model metadata.
- Plan 97 (Quality Tiers) — quality requirements.
- Plan 18 (Model Serving) — serving policy.