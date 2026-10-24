# Stage 1 — Per-Upstream-Commit Review (oldest → newest)

**Method:** For each of the 106 upstream commits (a99cf572..origin/master), read the overlap-file diff, compare against our branch's code at the same lines/functionality, classify, and note. Multi-model scrutiny is invoked for every KEEP-OURS-vs-THEIRS decision and every semantic-same-fix classification.

**Classifications:**
- `CLEAN` — upstream-only area, no branch interaction; take as-is
- `ADDITIVE` — both sides add disjoint content; merge = keep both
- `SAME-FIX` — upstream fixes the exact same bug/feature as ours; prefer upstream per mandate
- `DIVERGENT` — similar area, different concern; keep both + document
- `SUPERSEDED-OURS` — our branch code is made obsolete by upstream
- `NEEDS-SCRUTINY` — requires 3-model review before decision

**Legend for port items:** anything we must cherry-pick from dropped branch code into upstream's version goes in stage4-port-items.csv.

---

## 1. e10da160 — fix(usage): track exact Codex image token usage

**Date:** 2026-10-07 18:52 | **Author:** Đào Văn Hùng | **Files:** 2 test files | **Classification:** ADDITIVE

**What it does:** Adds `response.completed` usage tracking tests to codex-image-models.test.js and image-generation.test.js. Verifies `onUsage` callback receives correct token counts.

**Our branch:** Modified both files but did NOT add onUsage. Our changes were to different assertions (betaMarker, display_name). No line collision.

**Decision:** TAKE-UPSTREAM. Accept upstream additions.

---

## 2. 85bc33ce — feat(providers): add MiniMax Code (mcode) credits provider

**Date:** 2026-10-07 19:05 | **Author:** kelongyan | **Files:** 5 files | **Classification:** ADDITIVE

**What it does:** Adds new mcode provider: `minimaxHeaders` hook in default.js (x-api-key placeholder, session/timezone headers), capability table entries for MiniMax-M3.1/M3/M2.7 models, registry entry, usage tracking support.

**Our branch:** Modified default.js and capabilities.js but did NOT add any mcode code. No collision.

**Decision:** TAKE-UPSTREAM. Accept upstream additions.

---

## 3. 63de82b8 — feat(codebuddy-cn): sync catalog with 2026-09-30 server config
**Files:** capabilities.js | **Classification:** ADDITIVE. Our 5 capabilities.js commits touch different models (virtual router, claude-compat, gpt-6.1-sol). TAKE-UPSTREAM.

---

## 4. b00ba1aa — fix(muse): route Responses-only models to declared transport + nest reasoning effort
**Files:** chatCore.js | **Classification:** DIVERGENT. Branch's chatCore.js commits are conversationId/observability/multi-protocol — different functional area than muse transport routing. TAKE-UPSTREAM.

---

## 5. 46627249 — fix(ollama): report prompt_eval_cached_count as cached_tokens
**Files:** requestDetail.js | **Classification:** DIVERGENT. Branch's requestDetail.js work is conversationId/cost capture. TAKE-UPSTREAM.

---

## 6. a07ed95b — feat(antigravity): Claude Sonnet 5.5 + Opus 5.5
**Files:** capabilities.js, pricing.js, antigravity.js, cliTools.js | **Classification:** ADDITIVE. Branch's only antigravity.js commit is 7b9fada2 (429 attempts 3→6) — different region. TAKE-UPSTREAM.

---

## 7. 4fa46034 — feat(proxy-pools): Netlify relay proxy pool
**Files:** proxy-pools/page.js | **Classification:** DIVERGENT. Branch's e3faf053 adds L2 proxy status card to same page, different section. TAKE-UPSTREAM.

---

## 8. d8c585fb — feat(keys): per-API-key access control
**Files:** v1/models/route.js, db/index.js, db/schema.js, chat.js + NEW src/sse/services/keyAccess.js (199 lines) | **Classification:** ADDITIVE (new feature).
**Evidence:** branch has NO keyAccess.js; our chat.js has resolveSmartRouter (lines 26/122) but zero keyAccess references.
**⚠️ Stage-2 interaction:** upstream wires keyAccess at chat.js lines 28, 93-95, 111, 152, 190-191. When replaying our smartRouter wiring, order must be: enforceKeyAccess → resolveSmartRouter/resolveSmartChoice → combo expansion. TAKE-UPSTREAM.

---

## 9. 8a90d3c9 — fix(cli): take `connect` models from the server; add `show`, `--save`, Pi and Oh My Pi
**Files:** package.json | **Classification:** DIVERGENT. Root and cli/ version independently; take upstream CLI behavior, preserve our version fields. TAKE-UPSTREAM.

---

## 10. 0f7f6e72 — fix(capabilities): GLM-5.2/5.3 context is 1M, not the stale 200k pin (#4544)
**Files:** capabilities.js | **Classification:** MISSING-ON-BRANCH (was SAME-FIX candidate — DISPROVEN).
**Evidence:** our pattern table lines 414-416 still `contextWindow: 200000` for `*glm-5.3*`/`*glm-5.2*`; `git log -S 'contextWindow: 1000000'` over branch range matched only 15fc46e6, which added the virtual router models (auto/best-*), not GLM.
**Decision:** TAKE-UPSTREAM — apply the 1M pattern-table fix in Stage 2; we never had it.

---

## 11. c61ee37d — fix(capabilities): GLM-5.3 cannot disable thinking (#4656, fixes upstream #4409)
**Files:** capabilities.js | **Classification:** MISSING-ON-BRANCH (was SAME-FIX candidate — DISPROVEN).
**Evidence:** our glm-5.3-flash exact entry (line 122) has NO thinkingCanDisable field; our `*glm-5.3*` pattern has none either; `git log -S 'thinkingCanDisable'` over branch range returned zero commits. Upstream fix prevents z.ai 400 code 1210 when a turn asks to disable thinking.
**Decision:** TAKE-UPSTREAM — apply thinkingCanDisable:false on glm-5.3-flash + `*glm-5.3*` pattern in Stage 2.

---

## 12. a9d0ad26 — feat(bedrock): AWS Bedrock provider with AWS SSO (#4157)
**Files:** 31 files incl. NEW bedrock.js, kiro.js, registry/index.js, model.js, package.json, providers/route.js | **Classification:** ADDITIVE + ⚠️ REFACTOR HAZARD.
**Evidence:** branch has NO bedrock.js/awsEventStream.js. PR doc: extracts `crc32` + `parseEventFrame` from kiro.js into utils/awsEventStream.js (kiro −102 lines, frame loop unchanged). Our kiro.js changes — 96fc4e06 (flatten top-level tool schema combinators + degrade oversized payloads) and 2b63e0dd (test restoration) — must replay onto the POST-EXTRACTION kiro.js structure. PR also adds bedrock-xai, apiKeyOptionalWith:'profile', credentialForm:'aws' (generic modal gating), 60+ tests.
**Decision:** TAKE-UPSTREAM. Stage-2 flag: re-base our kiro.js features onto extracted-utils structure; verify kiro tests still pass.

---

## 13. a9c9f683 — feat(hermes): per-profile configuration (#4660)
**Files:** CHANGELOG.md, cliTools.js | **Classification:** DIVERGENT. Branch's 37514ede touches cliTools.js for kiro model defs/CLI mappings — different tool section. TAKE-UPSTREAM.

---

## 14. 2d94d3ab — feat(dashboard): open 9Remote sidebar item directly to website
**Files:** Sidebar.js | **Classification:** DIVERGENT. Branch commits 81be35de/a68c4625/23fb0dbf touch Sidebar.js for memory-module/claude-compat/search nav. TAKE-UPSTREAM.

---

## 15. eea08215 — fix(dashboard): mobile layouts for endpoint, provider models, cli-tools
**Files:** Header.js | **Classification:** DIVERGENT. Branch's 0ca07bf6 rewrites Chinese literals in Header.js (i18n) — layout vs text, disjoint. TAKE-UPSTREAM.

---

## 16. 24034f69 — feat(antigravity): refresh model catalog + MITM defaults to Gemini 3.8
**Files:** antigravity.js, cliTools.js | **Classification:** DIVERGENT + ⚠️ verify.
**Evidence:** branch's 7b9fada2 sets `"429": { attempts: 6 }` in antigravity.js. Upstream catalog refresh may touch the same registry object — must confirm our 429-attempts fix survives when this commit lands.
**Decision:** TAKE-UPSTREAM; re-assert 429 attempts=6 after application.

---

> **Scrutiny-priority reviews below** (queue positions 22/24/26) were pulled forward and verified with direct grep because they were SAME-FIX candidates.

---

## 22. 4c58e7f3 — fix(capabilities): add missing OpenCode Free reasoning entries (space-bunny & co)
**Files:** capabilities.js | **Classification:** MISSING-ON-BRANCH.
**Evidence:** grep for space-bunny/big-pickle/exo-free/fledge-alpha-free/longcat-2.0/north-mini-code-free/ring-2.6-1t-free/x-preview-f-free in our capabilities.js returns only line 614 `"meituan/longcat-2.0:free"` (an unrelated model-list entry). None of the 11 MODEL_CAPABILITIES entries upstream adds exist on our branch. These prevent applyThinking() from silently stripping reasoning_effort for newer OpenCode Free ids (refs upstream #2690).
**Decision:** TAKE-UPSTREAM — apply the 11 entries in Stage 2. (These are the entries that appeared on the HEAD side of the aborted-rebase step-1 conflict in capabilities.js.)

---

## 24. 8f4e3800 — fix(combo): fallback when model returns HTTP 200 with zero usable content (#4750)
**Files:** combo.js | **Classification:** MISSING-ON-BRANCH (correcting an earlier SAME-FIX hypothesis — DISPROVEN by direct grep).
**Evidence:** grep for isZeroContentResponse / peekComboResponse / peekStreamForContent / "zero usable content" / peeked in our open-sse/services/combo.js returns ZERO matches. Our branch has no zero-content fallback. Upstream adds isZeroContentResponse() (OpenAI choices + Anthropic content detection) plus a non-final-seat JSON peek that falls through to the next combo model on zero content.
**⚠️ Correction:** an earlier checkpoint called this a SAME-FIX candidate against "our existing peek logic" — that peek logic was on the HEAD (origin/master) side of the aborted-rebase step-8 conflict, NOT our branch. Our branch genuinely lacks it.
**Decision:** TAKE-UPSTREAM. Stage-2 note: our a38259d0 fallback-chain observability commit must merge with this zero-content logic in handleComboChat's success path (both edit the same `if (result.ok)` block).

---

## 26. c8644368 — fix(opencode-go): route claude-haiku-5-5 to /messages with adaptive thinking (#4727)
**Files:** capabilities.js, useModelCaps.js, opencode-go-models.test.js | **Classification:** DIVERGENT + ⚠️ test-interaction.
**Evidence:** upstream adds opencode-go claude-haiku-5-5 (claude-adaptive, 1M/128k) + commandcode claude-haiku-5-5 capability entries; exports resolveCaps from useModelCaps.js and adds ALIAS_TO_ID seat-alias resolution; adds claude-haiku-5-5 to the opencode-go catalog + CLAUDE_ONLY test block. Our branch touches useModelCaps.js and opencode-go-models.test.js via ca67b883/e4c1db96/9710b2cb/a68c4625/cf4dfefb/c58df01b. This maps to one of the 8 remaining test regressions (opencode-go-models supportedFormats) seen before the pivot.
**Decision:** TAKE-UPSTREAM. Stage-2 flag: reconcile our useModelCaps.js capability-override changes (c58df01b) with upstream's resolveCaps export + ALIAS_TO_ID mapping; reconcile our opencode-go-models.test.js with upstream's claude-haiku-5-5 expectations.

---

## 17. ce4460ef — # v0.5.99 (2026-10-08) release CHANGELOG
**Files:** CHANGELOG.md, package.json | **Classification:** DIVERGENT (release marker).
**Evidence:** Enumerates features already reviewed individually (bedrock #4157, hermes #4660, API keys, elevenlabs #4537, netlify, mcode, systemone, codebuddy-cn, 9Remote) + fixes (GLM #4544/#4656, combo picker #4659, gemini #4532/#4620, CLI). Our branch has independent versioning.
**Decision:** TAKE-UPSTREAM CHANGELOG content; preserve our package.json version.

---

## 18. 3ef4d8e3 — feat(usage): Cursor IDE quota via DashboardService (#4689)
**Files:** usage.js, ProviderLimits/utils.js | **Classification:** DIVERGENT (same region).
**Evidence:** Upstream adds `getCursorUsage` import + `cursor:` handler to `USAGE_HANDLERS`. Our branch has 3 quota-handler commits (45d77a21 generic quota, ff7ce121 Trae entitlement, bc2912cb OpenRouter BUG-QUOTA-03) in the same USAGE_HANDLERS region. No collision on cursor specifically — our branch doesn't add a cursor handler.
**Decision:** TAKE-UPSTREAM. Stage-2: merge into the expanded USAGE_HANDLERS block alongside our Trae/OpenRouter/generic entries.

---

## 19. cfd8c618 — fix(cursor): hold strictProxy on the AgentService h2 path (#4696)
**Files:** chatCore.js | **Classification:** MISSING-ON-BRANCH.
**Evidence:** Upstream adds `proxyPoolId` + `strictProxy` to the proxyOptions passthrough in chatCore.js. Our `grep strictProxy open-sse/handlers/chatCore.js` returns ZERO matches. Our branch has no strictProxy enforcement in chatCore.
**Decision:** TAKE-UPSTREAM. Prevents Cursor strict-pool connections from silently falling back to direct on the h2 AgentService path.

---

## 20. f5f88039 — fix(capabilities): advertise PDF input for current Claude models (#4761)
**Files:** capabilities.js | **Classification:** MOSTLY-MISSING-ON-BRANCH.
**Evidence:** Upstream adds `pdf: true` to ~15 Claude MODEL_CAPABILITIES entries (claude-fable-5-1, claude-opus-5.5 variants, claude-4.x family). Our branch has only 2 `pdf: true` entries total in capabilities.js (grep count); our claude-fable-5-1 (line 90) and claude-opus-5.5 (line 92) specifically lack pdf:true.
**Decision:** TAKE-UPSTREAM — apply the pdf:true additions across all Claude entries in Stage 2.

---

## 21. 90f89471 — fix(nous): add API-key attribution tags (#4770)
**Files:** CHANGELOG.md, default.js | **Classification:** ADDITIVE.
**Evidence:** Upstream adds attribution-tag preservation for Nous API-key requests in default.js executor. Our branch has no Nous-specific code in default.js.
**Decision:** TAKE-UPSTREAM.

---

## 23. b2aaf83b — fix(qoder): surface add-on (free-credit promo) quota in the quota tracker (#4758)
**Files:** ProviderLimits/utils.js | **Classification:** DIVERGENT (same function).
**Evidence:** Upstream rewrites the `case "qoder":` / `case "qoder-cn":` block in `parseQuotaData` to add `addOn` bucket support. Our branch has 2 commits on this file (45d77a21 generic quota, ff7ce121 Trae) but they add NEW provider cases, not modify the qoder case.
**Decision:** TAKE-UPSTREAM. Stage-2: no conflict expected — our additions are in different case blocks.

---

## 25. d6431f8b — feat(cli-tools): Hermes audio transcription via 9router (#4763)
**Files:** CHANGELOG.md | **Classification:** ADDITIVE (CHANGELOG only in overlap).
**Evidence:** The overlap diff is only the CHANGELOG entry. The actual feature files (Hermes card STT toggle, model picker) are outside the 53 overlap files.
**Decision:** TAKE-UPSTREAM.

---

## 27. 1d4335d4 — fix(translator): return Claude messages for forced SSE JSON responses (#4789)
**Files:** sseToJsonHandler.js | **Classification:** DIVERGENT + ⚠️ interaction flag.
**Evidence:** Upstream adds `openAICompletionToClaudeMessage` import + a `FORMATS.CLAUDE` branch in `handleForcedSSEToJson`. Our branch has 5 commits on sseToJsonHandler.js including 8ad9e3da (tasktype-tracking + empty-choices + openrouter-usage flags). Different functional areas within the same handler.
**Decision:** TAKE-UPSTREAM. Stage-2: verify our 8ad9e3da changes don't conflict with the new Claude branch in handleForcedSSEToJson.

---

## 28. 29fc880e — feat(gemini): add Gemini 4 Argon (gemini/vertex/antigravity)
**Files:** capabilities.js, registry/antigravity.js | **Classification:** MISSING-ON-BRANCH.
**Evidence:** Upstream adds `*gemini-4*` PATTERN_CAPABILITIES entry (thinkingCanDisable:false, audio/video input, 1M context, 64K output) + gemini-4-argon-high on antigravity registry. Our `grep argon|gemini-4 open-sse/providers/capabilities.js` returns ZERO matches. Also adds `getModelMeta()` helper.
**Decision:** TAKE-UPSTREAM. Stage-2: verify our 24034f69 antigravity catalog refresh doesn't conflict with the argon-high entry.

---

## 29. 165f9b90 — feat(providers): add Nous Research OAuth + free-tier provider
**Files:** capabilities.js, registry/index.js | **Classification:** ADDITIVE.
**Evidence:** Upstream adds `nous` to the thinkingFormat enum comment + PROVIDER_CAPABILITIES entries for Nous Research Portal free-tier models. Our `grep nous open-sse/providers/registry/index.js` returns ZERO matches — we don't have Nous as a provider.
**Decision:** TAKE-UPSTREAM. New provider we don't have.

---

## 30. 5bdcd5e7 — fix(opencode): move free tier to /inference/v1 with the v2 client fingerprint (#4842)
**Files:** opencode-free-tool-choice.test.js | **Classification:** DIVERGENT + ⚠️ test-interaction.
**Evidence:** Upstream adds `OPENCODE_FINGERPRINT_TOOLS` import + fingerprint-gate assertions to the test. Our branch ALREADY has the mock infrastructure: line 14 `vi.mock("../../open-sse/utils/opencodeFingerprint.js"` and line 16 `OPENCODE_FINGERPRINT_TOOLS: ["bash", "glob", "grep", "read"]`. Upstream adds real assertions that exercise this mock.
**Decision:** TAKE-UPSTREAM. Stage-2: verify our mock values align with upstream's test expectations; the test file exists and has the mock scaffolding.

---

## 31. be51142b — feat(quota): anchored auto-ping schedule at fixed local times (#4848)
**Files:** providers/[id]/page.js | **Classification:** DIVERGENT. Branch touches the provider detail page for other features. TAKE-UPSTREAM.

---

## 32. 7878f53b — fix(codex): drop retired gpt-5.5 from registry, image and auto-ping
**Files:** registry/codex.js, cliTools.js, image-generation.test.js | **Classification:** DIVERGENT. Branch has codex registry changes (refreshLeadMs restoration). TAKE-UPSTREAM; Stage-2: verify our codex.js refreshLeadMs=432000000 survives.

---

## 33. db81a8c9 — fix(headroom): avoid false compression warnings when tools dominate body (#4855)
**Files:** CHANGELOG.md, chatCore.js | **Classification:** DIVERGENT. Branch has many chatCore.js commits. TAKE-UPSTREAM.

---

## 34. 28d40159 — feat(quota): unify auto-ping mode selection and default to local timezone
**Files:** providers/[id]/page.js | **Classification:** DIVERGENT. Follow-on to be51142b. TAKE-UPSTREAM.

---

## 35. eb373017 — fix(gemini): drop sampling params and order functionResponse-last for Gemini 4 (#4802)
**Files:** capabilities.js | **Classification:** MISSING-ON-BRANCH (no gemini-4 entries on branch). TAKE-UPSTREAM.

---

## 36. a8f63f4d — fix(models): expose no-auth free providers in /v1/models and prune custom models on node deletion
**Files:** v1/models/route.js, nodesRepo.js | **Classification:** DIVERGENT. Branch modified v1/models/route.js (keyAccess interaction). TAKE-UPSTREAM; Stage-2: verify keyAccess filtering still applies.

---

## 37. 813a0121 — fix(usage): token fallback for input_tokens rows and stable key masking in stats
**Files:** usageRepo.js | **Classification:** DIVERGENT. Branch has usageRepo.js conversationId changes. TAKE-UPSTREAM.

---

## 38. 2aa9307f + 39. 6ed88685 — feat(keys): per-key token quotas + REVERT
**Files:** db/index.js, usageRepo.js, schema.js, chat.js + 21 files reverted | **Classification:** NET-ZERO (revert pair).
**Evidence:** 2aa9307f adds tokenLimit/usedTokens/incrementKeyTokens; 6ed88685 reverts it completely (97+/972-). Net effect on the merge is zero — both commits cancel. The keyAccess.js core from d8c585fb survives (revert only removes the quota additions, not the base access control).
**Decision:** SKIP-BOTH (net zero). Document that keyAccess.js retains d8c585fb's base functionality without token quotas.

---

## 40. 3c48d275 — Features: (CHANGELOG for v0.5.100-103)
**Files:** CHANGELOG.md, package.json | **Classification:** DIVERGENT (release marker). TAKE-UPSTREAM CHANGELOG; preserve our version.

---

## 41. 87a74e1b — # v0.5.104 (2026-10-15)
**Files:** CHANGELOG.md | **Classification:** DIVERGENT (release marker). TAKE-UPSTREAM.

---

## 42. 38a0c449 — feat(web-cookie): add web provider executors, browser pool and login capture
**Files:** 89 files incl. .gitignore, registry/index.js, package.json, providers pages | **Classification:** ADDITIVE (large new feature).
**Evidence:** Branch has NO web-cookie executors (ls open-sse/executors/web*.js = no matches; grep WebCookieExecutor/browserPool = 0 except one comment in sseConstants.js). This is a substantial new provider family.
**Decision:** TAKE-UPSTREAM. Stage-2: .gitignore and package.json merges need care; registry/index.js is auto-generated.

---

## 43. 3b137aa6 — fix(codebuddy): back off blocked international connections
**Files:** combo.js | **Classification:** MISSING-ON-BRANCH (our combo.js has no codebuddy backoff). TAKE-UPSTREAM. ⚠️ Stage-2: third combo.js edit alongside ca7b5401/5cdcddf5 — all three must merge with our a38259d0 fallback-chain.

---

## 44. 4a76b8de — fix(commandcode): correct quota display and connection test
**Files:** ProviderLimits/utils.js | **Classification:** DIVERGENT. Branch has quota-handler commits on same file. TAKE-UPSTREAM.

---

## 45. 421f2262 — feat(stt): add Codex OAuth transcription provider
**Files:** registry/codex.js | **Classification:** DIVERGENT. Branch has codex.js changes. TAKE-UPSTREAM; verify refreshLeadMs survives.

---

## 46. ca7b5401 — fix(combo): fall through on empty-content streaming responses
**Files:** combo.js | **Classification:** MISSING-ON-BRANCH.
**Evidence:** Adds NEW file open-sse/services/emptyFailover.js (peekStreamForContent/reconstructStream/isNoRetryFinish) + rewrites the result.ok success path in handleComboChat with peekComboResponse. Our combo.js has ZERO peek logic (verified earlier). This is the streaming-side complement to 8f4e3800's JSON zero-content check.
**Decision:** TAKE-UPSTREAM. ⚠️ Stage-2: this rewrites the same if(result.ok) block that 8f4e3800 and our a38259d0 fallback-chain touch. Merge order matters: apply ca7b5401's peek structure first, then layer fallback-chain attempt-recording around it.

---

## 47. 8a842043 — feat(rtk): add a user-authored custom system prompt
**Files:** chatCore.js, settingsRepo.js, chat.js | **Classification:** MISSING-ON-BRANCH.
**Evidence:** Adds customPromptEnabled/customPrompt params to handleChatCore signature + injectCustomPrompt import from rtk/customPrompt.js (NEW) + settings defaults. Our grep customPrompt chatCore.js = 0 matches. Our branch's handleChatCore signature has conversationId but NOT customPrompt.
**Decision:** TAKE-UPSTREAM. ⚠️ Stage-2: handleChatCore signature merge must include BOTH customPromptEnabled/customPrompt (upstream) AND conversationId (ours). This was already identified in the aborted-rebase step-3 conflict.

---

## 48. 08ef047f — fix(security): bump undici to 7.30.1 and bind headroom to loopback
**Files:** package.json | **Classification:** MISSING-ON-BRANCH (security fix). TAKE-UPSTREAM — priority.

---

## 49. 5883110b — fix(deps): upgrade Monaco to 0.57.0 and pin the copy the dashboard loads
**Files:** package.json | **Classification:** MISSING-ON-BRANCH. TAKE-UPSTREAM.

---

## 50. b08f12d5 — fix(codex-image): skip ChatGPT Free accounts and use a Go-compatible main model
**Files:** image-generation.test.js | **Classification:** DIVERGENT. Branch touched image-generation.test.js. TAKE-UPSTREAM.

---

## 51. b6a9ca43 — test: triage master's failing suite; fix GLM-5.2 effort, gpt-6.1-sol context, dead SSRF tests
**Files:** 33 files (capabilities.js + 32 test files incl. known-fails.txt + golden snapshot) | **Classification:** ⚠️ CRITICAL SAME-FIX OVERLAP.
**Evidence:** This is master's own test-triage commit. It makes the EXACT same fixes our branch made post-rebase:
- **DNS array mocks:** codex-image-fetch.test.js + image-fetch-hardening.test.js → lookup({all:true}) returns array (our commits 74c5a43b/7b9fada2 did the same)
- **glm-5.2 thinkingEffortSupported:** capabilities.js exact entry (our ad06b3bc did the same)
- **gpt-6.1-sol codex entry:** capabilities.js PROVIDER_CAPABILITIES.codex (our ad06b3bc did the same)
- **it.fails flips:** bugs-claudeCode-context + bugs-openai-bridge (our 729e786d/fa2b99e8 addressed these)
- **commandcode mediaType:** bugs-gemini-cursor-commandcode (our branch has this)
- **kiro systemPrompt→user-turn:** claude-kiro-direct.test.js kiroPromptOf helper (matches our translator changes)
- **cursor-models 57 lines:** http2 mock rework (one of our 8 remaining regressions!)
- **kiro-terminal-integrity 7 lines:** (one of our 8 remaining regressions!)
- **zed-native-auth 4 lines:** (one of our 8 remaining regressions!)
- **known-fails.txt 33-line refresh**
- **golden-url-header.test.js.snap:** 2170-line NEW snapshot

**Decision:** TAKE-UPSTREAM as the authoritative version. Stage-2 DEDUP: our post-rebase test-fix commits (74c5a43b, 7b9fada2, ad06b3bc, 28811ebb, a59bdcaa, d8af862d, 8ad9e3da, bfe4ab76, 6e17962a, 1ca9f5d8, ca67b883, 5cc2b724, 2b63e0dd, fa2b99e8, 729e786d) likely DUPLICATE much of this commit. When replaying our branch, these test-fix commits should be SKIPPED where b6a9ca43 already provides the fix. The 8 remaining regressions (cursor-models, kiro-terminal-integrity×2, opencode-go-models, opencode-muse-spark-thinking, thinking-levels-kiro, zed-native-auth, mimo-free.live) are likely resolved by taking b6a9ca43's test updates wholesale.

---

## 52. 351b04cb — feat(provider): add SenseNova provider support
**Files:** capabilities.js, registry/index.js | **Classification:** ADDITIVE. TAKE-UPSTREAM.

---

## 53. a3ca2f9b — fix(dashboard): correct API key visibility guidance
**Files:** public/i18n/literals/zh-CN.json | **Classification:** DIVERGENT. Branch has 0ca07bf6 i18n zh rewrite. TAKE-UPSTREAM; Stage-2: verify our i18n changes don't conflict.

---

## 54. b0655314 — fix(capabilities): give Grok 4.7 its 500k context window
**Files:** capabilities.js | **Classification:** MISSING-ON-BRANCH. TAKE-UPSTREAM.

---

## 55. 2720cd2a — fix(qoder): stop failing queued models, route Sonus/Cantus, restore capabilities
**Files:** capabilities.js | **Classification:** MISSING-ON-BRANCH. TAKE-UPSTREAM.

---

## 56. b8331283 — fix(opencode-free): full reasoning support for oc/mimo-v2.6-flash-free
**Files:** CHANGELOG.md, sseToJsonHandler.js, capabilities.js | **Classification:** DIVERGENT. Branch has sseToJsonHandler.js changes (8ad9e3da). TAKE-UPSTREAM; ⚠️ Stage-2: verify 8ad9e3da empty-choices fix doesn't conflict with mimo reasoning support.

---

## 57. 5cdcddf5 — fix(combo): advance past a request-scoped 4xx instead of ending the combo
**Files:** combo.js | **Classification:** MISSING-ON-BRANCH.
**Evidence:** Adds requestScopedResult variable + requestScoped destructure from checkFallbackError + early-return of first request-scoped failure. Our combo.js has none of this.
**Decision:** TAKE-UPSTREAM. ⚠️ Stage-2: fourth combo.js edit (with 8f4e3800, ca7b5401, 3b137aa6) — all must merge with our a38259d0 fallback-chain.

---

## 58. 95c9d03e — fix(stream): fill missing tool-call ids and restore renamed tool names (#4992, #4986)
**Files:** CHANGELOG.md | **Classification:** ADDITIVE (CHANGELOG only in overlap). TAKE-UPSTREAM.

---

## 59. 5a4e812e — fix(db): strip NUL bytes from bound strings
**Files:** CHANGELOG.md | **Classification:** ADDITIVE (CHANGELOG only in overlap). TAKE-UPSTREAM.

---

## 60. 313559f4 — fix(opencode): honor low|high|max reasoning efforts for zen free deepseek-v4.1-flash
**Files:** CHANGELOG.md | **Classification:** ADDITIVE (CHANGELOG only in overlap). TAKE-UPSTREAM.

---

## 61. f172c3c4 — fix(antigravity): use hub/2.24.0 User-Agent and add Gemini 4 Argon medium/low tiers (#4816)
**Files:** registry/antigravity.js | **Classification:** DIVERGENT. Branch has 7b9fada2 (429 attempts 3→6). TAKE-UPSTREAM; ⚠️ re-assert 429 attempts=6.

---

## 62. 32c5f30a — fix(capabilities): send reasoning_effort for OpenCode's glm-5.3-flash-free
**Files:** CHANGELOG.md, capabilities.js | **Classification:** MISSING-ON-BRANCH. TAKE-UPSTREAM.

---

## 63. 31b8439b — fix(usage): support /api/balance for ollama cloud quota tracking (#5026)
**Files:** ProviderLimits/utils.js | **Classification:** DIVERGENT. Branch has quota-handler commits. TAKE-UPSTREAM.

---

## 64. 82aeb907 — fix(antigravity): resolve tiered models from client reasoning effort
**Files:** chatCore.js | **Classification:** DIVERGENT. Branch has chatCore.js changes. TAKE-UPSTREAM.

---

## 65. f3f86fdd — feat(combos): add Smart Router (System One) with adaptive session stickiness (#4975)
**Files:** combo.js, shared/components/index.js, chat.js + 7 more | **Classification:** SAME-FEATURE as our da52d462 — VERDICT LOCKED: PREFER_UPSTREAM (3/3 models).
**Evidence:** See verdicts/da52d462-vs-4975.md. Upstream's implementation is production-grade (19 tests, SmartPolicyModal, 4 policies, fail-open). Our da52d462 is an untested prototype.
**Decision:** TAKE-UPSTREAM. DROP our da52d462. Port items: activeRequests concurrency tracking, 30-min TTL, costQualityTradeoff/maxCandidates settings.

---

## 66. f39d8f07 — # v0.5.109 (2026-10-23) release
**Files:** CHANGELOG.md, package.json | **Classification:** DIVERGENT (release marker). TAKE-UPSTREAM CHANGELOG; preserve our version.

---

## 67. 3ce2b828 — fix(kiro): normalize Anthropic model ids onto Kiro upstream aliases
**Files:** kiroConstants.js | **Classification:** MISSING-ON-BRANCH.
**Evidence:** Adds normalizeKiroUpstreamModelId() with ANTHROPIC_SNAPSHOT_SUFFIX regex to kiroConstants.js. Our grep normalizeAnthropicModelId|ANTHROPIC_TO_KIRO kiroConstants.js = 0 matches. Prevents 400 INVALID_MODEL_ID when Claude Code sends date-suffixed Anthropic ids.
**Decision:** TAKE-UPSTREAM.

---

# NO_OVERLAP Commits (39) — CLEAN audit

All 39 commits below touch NONE of the 53 overlap files. Classification: **CLEAN-TAKE-UPSTREAM** — accept verbatim, no branch interaction possible. Listed oldest→newest.

| # | SHA | Date | Subject | Files |
|---|-----|------|---------|-------|
| 68 | d2f90177 | 2026-10-07 | feat(systemone): support Cloudflare AI clef-flash endpoint | 2 |
| 69 | 625df74d | 2026-10-07 | fix(gemini): rename $ref keys in functionResponse payloads | 2 |
| 70 | cbd594ac | 2026-10-07 | fix(cursor): reject empty AgentService turns without successful stop | 2 |
| 71 | 18ad1a89 | 2026-10-07 | fix(cursor): forward reasoning effort to AgentService Run | 3 |
| 72 | b677bfce | 2026-10-07 | fix(cli): store model IDs in TUI combos | 3 |
| 73 | 0dd4d6be | 2026-10-07 | fix(codex): preserve explicit tool strict flags | 2 |
| 74 | 6e4f82db | 2026-10-07 | fix(translator): uniquify duplicate tool_call_ids for Gemini (#4532) | 2 |
| 75 | ee323400 | 2026-10-07 | fix(tts): accept server model and voice in self-hosted example | 2 |
| 76 | 3125ac2b | 2026-10-07 | fix(kimi): route Responses clients to the Kimi Code /responses endpoint | 2 |
| 77 | 2f827bcf | 2026-10-07 | feat(elevenlabs): add Scribe speech-to-text support (#4537) | 7 |
| 78 | 6a1573eb | 2026-10-08 | fix(combo): show compatible node models in picker without a connection (#4659) | 1 |
| 79 | 09f6d395 | 2026-10-08 | fix(gemini): do not treat properties map as schema node when tool param named properties (#4620) | 1 |
| 80 | cff2b1d9 | 2026-10-11 | feat(antigravity): bump IDE version to 2.22.0 | 7 |
| 81 | e7f41c13 | 2026-10-11 | fix(cursor): recover long sessions from empty AgentService turns (#4690) | 2 |
| 82 | f6c26d8e | 2026-10-11 | feat(cursor): resolve Auto (Server Picks) to the account's default agent model (#4692) | 3 |
| 83 | f7708c9d | 2026-10-11 | test(cursor): lock KV ack metadata echo with round-trip tests (#4694) | 2 |
| 84 | ef4679df | 2026-10-13 | fix(opencode): encode inverted timestamp in translated session IDs (#4780) | 3 |
| 85 | 468aa7d9 | 2026-10-13 | fix(param-support): drop response_format for opencode-go deepseek models | 2 |
| 86 | 59e9b526 | 2026-10-13 | fix(opencode-zen): use attested free-tier identity for -free models on keyed lane (#4784) | 4 |
| 87 | 9c141910 | 2026-10-14 | fix(vertex): honor API-key project/location for Gemini 4 Argon (#4821) | 3 |
| 88 | 51a1827e | 2026-10-14 | fix(github): route Copilot embeddings to api.githubcopilot.com (#4793) | 4 |
| 89 | e964e482 | 2026-10-15 | fix(opencode): inject reasoning_content placeholder for Zen multi-turn chats (#4805) | 1 |
| 90 | 7e0043de | 2026-10-15 | Merge branch 'chore/codex-drop-gpt-5.5' | 0 |
| 91 | da1756a8 | 2026-10-15 | feat(ui): model picker regex/negation search, batch select, provider filtering | 10 |
| 92 | d95bb8ea | 2026-10-15 | fix(dashboard): unclip proxy dropdown and tooltips via body portal | 2 |
| 93 | fb30246c | 2026-10-15 | fix(tests): isolate zed-native-auth DATA_DIR so it stops writing to the real DB | 1 |
| 94 | 342ecb0d | 2026-10-22 | fix(pi-settings): declare existingProvider before use in POST | 1 |
| 95 | d07e5bc3 | 2026-10-22 | fix(thinking): let a transport declare its thinking shape; nest reasoning on OpenCode Go /responses | 5 |
| 96 | 32a064e2 | 2026-10-23 | fix(docker): pin Node 22.23.4 to patch October 2026 security CVEs | 2 |
| 97 | 00dd3dfc | 2026-10-23 | fix(media-providers): keep the connection card for non-STT OAuth media pages | 1 |
| 98 | bc4a3cc7 | 2026-10-23 | feat(ollama): support System One decision models (clef, clef-flash) | 5 |
| 99 | 792f4719 | 2026-10-23 | fix(headroom): support native CommandCode requests | 5 |
| 100 | a440ef43 | 2026-10-23 | fix(headroom): compress native Gemini and Responses tool outputs | 4 |
| 101 | 7c42d8f8 | 2026-10-23 | fix(openai): rename max_tokens to max_completion_tokens | 2 |
| 102 | b82f5c4a | 2026-10-23 | fix(combos): try the next model when credits run out | 3 |
| 103 | dbdbb648 | 2026-10-23 | fix(github): refresh Copilot fallback model catalog | 2 |
| 104 | 5853a88a | 2026-10-23 | fix(search): reset regex state between model matches | 2 |
| 105 | 9b4ea9eb | 2026-10-23 | feat(combos): search box for the combo list | 1 |
| 106 | 161e3493 | 2026-10-23 | feat(image, mitm): support reference image inputs for Gemini and ensure MITM directory (#4981) | 4 |

**Decision for all 39:** CLEAN-TAKE-UPSTREAM. None touch any file our branch modified; accept verbatim.

---

# Stage 1 Summary

**Total upstream commits reviewed:** 106/106 ✅
- **67 priority** (touch ≥1 overlap file) — fully classified with evidence
- **39 CLEAN** (no overlap file) — accept verbatim

**Key decisions locked:**
1. **da52d462 (our smart-router) → DROP** in favor of upstream #4975 (System One). 3/3 model families agree. Port items: activeRequests concurrency, 30-min TTL, costQualityTradeoff/maxCandidates.
2. **b6a9ca43 (master test triage) is SAME-FIX overlap** with ~15 of our post-rebase test-fix commits. Stage-2 DEDUP: skip our duplicate test-fix commits.
3. **2aa9307f + 6ed88685 = net-zero revert pair** — SKIP-BOTH.
4. **combo.js has 4 upstream edits** (8f4e3800, ca7b5401, 3b137aa6, 5cdcddf5) that must merge with our a38259d0 fallback-chain observability.
5. **handleChatCore signature merge** must include BOTH upstream's customPromptEnabled/customPrompt AND our conversationId.
6. **Bedrock #4157 (a9d0ad26)** extracts EventStream utils from kiro.js — our kiro.js changes must replay onto post-extraction structure.

**Stage-2 replay hazards flagged:**
- combo.js: 4 upstream edits + our fallback-chain
- chatCore.js: customPrompt + conversationId signature merge
- kiro.js: post-Bedrock EventStream extraction rebase
- capabilities.js: many additive entries (no conflict expected)
- useModelCaps.js + opencode-go-models.test.js: resolveCaps/ALIAS_TO_ID reconciliation
- antigravity.js: re-assert 429 attempts=6 after catalog refresh
- i18n zh-CN.json: verify 0ca07bf6 rewrite doesn't conflict
- sseToJsonHandler.js: verify 8ad9e3da empty-choices vs upstream mimo reasoning
- v1/models/route.js: verify keyAccess filtering still applies

**Files on disk:**
- `.agent/rebase-catalog/stage1/REVIEW-NOTES.md` — 67 detailed entries + 39-row CLEAN table + Stage 1 summary
- `.agent/rebase-catalog/stage1/review.csv` — 106 rows (header + 67 priority + 39 CLEAN)
- `.agent/rebase-catalog/verdicts/da52d462-vs-4975.md` — locked 3/3 verdict
- `.agent/rebase-catalog/prs/` — 34 PR docs
- `.agent/rebase-catalog/commit-bodies/` — 106 commit bodies
- `.agent/rebase-catalog/stage1/diffs/` — 106 overlap-only diffs

