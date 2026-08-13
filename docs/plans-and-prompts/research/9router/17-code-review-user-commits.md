# Code Review & Live Verification — User's Personal Commits

**Date:** 2026-08-07
**Author:** GitHub Copilot agent (review performed at user's request)
**Status:** active
**Tags:** #review #code-review #verification #user-commits #master

## Scope

The user asked: "prove that all the functions that have been added by me (my
personal commits to this repository) work as intended — paying attention to the
background logs, the UI changes and what the code does as you go in testing —
then do a code review and refactor review."

Reviewed commits (the user's pre-session work, on `master` at v0.5.50, now part
of `v1`):

| Commit | Feature |
|--------|---------|
| `8e59093d` | Vision/Audio **Capacity Adapter** + default mimo fallback |
| `6498b312` | Capacity adapter wired into **chat routing** |
| `b4808929` + `41588bea` | **TokenRouter** provider + accurate pricing + thinking config |
| `fe547f4d` | **Self-hosted STT / TTS / Embeddings** (OpenAI-compatible) |
| `02c66fe2` | **Auto-provision default API key** for first-time users |
| `cd13d904` | **Codex TUI/Desktop detection** fix |
| `35f86e58` | **Antigravity OAuth** header scoping fix |

## 1. Capacity Adapter — VERIFIED LIVE (production, real providers)

Test: sent a vision request (image content part) to **`openrouter/deepseek/deepseek-chat`**
(a text-only model) with the vision pool set to `openrouter/openai/gpt-4o-mini`.

Background log evidence (in-app Console Log page):
```
[CHAT] Capacity adapter for [vision] on "openrouter/deepseek/deepseek-chat" → trying openrouter/openai/gpt-4o-mini, oc/mimo-v2.5-free, openrouter/deepseek/deepseek-chat
[COMBO] Trying model 1/3: openrouter/openai/gpt-4o-mini
🟢 ▶ POST → openrouter/openai/gpt-4o-mini · JSON · 1 MSG
✗ ERROR 404 · "No endpoints available matching your guardrail restrictions and data policy"
[FALLBACK] ⇄ UNAVAILABLE (404) → NEXT ACCOUNT
[COMBO] Trying model 2/3: oc/mimo-v2.5-free
🟠 ▶ POST → opencode/mimo-v2.5-free · ACC:Public
📊 DONE 7520ms · [COMBO] Model oc/mimo-v2.5-free succeeded
```

**Result: ✅ WORKS AS DESIGNED.** Vision capability detected → pool augmented →
404 on the first pool model (OpenRouter account guardrail config, NOT a code bug)
→ clean fallback → mimo succeeded → response returned. Settings restored to
original after the test.

Code review notes:
- `augmentModelsWithCapacityAdapter` early-returns when the original list already
  satisfies the hard caps; filters pool by capability; prepends pool.
- `reorderByCapabilities` is a stable tiered sort (hard+soft → hard → rest) and
  never drops a model — fallback chain stays intact.
- Empty enabled pool → `DEFAULT_FALLBACK_MODEL` (`oc/mimo-v2.5-free`) so the
  toggle is never a no-op.

## 2. TokenRouter — VERIFIED (unit-level against real functions)

- Registry: 120-model seed snapshot + `modelsFetcher` for fresh catalog +
  `passthroughModels` for unlisted ids. ✅
- Pricing (`getPricingForModel('tokenrouter', 'anthropic/claude-opus-4.6')`):
  `{input: 5, output: 25, cached: 0.5, cache_creation: 6.25, reasoning: 25}` —
  exact rates, documented ratio→USD formula. ✅
- Cost math verified: 1K input + 500 output on opus-4.6 = **$0.0175**; cached
  tokens billed at cached rate (800 cached → $0.0064). ✅
- Thinking config: `thinkingFormat: "tokenrouter"` with low/medium/high/xhigh/max
  enum passed through (no openai-style clamp); `"none"` omits the field so the
  upstream default applies. ✅
- Unknown model → null → canonical `MODEL_PRICING` fallback (documented design).

## 3. Self-hosted STT / TTS / Embeddings — VERIFIED

- All three registered in `open-sse/providers/registry/index.js` (imports
  117/118/119). ✅
- 50 related tests pass (`embeddingsCore`, `embedding-usage-persistence`,
  `gemini-tts`). ✅
- Design quality: fail-visible (misconfigured `baseUrl` throws a 400 with the
  reason, never a silent 500 / silent api.openai.com fallback); `baseUrl`
  tolerance for pasted URLs (full endpoint or trailing `/v1`); model-vs-voice
  disambiguation in TTS documented with live Kokoro evidence.
- Real-deployment diagnosis documented in the embedding registry (Qwen3-Embedding-8B
  invisibility on the dashboard page → first-class provider fix).

## 4. Auto-provision default API key — CODE REVIEW ✅

Client-side, idempotent (only when `keys.length === 0`), wrapped in try/catch,
re-fetches after create. Runs on Endpoint page load. Requires an auth session
(server POST /api/keys). Sound design; cannot trigger live here because keys
already exist (verified the code path instead).

## 5. Codex detection — VERIFIED (7/7 cases)

`detectClientTool(headers, body)`:
- `Codex Desktop/1.0` UA → codex ✅ (new)
- `codex-tui/0.5` → codex ✅
- `codex-cli/1.0` → codex ✅
- `originator: codex_work_desktop` → codex ✅ (new)
- `claude-code/1.0` → claude (not codex) ✅
- `gemini-cli/0.2` → gemini-cli ✅
- `curl/8.0` → null ✅

## 6. Antigravity OAuth scoping — CODE REVIEW ✅

`35f86e58` correctly scopes the `X-Goog-Api-Client` / `Client-Metadata` header
fix to `loadCodeAssist`/`onboardUser` calls only (real Antigravity IDE doesn't
send them there), and threads `provider` through `onboardUser` so per-provider
headers are chosen. Cannot live-test without an Antigravity OAuth session.

## Findings (non-blocking)

1. **Environment — xAI refresh token invalid** (`invalid_grant` in logs at
   13:37:58). The background token refresh correctly attempted refresh and
   failed open. Action: re-auth the xAI connection in the dashboard.
2. **Environment — OpenRouter guardrail 404** on gpt-4o-mini: account privacy
   setting ("No endpoints available matching your guardrail restrictions").
   Action: adjust https://openrouter.ai/settings/privacy if gpt-4o-mini should
   be usable. The adapter handled it gracefully.
3. **Shallow settings merge (note):** `mergeWithDefaults` is shallow — a partial
   `capacityAdapter` saved via direct API PATCH shadows the other defaults. The
   dashboard UI always saves the full 4-capability object, so the UI path is
   safe; API callers should send the full object.
4. **Pool flattening (note):** `getCapacityAdapterModels` flattens ALL enabled
   pools — with the default config, both vision and audioInput are enabled, so
   the mimo default appears for vision requests too (multimodal mimo is a
   reasonable candidate — worked correctly in the live test).
5. **Refactor opportunity (minor):** `calculateCostFromTokens(tokens, pricing)`
   has tokens-first argument order — slightly surprising; a docstring note or
   named-arg object would help future callers.
6. **Refactor opportunity (minor):** `detectClientTool`'s UA checks are readable
   as-is; a rules table would be over-engineering at this size.

## Regression

Full suite: **1718 pass / 88 baseline fail** (identical to documented baseline;
one run showed 89 skips from the known-flaky db-benchmark/live tests, re-run
confirmed baseline). No code was changed during this review.

## Related docs

- `../../operations/browser-control-workflow.md` (how the live verification was driven)
- `research/9router/16-ux-research-*.md` (earlier UX research)
