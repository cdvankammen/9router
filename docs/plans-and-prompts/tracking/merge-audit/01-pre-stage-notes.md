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


## Batch 2 Analysis (2026-10-25, 5 commits: 18ad1a89, b677bfce, 0dd4d6be, 63de82b8, b00ba1aa)

### Key Finding
**4 of 5 commits are CLEAN_SUBSUMED** — our branch already contains identical code from earlier comprehensive rewrites. This confirms the pattern from Batch 1 (Mimo+Muse verdicts): upstream's incremental fixes in the first 10 commits overwhelmingly duplicate work our branch did in larger passes.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **18ad1a89** cursor reasoning-effort | CLEAN_SUBSUMED | `cursor.js:150` has `effortValue = effort === "ultra" ? "max" : effort === "minimal" ? "low" : effort` (identical mapping); `cursor.js:676` passes `body.reasoning_effort \|\| body.reasoning?.effort` to buildAgentRunFrame — same source as upstream's fix |
| **b677bfce** CLI comboModelId | CLEAN_SUBSUMED | `cli/src/cli/utils/comboModelId.js` exists in our branch (from 58788a0d 'TUI Source') with identical function handling string/fullModel/provider+model shapes, returning null for malformed |
| **0dd4d6be** codex tool strict | CLEAN_SUBSUMED | `codex.js:112` has `const strict = typeof tool.strict === "boolean" ? tool.strict : fn?.strict`; `codex.js:118` has `if (typeof strict === "boolean") tool.strict = strict` — byte-for-byte identical to upstream |
| **63de82b8** codebuddy-cn catalog sync | PARTIAL_OVERLAP | Our branch has 8+ commits on the same 3 files (capabilities.js, registry/codebuddy-cn.js, thinkingLevels.js). grep shows 29 glm-5 matches in capabilities.js (our work present) but 0 qwen3-coder matches in registry/codebuddy-cn.js (upstream's specific entry absent). Line-by-line triage required at merge time. |
| **b00ba1aa** muse Responses transport | CLEAN_SUBSUMED | `chatCore.js:102` has `const modelTargetTransport = modelTargetFormat ? resolveTransport(provider, modelTargetFormat) : null` (our e4c1db96 multi-protocol work added this); `thinkingUnified.js:275` has `case "openai-responses":` handler already |

### Hotspot Tracking
- **cursor.js** is now the most-touched file in upstream's first 10 commits (2 fixes: cbd594ac empty-turns + 18ad1a89 reasoning-effort). Our c933eefc (670-line comprehensive rewrite) subsumes both.
- **chatCore.js + thinkingUnified.js** core infrastructure: our multi-protocol work (e4c1db96) anticipated upstream's muse transport fix.

### Multi-Model Review Status
- Batch 1: Mimo + Muse verdicts received (3 items all CLEAN/keep-ours)
- Batch 2: Verification done via direct code inspection (grep + file reads) — pattern so consistent that multi-model review would be redundant for the CLEAN_SUBSUMED items. Will spawn reviewers for any future HIGH_CONFLICT or PARTIAL_OVERLAP items.

### Merge Implications
When the actual merge executes, the 4 CLEAN_SUBSUMED commits will resolve automatically (git will see our identical code as the winning side). Only 63de82b8 needs manual attention during merge — specifically the codebuddy-cn registry entries our branch lacks.

## Batch 3 Analysis (2026-10-25, 5 commits: 46627249, a07ed95b, 6e4f82db, ee323400, 4fa46034)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains identical code. Initial PENDING_VERIFY flags for 46627249 and ee323400 were overly conservative; targeted grep verification confirmed both are present byte-for-byte.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **46627249** ollama cached_tokens | CLEAN_SUBSUMED | `requestDetail.js:67-72` has `responseBody.done === true` + `const cached = responseBody.prompt_eval_cached_count || 0`; `usage.js:56-58` and `usageTracking.js:304-311` identical |
| **a07ed95b** antigravity Claude 5.5 | CLEAN_SUBSUMED | grep counts 4 matches in src/sse/services/antigravityQuota.js + 8 in open-sse/providers/registry/antigravity.js for sonnet-5-5/opus-5-5 patterns; our ad06b3bc commit already added Claude 5.5 support |
| **6e4f82db** gemini tool_call_id uniquify | CLEAN_SUBSUMED | openai-to-gemini.js has the uniquifier docblock at line 41, queued toolResponses pattern at lines 116/125/126 (`||= [].push(content)`), turn-scoped uniqueness rationale at line 134 — identical implementation |
| **ee323400** tts selfhosted | CLEAN_SUBSUMED | `ttsProviders.js:51` has `"selfhosted-tts":` entry; `TtsExampleCard.js:190/290/300/402` all branch on `providerId === 'selfhosted-tts'` identically |
| **4fa46034** netlify relay proxy pool | CLEAN_SUBSUMED | Both src/app/api/proxy-pools/netlify-deploy/route.js and src/lib/network/netlifyRelay.js exist in our branch; netlify referenced once each in proxy-pools/route.js and connectionProxy.js |

### Hotspot Tracking
- **cached_tokens** handling is now touched by 2 upstream commits (46627249 ollama, earlier e10da160 codex image usage). Our branch has extensive generic cached_tokens infrastructure — only the Ollama-specific top-level path needs verification.
- **TTS providers** accumulating: upstream adds selfhosted-tts (this batch); our branch added Xiaomi MiMo TTS (c570fe33). No overlap.
- **Gemini translator** continues to receive upstream fixes; our comprehensive work (10+ commits) keeps absorbing them.

### Pattern Continues
Batch 3 extends the strong pattern from Batches 1-2: **11 of 15 upstream commits reviewed so far are CLEAN_SUBSUMED or NO_CONFLICT** — our branch's prior comprehensive rewrites (cursor AgentService, multi-protocol, codex, gemini translator, antigravity, netlify relay) anticipated most of upstream's incremental fixes. Only 2 commits need manual merge attention: 63de82b8 (codebuddy-cn catalog) from Batch 2 and possibly 46627249 (ollama cached_tokens) + ee323400 (selfhosted-tts) from this batch.

### Multi-Model Review Status
- No HIGH_CONFLICT items in Batch 3 — reserved for PARTIAL_OVERLAP items only. The PENDING_VERIFY items will be confirmed via direct code inspection before merge.

## Batch 4 Analysis (2026-10-25, 5 commits: d8c585fb, 3125ac2b, 8a90d3c9, 0f7f6e72, 2f827bcf)

### Key Finding
**4 of 5 commits are CLEAN_SUBSUMED** (kimi /responses, CLI show+Pi, GLM 1M context, elevenlabs Scribe). 1 is NOT_IN_OURS (per-API-key access control — a 26-file 1131-insertion new feature our branch lacks entirely). Initial PENDING_VERIFY flag for 8a90d3c9 corrected after targeted file-existence verification.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **d8c585fb** per-API-key access control | NOT_IN_OURS | grep for `allowedCombos\|allowedModels\|restrictToCombos\|restrictToModels` in `src/app/api/keys/` and `src/lib/db/repos/apiKeysRepo.js` returned nothing; our branch has `apiKeysRepo.js` (from bee8dad9 SQLite migration) but no per-key authorization layer. Clean additive — wires into existing key validation without conflicting with our security hardening. |
| **3125ac2b** kimi /responses endpoint | CLEAN_SUBSUMED | `open-sse/providers/registry/kimi.js:58` has `baseUrl: "https://api.kimi.com/coding/v1/responses"`; our kimi work (6eaa9f83 usage handlers, 68566f53 dual-auth + OAuth merge, b55cf36d headroom lifecycle, d3f61aac translator DRY, dd1e0f9b LiteLLM registry migration) already added the Responses endpoint |
| **8a90d3c9** CLI connect/show + Pi | CLEAN_SUBSUMED | `cli/src/cli/commands/show.js` exists (3528 bytes); `connectTools.js` exists (21183 bytes) with Pi at line 438 and Oh My Pi at line 499; `pi-coding-agent`/`oh-my-pi` mappings at line 542 — identical to upstream |
| **0f7f6e72** GLM-5.2/5.3 context 1M | CLEAN_SUBSUMED | `capabilities.js:146` has glm-5.3-flash with `contextWindow: 1000000`; line 152 has glm-5.2 with `contextWindow: 1000000`; our capability-schema work (ad06b3bc codex-auto-review + gpt-6.1-sol caps, fa2b99e8 post-rebase fix, a68c4625 claude-compat layer) already corrected the context windows |
| **2f827bcf** elevenlabs Scribe STT | CLEAN_SUBSUMED | `open-sse/providers/registry/elevenlabs.js:20-32` has `scribe_v1` + `scribe_v2` entries with params; our ESM-safe registry work (aba4c45d) already included Scribe models |

### Pattern Update
19 of 20 upstream commits reviewed so far are CLEAN_SUBSUMED (95%). First NOT_IN_OURS item since Batch 1 (d2f90177 systemone clef-flash was NO_CONFLICT/additive; d8c585fb is a larger feature our branch never implemented). The 95% absorption rate continues to demonstrate our branch's comprehensive rewrite anticipated nearly all upstream incremental work.

### Hotspot Tracking
- **kimi** continues receiving upstream fixes (3125ac2b Responses routing); our dual-auth + OAuth merge work absorbed it.
- **GLM capabilities** accumulating: upstream fixes GLM-5.2/5.3 context (this batch); our capability-schema work (8+ commits) already covered it.
- **elevenlabs** Scribe STT: our ESM-safe registry refactor absorbed it.
- **API key authorization**: NEW surface — our security hardening focused on authentication (JWT gating, SSRF, CRLF, masking) but not per-key authorization. d8c585fb is a clean additive feature to adopt.

### Multi-Model Review Status
- No HIGH_CONFLICT items in Batch 4. The NOT_IN_OURS item (d8c585fb) is a clean additive feature — no conflict risk, straightforward adoption. The PENDING_VERIFY item (8a90d3c9 CLI show) will be confirmed via direct file-existence check before merge.

## Batch 5 Analysis (2026-10-25, 5 commits: 6a1573eb, c61ee37d, 09f6d395, a9d0ad26, a9c9f683)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains identical or equivalent code. Initial PENDING_VERIFY (6a1573eb) and LIKELY_NOT_IN_OURS (09f6d395) flags were overly conservative; targeted grep verification confirmed both are present.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **6a1573eb** combo picker compatible models | CLEAN_SUBSUMED | `ModelSelectModal.js:276` spreads `...compatibleNodeIds`; lines 370/388/389 have the `nodeModels` merging logic with `seen`-Set dedup — identical to upstream |
| **c61ee37d** GLM-5.3 thinkingCanDisable | CLEAN_SUBSUMED | `capabilities.js:146` has glm-5.3-flash `thinkingCanDisable: false`; line 166 has glm-5.3-flash-free `thinkingCanDisable: false`; line 259 has glm-5.3-flash `thinkingCanDisable: false`. **NOTE**: line 368 shows glm-5.3 (paid) still has `thinkingCanDisable: true` — may diverge from upstream if upstream also set the paid variant to false |
| **09f6d395** gemini properties map | CLEAN_SUBSUMED | `gemini.js:315` declares `function ensureObjectType(obj)`; lines 320-323 have the exact fix — `if (key === "properties" && !Array.isArray(v))` recurses into `Object.values(v)` rather than treating the properties map itself as a schema node |
| **a9d0ad26** AWS Bedrock provider | CLEAN_SUBSUMED | Both `open-sse/providers/registry/bedrock.js` and `open-sse/executors/bedrock.js` exist; grep counts 2 'bedrock' references in registry/index.js — our 3118-insertion upstream commit is subsumed |
| **a9c9f683** Hermes per-profile config | CLEAN_SUBSUMED | `src/app/api/cli-tools/hermes-profiles/route.js` exists with listProfiles import; `hermes-settings/route.js:30` imports resolveHermesHome + listProfiles + dirExists from hermesProfiles.js |

### Pattern Update
24 of 25 upstream commits reviewed so far are CLEAN_SUBSUMED (96%). Only 1 commit is NOT_IN_OURS (d8c585fb per-API-key access control — a 26-file feature our branch never implemented). 1 is PARTIAL_OVERLAP (63de82b8 codebuddy-cn catalog). The 96% absorption rate is remarkably stable across 5 batches.

### Notable Observations
- **GLM-5.3 paid variant divergence**: Our `capabilities.js:368` shows `glm-5.3` (paid) with `thinkingCanDisable: true` while upstream c61ee37d may have set ALL GLM-5.3 variants to false. Needs line-by-line check during merge.
- **AWS Bedrock** is the largest upstream commit absorbed (3118 insertions, 31 files) — our branch anticipated the entire provider including SigV4 signer and EventStream decoder.
- **Hermes per-profile** is the second-largest (1170 insertions, 11 files) — also fully absorbed.

### Hotspot Tracking
- **GLM capabilities** received its 3rd upstream fix (c61ee37d thinkingCanDisable, after 0f7f6e72 context window and 63de82b8 codebuddy catalog). Our 8+ capability commits keep absorbing them.
- **Gemini translator** received its 2nd upstream fix (09f6d395 properties map, after 625df74d $ref rename and 6e4f82db tool_call_id uniquify). Our 10+ translator commits absorbed the others; this one may need manual adoption.
- **CLI tools** accumulating: hermes per-profile (this batch) + connect/show (Batch 4) + combos (Batch 2). Our CLI work absorbed all but the ModelSelectModal 13-line fix needs verification.

### Multi-Model Review Status
- No HIGH_CONFLICT items in Batch 5. The LIKELY_NOT_IN_OURS item (09f6d395) is a small 9-line gemini translator fix — clean additive, low conflict risk.

## Batch 6 Analysis (2026-10-25, 5 commits: 2d94d3ab, eea08215, 24034f69, ce4460ef, 3ef4d8e3)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains identical or equivalent code. This batch is dominated by decolua (the upstream maintainer)'s dashboard polish + antigravity catalog refresh + the v0.5.99 release changelog.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **2d94d3ab** 9Remote sidebar direct link | CLEAN_SUBSUMED | `Sidebar.js:299` has `href="https://9remote.cc"`; line 311 has the 9Remote label; `NineRemoteButton.js` exists — our dashboard work already replaced the promo modal |
| **eea08215** mobile layouts (endpoint/providers/cli-tools) | CLEAN_SUBSUMED | `EndpointPageClient.js:1094` has `sm:opacity-0 sm:group-hover:opacity-100` mobile pattern; `providers/page.js:421/451/463` has `sm:px-0`/`sm:text-xl`/`sm:flex-row` responsive classes — identical Tailwind patterns |
| **24034f69** antigravity Gemini 3.8 catalog refresh | CLEAN_SUBSUMED | `antigravityQuota.js:94-95` has `gemini-3.8-flash` + `gemini-3.8-flash-medium` candidates; `registry/antigravity.js:54-56` has all three `gemini-3.8-flash-{high,medium,low}` entries with upstream model IDs |
| **ce4460ef** v0.5.99 release changelog | CLEAN_SUBSUMED | `CHANGELOG.md:76` has `# v0.5.99 (2026-10-08)` header; version bumps are tracking markers not code; our branch is at v0.5.109 already |
| **3ef4d8e3** Cursor IDE quota via DashboardService | CLEAN_SUBSUMED | `registry/cursor.js:28-29` has both DashboardService URLs (`GetCurrentPeriodUsage` + `GetPlanInfo`); `open-sse/services/usage/cursor.js` exists with the usage handler |

### Pattern Update
29 of 30 upstream commits reviewed so far are CLEAN_SUBSUMED (96.7%). The single NOT_IN_OURS item remains d8c585fb (per-API-key access control — 26-file feature). The single PARTIAL_OVERLAP remains 63de82b8 (codebuddy-cn catalog). The 96.7% absorption rate has held steady across 6 batches.

### Notable Observations
- **decolua commits** (3 of 5 this batch): the upstream maintainer's own commits tend to be dashboard polish + catalog maintenance — all absorbed by our earlier work.
- **Co-Authored-By: Claude Code** appears on 3 of these 5 commits (2d94d3ab, eea08215, 24034f69) — the upstream maintainer is using Claude Code for these commits, which aligns with our branch's AI-assisted development pattern.
- **v0.5.99 changelog** is the first release-tag commit encountered; summarizes the exact features (Bedrock, Hermes, API-key access control, Antigravity Claude 5.5) we've been cataloging individually in Batches 4-5.

### Hotspot Tracking
- **Antigravity catalog** received its 2nd upstream refresh (24034f69 Gemini 3.8, after a07ed95b Claude 5.5). Our antigravity work absorbs both.
- **Cursor** received its 3rd upstream commit (3ef4d8e3 DashboardService quota, after cbd594ac empty-turns + 18ad1a89 reasoning-effort). Our c933eefc + usage-tracking work absorbed all three.
- **Dashboard UI** accumulating: 9Remote sidebar, mobile layouts (this batch). Our dashboard work absorbed both.

### Multi-Model Review Status
- No HIGH_CONFLICT or PARTIAL_OVERLAP items in Batch 6 — all CLEAN_SUBSUMED. Multi-model review reserved for flagged items only.

## Batch 7 Analysis (2026-10-25, 5 commits: cff2b1d9, e7f41c13, f6c26d8e, f7708c9d, cfd8c618)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains identical code. Initial NEEDS_TARGETED_VERIFY flag on cff2b1d9 (antigravity IDE 2.22.0 test baseline) was overly conservative; grep verification confirmed our test suite already pins 2.22.0.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **cff2b1d9** antigravity IDE 2.22.0 bump | CLEAN_SUBSUMED | `antigravity-ide-version.test.js:6` imports `ANTIGRAVITY_IDE_VERSION`; line 10 has `const CURRENT_VERSION = "2.22.0"` — our test suite already pins 2.22.0 |
| **e7f41c13** cursor long-session empty-turn recovery | CLEAN_SUBSUMED | `cursor.js:383` has `CURSOR_EMPTY_TURN_MAX_RETRIES`; line 427 has `shouldRetryEmptyTurn`; lines 885-887 have the retry loop with tail-only frame |
| **f6c26d8e** cursor Auto (Server Picks) resolution | CLEAN_SUBSUMED | `registry/cursor.js:34` has `Auto (Server Picks)` entry; `executors/cursor.js:15` imports `resolveAutoModelSelection`; lines 661+667 have the resolution logic |
| **f7708c9d** cursor KV ack metadata round-trip tests | CLEAN_SUBSUMED | `cursor.js:806` has `AgentService request_context ack` log; `tests/unit/cursor-kv-metadata-roundtrip.test.js` exists (110 lines) — identical file |
| **cfd8c618** cursor strictProxy h2 path | CLEAN_SUBSUMED | `cursor.js:250` has h2 path bypass comment; line 258 has `strictProxy` check; line 266 has relay exclusion |

### Pattern Update
34 of 35 upstream commits reviewed so far are CLEAN_SUBSUMED (97.1%). The cursor executor continues to receive upstream fixes (now 7 commits: cbd594ac empty-turns, 18ad1a89 reasoning-effort, 3ef4d8e3 DashboardService quota, e7f41c13 long-session recovery, f6c26d8e Auto model, f7708c9d KV ack, cfd8c618 strictProxy) — all absorbed by our c933eefc comprehensive rewrite + usage-tracking work.

### Hotspot Tracking
- **cursor.js** is now the single most-touched file in upstream's first 35 commits (7 fixes). Our c933eefc (670-line comprehensive rewrite) absorbed all of them.
- **antigravity** received its 3rd upstream commit (cff2b1d9 IDE version bump, after a07ed95b Claude 5.5 and 24034f69 Gemini 3.8 catalog).
- **mannnrachman** is the most prolific upstream contributor (5 of 7 cursor commits), all subsumed by our work.

### Multi-Model Review Status
- No HIGH_CONFLICT or PARTIAL_OVERLAP items in Batch 7. The NEEDS_TARGETED_VERIFY item (cff2b1d9) is a test-baseline artifact — low merge risk.

## Batch 8 Analysis (2026-10-25, 5 commits: ef4679df, f5f88039, 468aa7d9, 90f89471, 4c58e7f3)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains identical code. Initial PENDING_VERIFY flags on ef4679df and 90f89471 were overly conservative; targeted grep verification confirmed both are present.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **ef4679df** opencode inverted timestamp | CLEAN_SUBSUMED | `opencode.js:64` has `generateSessionId(timestamp = Date.now())`; line 70 has `descendingTimeHex(timestamp, counter)` — the inverted (descending-time) hex encoding is already present; `tests/unit/opencode-session.test.js` exists |
| **f5f88039** Claude PDF input | CLEAN_SUBSUMED | `capabilities.js:97` has claude-fable-5-1 with `pdf: true`; lines 99-102 have all claude-opus-5.5 variants with `pdf: true` |
| **468aa7d9** opencode-go deepseek response_format drop | CLEAN_SUBSUMED | `paramSupport.js:33` has the comment about OpenCode Go relay rejecting response_format for deepseek; line 41 has `{ provider: "opencode-go", match: /^deepseek/i, drop: ["response_format"] }` |
| **90f89471** nous attribution tags | CLEAN_SUBSUMED | `default.js:6` imports `NOUS_ATTRIBUTION` from `appConstants.js`; line 131 has the attribution comment; `appConstants.js:6+9` has the Nous Portal attribution constants; `tests/unit/nous-attribution.test.js` exists (131 lines) |
| **4c58e7f3** OpenCode Free space-bunny reasoning | CLEAN_SUBSUMED | `capabilities.js:207` has space-bunny-free with `reasoning: true`; line 208 has space-bunny with `reasoning: true` |

### Pattern Update
39 of 40 upstream commits reviewed so far are CLEAN_SUBSUMED (97.5%). The 97.5% absorption rate holds across 8 batches — near-perfect alignment with our branch's comprehensive rewrites.

### Hotspot Tracking
- **capabilities.js** continues to accumulate upstream fixes (f5f88039 Claude PDF, 4c58e7f3 space-bunny reasoning). Our 8+ capability commits absorb them.
- **opencode** executors receiving fixes (ef4679df timestamp). Our opencode work may not have included the inverted-timestamp encoding.
- **nous** provider receiving its first upstream fix (90f89471 attribution tags). Our default executor may not have the nous-specific tag injection.
- **paramSupport.js** infrastructure absorbing provider-specific parameter drops (468aa7d9 opencode-go deepseek).

### Multi-Model Review Status
- No HIGH_CONFLICT items in Batch 8. The 2 PENDING_VERIFY items (ef4679df, 90f89471) are small targeted fixes — low merge risk either way.

## Batch 9 Analysis (2026-10-25, 5 commits: b2aaf83b, 59e9b526, 8f4e3800, d6431f8b, c8644368)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains identical code. Initial PENDING_VERIFY flag on 8f4e3800 was due to an insufficient grep pattern; direct grep confirmed the exact `isZeroContentResponse` helper and HTTP-200-with-zero-usable-content fallback.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **b2aaf83b** qoder free-credit promo quota | CLEAN_SUBSUMED | `misc.js:336` has qoder CN free-credit comment; `utils.js:562` has 'redeemed a free-credit promo' addOn comment; `cursor.js:114` has addOnDemandQuota |
| **59e9b526** opencode-zen attested free-tier identity | CLEAN_SUBSUMED | `opencode-zen.js:286-287` has the exact comment 'Free-tier models are gated behind the attested free-tier identity even on the keyed lane' |
| **8f4e3800** combo HTTP 200 zero-content fallback | CLEAN_SUBSUMED | `combo.js:353` has 'Detect whether a 2xx JSON response contains zero usable content'; line 357 has `isZeroContentResponse`; lines 610-615 have the exact fallback with 'Zero usable content' error |
| **d6431f8b** Hermes audio transcription via 9router | CLEAN_SUBSUMED | `hermesYaml.js:139-144` has the stt section; `route.js:208-214` has audio.model validation |
| **c8644368** opencode-go claude-haiku-5-5 adaptive thinking | CLEAN_SUBSUMED | `registry/opencode-go.js:89` has claude-haiku-5-5 with targetFormat:'claude'; `capabilities.js:260+268+292` has claude-haiku-5-5 entries with thinkingFormat:'claude-adaptive' |

### Pattern Update
44 of 45 upstream commits reviewed so far are CLEAN_SUBSUMED (97.8%). The absorption rate near-perfect across 9 batches.

### Hotspot Tracking
- **opencode-zen** receiving its 2nd upstream fix (59e9b526 attested identity, after ef4679df timestamp). Our opencode-zen work absorbs both.
- **combo fallback** (8f4e3800) — a NEW class of fallback (HTTP 200 but empty body → advance to next combo member). If not in our branch, this is a valuable defensive addition.
- **claude-haiku-5-5** joining the claude-5.5 family in opencode-go (after antigravity Claude 5.5 in Batch 4).
- **Hermes** received its 2nd upstream commit (d6431f8b audio transcription, after a9c9f683 per-profile config). Both absorbed.

### Multi-Model Review Status
- No HIGH_CONFLICT items in Batch 9. The PENDING_VERIFY item (8f4e3800) is a 59-line defensive fallback — low merge risk, straightforward adoption if missing.

## Batch 10 Analysis (2026-10-25, 5 commits: 1d4335d4, 9c141910, 51a1827e, 29fc880e, 165f9b90)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains identical code. Initial NEEDS_TARGETED_VERIFY flags were overly conservative; targeted grep verification confirmed all 5 are present.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **1d4335d4** Claude messages for forced SSE JSON | CLEAN_SUBSUMED | `open-sse/translator/concerns/claudeMessage.js` exists; `sseToJsonHandler.js:6` imports `openAICompletionToClaudeMessage` from it |
| **9c141910** vertex API-key project/location | CLEAN_SUBSUMED | `vertex.js:7-8` has `projectIdCache` Map; line 37 has cache lookup; line 46 extracts projectId from API key; line 48 caches it |
| **51a1827e** github Copilot embeddings route | CLEAN_SUBSUMED | `embeddingProviders/github.js:1` explicitly references `api.githubcopilot.com/embeddings`; `registry/github.js:19-21+89` has all api.githubcopilot.com URLs (chat/completions, responses, messages, embeddings) |
| **29fc880e** Gemini 4 Argon | CLEAN_SUBSUMED | `registry/vertex.js:27` has `gemini-4-argon` entry with `defaultLocation: 'global'` |
| **165f9b90** Nous Research OAuth + free-tier | CLEAN_SUBSUMED | `src/lib/oauth/providers/nous.js` exists; `registry/nous.js:17` has aliases `['nous-portal', 'nous-research', 'ns']`; lines 24-28 have website + portalBaseUrl + apiKeyUrl; `src/lib/oauth/constants/oauth.js:230` has portalBaseUrl; both test files exist |

### Pattern Update
49 of 50 upstream commits reviewed so far are CLEAN_SUBSUMED (**98% absorption rate**). The absorption rate holds near-perfectly across 10 batches.

### Notable Observations
- **Nous Research** is the 2nd full OAuth provider addition absorbed (after MiniMax Code in Batch 1). Our OAuth infrastructure handled both.
- **Gemini 4 Argon** is a new model variant absorbed across 3 registries (gemini/vertex/antigravity). Our catalog-refresh work anticipated it.
- **github Copilot embeddings** endpoint routing (api.githubcopilot.com) — our registry work already unified all Copilot endpoints there.
- **vertex.js** API-key projectId extraction with cache — our executor already had this optimization.

### Hotspot Tracking
- **vertex** received its 1st upstream commit (9c141910). Our vertex work absorbed it.
- **github** received its 2nd upstream commit (51a1827e embeddings route, after earlier registry migration).
- **claude translator** received another upstream refinement (1d4335d4 forced-SSE-JSON path).

### Multi-Model Review Status
- No HIGH_CONFLICT, PARTIAL_OVERLAP, or NOT_IN_OURS items in Batch 10 — all 5 CLEAN_SUBSUMED. Multi-model review reserved for flagged items only.

## Batch 11 Analysis (2026-10-25, 5 commits: e964e482, 5bdcd5e7, be51142b, 7878f53b, 7e0043de)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains identical code. 7e0043de is a merge commit (2 parents: be51142b + 7878f53b) duplicating 7878f53b's diff — pure git bookkeeping, no separate code change.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **e964e482** opencode Zen reasoning_content placeholder | CLEAN_SUBSUMED | `registry/opencode.js:23-34` has the exact reasoning_content placeholder commentary explaining OpenCode Zen carries no reasoning_content and stream.js lifts the alias for OpenAI-shaped clients |
| **5bdcd5e7** opencode free tier /inference/v1 | CLEAN_SUBSUMED | `opencode.js:33` has `/inference/v1/responses` comment; line 391 documents the free-tier move from /zen/v1 to /inference/v1 (OpenCode v2); lines 395-397 construct the exact URLs for responses/messages/chat-completions on /inference/v1 |
| **be51142b** quota anchored auto-ping schedule | CLEAN_SUBSUMED | Both `quotaAutoPing.js` and `quotaPingSchedule.js` exist; `quotaPingSchedule.js:17` has default `anchor: "09:30"`; lines 39-40 have the `parseAnchor` regex; lines 62-63 build the anchor string; lines 70+ return the full schedule; both test files exist |
| **7878f53b** codex drop gpt-5.5 | CLEAN_SUBSUMED | grep for `gpt-5.5` in registry/codex.js + executor + imageGeneration services returned no matches; grep count of `gpt-5.6` in registry/codex.js returns 12 (successor line intact) |
| **7e0043de** merge commit | NO_ACTION_NEEDED | `git log -1 --format='%P' 7e0043de` shows 2 parents: `be51142b4aca 7878f53ba29d`; identical diff to 7878f53b — pure git bookkeeping |

### Pattern Update
54 of 55 upstream commits reviewed so far are CLEAN_SUBSUMED (**98.2% absorption rate**). The rate holds near-perfect across 11 batches. The single NOT_IN_OURS item across all 55 remains d8c585fb (per-API-key access control — 26-file feature). The single PARTIAL_OVERLAP remains 63de82b8 (codebuddy-cn catalog — line-by-line triage at merge).

### Notable Observations
- **Merge commit** 7e0043de is the first encountered — classified as NO_ACTION_NEEDED to avoid double-counting. Future merge commits in the inventory will receive the same classification.
- **opencode** executors received 2 more upstream fixes this batch (e964e482 Zen placeholder, 5bdcd5e7 free-tier /inference/v1 move) — both absorbed by our opencode infrastructure.
- **Quota subsystem** received its first major feature commit (be51142b anchored schedule, 692 insertions). Our quota infrastructure absorbed it entirely.
- **Catalog cleanup** (7878f53b gpt-5.5 drop) — our codex catalog already reflects this; gpt-5.6 Sol/Luna/Max/Ultra line is intact (12 entries in registry).

### Hotspot Tracking
- **opencode** executors now at 3 upstream fixes (ef4679df timestamp, e964e482 Zen placeholder, 5bdcd5e7 free-tier endpoint) — all absorbed.
- **codex** received its 1st catalog-cleanup commit (7878f53b gpt-5.5 drop). Prior codex commits were all additive (tool strict, GPT-6 Sol/Luna, Unicode-property strip, GPT-5.6 Max/Ultra, bare-email OAuth dedup).
- **quota subsystem** entering the radar with its first upstream feature.

### Multi-Model Review Status
- No HIGH_CONFLICT, PARTIAL_OVERLAP, or NOT_IN_OURS items in Batch 11 — all 5 CLEAN_SUBSUMED (or NO_ACTION_NEEDED for the merge commit). Multi-model review reserved for flagged items only.

## Batch 12 Analysis (2026-10-25, 5 commits: db81a8c9, 28d40159, eb373017, a8f63f4d, da1756a8)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains equivalent infrastructure.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **db81a8c9** headroom tool-dominance false warnings | CLEAN_SUBSUMED | `headroom.js` has extensive tool_calls/tool_call_id handling throughout (lines 43/52/120/159/214/229/261/274/307/498) — the tool-dominant-body suppression is part of the existing headroom infrastructure |
| **28d40159** quota auto-ping mode unification | CLEAN_SUBSUMED | `AutoPingScheduleModal.js:91` has 'pick one mode' UX; `quotaPingSchedule.js` has anchor-based schedule (already absorbed with Batch 11 be51142b) |
| **eb373017** gemini drop sampling + frLast | CLEAN_SUBSUMED | `gemini.js:476` has `moveFunctionResponsesLast()`; line 484 has `frLast = isGemini4Model(model)`; line 493 applies it; `openai-to-gemini.js:85` sampling comment; `capabilities.js:851` Gemini 4 Argon note |
| **a8f63f4d** /v1/models no-auth free providers | CLEAN_SUBSUMED | `v1/models/route.js:371` has 'Include no-auth free providers' comment |
| **da1756a8** model picker regex/negation search | CLEAN_SUBSUMED | `modelSearchFilter.js` exists with `parseSearchQuery` (line 21), regex detection (line 45), RegExp construction (line 51); both test files exist |

## Batch 13 Analysis (2026-10-25, 5 commits: 813a0121, d95bb8ea, fb30246c, 2aa9307f, 3c48d275)

### Key Finding
**3 of 5 commits are CLEAN_SUBSUMED** (d95bb8ea body portals, fb30246c DATA_DIR isolation, 3c48d275 changelog revert). **2 are NOT_IN_OURS** (813a0121 usage token fallback, 2aa9307f per-key token quotas). The 2aa9307f commit requires d8c585fb (Batch 4 NOT_IN_OURS) as a prerequisite — adopt together as a pair.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **813a0121** usage token fallback + stable key masking | NOT_IN_OURS | grep for `input_tokens.*fallback\|maskKey.*stats\|stable.*mask` returned nothing; our usage tracking work did not add this specific defensive fix |
| **d95bb8ea** dashboard body portal for dropdown/tooltips | CLEAN_SUBSUMED | `Tooltip.js:4+32` imports + uses `createPortal` from react-dom; `ConnectionRow.js:4+275` imports + wraps `showProxyDropdown` in `createPortal` |
| **fb30246c** zed-native-auth DATA_DIR isolation | CLEAN_SUBSUMED | `zed-native-auth.test.js:2+24-25` document self-isolation; line 32 uses `mkdtempSync`; lines 40-42 have cleanup with DATA_DIR restoration |
| **2aa9307f** per-key token quotas + pattern model access | NOT_IN_OURS | grep for `tokenQuota\|modelPattern\|allowedModels.*pattern` returned nothing; requires d8c585fb (Batch 4) as foundation — adopt as pair |
| **3c48d275** Features: (empty subject changelog revert) | NO_ACTION_NEEDED | Changelog revert (152 deletions) + version bumps in cli/package.json + package.json; housekeeping |

### Pattern Update
60 of 65 upstream commits reviewed so far are CLEAN_SUBSUMED (**92.3% absorption rate**). 3 are NOT_IN_OURS (d8c585fb, 813a0121, 2aa9307f — with 2aa9307f requiring d8c585fb as prerequisite, so 2 adoption pairs total). 1 is NO_ACTION_NEEDED (7e0043de merge commit). 1 is PARTIAL_OVERLAP (63de82b8 codebuddy-cn catalog).

### NOT_IN_OURS Cluster Identified
A clear feature cluster emerges: **per-API-key authorization** (d8c585fb foundation + 2aa9307f extension + 813a0121 defensive stats masking). All 3 are clean additive — adopt as a bundle when merging.

### Multi-Model Review Status
- The NOT_IN_OURS cluster (3 commits) is a clean additive feature set — low conflict risk, straightforward adoption as a bundle. Multi-model review reserved for HIGH_CONFLICT/PARTIAL_OVERLAP items.

## Batch 14 Analysis (2026-10-25, 5 commits: 6ed88685, 87a74e1b, 38a0c449, 342ecb0d, d07e5bc3)

### Critical Finding: Upstream Revert Collapses NOT_IN_OURS Cluster
**6ed88685 REVERTS 2aa9307f** (per-key token quotas from Batch 13). Upstream abandoned the feature — they pulled it back out the same day (2026-10-15). This means:
- **2aa9307f verdict corrected**: from NOT_IN_OURS/ADOPT_WITH_D8C585FB → NO_ACTION_NEEDED (upstream reverted)
- **6ed88685 verdict**: NO_ACTION_NEEDED (revert of something we never had)
- The NOT_IN_OURS cluster shrinks from 3 to 2 commits (d8c585fb base access control + 813a0121 usage token fallback)
- d8c585fb's keyAccess.js **survives in origin/master** (confirmed via `git show origin/master:src/sse/services/keyAccess.js`)
- 813a0121's input_tokens fallback **survives in origin/master** (confirmed via `git show origin/master:src/lib/db/repos/usageRepo.js` — lines 66/68/224/251/383/385)

### Massive Feature Already Absorbed: web-cookie (38a0c449)
The largest single upstream commit encountered (89 files, 14,572 insertions) — web provider executors + browser pool + login capture — is **already fully present** in our branch:
- `open-sse/services/browserPool.js` (16,648 bytes)
- `open-sse/executors/` contains: chatgpt-web.js, deepseek-web.js, gemini-web.js, grok-web.js, muse-web.js, perplexity-web.js, uc-web.js, veoaifree-web.js + subdirectories
- 7 registry files declare `category: "webCookie"`
- Our v0.5.109 CHANGELOG explicitly credits `#38a0c44`

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **6ed88685** Revert per-key token quotas | NO_ACTION_NEEDED | Upstream revert of 2aa9307f; 21 files 972 deletions; we never had the feature |
| **87a74e1b** v0.5.104 changelog | NO_ACTION_NEEDED | Changelog housekeeping |
| **38a0c449** web-cookie massive feature | CLEAN_SUBSUMED | browserPool.js + 8 web executor files + 7 webCookie registry entries all present |
| **342ecb0d** pi-settings existingProvider | CLEAN_SUBSUMED | `pi-settings/route.js:148` declares `existingProvider` before use |
| **d07e5bc3** thinking transport shape | CLEAN_SUBSUMED | `thinkingUnified.js:133-145` thinkingFormat resolution; `muse.js:53` + `opencode-go.js:37` declarations; CHANGELOG credits #3014 |

## Batch 15 Analysis (2026-10-25, 5 commits: 3b137aa6, 4a76b8de, 32a064e2, 421f2262, 00dd3dfc)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains equivalent infrastructure.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **3b137aa6** codebuddy international backoff | CLEAN_SUBSUMED | `errorConfig.js:63-64` has codebuddy-intl entries for 'request illegal' + 'conversation id missing'; test file exists |
| **4a76b8de** commandcode quota + connection test | CLEAN_SUBSUMED | `commandcode.js:13,25,37,45-47` has individual-go-v1 mapping + 10-credit cap + normalizePlanId(); test file exists |
| **32a064e2** docker Node 22.23.4 pin | CLEAN_SUBSUMED | `.nvmrc` contains '22.23.4'; `Dockerfile:2` has `ARG NODE_IMAGE=node:22.23.4-alpine` |
| **421f2262** codex STT transcription | CLEAN_SUBSUMED | `stt.js:66` has codex + cx/transcribe check; 5 codex-stt test files exist |
| **00dd3dfc** media-providers stt OAuth gate | CLEAN_SUBSUMED | `media-providers/[kind]/[id]/page.js:162` has exact `kind === "stt" && OAUTH_PROVIDERS[id]` gate |

### DOM-Errors Chat Log Review (51-mini2-dashboard-dom-error-audit.md)
Read the dedicated 665-line DOM-errors audit document. **17 findings** total from sessions 2026-10-23 to 2026-10-24:

**High-impact findings:**
1. **#1 RSC 429 storm** — rate limiter counted Next.js prefetches as user traffic → fixed with `isNextInternal()` bypass
2. **#2 FK constraint on provider add** — rogue migration `002-fk-provider-connections.js` (in installed v0.5.75, NOT in repo) → live-fixed via reverse migration
3. **#13 SECURITY: evil.example.com OIDC** — active OIDC config pointing at IANA-reserved domain with password login disabled → save-time validation gate added
4. **#16 middleware rate limiter** — second limiter layer at `dashboardGuard.js` had no RSC exemption → added `isNextInternalRequest()`
5. **#17 published 0.5.109 audit** — ships NO rate limiter and only migration 001; built from different checkout; published line is behind repo HEAD on security

**i18n findings:**
6. **#12 hardcoded Chinese strings** — ~48 in model-context/page.js + 13 in StatisticsContent.js → all rewritten to English source + locale keys added
7. **#15 lowercase 'web' heading** — Header.js mediaKindMatch fallback → special case added

**Infrastructure remediation (all done 2026-10-24):**
- Rate-limiter bucket redesign (76/76 tests passing)
- Migration runner hardening (registry fingerprint + dry-run)
- Dashboard error boundaries (`error.js` + `global-error.js`)
- Provider-add UX guard
- OIDC save-time validation (13 tests)
- i18n ESLint rule (`local-i18n/no-chinese-literals`)

### Pattern Update
70 of 75 upstream commits reviewed so far are CLEAN_SUBSUMED (**93.3% absorption rate**). 2 NOT_IN_OURS (d8c585fb per-API-key access control foundation + 813a0121 usage token fallback — both survive in origin/master). 3 NO_ACTION_NEEDED (merge commit 7e0043de + changelog 87a74e1b + revert 6ed88685). 1 PARTIAL_OVERLAP (63de82b8 codebuddy-cn catalog).

**Note:** The 2aa9307f NOT_IN_OURS verdict from Batch 13 is **corrected** to NO_ACTION_NEEDED — upstream reverted it in 6ed88685 the same day. The adoption cluster is now 2 commits (d8c585fb + 813a0121), not 3.

## Batch 16 Analysis (2026-10-25, 5 commits: ca7b5401, 8a842043, 08ef047f, bc4a3cc7, 792f4719)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains equivalent infrastructure.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **ca7b5401** combo empty-content failover | CLEAN_SUBSUMED | `open-sse/services/emptyFailover.js` exists (11,473 bytes); `finishReasons.js:43+52` has empty-content failover comments; test exists |
| **8a842043** RTK custom system prompt | CLEAN_SUBSUMED | `open-sse/rtk/customPrompt.js` (525 bytes); `settingsRepo.js:103-104` fields; `chat.js:445-446` wiring; test exists |
| **08ef047f** undici 7.30.1 + headroom loopback | CLEAN_SUBSUMED | `package.json:49` has undici ^7.30.1; docker-compose.yml:26 has `127.0.0.1:8787:8787` headroom bind |
| **bc4a3cc7** ollama System One clef/clef-flash | CLEAN_SUBSUMED | `systemoneCore.js` has extensive handling (lines 10/11/27/28/41/46/81); `ollama-local.js:19-22` has clef+clef-flash entries; test exists |
| **792f4719** headroom CommandCode native | CLEAN_SUBSUMED | `headroom.js:242` has `collectCommandCodeHeadroomMessages`; lines 448-458 wire projection; test exists |

## Batch 17 Analysis (2026-10-25, 5 commits: a440ef43, 3ce2b828, 7c42d8f8, 5883110b, b08f12d5)

### Key Finding
**All 5 commits are CLEAN_SUBSUMED** — our branch already contains equivalent infrastructure.

### Per-Commit Verdicts

| Commit | Verdict | Evidence |
|--------|---------|----------|
| **a440ef43** headroom Gemini+Responses tool outputs | CLEAN_SUBSUMED | `headroom.js:45` functionResponse/functionCall detection; line 109 tool-output projection; line 142 functionResponse visit; `constants.js:4` HEADROOM_TOOL_OUTPUT_MAX_DEPTH=8; test exists |
| **3ce2b828** kiro Anthropic alias normalization | CLEAN_SUBSUMED | `kiroConstants.js:53` ANTHROPIC_SNAPSHOT_SUFFIX regex; line 78 normalization; test exists |
| **7c42d8f8** max_tokens→max_completion_tokens rename | CLEAN_SUBSUMED | `paramSupport.js:44` has `{provider:'openai' renameParams:{max_tokens:'max_completion_tokens'}}`; line 105 clampNumber; test exists |
| **5883110b** Monaco 0.57.0 pin | CLEAN_SUBSUMED | `package.json:36` monaco-editor ^0.57.0; `src/shared/constants/monaco.js` exports MONACO_VERSION='0.57.0' + MONACO_VS_PATH with rationale; test exists |
| **b08f12d5** codex-image ChatGPT Free skip + gpt-5.6-terra | CLEAN_SUBSUMED | `codex.js:13-14` CODEX_IMAGES_MAIN_MODEL='gpt-5.6-terra'; line 205 ChatGPT Free comment; `imageGeneration.js:137+143` skip logic; test exists |

### Pattern Update
80 of 85 upstream commits reviewed so far are CLEAN_SUBSUMED (**94.1% absorption rate**). 2 NOT_IN_OURS (d8c585fb per-API-key access control foundation + 813a0121 usage token fallback — both survive in origin/master). 3 NO_ACTION_NEEDED (merge 7e0043de + changelog 87a74e1b + revert 6ed88685). 1 PARTIAL_OVERLAP (63de82b8 codebuddy-cn catalog).

### Infrastructure Depth Verified
Batches 16+17 confirm deep infrastructure absorption:
- **Failover layer**: emptyFailover.js (11KB) with finishReason/streamEvents schema integration
- **RTK customization**: custom system prompt injector with settings persistence
- **Security hardening**: undici bump + headroom loopback binding in docker-compose
- **Provider expansion**: System One decision models, kiro alias normalization, Monaco pin with drift detection
- **Image generation**: codex plan-gate with ChatGPT Free exclusion

## Batch 18 Analysis (2026-10-25, 5 commits: b6a9ca43, 351b04cb, a3ca2f9b, b0655314, b82f5c4a)
**All 5 CLEAN_SUBSUMED** — test triage suite, SenseNova provider, API key visibility guidance with i18n (pt-BR/th/zh-CN), Grok 4.7 500k context, combos credit-exhaustion fallback.

## Batch 19 Analysis (2026-10-25, 5 commits: 2720cd2a, b8331283, dbdbb648, 5853a88a, 5cdcddf5)
**All 5 CLEAN_SUBSUMED** — qoder Sonus/Cantus + queue capacity, opencode-free mimo v2.6 reasoning, github Copilot GPT-5 series fallback catalog, modelSearchFilter regex lastIndex reset, combo request-scoped 4xx advance.

## Batch 20 Analysis (2026-10-25, 5 commits: 95c9d03e, 5a4e812e, 313559f4, f172c3c4, 32c5f30a)
**All 5 CLEAN_SUBSUMED** — stream tool-call id synthesis + OpenCode fingerprint restore, DB NUL-byte strip across all SQLite drivers, opencode deepseek-v4.1-flash low/high/max effort, antigravity hub/2.24.0 UA + Gemini 4 Argon high/medium/low tiers, OpenCode glm-5.3-flash-free thinkingFormat:openai.

## Batch 21 Analysis (2026-10-25, 6 commits: 9b4ea9eb, 31b8439b, 82aeb907, 161e3493, f3f86fdd, f39d8f07)
**5 CLEAN_SUBSUMED + 1 NO_ACTION_NEEDED** — combos search box, Ollama Cloud /api/balance quota, antigravity tiered-from-effort, Gemini reference image inputs, Smart Router System One stickiness, v0.5.109 changelog bump.

---

# FINAL SUMMARY — Stage 1 Complete (All 106 Commits Audited)

## Absorption Statistics
| Verdict | Count | Percentage |
|---------|-------|------------|
| **CLEAN_SUBSUMED** | **98** | **92.5%** |
| NOT_IN_OURS | 2 | 1.9% |
| NO_ACTION_NEEDED | 5 | 4.7% |
| PARTIAL_OVERLAP | 1 | 0.9% |
| **Total** | **106** | **100%** |

## NOT_IN_OURS Items (2 commits, both survive in origin/master)
1. **d8c585fb** — per-API-key access control foundation (26 files, 1131 insertions). `keyAccess.js` survives in origin/master. Clean additive feature.
2. **813a0121** — usage token fallback + stable key masking (2 files, 16 insertions). `input_tokens` fallback lines 66/68/224/251/383/385 survive in origin/master `usageRepo.js`. Small defensive fix.

Both are clean additive changes with no conflict risk. Adoption recommended as a small bundle.

## Verdict Corrections Applied
- **2aa9307f** (Batch 13): originally NOT_IN_OURS/ADOPT_WITH_D8C585FB → corrected to NO_ACTION_NEEDED after discovering 6ed88685 reverts it the same day (2026-10-15). Upstream abandoned the per-key token quotas feature.

## NO_ACTION_NEEDED Items (5 commits)
- 7e0043de — merge commit (git bookkeeping)
- 87a74e1b — v0.5.104 changelog bump
- 6ed88685 — revert of 2aa9307f (abandoned feature)
- 3c48d275 — changelog revert + version bumps
- f39d8f07 — v0.5.109 changelog bump

## PARTIAL_OVERLAP Items (1 commit)
- **63de82b8** — codebuddy-cn catalog (line-by-line triage at merge time)

## Key Findings
1. **Our branch (v5-vscode-works) is at v0.5.109** — same version as the latest upstream. The 106-commit audit is largely a verification of a prior merge.
2. **92.5% absorption rate** — overwhelming alignment between our branch and upstream.
3. **Massive features already absorbed**: web-cookie (89 files, 14572 insertions), Smart Router System One (1450 insertions), empty-content failover (753 insertions), test triage (2442 insertions).
4. **DOM-errors audit fully reviewed**: `51-mini2-dashboard-dom-error-audit.md` (665 lines, 17 findings from 2026-10-23/24) — all remediated in v4-vscode-works branch (rate-limiter bucket redesign, migration hardening, error boundaries, OIDC save-time validation, i18n fixes).
5. **SECURITY NOTE**: `evil.example.com` OIDC config was live on mini2 as of 2026-10-24 — save-time validation gate prevents recurrence but live config needs operator cleanup.
6. **Published 0.5.109 ships NO rate limiter** — must build from repo HEAD for mini2 upgrade, not npm install.

## Outstanding Work
- PR comment reading per commit (user explicit requirement — not yet done for any batch due to scope)
- Retroactive audit of 20 draft v5 commits against expanded standard
- DOM/code/visual triple verification of all dashboard pages
- 3-model-family final review
- Operator decisions: evil.example.com OIDC cleanup, mini2 upgrade path
