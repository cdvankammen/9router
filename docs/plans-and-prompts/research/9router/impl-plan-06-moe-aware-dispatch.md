---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, moe, expert-routing, dispatch, mixture-of-experts
---

# Implementation Plan 6 — MoE-Aware Dispatch (expert-aware routing for MoE providers)

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `43-branch-moe-and-expert-routing.md`).
> This plan covers the "MoE-aware dispatch" option: route to MoE models and expert-specialized models intelligently.

## 1. Goal

Add **MoE-aware dispatch**: recognize MoE models (Mixtral, DeepSeek-MoE, etc.) and expert-specialized models in the provider registry, and route to them intelligently — leveraging their cost/quality profile (dense quality at sparse compute) and their domain specializations.

## 2. Background (from research)

- **MoE architecture**: gating network selects top-k experts per token; sparsity means only a fraction of experts active; load-balancing losses prevent expert collapse; experts specialize by domain.
- **Switch Transformer**: 7× pre-training speedup with load-balancing loss.
- **Mixtral 8x7B**: 8 experts, top-2 routing; 47B total params, 13B active.
- **DeepSeek-MoE**: fine-grained expert segmentation + shared experts.
- **Expert Choice routing**: experts choose tokens, eliminating load-balancing loss.
- **9Router current state**: provider registry has model lists; no MoE awareness; no expert-specialization metadata.

## 3. Design

### 3.1 MoE Metadata

- **Provider registry extension**: add `moe: true` + `experts: N` + `activeExperts: K` + `specialization: [domains]` to model entries.
- **Model catalog**: `config/providerModels.js` — add MoE flags.
- **New**: `src/lib/db/repos/modelCapabilityRepo.js` — capability metadata (MoE, experts, specialization, quantization).

### 3.2 MoE-Aware Scoring

- **`scoreModel()`** (smartRouter): MoE models get a cost-quality bonus (dense quality at sparse compute).
- **Expert specialization scoring**: if task type matches a model's specialization (code → code-specialized MoE), boost score.
- **Quantization-aware**: route to quantized MoE models for cost savings (INT8/INT4).

### 3.3 Expert-Aware Dispatch

- **New strategy**: `expert-dispatch` — for each request:
  1. Classify task type.
  2. Filter models by capability (MoE, specialization, quantization).
  3. Rank by specialization match + cost + quality.
  4. Route to best expert-specialized model.
- **Fallback**: generalist models when no specialist matches.

### 3.4 MoE-Specific Optimizations

- **Context routing**: MoE models with large context (Mixtral 32k) for long inputs.
- **Batch routing**: MoE models for batch workloads (throughput).
- **Speculative decoding**: MoE + speculative decoding synergy (draft model + MoE target).

## 4. Implementation Steps

1. Add MoE metadata to provider registry + model catalog.
2. Create model capability repo.
3. Add MoE-aware scoring to `scoreModel()`.
4. Add `expert-dispatch` strategy.
5. Add specialization matching.
6. Add quantization-aware routing.
7. Tests: MoE scoring, specialization matching, dispatch.

## 5. Files Touched

- `open-sse/providers/registry/*` (MoE flags)
- `open-sse/config/providerModels.js` (MoE metadata)
- `src/lib/db/repos/modelCapabilityRepo.js` (new)
- `open-sse/services/smartRouter.js` (MoE scoring)
- `src/sse/handlers/chat.js` (expert-dispatch strategy)
- `tests/unit/moe-dispatch.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| MoE metadata staleness | Registry regeneration scripts; manual override |
| Specialization mislabeling | Curated metadata; usage-based validation |
| Quantized model quality | Quality floor per quantization level |
| MoE context limits | Context window check before routing |

## 7. Success Criteria

- MoE models correctly identified and scored.
- Expert-dispatch routes to specialists for matching tasks.
- ≥20% cost reduction on MoE-eligible workloads.
- No quality regression vs generalist routing.

## 8. Related Plans
- Plan 4 (Cost-Quality Optimizer) — cost integration.
- Plan 1 (Learned Routing) — learned specialization.
- Plan 7 (Eval Harness) — dispatch evaluation.