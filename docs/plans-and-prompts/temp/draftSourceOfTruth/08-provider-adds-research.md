# PROVIDER-ADDS Cluster — Deep Research

**Date:** 2026-08-12
**Cluster PRs:** #3124, #3057, #3132, #2948, #2952, #2954, #2898
**Base:** decolua/9router `master` (registry p0–p120, gaps at p76/p101/p102/p104/p114)

---

## Executive Summary

| PR | Title | Author | Files | Risk | Tier | Verdict |
|----|-------|--------|-------|------|------|---------|
| **#3124** | feat: add Meta AI (Muse Spark) | dasepmoch | 8 | LOW | T1 | ✅ Merge-ready. Clean registry add. Next available slot: p121. |
| **#3057** | feat: add OpenCode Zen (PAYG) | cokkyturnip | 6 | LOW-MED | T2 | ⚠️ Needs custom executor review. Shares models with opencode-go. |
| **#3132** | feat(elevenlabs): full TTS panel | ntdatt812 | 48 | MEDIUM | T2 | ⚠️ Large but well-tested. handleTtsCore signature change affects all TTS. |
| **#2948** | feat: custom video provider nodes | nhatcoi | 14 | MEDIUM | T2 | ⚠️ New UI modal + SSE handlers. Needs architecture review. |
| **#2952** | feat(qoder): deep protocol module | asuan-dev | 33 | MEDIUM-HIGH | T3 | ⚠️ Major refactor. Replaces executor with protocol module. 105 tests. |
| **#2954** | feat(codebuddy): shared protocol + profile refresh | asuan-dev | 18 | MEDIUM | T3 | ⚠️ Depends on #2952 patterns. New API route + dashboard button. |
| **#2898** | feat(cli-tools): add Pi agent support | jellydn | 11 | LOW | T1 | ✅ Merge-ready. CLI tools integration, not a provider registry add. |

### Registry Slot Analysis
Current master uses p0–p120 with gaps at p76, p101, p102 (trae hidden), p104 (windsurf hidden), p114 (devin-cli hidden).
- **#3124 (Meta AI):** Needs new slot → **p121**
- **#3057 (OpenCode Zen):** Needs new slot → **p122** (or reuse gap if appropriate)
- **#2952 (Qoder refactor):** Replaces existing p75 (`qoder.js`) — no new slot
- **#2954 (CodeBuddy):** Modifies existing p18/p100 — no new slot
- **#3132, #2948, #2898:** Not registry additions

---

## Per-PR Detailed Analysis

### PR #3124 — feat(providers): add Meta AI (Muse Spark)
**Tier: T1 — Merge-ready**

| Field | Value |
|-------|-------|
| Author | dasepmoch |
| Files | 8 (meta.js registry, index.js, capabilities.js, thinkingUnified.js, thinkingLevels.js, pricing.js, meta.png, test) |
| Models | muse-spark-1.2, muse-spark-1.1, muse-spark-1.2-contributor |
| Pricing | $1.25/$4.25 input/output (1.2/1.1), $0.10/$0.20 (contributor) |
| Tests | 7/7 pass |

**What it does:** Adds Meta AI as OpenAI-compatible apikey provider at `https://api.meta.ai/v1`. Dynamic model list via `modelsFetcher`. Thinking format: `reasoning_effort` minimal/low/medium/high/xhigh (clamps max→xhigh, omits none → upstream 400).

**Proposed registry entry (`open-sse/providers/registry/meta.js`):**
```javascript
export default {
  id: "meta",
  priority: 121,
  alias: "meta-ai",
  aliases: ["llama"],
  category: "apikey",
  display: {
    name: "Meta AI",
    icon: "meta",
    color: "#0064E0",
    textIcon: "MA",
    website: "https://ai.meta.com",
    notice: { apiKeyUrl: "https://developers.facebook.com/" },
  },
  transport: {
    baseUrl: "https://api.meta.ai/v1/chat/completions",
    format: "openai",
    modelsFetcher: { url: "https://api.meta.ai/v1/models", type: "openai" },
  },
  models: [
    { id: "muse-spark-1.2", name: "Muse Spark 1.2" },
    { id: "muse-spark-1.1", name: "Muse Spark 1.1" },
    { id: "muse-spark-1.2-contributor", name: "Muse Spark 1.2 Contributor" },
  ],
  passthroughModels: true,
};
```

**Registry index.js addition:**
```javascript
import p121 from "./meta.js";
// ... in array:
p121,
```

**Capabilities addition:**
```javascript
// In PROVIDER_CAPABILITIES or MODEL_CAPABILITIES:
"muse-spark-1.2": { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000 },
"muse-spark-1.1": { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000 },
"muse-spark-1.2-contributor": { reasoning: true, thinkingFormat: "openai", thinkingCanDisable: false, contextWindow: 1000000 },
```

**Conflict:** None. Uses next available slot p121. All files are additive.
**Automerge:** YES after rebase confirmation.

---

### PR #3057 — feat: add OpenCode Zen (PAYG) provider
**Tier: T2 — Review carefully**

| Field | Value |
|-------|-------|
| Author | cokkyturnip |
| Files | 6 (opencode-zen.js registry, executor, index.js, icon, etc.) |
| Models | 61 models (Claude, GPT, Gemini, Grok, DeepSeek, GLM, Kimi, MiniMax, Qwen) |
| Category | apikey (distinct from opencode-go's subscription) |

**What it does:** Adds OpenCode Zen PAYG tier as separate provider. Custom executor routes to `/zen/v1/chat/completions` (OpenAI) or `/zen/v1/messages` (Claude). Sends API key via Bearer or x-api-key depending on format.

**Key concern:** 61 models overlap heavily with existing `opencode-go` (p68). The distinction is billing only (PAYG vs $5/mo subscription). Users may be confused by two nearly identical providers.

**Proposed registry slot:** p122

**Risk:** LOW-MEDIUM. Custom executor needs review for auth forwarding correctness. Model overlap with opencode-go is a UX concern, not a code conflict.

**Decision needed:** Should this be a separate provider or a billing-mode toggle on existing opencode-go?

---

### PR #3132 — feat(elevenlabs): full TTS panel
**Tier: T2 — Large but well-tested**

| Field | Value |
|-------|-------|
| Author | ntdatt812 |
| Files | 48 (adapter, panel component, i18n ×32 locales, tests) |
| Tests | 21 new tests, 0 regressions |
| Breaking change | `handleTtsCore` signature: named params → options bag |

**What it does:** Comprehensive ElevenLabs upgrade: v3 model, inline audio tags (~70), AI Enhance (rewrites text via user's LLM), stability/speed/language/output_format controls, generation history (IndexedDB Blobs), credit reporting, restricted-key fallback voice roster.

**⚠️ Signature change:**
```javascript
// BEFORE:
handleTtsCore({ provider, model, input, credentials, responseFormat, language, style })
// AFTER:
handleTtsCore({ provider, model, input, credentials, responseFormat, options })
```
All TTS adapters and callers must be updated. PR updates in-repo call sites (`src/sse/handlers/tts.js`) and test assertions.

**Deprecated model removed:** `eleven_monolingual_v1` (API returns 400).

**Risk:** MEDIUM. 48 files is large. The signature change touches the TTS core contract. Well-tested but needs careful review of the options-bag migration.

**Merge order:** Independent of other clusters. Can merge anytime.

---

### PR #2948 — feat(media-providers): custom video provider nodes
**Tier: T2 — Architecture review needed**

| Field | Value |
|-------|-------|
| Author | nhatcoi |
| Files | 14 |
| Scope | AddCustomVideoModal UI + API routes + SSE handlers |

**What it does:** Adds UI for configuring custom video generation provider nodes. New modal component, backend API routes, SSE handler integration.

**Risk:** MEDIUM. Introduces new media provider pattern. Needs architecture review to ensure it fits the existing media provider framework (`PROVIDER_MEDIA[id]`).

---

### PR #2952 — feat(qoder): deep protocol module
**Tier: T3 — Major refactor**

| Field | Value |
|-------|-------|
| Author | asuan-dev |
| Files | 33 |
| Tests | 105 protocol/OAuth/PAT tests |
| Scope | Replaces single-file qoder executor with reusable protocol module |

**What it does:** Extracts Qoder/QoderWork CN wire protocol (Cosy signing, body encoding, SSE unwrap, model catalog, quota, PAT exchange) into `open-sse/protocol/qoder/`. Thin adapter replaces old executor. Fixes: platform-derived Cosy-Machineos, distinct Machineid/Machinetoken, proxy-aware OAuth, reasoning_effort passthrough. Adds QoderWork CN provider.

**Risk:** MEDIUM-HIGH. Touches 33 files. Replaces working executor with new architecture. 105 tests provide good coverage but the refactor surface is large.

**Dependency:** #2954 builds on this pattern. Merge #2952 first.

---

### PR #2954 — feat(codebuddy): shared protocol normalization + profile refresh
**Tier: T3 — Depends on #2952 patterns**

| Field | Value |
|-------|-------|
| Author | asuan-dev |
| Files | 18 |
| Tests | 26 vitest + 11 node:test |

**What it does:** Shared CodeBuddy protocol module (`open-sse/protocol/codebuddy/`), provider-owned config for model discovery, account profile refresh API (`POST /api/providers/[id]/refresh-profile`), dashboard refresh-all button.

**Risk:** MEDIUM. New API route + dashboard feature. Pattern follows #2952.

**Dependency:** Merge after #2952.

---

### PR #2898 — feat(cli-tools): add Pi (pi.dev) coding agent support
**Tier: T1 — Merge-ready**

| Field | Value |
|-------|-------|
| Author | jellydn |
| Files | 11 |
| Closes | #2897 |

**What it does:** Adds Pi to CLI Tools page. API route for reading/writing `~/.pi/agent/models.json`. PiToolCard component with base URL, API key, multi-model selector. Not a provider registry addition — it's a CLI tool integration.

**Risk:** LOW. Self-contained CLI tools feature. No registry conflicts.
**Automerge:** YES.

---

## Recommended Merge Order

```
1. #2898  (Pi CLI tool)        — independent, LOW risk
2. #3124  (Meta AI)            — independent, clean registry add at p121
3. #3057  (OpenCode Zen)       — review executor, decide vs opencode-go overlap
4. #3132  (ElevenLabs TTS)     — review handleTtsCore signature change
5. #2948  (Custom video nodes) — architecture review
6. #2952  (Qoder protocol)     — major refactor, merge before #2954
7. #2954  (CodeBuddy protocol) — depends on #2952
```

## Conflict Matrix

| File | PRs |
|------|-----|
| `registry/index.js` | #3124 (p121), #3057 (p122) |
| `capabilities.js` | #3124 |
| `pricing.js` | #3124 |
| `thinkingUnified.js` | #3124 |
| `thinkingLevels.js` | #3124 |
| `executors/` | #3057 (new), #2952 (replaces qoder.js) |
| `handleTtsCore` callers | #3132 |
| `protocol/` (new dir) | #2952, #2954 |
