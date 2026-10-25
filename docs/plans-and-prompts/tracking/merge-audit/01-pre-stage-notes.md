# Pre-Stage Notes: Origin/Master Commits (106 commits)

This document captures pre-merge analysis of each upstream commit, noting:
- What the commit fixes/adds
- Whether our branch has similar code
- Potential conflicts or overlaps
- Multi-model review opinions

## Audit Process

1. **Read commit message + PR** (if exists)
2. **Read PR comments** for context and edge cases
3. **Review the actual code changes** (diff)
4. **Cross-reference with our branch** - do we touch same files/functions?
5. **Spawn multi-model review** - get 2nd opinion on conflict potential
6. **Document decision**: upstream fix, our fix, both (with rationale)

---

## Commit Analysis (Oldest → Newest)

### Batch 1 — 2026-10-07 (5 commits, oldest first)

#### d2f90177 — feat(systemone): support Cloudflare AI clef-flash endpoint
- **Author:** decolua | **Files:** open-sse/handlers/systemoneCore.js (+20/-2), open-sse/providers/registry/cloudflare-ai.js (+8/-1)
- **What:** Adds Cloudflare AI's `clef-flash` model to the System One (smart-router) provider. Cloudflare-style endpoints embed `{accountId}` and `{model}` in the URL path, so systemoneCore.js now template-substitutes both. Uses `getModelUpstreamId()` so the body carries the short selector `clef-flash` (what Cloudflare validates) instead of the full `@cf/cloudflare/clef-flash` id.
- **PR:** None referenced in commit subject/body.
- **Our-branch overlap:** HIGH — our branch CREATED System One (`0a879c5c feat: add v1m System One provider`, `b7446f8d feat(providers): add System One (Jev) decision endpoint`). Upstream is extending our own feature.
- **Security overlap:** None of the 11 hardened vectors touch systemoneCore.js or cloudflare-ai.js registry.
- **Decision:** MERGE_AS_IS — clean additive change to infrastructure our branch owns. Template-substitution for `{accountId}` and `{model}` is well-bounded. No conflict risk since our branch has no custom edits to these two files after creating them.

#### e10da160 — fix(usage): track exact Codex image token usage
- **Author:** Đào Văn Hùng | **Files:** 6 (imageGenerationCore.js, imageProviders/codex.js, imageGeneration.js, 3 test files, +223/-9)
- **What:** Codex image generation now reports exact provider-reported token usage (`input_tokens`/`output_tokens`/`cached_tokens`/`reasoning_tokens`) via an `onUsage` callback threaded through `handleImageGenerationCore → parseResponse → parseStream → buildSseResponse`. Usage is persisted via `saveRequestUsage()`.
- **PR:** None referenced.
- **Our-branch overlap:** NONE — `git log v4-vscode-works` shows no custom changes to `imageGenerationCore.js`, `imageProviders/codex.js`, or `src/sse/handlers/imageGeneration.js`.
- **Security overlap:** Our `/api/keys` masking is unrelated (masks gateway keys in `/api/keys` responses). The `saveRequestUsage()` call uses `apiKey` raw for internal DB storage (already masked on read via `maskApiKey` in usageRepo.js). No conflict.
- **Decision:** MERGE_AS_IS — clean additive feature. The `normalizeResponsesUsage()` helper is well-structured with `Number.isSafeInteger` guards.

#### 625df74d — fix(gemini): rename $ref keys in functionResponse payloads
- **Author:** Badroel07 | **Files:** open-sse/translator/formats/gemini.js (+27/-1), tests/unit/gemini-contents-normalization.test.js (+57/-1)
- **What:** Gemini rejects tool results whose `functionResponse.response` object contains a `$ref` key (JSON Schema / OpenAPI documents from webfetch/read/MCP trigger 400 INVALID_ARGUMENT). Adds `sanitizeFunctionResponsePayload()` that recursively renames `$ref → _ref`, called from `normalizeGeminiContents()` via a new `sanitizeFunctionResponsePart()` wrapper around the existing `c.parts.filter()`.
- **PR:** None referenced (body text explains the bug clearly).
- **Our-branch overlap:** HIGH — `git log v4-vscode-works -- open-sse/translator/formats/gemini.js` shows 10+ commits touching this file (aafe3002, 30464bc2, e7b5f09d, f6c59d30, 2abe8b85, e3e3e235, 319caa2d, 3d20a4cc, f6c2f7ca, db9ec3af). Most are schema-cleaning fixes, but they likely modified the same `normalizeGeminiContents()` function this commit extends.
- **Security overlap:** None of the 11 hardened vectors touch translator/formats/gemini.js.
- **Decision:** EXPECT_CONFLICTS — git will almost certainly conflict on the `c.parts.filter(...)` line that upstream converts to `.filter(...).map(sanitizeFunctionResponsePart)`. Resolution strategy: take upstream's sanitization verbatim (it's a real bug fix with good tests), then re-apply our schema-cleaning commits on top. The sanitization is a leaf function that composes cleanly with our schema edits.

#### 85bc33ce — feat(providers): add MiniMax Code (mcode) credits provider
- **Author:** kelongyan | **Files:** 23 changed, +1253/-2 (new minimax-code executor, registry entries, shared OAuth module, usage service, tests)
- **What:** Full MiniMax Code provider with device-code OAuth, shared `minimax-code-shared.js` module (149 lines) used by both `minimax-code` and `minimax-code-global`, custom usage-tracking service, model catalog, and thinking-level support. OAuthModal.js adds `minimax-code`/`minimax-code-global` to `deviceCodeProviders` array and handles `_minimaxPollByUser` extra polling data. MiniMax's device-code variant returns no `device_code` — token endpoint is polled with `user_code` itself.
- **PR:** None referenced.
- **Our-branch overlap:** MEDIUM — our OAuthModal.js has 15+ commits (glm, grok-cli, muse, qoder-cn, xiaomi-mimo, zed, trae, windsurf, kimi, kimchi). The `deviceCodeProviders` array is a known merge-conflict hotspot. Our `src/lib/oauth/providers/` has no custom providers that would conflict.
- **Security overlap:** OAuth routes are in LOCAL_ONLY_PATHS (already gated). New provider doesn't bypass any of the 11 hardened vectors. Redirect_uri handling is standard device-code flow (no browser redirect).
- **Decision:** REVIEW_CAREFULLY — the shared-module pattern (`minimax-code-shared.js`) is architectural; if we add our own providers later we should follow it. OAuthModal.js will almost certainly conflict on the `deviceCodeProviders` array. Resolution: take upstream's additions, verify the array ordering matches our current state.

#### cbd594ac — fix(cursor): reject empty AgentService turns without successful stop
- **Author:** mannnrachman | **Files:** open-sse/executors/cursor.js (+15/-7), tests/unit/cursor-agent-exec-request.test.js (+32)
- **What:** Extracts a `finishTurn()` helper that emits `type: "error"` with `"Cursor AgentService returned an empty turn"` when the stream ends without a successful SSE stop. Previously, an empty turn (no text, no stop) was silently treated as success. Now explicitly rejects empty turns for both streaming and non-streaming clients (400 status for non-stream).
- **PR:** None referenced.
- **Our-branch overlap:** **EXACT SAME BUG** — our commit `c933eefc fix(cursor): stop AgentService empty turns and silent tool hangs` (2026-09-21) addresses the same symptom but is much more comprehensive (670 insertions, 9 files, includes MCP tools, protobuf encoders, thinking mapping, request_context ack, etc.).
- **Security overlap:** None.
- **Decision:** TRIAGE NEEDED — upstream's fix is a minimal `finishTurn()` extraction (15 lines), ours is a comprehensive AgentService rewrite (670 lines). Our fix predates upstream's by ~16 days. Three options:
  1. **Keep ours entirely** — upstream's minimal fix is subsumed by our comprehensive one
  2. **Take upstream's finishTurn helper** into our code as a small refinement
  3. **Verify upstream's fix didn't address a case ours missed** — need to read our `c933eefc` diff carefully
  Recommendation: option 2 — adopt upstream's `finishTurn()` naming/helpers as a small refinement on top of our comprehensive fix. Verify with tests that both empty-EOF and empty-explicit-turn cases are covered (upstream adds 4 new tests for these).

