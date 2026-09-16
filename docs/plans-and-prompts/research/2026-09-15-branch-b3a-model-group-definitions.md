# Branch Research — B3a: Model-Group Definitions (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #model-groups #qwen #shared-budget #binary-tree #branch-b3a

## Objective

Deep-dive the **model-group definitions** subtree: group membership (B3a1) and shared budget (B3a2), down to L6 leaves.

```
B3a GROUP DEFINITIONS
├─ B3a1: membership (provider + family prefix)
│  ├─ B3a1L: qwen-* auto-derive
│  │  ├─ B3a1LL: explicit opt-in
│  │  └─ B3a1LR: prefix confirmation
│  └─ B3a1R: explicit list / combo membership
│     ├─ B3a1RL: reuse combo engine
│     └─ B3a1RR: LiteLLM routing groups precedent
└─ B3a2: shared budget (RPM/TPM)
   ├─ B3a2L: group cap before dispatch
   │  ├─ B3a2LL: 9 qwen models share one cap
   │  └─ B3a2LR: group queue + pacing
   └─ B3a2R: group cooldown on 429
      ├─ B3a2RL: 5s default (LiteLLM)
      └─ B3a2RR: configurable
```

## Codebase grounding

### The user's ask

- The user has **9 qwen models under one provider endpoint** and wants to **group them together and prevent calls** from exceeding the shared upstream quota. This is the model-group limiting feature.

### What exists

- `open-sse/config/providerModels.js` — the model registry (provider → models). Qwen models are listed per-provider.
- `open-sse/config/providers.js` — provider config (base URLs, auth).
- Combo engine (`src/lib/db/repos/combosRepo.js` + smartRouter dynamic combos) — ordered fallback lists (try A, then B). Combos are *fallback*, not *shared budget*.
- `src/sse/services/smartRouter.js` — pre-combo interception, concurrency tracking per model.

### What doesn't exist

- No group concept: models are independent; each has its own limits (or none).
- No shared-budget enforcement across models.

## External research

### B3a1L — qwen-* auto-derive

- The user's 9 qwen models share a provider endpoint (e.g. `qwen-max`, `qwen-plus`, `qwen-turbo`, `qwen-long`, `qwen-vl-plus`, etc. under one base URL). Grouping by **provider + family prefix** (`qwen-*`) is the natural auto-derivation.
- **B3a1LL — explicit opt-in:** auto-derivation should be *opt-in* (a config flag), not implicit — the user might have qwen models on different providers with different quotas.
- **B3a1LR — prefix confirmation:** before auto-deriving, confirm the prefix matches the actual model list (e.g. all models starting with `qwen-` on provider X). If the user has `qwen-coder` on provider Y, it's a different group.

### B3a1R — Explicit list / combo membership

- **B3a1RL — reuse combo engine:** groups can be defined as explicit model lists, reusing the combo engine's model-selection plumbing (the combo engine already knows how to enumerate and select models).
- **B3a1RR — LiteLLM routing groups precedent:** LiteLLM routing groups (phase 2 research): each `model_name` belongs to at most one group; groups are callable as models themselves; group names appear in `/v1/models`; `model_group` is recorded in spend logs. This is the industry precedent for "group = first-class entity."

### B3a2L — Shared budget (RPM/TPM)

- **B3a2LL — 9 qwen models share one cap:** the group has ONE token bucket (RPM + TPM) shared by all members. A request to any member consumes from the group bucket. This is the core of "prevent calls" — the group cap is enforced *before dispatch*.
- **B3a2LR — group queue + pacing:** when the group bucket is empty, requests queue (B2b pacing) instead of failing. The drain rate = group quota / member count (or configured).

### B3a2R — Group cooldown on 429

- **B3a2RL — 5s default (LiteLLM):** when a group member gets a 429, the whole group enters cooldown (LiteLLM default 5s). This prevents the group from hammering the shared upstream.
- **B3a2RR — configurable:** cooldown duration per group (config), and optionally per-provider defaults.

## Synthesis — design space

1. **Group definition:**
   - `group = { name, provider, members: [modelIds], sharedRpm, sharedTpm, cooldownMs }`.
   - Auto-derive: `provider + prefix` (opt-in flag `autoGroupPrefixes: { "dashscope": "qwen-" }`).
   - Explicit: `groups: [{ name: "qwen-family", members: ["qwen-max", "qwen-plus", ...] }]`.
2. **Enforcement point:** before dispatch in `chatCore.js` (or the app-layer smartRouter pre-combo interception): check the group bucket; if empty → queue (B2b) or 429.
3. **Cooldown:** on upstream 429 for any member → group cooldown (5s default). During cooldown, requests queue or fail fast (configurable).
4. **Composition with combos:** a combo can contain members of a group (fallback within the group); the group cap applies regardless of which member is tried. This is the "compose (combo members in group)" leaf.
5. **Dashboard:** group as a first-class entity (B3b) — throughput, queue depth, cooldown state per group.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Provider + family prefix is the right auto-derivation | High |
| Opt-in auto-derivation avoids cross-provider mistakes | High |
| LiteLLM routing groups are the right precedent | High |
| Shared token bucket per group is the right enforcement | High |
| Group cooldown on 429 prevents upstream hammering | High |

## Open questions

1. Should the group cap be per-provider (all groups on one provider share) or per-group? (Recommendation: per-group, with an optional provider-level cap as a safety net.)
2. What happens when a group member is also in a combo with a non-member? (Recommendation: group cap applies to the member; the combo fallback to a non-member is unaffected.)
3. Should group membership be visible in `/v1/models` (LiteLLM precedent) or internal-only?

## Sources

- Code: `open-sse/config/providerModels.js`, `open-sse/config/providers.js`, `src/lib/db/repos/combosRepo.js`, `src/sse/services/smartRouter.js`
- Prior research: `2026-09-14-keyless-governance-research.md` (model-group limiting section)
- Industry: LiteLLM routing groups (phase 2 fetch), Anthropic RPM/ITPM/OTPM model (B1a branch)