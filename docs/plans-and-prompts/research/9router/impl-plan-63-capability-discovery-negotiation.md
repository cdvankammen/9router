---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-negotiation, capability, discovery, metadata
---

# Implementation Plan 63 — Model Capability Discovery & Negotiation

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `44-branch-gateways-and-serving.md`).
> This plan covers the "capability discovery" option: model capability discovery and negotiation.

## 1. Goal

Add model capability discovery to 9Router: discover model capabilities (context, modalities, tools, streaming), negotiate parameters, and route by capability — so requests match model capabilities.

## 2. Background (from research)

- **9Router current state**: model metadata in config; no discovery.
- **Research findings** (44-branch): capability discovery (from provider APIs, docs); capability-based routing (match request needs to model capabilities); negotiation (params adjusted to capabilities).

## 3. Design

### 3.1 Capability Model

- **Capability dimensions**: context window, modalities (text/image/audio), tools, streaming, reasoning, max output.
- **Capability sources**: registry, provider APIs, manual.
- **Capability confidence**: source reliability.

### 3.2 Discovery

- **Provider discovery**: query provider APIs for models/capabilities.
- **Doc-based discovery**: parse provider docs (semi-auto).
- **Manual override**: manual capability config.

### 3.3 Capability-Based Routing

- **Request needs**: extract capability requirements.
- **Capability matching**: match needs to capabilities.
- **Capability fallback**: fallback when no match.

### 3.4 Negotiation

- **Parameter negotiation**: adjust params to capabilities (max_tokens, modalities).
- **Feature negotiation**: enable/disable features per capability.
- **Negotiation logging**: negotiation events.

## 4. Implementation Steps

1. Define capability model.
2. Build discovery.
3. Add capability-based routing.
4. Add negotiation.
5. Tests: discovery, matching, negotiation.

## 5. Files Touched

- `src/lib/capabilities/` (new: model, discovery)
- `open-sse/providers/registry/` (capability metadata)
- `src/sse/handlers/chat.js` (capability routing)
- `open-sse/handlers/chatCore.js` (negotiation)
- `tests/unit/capabilities.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Stale capabilities | Discovery refresh |
| Wrong matching | Confidence + fallback |
| Discovery cost | Caching |
| Negotiation bugs | Tests |

## 7. Success Criteria

- Capabilities discovered.
- Routing by capability.
- Negotiation works.
- Telemetry visible.

## 8. Related Plans
- Plan 34 (Provider Registry) — metadata.
- Plan 55 (Context Window) — context capability.
- Plan 40 (API Compatibility) — feature negotiation.