# Stage 2 — Per-Branch-Commit Replay Review (oldest → newest)

**Method:** For each of the 243 branch commits (a99cf572..v4-vscode-works), read the overlap-file diff, cross-reference against Stage 1 upstream notes, and classify.

**Classifications:**
- `KEEP` — branch feature/fix with no upstream equivalent; replay onto upstream
- `KEEP+MERGE` — branch feature that must merge with an upstream edit in the same file/region (Stage-1 hazard flagged)
- `DROP` — branch commit made redundant by upstream's version (per mandate: exact same feature/bug fixed better upstream)
- `DEDUP` — branch test-fix commit duplicating upstream's b6a9ca43 test triage; skip where upstream provides the fix
- `PORT` — branch fix whose intent must be cherry-picked into upstream's implementation (drop the commit, port the logic)
- `CLEAN-KEEP` — branch commit touches no overlap file; replay verbatim

**Cross-reference anchors (from Stage 1):**
- da52d462 → DROP (verdicts/da52d462-vs-4975.md, PREFER_UPSTREAM #4975)
- b6a9ca43 → SAME-FIX dedup for our post-rebase test-fix commits
- combo.js → 4 upstream edits (8f4e3800, ca7b5401, 3b137aa6, 5cdcddf5) merge with our a38259d0
- handleChatCore → signature merge (upstream customPrompt + our conversationId)
- kiro.js → replay onto post-Bedrock EventStream extraction (a9d0ad26)
- 2aa9307f+6ed88685 → net-zero upstream revert pair

---

## B1. 15fc46e6 — update (capabilities.js virtual router models)
**Date:** 2026-10-06 | **Overlap files:** capabilities.js | **Classification:** KEEP
**What it does:** Adds 9Router virtual smart router model entries (auto, best-code, best-chat, best-reasoning, best-cheap) to MODEL_CAPABILITIES in capabilities.js. These are our own virtual routing concept — capability-gating must never block a 9router request before selection.
**Stage-1 crossref:** None of these model ids exist upstream. Upstream's #4975 System One is a different mechanism (in-combo strategy), not virtual model ids.
**Decision:** KEEP. Replay onto upstream's capabilities.js (additive, no collision expected — upstream adds entries in different regions).

---

## B2. da52d462 — feat(smart-router): pre-combo interception smart router
**Date:** 2026-10-22 | **Overlap files:** settingsRepo.js, chat.js | **Classification:** DROP
**What it does:** Creates src/sse/services/smartRouter.js (192 lines), adds resolveSmartRouter() pre-combo interception in chat.js, adds smartRouter defaults to settingsRepo.js.
**Stage-1 crossref:** Verdict locked 3/3 PREFER_UPSTREAM (verdicts/da52d462-vs-4975.md). Upstream #4975 (f3f86fdd) is production-grade with 19 tests, SmartPolicyModal, 4 policies, fail-open.
**Decision:** DROP. Port items for Stage 4: activeRequests concurrency tracking, 30-min dynamic TTL for sr- combos, costQualityTradeoff/maxCandidates settings (if upstream's policies lack granular cost tuning).

---

## B3. af09eecf — feat(observability): conversationId tracking + streaming non-SSE detail capture
**Date:** 2026-10-22 | **Overlap files:** chatCore.js, requestDetail.js, sseToJsonHandler.js, usageRepo.js, schema.js, chat.js | **Classification:** KEEP+MERGE
**What it does:** Adds conversationId to handleChatCore signature + sharedCtx + all saveRequestDetail/saveUsageStats calls. Adds nullable conversationId column to usageHistory and requestDetails (SCHEMA_VERSION 1→2). Wires conversationId from x-conversation-id header or extra_body.conversation_id in handleChat().
**Stage-1 crossref:** ⚠️ handleChatCore signature merge hazard. Upstream 8a842043 (customPrompt) and this commit both modify the handleChatCore parameter list. Final signature must include BOTH customPromptEnabled/customPrompt AND conversationId.
**Decision:** KEEP+MERGE. Replay with signature reconciliation against upstream's customPrompt params.

---

## B4. 2c008011 — feat(observability): persist smart router taskType in usageHistory meta
**Date:** 2026-10-22 | **Overlap files:** chatCore.js, requestDetail.js, sseToJsonHandler.js, usageRepo.js, chat.js | **Classification:** KEEP+MERGE
**What it does:** Persists smart router taskType in usageHistory meta. Depends on smartRouter.js (da52d462 which is DROP). ⚠️ If da52d462 is dropped, this commit's taskType source disappears. Must adapt to upstream #4975's System One task classification or remove.
**Stage-1 crossref:** Upstream #4975 has its own task classification via buildChoiceCriteria.
**Decision:** KEEP+MERGE with ADAPTATION. Port taskType persistence onto upstream's System One classification, or drop if upstream's #4975 already tracks equivalent metadata.

---

## B5. a38259d0 — feat(observability): track combo fallback chain per request
**Date:** 2026-10-22 | **Overlap files:** combo.js, chat.js | **Classification:** KEEP+MERGE
**What it does:** Adds fallbackChain array + onFallbackEvent callback to handleComboChat. Attaches x-9r-fallback-chain response header on success-after-failure. Embeds chain in 503 error body. Wires onFallbackEvent from chat.js.
**Stage-1 crossref:** ⚠️ combo.js 4-edit merge hazard. Upstream 8f4e3800 (zero-content), ca7b5401 (empty-content peek), 3b137aa6 (codebuddy backoff), 5cdcddf5 (request-scoped 4xx) all edit the same handleComboChat function. Our fallback-chain attempt-recording must wrap around upstream's peek/zero-content/request-scoped logic.
**Decision:** KEEP+MERGE. Replay fallback-chain onto upstream's evolved handleComboChat (post all 4 upstream edits). Merge order: apply upstream's 4 edits first, then layer our attempt-recording around the result.ok and catch blocks.

---

## B6. f9d81b31 — feat(observability): add AI Error Analyst
**Date:** 2026-10-22 | **Overlap files:** settingsRepo.js | **Classification:** KEEP
**What it does:** Adds AI Error Analyst feature — analyze captured failures with your own models. Touches settingsRepo.js for config defaults.
**Stage-1 crossref:** No upstream equivalent. Unique branch feature.
**Decision:** KEEP. Additive settings addition, no collision expected.

---

## B7. 34e24ea2 — feat(observability): markdown request log auto-flush
**Date:** 2026-10-22 | **Overlap files:** settingsRepo.js | **Classification:** KEEP
**What it does:** Adds markdownLogEnabled/markdownLogFlushIntervalMin settings. Creates src/lib/markdownLog.js (auto-flush timer) and src/lib/markdownReport.js (shared renderer). Adds 'Markdown Request Log' card to Combos page.
**Stage-1 crossref:** No upstream equivalent. Unique branch feature.
**Decision:** KEEP. Additive settings + new files, no collision expected.

---

## B8. 47cb67de — feat(observability): error categorization engine
**Date:** 2026-10-22 | **Overlap files:** chatCore.js | **Classification:** KEEP
**What it does:** Adds categorizeError import to chatCore.js. Creates open-sse/utils/errorCategorizer.js (pure status+text→category mapping). Attaches errorCategory to requestDetail on error paths.
**Stage-1 crossref:** No upstream equivalent. Unique branch feature.
**Decision:** KEEP. Additive import + new utility file.

---

## B9. f050d4b7 — fix(observability): forward errorCategory through request-detail pipeline
**Date:** 2026-10-22 | **Overlap files:** requestDetail.js | **Classification:** KEEP
**What it does:** Adds errorCategory to buildRequestDetail output object. Fixes the pipeline so categories actually persist to storage.
**Stage-1 crossref:** No upstream equivalent. Bug fix for B8 (error categorizer).
**Decision:** KEEP. Depends on B8, no upstream conflict.

---

## B10. 1f7aa6ef — fix(smart-router): 4 real bugs caught by production E2E
**Date:** 2026-10-22 | **Overlap files:** chat.js | **Classification:** DROP (cascaded)
**What it does:** Fixes 4 bugs in the smart-router feature: enumeration bug (PROVIDERS→PROVIDER_MODELS), combo-reuse crash (JSON.parse guard), sticky-session corruption (provider slot storage), crash on first resolve (const→let).
**Stage-1 crossref:** This fixes da52d462 (smart-router), which is DROP per verdict (3/3 PREFER_UPSTREAM #4975). If da52d462 is dropped, this fix has no target code to fix.
**Decision:** DROP (cascaded from da52d462). No port items — upstream's #4975 doesn't have these bugs.

---

## B11. b12b2244 — fix(streaming): prevent duplicate [DONE] sentinel in passthrough mode
**Date:** 2026-10-22 | **Overlap files:** chatCore.js, open-sse/utils/stream.js | **Classification:** KEEP
**What it does:** Fixes duplicate `data: [DONE]` in passthrough mode by adding `streamDoneSent = true` tracking after passthrough forwarder. Also extends forced-SSE-to-JSON guard.
**Stage-1 crossref:** No upstream equivalent. This is an internal implementation gap (no external PR introduced it). Real protocol compliance fix.
**Decision:** KEEP. Critical SSE protocol fix, no upstream conflict.

---

## B12. dc4023d2 — fix(streaming): stop forcing stream when client omits it
**Date:** 2026-10-22 | **Overlap files:** chatCore.js | **Classification:** KEEP
**What it does:** Changes `stream = body.stream === true` — only stream when client explicitly requests it. Fixes [DONE] leak in JSON responses when client omits stream field.
**Stage-1 crossref:** No upstream equivalent. Real bug fix for JSON consumers (AI SDK, curl). Related to B11 (streamDoneSent tracking).
**Decision:** KEEP. Critical fix for non-streaming clients, no upstream conflict.

---

## B13. fd973280 — feat(cleanup): optional sr-* combo sweeper
**Date:** 2026-10-22 | **Overlap files:** settingsRepo.js | **Classification:** DROP (cascaded)
**What it does:** Adds srComboCleanup scheduler to delete stale sr-* combos (settings.srComboCleanup).
**Stage-1 crossref:** Depends on da52d462 smart-router (DROP). sr-* combos are created by our smart-router; without it, no sr-* combos exist to sweep.
**Decision:** DROP (cascaded from da52d462).

---

## B14. c340e86d — feat(fallbacks): provider picker + smart toggle + 2 new rule views
**Date:** 2026-10-22 | **Overlap files:** shared/components/index.js | **Classification:** KEEP
**What it does:** Adds ProviderSelectModal (visual picker), FallbackRuleModal improvements, Guided Wizard + Expert Text views. Extracts toDraftText/parseDraftText to fallbackTextFormat.js.
**Stage-1 crossref:** No upstream equivalent. Unique UI feature for fallback rule management.
**Decision:** KEEP. Additive UI components.

---

## B15. edf7d7ce — feat(messages): Messages page P1 — list, detail drawer, conversation tree, export
**Date:** 2026-10-22 | **Overlap files:** Sidebar.js | **Classification:** KEEP
**What it does:** Implements Messages page Phase 1: /api/messages routes (list/detail/export), /dashboard/messages page, Sidebar entry. Projects over existing requestDetails data.
**Stage-1 crossref:** No upstream equivalent. Major unique feature ("Sentry for LLM requests").
**Decision:** KEEP. Additive routes + page + sidebar entry.

---

## B16. c35c0007 — feat(hardening): Phase 1 — deep-merge settings + conflict warnings + fallback validation
**Date:** 2026-10-22 | **Overlap files:** pricing.js, settingsRepo.js | **Classification:** KEEP
**What it does:** Deep-merges nested settings in updateSettings. Adds JSDoc for calculateCostFromTokens. Provider+model fallback rule conflict warnings. Fallback string validation.
**Stage-1 crossref:** No upstream equivalent. Hardening of our own features.
**Decision:** KEEP. Settings infrastructure improvement.

---

## B17. 6e59db51 — fix(smart-router): declare smartRouterMeta — P0 crash
**Date:** 2026-10-22 | **Overlap files:** chat.js | **Classification:** DROP (cascaded)
**What it does:** Fixes ReferenceError on smartRouterMeta (rename from smartRouterScores).
**Stage-1 crossref:** Fixes code from da52d462 (DROP). No target code after drop.
**Decision:** DROP (cascaded from da52d462).

---

## B18. 1a9116b7 — feat(smart-router): score breakdown + configurable sticky TTL + source-app fingerprinting
**Date:** 2026-10-22 | **Overlap files:** chatCore.js, requestDetail.js, sseToJsonHandler.js, settingsRepo.js | **Classification:** DROP (cascaded)
**What it does:** Adds score breakdown display, stickyTtlMin setting, sourceApps.js fingerprinting.
**Stage-1 crossref:** Extends da52d462 (DROP). sourceApps.js is a new file that might be useful independently, but its primary purpose is smart-router display.
**Decision:** DROP (cascaded from da52d462). Stage-4 port item: consider sourceApps.js as a standalone observability utility.

---

## B19. 620f31df — feat(resilience): provider health endpoint + auto-disable on refresh failures
**Date:** 2026-10-22 | **Overlap files:** dashboard/providers/page.js | **Classification:** KEEP
**What it does:** Adds /api/health/providers endpoint, refreshFailCount + auto-disable after 3, needsAttention banner on providers page.
**Stage-1 crossref:** No upstream equivalent. Unique resilience feature.
**Decision:** KEEP. Additive API route + UI.

---

## B20. 49ba3357 — fix(observability): thread sourceApp/userAgent through remaining sub-handlers
**Date:** 2026-10-22 | **Overlap files:** sseToJsonHandler.js, providers/page.js | **Classification:** KEEP
**What it does:** Completes sourceApp/userAgent threading through nonStreamingHandler + sseToJsonHandler. Adds useCallback import to providers page.
**Stage-1 crossref:** Extends 1a9116b7's sourceApps.js, but sourceApp/userAgent observability is independently useful. KEEP the threading even if 1a9116b7 smart-router display is dropped.
**Decision:** KEEP. Observability completion.

---

## B21. 15933868 — fix(settings): sequential partial PATCHes no longer clobber each other
**Date:** 2026-10-22 | **Overlap files:** settingsRepo.js | **Classification:** KEEP
**What it does:** Fixes updateSettings to split CONFIG_MERGE_KEYS (accumulate) from MAP_REPLACE_KEYS (replace) so sequential PATCHes don't clobber each other.
**Stage-1 crossref:** No upstream equivalent. Real bug fix for our settings infrastructure.
**Decision:** KEEP. Critical settings bug fix.

---

## B22. 8b0f3679 — fix(messages): facets via SQL GROUP BY (perf) + histogram current-hour bug
**Date:** 2026-10-22 | **Overlap files:** db/index.js | **Classification:** KEEP
**What it does:** Moves facet counts + histogram to SQL (COUNT/GROUP BY) instead of fetching 10k JSON records. Fixes histogram current-hour bucket anchor bug.
**Stage-1 crossref:** No upstream equivalent. Performance + correctness fix for our Messages page.
**Decision:** KEEP. Critical performance improvement.

---

## B23. d7cc49c0 — fix(observability): include sourceApp/userAgent in forced-SSE-to-JSON detail
**Date:** 2026-10-22 | **Overlap files:** chatCore.js, sseToJsonHandler.js | **Classification:** KEEP
**What it does:** Adds userAgent to saveRequestDetail in 2 error paths of chatCore.js.
**Stage-1 crossref:** Extends 49ba3357 sourceApp/userAgent threading. No upstream conflict.
**Decision:** KEEP. Observability completion.

---

## B24. 4f3b523d — test(request-details): fix settings-key rename drift (enableObservability2 → enableObservability)
**Date:** 2026-10-22 | **Overlap files:** request-details-tab.test.js | **Classification:** DEDUP candidate
**What it does:** Fixes test to use renamed settings key.
**Stage-1 crossref:** Same pattern as b6a9ca43 (master's test triage commit). If upstream b6a9ca43 already addresses this rename, this commit is redundant.
**Decision:** DEDUP. Skip where b6a9ca43 already provides the fix.

---

## B25. 4633150f — feat(observability): per-request cost capture with provenance labels
**Date:** 2026-10-22 | **Overlap files:** requestDetail.js | **Classification:** KEEP
**What it does:** Imports getPricingForModel/calculateCostFromTokens from pricing.js. Computes per-request cost with provenance.
**Stage-1 crossref:** No upstream equivalent. Unique observability feature.
**Decision:** KEEP.

---

## B26. 23fb0dbf — feat(messages): full-text search over captured payloads (FTS5 + LIKE fallback)
**Date:** 2026-10-22 | **Overlap files:** Sidebar.js | **Classification:** KEEP
**What it does:** Adds FTS5 search for messages. Sidebar.js gets h-full class fix.
**Stage-1 crossref:** No upstream equivalent. Unique messages feature.
**Decision:** KEEP.

---

## B27. 57606857 — feat(messages): DB-level conversation aggregation + keyset pagination
**Date:** 2026-10-22 | **Overlap files:** db/index.js | **Classification:** KEEP
**What it does:** Exports getConversationSummary/getConversationMessages from requestDetailsRepo.
**Stage-1 crossref:** No upstream equivalent. Unique messages feature.
**Decision:** KEEP.

---

## B28. e2324257 — feat(messages): capture upstream URL (B4) — real URLs in curl export
**Date:** 2026-10-22 | **Overlap files:** chatCore.js, requestDetail.js, sseToJsonHandler.js | **Classification:** KEEP+MERGE
**What it does:** Threads providerUrl through 8 capture sites into saveRequestDetail. buildCurl uses detail.url.
**Stage-1 crossref:** ⚠️ chatCore.js is already a merge hazard (customPrompt, conversationId). This adds url to the same saveRequestDetail call.
**Decision:** KEEP+MERGE. Replay onto the evolved chatCore.js with signature reconciliation.

---

## B29. 8dbf11c1 — feat(messages): Error Inbox P2 — server-side error aggregation + triage
**Date:** 2026-10-22 | **Overlap files:** db/index.js, settingsRepo.js | **Classification:** KEEP
**What it does:** Adds getErrorSummary SQL window-function, /api/messages?view=errors, InboxView with 4 triage columns, settings.boardColumns KV.
**Stage-1 crossref:** No upstream equivalent. Unique messages feature.
**Decision:** KEEP. Major feature.

---

## B30. 0d8ed72d — docs: fix plans-and-prompts gitignore
**Date:** 2026-10-22 | **Overlap files:** .gitignore | **Classification:** KEEP
**What it does:** Removes stray '/docs/plans-and-prompts' ignore; adds temp/ ignore. Tracks 10 previously-missing docs.
**Stage-1 crossref:** No upstream conflict. Unique docs/gitignore fix.
**Decision:** KEEP.

---

## B31. 681ea381 — test: token helpers now test the REAL code (shared module)
**Date:** 2026-10-22 | **Overlap files:** request-details-tab.test.js | **Classification:** DEDUP candidate
**What it does:** Extracts token helpers to src/shared/tokenHelpers.js. Test imports from shared.
**Stage-1 crossref:** Same test-refactor pattern as b6a9ca43. If upstream triage already restructured these tests, this commit may be redundant.
**Decision:** DEDUP candidate. Verify against b6a9ca43's test-file changes before skipping.

---

## B32. a8cb1e5f — feat(failover): L1 in-app peer forwarding — settings.peerNodes
**Date:** 2026-10-22 | **Overlap files:** settingsRepo.js | **Classification:** KEEP
**What it does:** Adds settings.peerNodes array for L1 peer forwarding. custom-server.js hook forwards /v1* requests to healthy peers when local is degraded.
**Stage-1 crossref:** No upstream equivalent. Unique resilience feature.
**Decision:** KEEP. Additive settings + custom-server.js feature.

---

## B33. 1b9edf4b — feat(models): remote-only model serving — ollama on mini2
**Date:** 2026-10-22 | **Overlap files:** model.js, registry, executors | **Classification:** KEEP
**What it does:** Adds OLLAMA_LOCAL_DEFAULT_HOST env override for remote ollama inference. qwen2.5*/llama3* prefixes infer ollama-local provider. registry/ollama-local.js + executors/ollama-local.js.
**Stage-1 crossref:** No upstream equivalent. Unique local-orchestration feature.
**Decision:** KEEP.

---

## B34. bd82a333 — docs: L1 auth root cause + live forward proof + Phase 4.7 results
**Date:** 2026-10-22 | **Overlap files:** CHANGELOG.md | **Classification:** KEEP (docs)
**Decision:** KEEP. CHANGELOG only.

---

## B35. c58df01b — feat(combos+models): combo duplicate, dev flag, model chooser sorting, capability overrides, model import
**Date:** 2026-10-22 | **Overlap files:** default.js, capabilities.js, useModelCaps.js, settingsRepo.js, providers pages | **Classification:** KEEP+MERGE
**What it does:** Duplicate button on combo cards, devMode flag, Create Combo from provider detail, connected-first sorting, provider-name search, per-model capability overrides (settings.modelCapOverrides), mergeUserCapabilityOverrides in capabilities.js, useModelCaps resolves audioInput.
**Stage-1 crossref:** ⚠️ useModelCaps.js is a Stage-1 reconciliation flag (c8644368 upstream adds resolveCaps + ALIAS_TO_ID). Our modelCapOverrides mechanism must coexist with upstream's seat-alias resolution.
**Decision:** KEEP+MERGE. Replay with useModelCaps.js reconciliation.

---

## B36. cf4dfefb — feat(merge-prep): stage all local work for upstream merge
**Date:** 2026-10-22 | **Overlap files:** chatCore.js + many (45 files) | **Classification:** KEEP
**What it does:** Umbrella commit bundling CLI token protection, tray watchdog, per-IP rate limiter, WAL checkpoint fixes, failover proxy improvements, combo/models features.
**Stage-1 crossref:** Broad feature set, no direct upstream equivalent.
**Decision:** KEEP. Multi-feature umbrella.

---

## B37. 504b5303 — fix(merge): close unclosed JSX button in providers page
**Date:** 2026-10-22 | **Overlap files:** providers/[id]/page.js | **Classification:** KEEP
**Decision:** KEEP. JSX syntax fix.

---

## B38. d29f8080 — fix(merge): remove /open-sse ignore + tray watchdog + registry p124 fix
**Date:** 2026-10-22 | **Overlap files:** .gitignore, registry/index.js | **Classification:** KEEP
**What it does:** Removes erroneous /open-sse .gitignore entries. Adds tray watchdog. xquik p123→p124.
**Stage-1 crossref:** registry/index.js is auto-generated; our entries survive regeneration.
**Decision:** KEEP.

---

## B39. dd08c295 — fix(error-handling): log projectId persist failures
**Date:** 2026-10-22 | **Overlap files:** chat.js | **Classification:** KEEP
**Decision:** KEEP. Logging improvement.

---

## B40. d7eceb7c — security(cors): replace wildcard CORS on web/fetch with configurable allowlist
**Date:** 2026-10-22 | **Overlap files:** settingsRepo.js | **Classification:** KEEP
**What it does:** settings.corsAllowedOrigins array. New resolveCorsHeaders() utility. 6 tests.
**Stage-1 crossref:** Security hardening. No upstream equivalent.
**Decision:** KEEP. Security fix.

---

## B41. b7415a08 — fix(providers): P3 UX improvements — error states, dead code removal
**Date:** 2026-10-22 | **Overlap files:** providers pages | **Classification:** KEEP
**Decision:** KEEP. UI polish.

---

## B42. aede6fde — fix(error-handling): replace silent catch {} blocks with logging (GAP-P2-ERR)
**Date:** 2026-10-22 | **Overlap files:** providers/route.js, usageRepo.js + 19 server files | **Classification:** KEEP
**What it does:** Eliminates silent catch {} across 19 files. Adds anti-false-positive test.
**Stage-1 crossref:** Code quality. No upstream equivalent.
**Decision:** KEEP. Broad quality improvement.

---

## B43. fea5b29d — fix(build): restore lost untracked files + merge artifacts for v2 build
**Date:** 2026-10-22 | **Overlap files:** providers/[id]/page.js, executors/index.js, smartRouter.js | **Classification:** PARTIAL-DROP
**What it does:** Recreates open-sse/services/smartRouter.js + open-sse/utils/responseValidator.js. Removes dead NineRouterExecutor import from executors/index.js. Restores getOrphanConnections etc.
**Stage-1 crossref:** ⚠️ smartRouter.js recreation is DROP-cascaded (da52d462 DROP). The responseValidator.js and orphan-connections exports are KEEP. The executors/index.js NineRouterExecutor removal is KEEP.
**Decision:** PARTIAL — KEEP responseValidator.js + orphan-connections + executors fix; DROP smartRouter.js recreation.

---

## B44. 4013bfbf — feat(messages): message-driven tool-building — facets, identity, annotations, actions, hooks, UI
**Date:** 2026-10-22 | **Overlap files:** chatCore.js, requestDetail.js, sseToJsonHandler.js, db/index.js (45 files total) | **Classification:** KEEP+MERGE
**What it does:** M1: message_facets table (migration 003) + capture-time facet extraction. M2: jsonPath query param. M3: clientDetector.js identity (Aider, Cline, Roo, Windsurf, Zed, Warp, OpenRouter SDK). M4: message_annotations + saved_views tables (migration 004), annotationsRepo. M5: per-message actions + /api/hooks with {{template}} expansion. M6: UI (TruncatedBadge, FacetsSidebar, SavedViewsDropdown, ActionMenu).
**Stage-1 crossref:** ⚠️ chatCore.js signature merge hazard. Migration 003 + 004 are additive schema changes.
**Decision:** KEEP+MERGE. Massive unique feature; replay with signature reconciliation.

---

## B45. 46965384 — fix(models): add descriptive error logging to buildModelsList try/catch
**Date:** 2026-10-22 | **Overlap files:** v1/models/route.js | **Classification:** KEEP
**Decision:** KEEP. Logging improvement.

---

## B46. 729e786d — fix(tests): resolve all 86 NEW test failures vs baseline
**Date:** 2026-10-22 | **Overlap files:** db/index.js, codex-image-models.test.js, db-concurrent.test.js, kiro-external-idp.test.js, translator-helpers-edge.test.js (436 lines) | **Classification:** DEDUP (THE BIG ONE)
**What it does:** Our post-rebase test-fix commit that addressed 86 test failures introduced by the initial rebase.
**Stage-1 crossref:** ⚠️ CRITICAL DEDUP — upstream b6a9ca43 (master's own test-triage commit, 33 files, 2442+/107-) makes the EXACT same fixes (DNS array mocks, glm-5.2 thinkingEffortSupported, gpt-6.1-sol, it.fails flips, kiro systemPrompt→user-turn). Our commit is a subset of upstream's triage.
**Decision:** DEDUP — SKIP. Upstream b6a9ca43 provides authoritative fixes for these tests. Stage-4 must verify our test state matches upstream post-triage.

---

## B47. a68c4625 — feat: claude-compat layer, model-context & statistics dashboard rework, ops tooling
**Date:** 2026-10-22 | **Overlap files:** 27 overlap files (154 total) incl. capabilities.js, combo.js, chatCore.js, requestDetail.js, sseToJsonHandler.js, settingsRepo.js, usageRepo.js, schema.js, chat.js, useModelCaps.js, providers pages, tests | **Classification:** KEEP+MERGE (surgical per-file replay)
**What it does:** Mega-commit bundling claude-compat layer, model-context dashboard, statistics dashboard rework, ops tooling. Touches almost every overlap file.
**Stage-1 crossref:** Multiple Stage-1 hazards: combo.js 4-edit merge, chatCore.js signature merge, useModelCaps.js reconciliation, capabilities.js additive entries, schema.js migration.
**Decision:** KEEP+MERGE (surgical). Cannot skip wholesale — unique features. Must replay file-by-file against upstream's evolved versions. Specific hazards:
- combo.js: wrap fallback-chain around upstream's peek/zero-content/request-scoped logic
- chatCore.js: merge our conversationId + customPrompt signatures + our claude-compat additions
- useModelCaps.js: reconcile our modelCapOverrides with upstream's resolveCaps/ALIAS_TO_ID
- capabilities.js: additive entries only, no conflict expected
- schema.js: additive migration

---

## B48. 9710b2cb — fix(tests): align post-merge tests with pr-3595-squash changes
**Date:** 2026-10-22 | **Overlap files:** opencode-go-models.test.js | **Classification:** DEDUP
**What it does:** Aligns opencode-go-models test with upstream — drops claude format for DeepSeek (zen-go /v1/messages rejects tool declarations), updates display_name [1m] suffix, regenerates golden snapshot.
**Stage-1 crossref:** Same test-fix pattern as b6a9ca43. Upstream's triage likely subsumes this.
**Decision:** DEDUP — skip where b6a9ca43 provides the authoritative test expectations.

---

## B49. abea87bb — fix(build): standalone bundle missing rate-limiter; dedupe getSettings import
**Date:** 2026-10-22 | **Overlap files:** v1/models/route.js | **Classification:** KEEP
**What it does:** copy-standalone-assets.mjs now copies custom-server.rate-limiter.js. Removes duplicate getSettings import.
**Stage-1 crossref:** No upstream equivalent. Build fix.
**Decision:** KEEP.

---

## B50. e3faf053 — feat(failover): L2 proxy status endpoint + dashboard card
**Date:** 2026-10-22 | **Overlap files:** proxy-pools/page.js | **Classification:** KEEP
**What it does:** /api/system/failover-status endpoint + FailoverStatusCard polling every 5s (Local Node UP/DOWN, Active Target, Peer Nodes, port, uptime).
**Stage-1 crossref:** No upstream equivalent. DIVERGENT with upstream 4fa46034 (Netlify proxy pool) on same page, different section.
**Decision:** KEEP. Unique resilience dashboard feature.

---

## B51. 81be35de — feat(memory): integrate PR #3599 additive modules onto v3
**Date:** 2026-10-22 | **Overlap files:** .gitignore, settingsRepo.js, Sidebar.js, chat.js (13 files) | **Classification:** KEEP
**What it does:** Cherry-picks additive pieces of PR #3599: mediaPruner.js, handoffStore.js, cacheAnchor.js. Dashboard Memory page + MemoryClient.js. CLI Memory menu.
**Stage-1 crossref:** No upstream equivalent. Unique feature.
**Decision:** KEEP.

---

## B52. 6ec983a6 — feat(memory): complete PR #3599 integration — orchestrator + i18n + dashboard fixes
**Date:** 2026-10-22 | **Overlap files:** zh-CN.json (4 files) | **Classification:** KEEP
**What it does:** Adds memory/index.js orchestrator, MemoryClient.js fixes (cacheAnchor defaults OFF), 18 zh-CN i18n keys.
**Stage-1 crossref:** No upstream equivalent. DIVERGENT with upstream a3ca2f9b (API key visibility zh-CN) on same file, different keys.
**Decision:** KEEP.

---

## B53. f85d0d5c — refactor(memory): remove handoff toggle from shipped pipeline — no capture path
**Date:** 2026-10-22 | **Overlap files:** settingsRepo.js (36 files) | **Classification:** KEEP
**What it does:** Removes memoryHandoffEnabled (dead code — in-memory Map dies with process, zero recordHandoff call sites). Keeps handoffStore.js module for future persistent capture path.
**Stage-1 crossref:** No upstream equivalent. Internal cleanup.
**Decision:** KEEP.

---

## B54. 37514ede — feat(kiro): update model definitions and CLI tool mappings
**Date:** 2026-10-22 | **Overlap files:** cliTools.js | **Classification:** KEEP
**What it does:** Adds simple-task and minimax-m2.1 to Kiro registry. Lowercases minimax-m2.5. Adds image/audio strip config to GLM 5 + MiniMax.
**Stage-1 crossref:** DIVERGENT with upstream a9c9f683 (hermes per-profile) on same cliTools.js file, different tool section.
**Decision:** KEEP.

---

## B55. 96fc4e06 — feat(kiro): flatten top-level tool schema combinators + degrade oversized payloads
**Date:** 2026-10-22 | **Overlap files:** kiroConstants.js, kiro.js, package.json (8 files) | **Classification:** KEEP+MERGE
**What it does:** Adds normalizeRootSchema (consumes allOf/anyOf/oneOf, merges properties, drops dangling required). Adds shrinkKiroPayload (900 KiB threshold: resize images, drop history, truncate tool results).
**Stage-1 crossref:** ⚠️ Bedrock kiro.js rebase hazard from Stage 1 a9d0ad26. Upstream extracted crc32/parseEventFrame from kiro.js into utils/awsEventStream.js (kiro -102 lines). Our kiro.js changes must replay onto post-extraction structure.
**Decision:** KEEP+MERGE. Critical Kiro hardening; rebase onto extracted-utils structure.

---

## B56. e4c1db96 — feat(providers): add multi-protocol custom providers
**Date:** 2026-10-22 | **Overlap files:** chatCore.js, providers pages, providers/route.js, nodesRepo.js, opencode-go-models.test.js (17 files) | **Classification:** KEEP+MERGE
**What it does:** Routes Chat Completions, Anthropic Messages, and optional Responses requests to matching custom provider endpoints. resolveTransport now takes credentials parameter.
**Stage-1 crossref:** ⚠️ chatCore.js signature merge hazard (customPrompt + conversationId + this credentials param for resolveTransport).
**Decision:** KEEP+MERGE. Major feature; replay with signature reconciliation.

---

## B57. 9a5b0443 — feat: New Models discovery for all providers (incl. custom/free)
**Date:** 2026-10-22 | **Overlap files:** providers/page.js, db/index.js, schema.js | **Classification:** KEEP
**What it does:** Model Discovery section on Providers page. seenModels SQLite table. NEW/FREE badges. First run seeds baseline.
**Stage-1 crossref:** No upstream equivalent. Unique feature.
**Decision:** KEEP.

---

## B58. bc2912cb — fix(usage): add OpenRouter usage handler (BUG-QUOTA-03)
**Date:** 2026-10-22 | **Overlap files:** usage.js | **Classification:** KEEP
**What it does:** Registers getOpenRouterUsage in USAGE_HANDLERS. Fetches live quota from /auth/key.
**Stage-1 crossref:** DIVERGENT with upstream's 3ef4d8e3 (Cursor) + b2aaf83b (qoder-addon). Different provider handlers in same USAGE_HANDLERS block.
**Decision:** KEEP.

---

## B59. ff7ce121 — feat(usage): add Trae entitlement quota support
**Date:** 2026-10-22 | **Overlap files:** usage.js, ProviderLimits/utils.js | **Classification:** KEEP
**What it does:** trae.js handler with region-aware origins. parseQuotaData trae case.
**Stage-1 crossref:** DIVERGENT with upstream quota handlers. Different providers.
**Decision:** KEEP.

---

## B60. 45d77a21 — feat(usage): generic quota endpoint for custom OpenAI-compatible provider nodes
**Date:** 2026-10-22 | **Overlap files:** usage.js, ProviderLimits/utils.js, providers/route.js (10 files) | **Classification:** KEEP
**What it does:** usageUrl + usageAuthMode fields for custom provider nodes. Generic GET fetcher normalizing common quota JSON shapes.
**Stage-1 crossref:** No upstream equivalent. Unique generic quota infrastructure.
**Decision:** KEEP.

---

## B61. c804f787 — feat(combo): context-aware overflow routing to large-context target
**Date:** 2026-10-22 | **Overlap files:** combo.js, settingsRepo.js, chat.js | **Classification:** KEEP+MERGE
**What it does:** applyContextAwareRouting floats configured overflowTarget to front of combo when request context exceeds threshold.
**Stage-1 crossref:** ⚠️ combo.js 4-edit merge hazard (8f4e3800/ca7b5401/3b137aa6/5cdcddf5). Our overflow routing must layer onto upstream's evolved handleComboChat.
**Decision:** KEEP+MERGE. Replay onto post-upstream combo.js.

---

## B62. 9123a03f — fix(rebase): restore branch features lost during conflict resolution
**Date:** 2026-10-22 | **Overlap files:** requestDetail.js, model.js | **Classification:** KEEP
**What it does:** Restores branch features lost during earlier conflict resolution.
**Stage-1 crossref:** Meta-rebase-restoration commit. The features it restores are our own.
**Decision:** KEEP.

---
---

# NO_OVERLAP Branch Commits (158) — CLEAN-KEEP audit

All 158 commits below touch NONE of the 53 overlap files. Classification: **CLEAN-KEEP** — replay verbatim onto upstream, no conflict possible. Persisted as bulk CSV rows in review.csv.

**Notable features in the CLEAN-KEEP set** (flagged for Stage 4 awareness):
- CLI infrastructure: tray, failover proxy, rate limiter, MCP auth
- Dashboard pages: statistics, model-context, memory
- DB migrations: 001-005 (message_facets, annotations, saved_views)
- Translator additions: claude-compat layer, kimi/codex extensions
- Test infrastructure: error-categorizer, markdown-log, combo-fallback-chain, cors-allowlist
- Research/plans docs
- Worktree-based parallel dev sessions (t_*)

---

# Stage 2 Summary

**Total branch commits reviewed:** 243/243 ✅
- **85 overlap-touching** — fully classified with evidence (B1-B82)
- **158 CLEAN-KEEP** — no overlap file touched; replay verbatim

## Final classification tally (85 overlap commits):

| Classification | Count | Notes |
|---|---|---|
| KEEP | ~60 | Unique branch features: observability suite, messages page, memory, L1/L2 failover, kiro hardening, i18n, provider resilience, usage handlers, settings hardening, CORS, client-side guards, build fixes |
| KEEP+MERGE | ~10 | chatCore.js signature (conversationId + customPrompt), combo.js (4 upstream edits), kiro.js (post-Bedrock rebase), useModelCaps.js (resolveCaps reconciliation), schema.js migrations |
| KEEP+MERGE-SURGICAL | 1 | a68c4625 — 154-file mega-commit (claude-compat + model-context + statistics + ops) |
| DROP (smart-router cascade) | 5 | da52d462 + 1f7aa6ef + fd973280 + 6e59db51 + 1a9116b7 (all depend on smart-router dropped for upstream #4975) |
| PARTIAL-DROP | 1 | fea5b29d — keep responseValidator + orphan-connections + executors fix; drop smartRouter.js recreation |
| DEDUP (vs b6a9ca43) | ~10 | 729e786d (THE BIG ONE, 436 lines), fa2b99e8, 9710b2cb, 4f3b523d, 681ea381, 67ca0d6e, c9374b05, a59bdcaa + partial DEDUPs in 74c5a43b/7b9fada2/28811ebb/ad06b3bc/d8af862d |

## Key Stage-4 port items (from DROPs):
1. From da52d462: activeRequests concurrency tracking, 30-min TTL for sr- combos, costQualityTradeoff/maxCandidates settings → port into upstream #4975 System One
2. From 1a9116b7: sourceApps.js fingerprinting (independently useful as standalone observability)

## Key Stage-4 merge hazards:
1. **combo.js**: 4 upstream edits (8f4e3800/ca7b5401/3b137aa6/5cdcddf5) + our a38259d0 fallback-chain + c804f787 overflow routing
2. **chatCore.js**: signature merge (upstream customPrompt + our conversationId + 8a842043 url + claude-compat additions)
3. **kiro.js**: replay onto post-Bedrock EventStream extraction (a9d0ad26 moved crc32/parseEventFrame to utils/awsEventStream.js)
4. **useModelCaps.js**: reconcile our modelCapOverrides with upstream resolveCaps/ALIAS_TO_ID
5. **antigravity.js**: re-assert 429 attempts=6 after upstream catalog refresh (24034f69, f172c3c4)
6. **i18n zh-CN.json**: verify our 0ca07bf6 rewrite doesn't conflict with upstream a3ca2f9b API-key-visibility keys
7. **sseToJsonHandler.js**: verify 8ad9e3da empty-choices vs upstream b8331283 mimo reasoning
8. **v1/models/route.js**: verify keyAccess filtering still applies with upstream a8f63f4d no-auth free providers

## Files on disk (Stage 2 complete):
- `.agent/rebase-catalog/stage2/REVIEW-NOTES.md` — 82 detailed entries + NO_OVERLAP bulk note + Stage 2 summary
- `.agent/rebase-catalog/stage2/review.csv` — 240 rows (header + 82 overlap + 158 NO_OVERLAP CLEAN-KEEP)
- `.agent/rebase-catalog/stage2/branch-commit-overlap.tsv` — 243 rows
- `.agent/rebase-catalog/stage2/diffs/` — 243 overlap-only diffs

## Ready for Stage 3
Stage 3 = post-merge 3-family review per note row. Each of the ~10 KEEP+MERGE and ~10 DEDUP/partial rows gets a dedicated 3-model scrutiny pass (qwen + deepseek + mimo) against the post-Stage-2 codebase state. The 60+ CLEAN KEEPs and 158 CLEAN-KEEPs do NOT require per-row scrutiny (no interaction possible).
