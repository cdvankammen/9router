# Master Continuation Plan — 9Router

**Date:** 2026-08-19 (created) → 2026-08-29 (updated)
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #plan #continuation #master #exhaustive

---

## What This Document Is

This is the **single source of truth** for where the 9Router project stands, what's been done, what's left, and what's currently unfinished. It was produced by exhaustive reads of every file in `docs/plans-and-prompts/` (60+ files, ~30,000 lines), git history (122 commits on v1, 27,518 insertions), recovered chat logs, and GitHub PRs/issues.

---

## 1. Project State (as of 2026-08-29)

### Deployment

| Machine | Port | Status | Version | Providers |
|---------|------|--------|---------|-----------|
| mini2 (Tailscale 100.96.109.61) | 20128 | ✅ Running | v0.5.50 | 2 (openai-compat, openrouter) |
| mini (LAN 10.2.0.22) | 20130 | ✅ Running | v0.5.50 | 2 (openai-compat, openrouter) |
| mini3 (Tailscale 100.74.34.82) | 20128 | ✅ Running | v0.5.50 | 2 (openai-compat, openrouter) |

### Branch / Repo

- **Branch:** `v1` (local only, not pushed)
- **Commits:** 122 on v1 vs master
- **Files changed:** 205 files, +27,518 lines
- **Author:** cdvankammen (all commits)
- **Test suite:** 1811 pass / 86 fail (baseline ≤89, 0 new regressions)

---

## 2. What's DONE (shipped on v1)

### Smart Router (ADR-001)
- Pre-combo interception in `chat.js` (commit `9f4c1631`)
- Dynamic `sr-*` combo creation + sticky sessions (5-min TTL)
- Task-type scoring + `meta.taskType` metrics
- `allowedModels` wildcard subset
- Custom provider node support (`getNodeModels` 5-min cache)
- 4 E2E-caught bugs fixed
- Optional sr-* cleanup scheduler (OFF by default, 13 tests)
- Smart Router config card UI

### Observability Suite (ADR-002/003/005/008)
- Schema v2: conversationId + indexes
- Export endpoint JSON+markdown
- Conversation filter + column UI
- Combo fallback chain logging
- AI Error Analyst (`POST /api/analyze-error`)
- Markdown auto-flush `~/.9router/logs/YYYY-MM-DD.md`
- Error categorization engine + pipeline fix
- `[DONE]` SSE duplicate fix (passthrough)
- sourceApp/userAgent end-to-end persistence
- Provider-page error panel + per-model error chip (System B)
- Provider usage/cost card
- `include_usage` guard on `DefaultExecutor`
- OpenRouter added to quota tracker
- Per-model capability overrides (vision/audio)
- Per-request cost capture with provenance labels
- Full-text search FTS5 + LIKE fallback
- DB-level conversation aggregation (B3 fix) + keyset pagination
- B4 upstream URL capture
- Error Inbox P2 server-side fingerprint triage

### Fallback Rules UX (ADR-004/006)
- Per-model/per-provider fallbacks backend
- Retries: `retriesPerModel` + `perModelRetries`
- 5-view rule manager: Table, Chain Flow, Simple+Advanced, Guided Wizard, Expert Text
- ProviderSelectModal (visual provider picker)
- Drag-and-drop in FallbackRuleModal
- Live drop indicator bar (dnd-kit coordinate fix)
- `fallbackTextFormat` lib + 13 tests

### Messages Page
- P1: 3 API routes + page + sidebar entry
- Timeline/Waterfall, Trace Tree, Board/Kanban views
- Facet API + histogram
- Compact-mode sidebar scroll fix
- Detail drawer overflow/scroll fixes
- 6 audit bugs fixed
- Shared `messageFormats.js`
- Inbox render fix + provider-name React crash
- Conversation thread expand fix + pageSize
- Trace view crash fix

### Deployment / HA / Node Failover
- L2 failover proxy (`cli/failover-proxy.cjs`)
- Post-scrutiny crash fixes
- L1 in-app peer forwarding (`settings.peerNodes`)
- Failover hardening: launchd + Tailscale + IPv6 toggle + multi-peer auto-discovery
- mini2 proper packaged install (npm-global, launchd)
- Model-serving policy: remote-only inference (Ollama on mini2)
- Full mini2 app+tray
- Mac tray app rebuild

### Hardening (4 phases)
- Phase 1: Deep-merge nested settings, conflict warning, fallback validation
- Phase 2: Smart router score breakdown, sticky TTL config, node refresh, chip truncation
- Phase 3: Markdown atomic write, export pagination, droppedRecords counter
- Phase 4: `/api/health/providers`, auto-disable on refresh failures, node error badge
- 7-bug exhaustive audit pass (BUG-A through BUG-G)

### Testing & Research
- Test authenticity audit (7 files verified real)
- Token helpers extracted
- Browser QA all 6 tabs + visual QA
- Deep research v1-v4 (300+ projects, 43 papers)
- Research synthesis + messages-page-feature-spec + gaps/risks docs
- Code review of user's personal commits
- Browser-control workflow doc + `9router-browser-e2e` skill
- OpenRouter 08-13 fix (batch import hang)

---

## 3. What's LEFT (prioritized)

### User-Gated Decisions (BLOCKED)
| # | Item | Source | Status |
|---|------|--------|--------|
| 1 | Choose ONE of 5 fallback-rule UIs | TASK-LOG #48, fallback-rules-ux-plan.md | Awaiting user decision |
| 2 | Approve inline per-model retries in modal chain boxes | TASK-LOG #49, research/16-ux-research | Research done, awaiting approval |
| 3 | TokenRouter pricing re-validation | hardening-roadmap.md §4.3 | "Keep for later" per user |
| 4 | mimo fallback health check | hardening-roadmap.md §4.4 | "Keep for later" per user |

### Documentation (HIGH PRIORITY)
| # | Item | Source | Severity |
|---|------|--------|----------|
| 5 | ARCHITECTURE.md rewrite (references db.json, last updated 2026-02-06, missing RTK/Headroom/MITM/SQLite) | research/05-cross-cutting-analysis.md, CLAUDE.md | Critical |
| 6 | ARCHITECTURE.md env matrix (missing BASE_URL/CLOUD_URL server-side vars) | research/04-infrastructure-config.md | Medium |
| 7 | PR audit completion (only 2/16 clusters done of 653 open PRs) | temp/draftSourceOfTruth/01-pr-categorization.json | High |

### Feature Completion (MEDIUM)
| # | Item | Source | Status |
|---|------|--------|--------|
| 8 | Conversation tree branching | messages-page-feature-spec.md §7, ADR-007 | Gated by ~10k row threshold |
| 9 | Privacy suite (redaction, no-log, zero-retention) | messages-page-feature-spec.md §9 | Required before batch AI analysis |
| 10 | Webhook notifications (Apprise/Alertmanager) | messages-page-feature-spec.md §6 | Deferred |
| 11 | Langfuse/OpenLIT ship-out | messages-page-feature-spec.md §10 P4 | Optional |
| 12 | Body-diff between requests | messages-page-feature-spec.md §5 | Not started |
| 13 | clientId/projectId/IP enrichment | messages-page-feature-spec.md §10 P3 | Not started |
| 14 | Routing-reason telemetry (CPR/CLO) | messages-page-feature-spec.md §5 | Not started |
| 15 | Synthetic scan (local-model default) | messages-page-feature-spec.md §6 | Not started |

### Technical Debt
| # | Item | Source | Priority |
|---|------|--------|----------|
| 16 | Markdown flush concurrency (multi-server) | hardening-roadmap.md §3.1 | Medium |
| 17 | 1000-record observability cap (silent drops) | error-sweep.md E5 | Medium |
| 18 | `failover-proxy.cjs` not auto-copied by `build-cli.js` | deployment runbook gotcha | Medium |
| 19 | VS Code profile cleanup (dialagram.me custom models) | recovered chat 1f65f3a1 | Medium |

### Open GitHub Issues (20 open, top 5)
| # | Title | Priority |
|---|-------|----------|
| 3427 | Usage dashboard request details shows no data | High |
| 3425 | Fusion Combo causes repeated 400 errors | High |
| 3424 | ollama-local provider returns 503 | High |
| 3422 | All Kiro AI Models Had Error Invalid Model ID | High |
| 3418 | MiniMax-M3 ignores images from OpenAI clients | Medium |

### Open GitHub PRs (20 open, top 5)
| # | Title | Branch |
|---|-------|--------|
| 3426 | fix(usage): show model and provider for single-item groups | fix/usage-stats-single-model |
| 3423 | feat(open-sse): Revise Qwen3.8 pricing + Meta Muse patterns | master |
| 3421 | feat(kimi): force streaming for Kimi Code | feat/kimi-forcestream |
| 3420 | fix(chat): sync negotiated stream flag | fix/stream-flag-sync |
| 3419 | fix(minimax): preserve images on matched transport | fix/minimax-m3-vision-transport |

---

## 4. Unfinished Work (from recovered chat logs)

| Session | Date | Topic | Left Off |
|---------|------|-------|----------|
| `8727887c` | Aug 8 | PR audit of 653 open PRs | Only security + antigravity clusters done. 12+ clusters unprocessed. |
| `d4294fc8` | Aug 5 | Deep dive code walkthrough | Smart Router code blocks produced but not applied. |
| `2cbf4374` | Aug 10 | VS Code Messaging Bridge Extension | Designed but never built. |
| `14669f29` | Aug 5 | /understand --full knowledge graph | Partial — `.ua/intermediate/` may hold batch results. |
| `1f65f3a1` | Aug 5 | "Response contained no choices" error | Profile `-448b8715` still has dialagram.me models — latent blocker. |

---

## 5. Decisions (8 ADRs)

| ADR | Title | Key Decision |
|-----|-------|-------------|
| 001 | Smart router pre-combo interception | Pre-combo hook, not executor-level |
| 002 | Observability conversation tracking | conversationId + requestDetails threading |
| 003 | AI error analyst | Reuses `handleChatCore` pipeline |
| 004 | Fallback configuration | Combos + `settings.modelFallbacks` |
| 005 | SSE done-tracking passthrough | Explicit `streamDoneSent` in passthrough |
| 006 | Drop indicator approach | Live viewport rect (initial + delta) |
| 007 | Messages JSON blob vs table | Keep JSON blob; projection table deferred |
| 008 | Provider page observability reuse | System B (requestDetails fingerprints) over System A |

---

## 6. Key Risks

| Risk | Status | Action |
|------|--------|--------|
| xAI token revoked (`invalid_grant`) | Active | User re-auth needed |
| OpenRouter guardrail/privacy 404 | Active | Check provider privacy settings |
| `ARCHITECTURE.md` critically stale | Active | Rewrite needed |
| `failover-proxy.cjs` not in build script | Active | Add to `build-cli.js` |
| VS Code profile dialagram.me models | Active | Clean profile `-448b8715` |

---

## 7. Recommended Next Steps (priority order)

1. **Fix `build-cli.js`** to include `failover-proxy.cjs` in the bundle
2. **Update `docs/ARCHITECTURE.md`** — rewrite persistence section, add missing components
3. **Complete PR audit** — dispatch subagents for remaining clusters
4. **User decisions** — fallback rule UI choice, inline retries approval
5. **Messages P2+** — Error Inbox P2 completion
6. **Clean VS Code profile** — remove dialagram.me custom models

---

## 8. Evidence Sources

- 29 research files in `research/9router/`
- 4,720 lines across tracking/ (SESSION-HISTORY, TASKS, CHANGELOG, 8 ADRs, 12 learnings)
- 12 operations workflow docs
- 7 planning docs
- 6 message-capture research files
- 11 recovered chat logs in `temp/chat-logs/`
- Git: 122 commits, 205 files, 27,518 insertions
- GitHub: 20 open PRs + 20 open issues
