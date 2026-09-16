---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, api-compatibility, openai, sdk, clients
---

# Implementation Plan 40 — API Compatibility & SDK Support

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `44-branch-gateways-and-serving.md`).
> This plan covers the "API compatibility" option: full OpenAI-compatible API surface and SDK support.

## 1. Goal

Ensure 9Router's API is fully OpenAI-compatible: complete endpoint coverage, parameter fidelity, error compatibility, and SDK compatibility — so any OpenAI client works unchanged.

## 2. Background (from research)

- **9Router current state**: `/v1/*` OpenAI-compatible endpoint; chat completions + embeddings + other skills.
- **Research findings** (44-branch): compatibility requires endpoint coverage (chat, completions, embeddings, images, audio, files), parameter fidelity (stream, tools, response_format), error compatibility (OpenAI error shapes), and SDK testing.

## 3. Design

### 3.1 Endpoint Coverage

- **Endpoint matrix**: chat/completions, embeddings, images, audio (stt/tts), files, models.
- **Coverage gaps**: identify + implement missing endpoints.
- **Versioning**: /v1 stability.

### 3.2 Parameter Fidelity

- **Parameter passthrough**: all OpenAI params passed through.
- **Parameter translation**: provider-specific params mapped.
- **Parameter validation**: OpenAI-compatible validation.

### 3.3 Error Compatibility

- **Error shapes**: OpenAI error format (error: {message, type, param, code}).
- **Status codes**: OpenAI-compatible status codes.
- **Error docs**: documented error codes.

### 3.4 SDK Compatibility

- **SDK test matrix**: OpenAI SDK (Python, JS, others).
- **SDK tests**: automated SDK compatibility tests.
- **SDK docs**: SDK usage examples.

## 4. Implementation Steps

1. Build endpoint coverage matrix.
2. Fill coverage gaps.
3. Ensure parameter fidelity.
4. Ensure error compatibility.
5. Add SDK tests.
6. Tests: endpoint matrix, SDK tests.

## 5. Files Touched

- `src/app/api/v1/` (endpoints)
- `open-sse/translator/` (parameter translation)
- `open-sse/config/errorCodes.js` (error shapes)
- `tests/sdk/` (new: SDK tests)
- `docs/api-compatibility.md` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Endpoint gaps | Coverage matrix |
| Parameter drift | Fidelity tests |
| Error mismatch | Compatibility tests |
| SDK breakage | SDK test matrix |

## 7. Success Criteria

- Full endpoint coverage.
- Parameter fidelity verified.
- Error shapes compatible.
- SDK tests pass.

## 8. Related Plans
- Plan 19 (Unified Error System) — error shapes.
- Plan 34 (Provider Registry) — provider mapping.
- Plan 32 (CI) — SDK tests in CI.