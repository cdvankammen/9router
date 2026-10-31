# PR-Ready Inventory — v5-vscode-works Rebase Campaign

**Date:** 2026-10-31
**Branch:** `v5-vscode-works` @ `b7b5b6b2`
**Fork:** `fork/v5-vscode-works` (pushed)
**Pre-rebase baseline:** `07c16dab` (v5-vscode-works-pre-rebase-20261030)
**Campaign rounds:** 29 (100% complete — 0 behind origin/master)

## Commit Totals

| Metric | Count |
|--------|-------|
| Commits ahead of `origin/master` | **1967** |
| Commits ahead of pre-rebase baseline `07c16dab` | **1486** |
| Upstream commits carried from `origin/master` | **1436** |
| Rebase-repair specific commits (our merge work) | **40** |
| Upstream PRs absorbed (unique) | **34** |
| Locked multi-model verdicts | **8** |
| Stage-3 scrutiny-queue items (KEEP+MERGE) | **15** |

### Our Commit Breakdown by Prefix

| Prefix | Count | Description |
|--------|-------|-------------|
| `fix(security)` | 88 | Security hardening across routes |
| `docs(security)` | 61 | Security audit documentation |
| `feat(providers)` | 32 | Provider registry + feature additions |
| `fix(translator)` | 31 | Translator engine fixes |
| `fix(kiro)` | 27 | Kiro provider-specific fixes |
| `refactor(open-sse)` | 25 | Routing engine refactors |
| `fix(usage)` | 24 | Usage tracking corrections |
| `fix(antigravity)` | 23 | Antigravity provider fixes |
| `fix(codex)` | 20 | Codex provider fixes |
| `fix(claude)` | 20 | Claude provider fixes |
| `fix(opencode)` | 18 | OpenCode provider fixes |
| `docs(rebase-repair)` | 18 | Rebase tracking docs |
| `fix(rebase-repair)` | 17 | Rebase merge corrections |
| `feat(usage)` | 17 | Usage tracking features |
| `docs(changelog)` | 17 | CHANGELOG updates |
| `fix(tests)` | 16 | Test harness fixes |
| `feat(cli-tools)` | 15 | CLI tools features |
| `fix(ui)` | 13 | Dashboard UI fixes |
| `fix(providers)` | 13 | Provider fixes |
| `fix(gemini)` | 13 | Gemini provider fixes |
| `fix(dashboard)` | 13 | Dashboard fixes |
| `feat(antigravity)` | 13 | Antigravity features |

---

## Section 1: Upstream PRs Absorbed (34 PRs)

These upstream pull requests were merged into `origin/master` during the campaign window and are now carried on our branch.

### New Providers & Integrations

| PR | Title | Author | Scope |
|----|-------|--------|-------|
| **#4157** | feat(bedrock): AWS Bedrock provider with AWS SSO | amirsalaar | 31 files, 12 commits. Real AWS SSO (not pasted IAM keys). Static + profile credential modes. Extracts `crc32` + `parseEventFrame` from kiro.js → `utils/awsEventStream.js` |
| **#4537** | feat(elevenlabs): Scribe STT provider | — | ElevenLabs Scribe speech-to-text integration |
| **#4763** | feat(cli-tools): Hermes audio transcription via 9router | — | Hermes card STT toggle + model picker |
| **#4770** | fix(nous): API-key attribution tags | — | Nous Research attribution-tag preservation in default.js executor |
| **#4793** | fix(github-copilot): embeddings endpoint | — | GitHub Copilot embeddings route corrections |
| **#4816** | feat(antigravity): Argon tiers | — | Antigravity Argon model tier additions |
| **#4821** | fix(vertex): API key location | — | Vertex provider API key path correction |
| **#5026** | fix(ollama): balance | — | Ollama load balancing corrections |

### Translator & Protocol

| PR | Title | Scope |
|----|-------|-------|
| **#4532** | fix(gemini): duplicate toolCallIds | Prevents duplicate tool call IDs in Gemini responses |
| **#4620** | fix(gemini): properties param | Gemini function-calling properties parameter fix |
| **#4789** | fix(translator): Claude messages for forced SSE JSON | `openAICompletionToClaudeMessage` branch in `handleForcedSSEToJson` |
| **#4981** | fix(image): ref inputs MITM | Image generation reference inputs through MITM proxy |
| **#4992** | fix(passthrough): toolCall ID | Preserves tool call IDs in passthrough mode |

### Capabilities & Model Catalog

| PR | Title | Scope |
|----|-------|-------|
| **#4544** | fix(glm): context window 1M | GLM-5.2/5.3 pattern table `contextWindow: 1000000` (was 200k) |
| **#4656** | fix(capabilities): GLM-5.3 thinkingCanDisable | Prevents z.ai 400 code 1210 when disabling thinking |
| **#4727** | fix(opencode-go): claude-haiku-5-5 adaptive thinking | 7 cascading defects fixed: wrong endpoint, thinking shape, context window, blank thinking blocks, context_management field, limits, dashboard shadow rows. Provider-scoped overrides for opencode-go + commandcode |
| **#4761** | fix(capabilities): Claude PDF input | `pdf: true` across ~15 Claude MODEL_CAPABILITIES entries |
| **#4802** | fix(gemini): drop sampling params, functionResponse-last | Gemini 4 ordering + parameter corrections |
| **#4805** | fix(opencode): reasoning placeholder | OpenCode reasoning placeholder handling |

### Combo & Routing

| PR | Title | Scope |
|----|-------|-------|
| **#4659** | fix(combo): picker shows compatible nodes without connection | `ModelSelectModal` includes `openai-compatible-*` / `anthropic-compatible-*` provider aliases. Fixes #4177, #2113, #2119, #1988 |
| **#4750** | fix(combo): zero-content fallback | `isZeroContentResponse()` + JSON peek before accepting HTTP 200 on non-final seat. Falls through on empty body / `in_progress` finish_reason / 0 token usage |
| **#4975** | feat(combos): System One smart router | **REPLACES our `da52d462` smart-router.** 4th combo strategy `smart`, 4 policies (Smart Switch/Strict Lock/Per-Turn/Custom Threshold), 2-hour stickiness, fail-open, 19 tests, SmartPolicyModal UI. By miqonee. Closes #4126, #2852, #3410 |

### Cursor IDE

| PR | Title | Scope |
|----|-------|-------|
| **#4689** | feat(usage): Cursor IDE quota via DashboardService | `getCursorUsage` + `cursor:` handler in `USAGE_HANDLERS` |
| **#4690** | fix(cursor): empty turn recovery | Cursor empty turn recovery logic |
| **#4692** | fix(cursor): auto model resolution | Cursor automatic model resolution |
| **#4694** | test(cursor): KV metadata tests | Cursor key-value metadata test coverage |
| **#4696** | fix(cursor): hold strictProxy on AgentService h2 path | `proxyPoolId` + `strictProxy` passthrough in chatCore.js |

### Quota & Usage

| PR | Title | Scope |
|----|-------|-------|
| **#4758** | fix(qoder): add-on quota tracking | `addOn` bucket in `parseQuotaData` for qoder/qoder-cn |
| **#4848** | feat(quota): anchored auto-ping schedule | Fixed local-time auto-ping schedule |

### CLI & Dashboard

| PR | Title | Scope |
|----|-------|-------|
| **#4660** | feat(hermes): per-profile configuration | Hermes per-profile config in cliTools.js |
| **#4780** | fix(opencode): session inverted timestamp | OpenCode session timestamp ordering |
| **#4784** | fix(opencode): zen free tier identity | OpenCode Zen free-tier identity corrections |
| **#4842** | fix(opencode): free tier to /inference/v1 with v2 fingerprint | `OPENCODE_FINGERPRINT_TOOLS` gate + v2 client fingerprint |
| **#4855** | fix(headroom): false compression warnings | Prevents false warnings when tools dominate body |

---

## Section 2: Our Code — KEPT (Unique Features)

These branch commits have no upstream equivalent and were preserved verbatim.

### Observability & Error Tracking

| Commit | Description |
|--------|-------------|
| **B8** `c49a64eb` | `categorizeError` import + `errorCategorizer.js` utility. Status+text → category mapping. Attaches `errorCategory` to `requestDetail` |
| **B9** `f050d4b7` | Forward `errorCategory` through `buildRequestDetail` pipeline |
| **B20** `49ba3357` | Thread `sourceApp`/`userAgent` through `nonStreamingHandler` + `sseToJsonHandler` |
| **B23** `d7cc49c0` | Include `sourceApp`/`userAgent` in forced-SSE-to-JSON detail |
| **B25** `4633150f` | Per-request cost capture with provenance labels (`getPricingForModel`/`calculateCostFromTokens`) |

### Streaming & Protocol

| Commit | Description |
|--------|-------------|
| **B11** `b12b2244` | Prevent duplicate `[DONE]` sentinel in passthrough mode (`streamDoneSent` tracking) |
| **B12** `dc4023d2` | Stop forcing stream when client omits it (`stream = body.stream === true`) |

### Messages Page (Major Feature — "Sentry for LLM requests")

| Commit | Description |
|--------|-------------|
| **B15** `edf7d7ce` | Phase 1: `/api/messages` routes (list/detail/export), `/dashboard/messages` page, Sidebar entry |
| **B22** `8b0f3679` | Facets via SQL GROUP BY (perf) + histogram current-hour anchor bug fix |
| **B26** `23fb0dbf` | Full-text search over captured payloads (FTS5 + LIKE fallback) |
| **B27** `57606857` | DB-level conversation aggregation + keyset pagination |
| **B29** `8dbf11c1` | Error Inbox P2: server-side error aggregation + triage (4 columns, `settings.boardColumns` KV) |

### Fallback & Resilience

| Commit | Description |
|--------|-------------|
| **B14** `c340e86d` | Provider picker + smart toggle + 2 new rule views (Guided Wizard + Expert Text). `ProviderSelectModal`, `FallbackRuleModal`, `toDraftText`/`parseDraftText` |
| **B19** `620f31df` | Provider health endpoint (`/api/health/providers`) + auto-disable after 3 refresh failures + needsAttention banner |
| **B32** `a8cb1e5f` | L1 in-app peer forwarding (`settings.peerNodes`). `custom-server.js` forwards `/v1*` to healthy peers when local is degraded |

### Settings Infrastructure

| Commit | Description |
|--------|-------------|
| **B16** `c35c0007` | Phase 1 hardening: deep-merge nested settings + conflict warnings + fallback rule validation |
| **B21** `15933868` | Sequential partial PATCHes no longer clobber each other (`CONFIG_MERGE_KEYS` accumulate vs `MAP_REPLACE_KEYS` replace) |

### Local Orchestration

| Commit | Description |
|--------|-------------|
| **B33** `1b9edf4b` | Remote-only model serving: `OLLAMA_LOCAL_DEFAULT_HOST` env override for remote ollama inference on mini2. `qwen2.5*`/`llama3*` prefixes → ollama-local provider |

### Docs & Cleanup

| Commit | Description |
|--------|-------------|
| **B30** `0d8ed72d` | Fix `.gitignore` — remove stray `/docs/plans-and-prompts` ignore, add `temp/` ignore |
| **B34** `bd82a333` | L1 auth root cause + live forward proof + Phase 4.7 results (CHANGELOG) |

---

## Section 3: Our Code — DROPPED (Superseded by Upstream)

These branch commits were dropped because upstream implemented the same feature better.

### Smart Router (da52d462 + cascaded fixes)

**Verdict:** `verdicts/da52d462-vs-4975.md` — 3/3 model families (MiMo 2.6, DeepSeek V4, Qwen 3.5 Plus Thinking) unanimously PREFER_UPSTREAM.

| Commit | What it did | Why dropped |
|--------|-------------|-------------|
| **da52d462** | Smart router: pre-combo interception, dynamic `sr-*` combos, 30-min TTL, session stickiness | Upstream #4975 is production-grade: 19 tests, SmartPolicyModal UI, 4 adaptive policies, fail-open, live cluster verification across 6 models |
| **B10** `1f7aa6ef` | 4 real bugs in smart-router (enumeration, combo-reuse crash, sticky-session corruption, first-resolve crash) | No target code after da52d462 drop |
| **B13** `fd973280` | `sr-*` combo sweeper scheduler | No `sr-*` combos exist without smart-router |
| **B17** `6e59db51` | Declare `smartRouterMeta` — P0 crash fix | No target code |
| **B18** `1a9116b7` | Score breakdown + configurable sticky TTL + source-app fingerprinting | Primary purpose is smart-router display |

### Port Items (from dropped code → upstream's #4975)

1. **`activeRequests` Map concurrency tracking** — real-time load spike handling (all 3 models recommend)
2. **30-min dynamic TTL for `sr-*` combos** — complements upstream's 2-hour stickiness
3. **`costQualityTradeoff` + `maxCandidates` settings** — granular cost tuning if upstream's policies lack it

---

## Section 4: Our Code — KEPT+MERGED (Reconciled with Upstream)

These branch commits were preserved but required careful merging with upstream changes in the same files.

### Locked Verdicts (8 files in `verdicts/`)

| Verdict | Our Commit | Upstream Conflict | Resolution |
|---------|-----------|-------------------|------------|
| **a38259d0-combo-fallback-chain.md** | `a38259d0` — fallbackChain[] observability | 4 upstream combo.js edits (8f4e3800/ca7b5401/3b137aa6/5cdcddf5) | 5-step merge: upstream first (zero-content → capability-aware → peek → overflow), ours last (append tracker) |
| **96fc4e06-kiro-combinators.md** | `96fc4e06` — kiro tool schema flatten + oversize degradation | a9d0ad26 Bedrock extraction (response-side) | Orthogonal: our request-side hardening vs upstream response-side parsing. Replay onto post-extraction kiro.js |
| **af09eecf-chatcore-signature.md** | `af09eecf` — `conversationId` parameter in chatCore.js signature | 8a842043 `customPrompt` parameter | 6-step merge: both parameters coexist in chatCore.js signature, threaded independently through 5 sub-modules |
| **c58df01b-usemodelcaps.md** | `c58df01b` — combo duplicate + modelCapOverrides | c8644368 `resolveCaps` + `ALIAS_TO_ID` | `modelCapOverrides` + `resolveCaps` coexist in useModelCaps.js |
| **2b63e0dd-vs-b6a9ca43.md** | `2b63e0dd` — 40 test regression fixes (436 lines) | b6a9ca43 upstream test triage | **DEDUP DISPROVEN.** 13 of 14 unique production-fix patterns have ZERO matches in upstream. Replay in full |
| **v3-orphaned-commits-final.md** | 57 v3 commits | — | Classified individually (KEEP/DROP/PORT) |
| **fea5b29d-keep-confirmation.md** | `fea5b29d` | — | KEEP confirmation |
| **(implicit)** | `e2324257` — capture upstream URL in messages | chatCore.js signature hazard | KEEP+MERGE onto evolved chatCore.js |

### Stage-3 Scrutiny Queue (15 items)

| Commit | Feature | Merge Hazard | Status |
|--------|---------|--------------|--------|
| `af09eecf` | conversationId tracking | chatCore.js signature | KEEP+MERGE |
| `2c008011` | smart router taskType in usageHistory | depends on dropped da52d462 | KEEP+MERGE+ADAPT |
| `a38259d0` | combo fallback chain | combo.js 4 upstream edits | KEEP+MERGE |
| `e2324257` | capture upstream URL (B4) | chatCore.js signature | KEEP+MERGE |
| `681ea381` | token helpers shared module | test file overlap only | REPLAY |
| `c58df01b` | combo duplicate + model caps | useModelCaps.js reconciliation | KEEP+MERGE |
| `4013bfbf` | message-driven tool-building (45 files) | chatCore signature | KEEP+MERGE |
| `729e786d` | resolve 86 NEW test failures | 6 test files overlap b6a9ca43 | REPLAY |
| `a68c4625` | claude-compat layer + dashboard rework (154 files) | multiple Stage-1 hazards | KEEP+MERGE-SURGICAL |
| `96fc4e06` | kiro schema flatten | Bedrock kiro.js rebase | KEEP+MERGE |
| `e4c1db96` | multi-protocol custom providers | chatCore signature | KEEP+MERGE |
| `c804f787` | context-aware overflow routing | combo.js 4-edit hazard | KEEP+MERGE |
| `2b63e0dd` | restore ~40 test regressions | DEDUP disproven | REPLAY |
| `fa2b99e8` | resolve 13 post-rebase regressions | capabilities.js + 5 tests | REPLAY |
| `5cc2b724` | request-details-tab flush + ATTACH | critical DB infra | KEEP+MERGE |

---

## Section 5: Post-Rebase Fixes (Round 28)

After the 29-round rebase was complete, 12 pre-existing test failures were surgically fixed.

| Commit | Fix |
|--------|-----|
| `5c7caed9` | **Translator:** flatten text-only content arrays in `filterToOpenAIFormat` + NDJSON auto-detect in `parseSSELine` |
| `f92cc6d4` | **Translator:** remove top-level `systemPrompt` from kiro payload + streaming tool sanitization in `openai-to-claude.js` |
| `d7a29d55` | **Combo + Headroom:** `reorderByCapabilities` reference stability + bad-request hard-stop in combo.js; reasoning-skip for visible summary arrays in `rtk/headroom.js` |
| `87786881` | **ProxyFetch:** route proxy-aware hosts before TLS default-deny check + combo bad-request + key-access backup name prefix match |
| `ccd45f12` | **Baseline:** reconcile `known-fails.txt` for round 28 (remove 12 fixed entries) |

### Current known-fails.txt (13 entries remaining)

| Test | Reason | Fix Required |
|------|--------|--------------|
| `claude-header-forwarding.test.js` (1 test) | `gotScraping` deliberately disabled in proxyFetch.js | Re-enable gotScraping to fix |
| `oauth-cursor-auto-import.test.js` (8 tests) | macOS Cursor DB paths don't exist in CI | Requires Cursor installation |
| `mimo-free.live.test.js` (1 test) | Live call — upstream now answers "Unsupported model mimo-auto" | Update test or provider catalog |
| `db-benchmark.test.js` (suite) | Benchmarks lowdb (removed in bee8dad9) | Suite cannot load |
| `embeddings.cloud.test.js` (suite) | Imports `cloud/` worker (not in this repo) | Suite cannot load |
| `memory-enhancements.test.js` (suite) | Imports missing memory-enhancements module | Suite cannot load |

---

## Section 6: What Wasn't Done (Deferred)

| Item | Status | Notes |
|------|--------|-------|
| Upstream security PR to `decolua/9router` | **Deferred** | Requires explicit operator direction. 88 `fix(security)` + 61 `docs(security)` commits contain findings |
| `gotScraping` TLS fingerprinting re-enable | **Deferred** | Deliberately disabled; test expects the disabled feature |
| Port items from dropped smart-router | **Deferred** | `activeRequests` concurrency tracking, 30-min TTL, `costQualityTradeoff`/`maxCandidates` — to be ported into upstream's #4975 System One |
| `sourceApps.js` standalone extraction | **Deferred** | Was part of dropped B18; potentially useful as independent observability utility |

---

## Section 7: Regression Baseline

**Pre-rebase:** ~938 pass, ~64 fail
**Post-rebase (current):** 13 known failures catalogued in `tests/__baseline__/known-fails.txt`
**Regressions introduced by rebase:** **0** (verified by `verify-no-regression.mjs`)

### Test Harness

- vitest 4.1.11, run from `tests/` via `npx vitest run`
- Independent ESM package (not wired into root `npm test`)
- `tests/__baseline__/verify-no-regression.mjs` compares vitest JSON output against `known-fails.txt`

---

## Section 8: Fleet Deployment Status

| Host | Status | Skill Lines | Build |
|------|--------|-------------|-------|
| mini | ✅ UP | 806 | — |
| mini2 | ✅ UP | 806 | absorbed mini5 IPs |
| mini3 | ✅ UP | 806 | — |
| mini4 | ✅ UP | 806 | `vJKp96vZb0vcmxw1kIaZc` (production) |
| cmox | ✅ UP | 806 | — |
| nmox | ✅ UP | 806 | was EHOSTDOWN, recovered |
| pmox | ✅ UP | 806 | was EHOSTDOWN, recovered |
| ~~mini5~~ | DECOMMISSIONED | N/A | IPs reassigned to mini2 |

**Skill:** `cdvankammen/rebase-campaign.git` @ `01aaae0` (806 lines)
**Deployed:** 7/7 hosts × 4 directories = **28 deployments**
**Directories:** `~/.agents/skills`, `~/.hermes/skills`, `~/.copilot/skills`, `~/.claude/skills`

---

## Section 9: Honesty Corrections

| Commit | Correction |
|--------|------------|
| `29779ca9` | Corrected tracking doc for commit `87786881` — message said "proxyFetch" but content was combo+key-access |
| `f02c4c3a` | Documented nmox+pmox EHOSTDOWN diagnosis (not silently ignored) |
| `4c7d9d36` | Documented worktree cleanup — 27 worktrees, ~5.5G reclaimed |
| `b7b5b6b2` | Fleet closure — 7/7 at 806 lines confirmed |

---

## Appendix A: Catalog Structure

```
.agent/rebase-catalog/
├── upstream-106.csv          # 106 upstream commits (SHA/date/author/subject)
├── branch-243.csv            # 243 branch commits
├── upstream-pr-map.csv       # upstream SHA → PR number mapping
├── unique-prs.txt            # 34 unique PR numbers
├── prs/                      # 34 PR-specific markdown files
├── verdicts/                 # 8 locked multi-model verdicts
├── stage1/                   # upstream commit analysis
│   ├── REVIEW-NOTES.md       # 36 classifications (CLEAN/ADDITIVE/DIVERGENT/TAKE-UPSTREAM/MISSING-ON-BRANCH)
│   ├── review.csv
│   ├── diffs/                # 106 upstream commit diffs
│   └── upstream-commit-overlap.tsv
├── stage2/                   # branch commit analysis
│   ├── REVIEW-NOTES.md       # 35 classifications (KEEP/KEEP+MERGE/DROP/DEDUP/PORT/CLEAN-KEEP)
│   ├── review.csv
│   ├── diffs/                # 243 branch commit diffs
│   └── branch-commit-overlap.tsv
├── stage3/
│   └── scrutiny-queue.csv    # 15 merge-hazard items
└── commit-bodies/            # 106 commit body text files
```

## Appendix B: Key Commit Chain (most recent first)

```
b7b5b6b2 docs: fleet closure — nmox + pmox back online, 7/7 at 806 lines
4c7d9d36 docs: post-campaign worktree cleanup — 27 worktrees, ~5.5G reclaimed
f02c4c3a docs: nmox + pmox confirmed DOWN (EHOSTDOWN)
29779ca9 docs: correct round 28 tracking — remove false proxyFetch claim
ccd45f12 fix(baseline): reconcile known-fails.txt for round 28
89c0a0ab docs(rebase-repair): round 28 — proxyFetch routing + known-fails reconciliation
87786881 fix(proxyFetch): combo bad-request + key-access backup name
d7a29d55 fix(combo+headroom): reorderByCapabilities reference stability + reasoning-skip
f92cc6d4 fix(translator): kiro systemPrompt + claude streaming tool sanitization
5c7caed9 fix(translator): flatten text-only content arrays + NDJSON auto-detect
```

---

*Generated 2026-10-31. Campaign complete. Branch `v5-vscode-works` is PR-ready.*
