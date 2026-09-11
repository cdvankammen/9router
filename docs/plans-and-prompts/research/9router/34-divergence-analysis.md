# Divergence Analysis: v1-bug-fix vs upstream master

**Date:** 2026-09-10 | **Status:** active
**Branch:** v1-bug-fix (local) vs origin/master (upstream decolua/9router)
**Tags:** #merge #divergence #planning

## Summary

- **Upstream commits we are missing:** 103 (v0.5.55 → v0.5.65+)
- **Local commits upstream is missing:** 125 (failover, WAL, combos, observability, messages, docs)
- **Uncommitted working tree changes:** 75 files (combos UI, tray fixes, api routes, db repos)
- **Strategy:** git merge origin/master into a merge branch from v1-bug-fix

## Upstream Commits (103, newest first)

### v0.5.65 era (Sep 3+)
| Commit | Description |
|--------|-------------|
| 4eda76e2 | # v0.5.65 (2026-09-03) |
| e0ffc7e2 | feat(fetch): add Ollama Cloud web fetch provider |
| 6ab9ca9e | fix(claude): never anchor cache breakpoint on defer_loading tools (#3567) |
| 6efb9790 | feat(providers): streamline tokenrouter models and add missing provider icons |
| 831001c3 | feat(providers): add max height and scroll for connection list |
| e7dd72a8 | fix(usage): read Responses-shape cached_tokens in extractUsageFromResponse |
| 5caa72f5 | fix(models): support single model lookup |
| e014cb53 | feat(codebuddy-cn): refresh model catalog — add hy4-preview/hy3/glm-5.3/kimi-k3 |
| d1d4e0f0 | feat(providers): add status filter to providers dashboard |
| ac98dd9d | fix(antigravity): strike-break optimistic quota readings that keep 429ing |
| a58902e4 | feat(i18n): complete Indonesian translation (1391 keys) |
| 98579f98 | fix(auth): protect root /responses rewrite |
| 15687d19 | fix(chat,docker): return 503 for rate-limited providers and bundle node-machine-id |
| acb5c34c | fix(opencode): route Muse Spark models to Responses API and declare vision |
| b870b5d4 | fix(security): close SSRF guard bypasses in ssrfGuard.js (#3714) |
| 1f190bd0 | fix(kiro): preserve inline images in OpenAI MITM |
| 70f15aa5 | feat(antigravity,gemini): add Gemini 3.8 Flash support |
| 1fe996db | fix(translator): route Gemini thinking through reasoning_effort |
| c24a8542 | feat(cli-tools): support saving and managing custom API key presets |
| 1fc2a81d | fix(kiro): remove redundant top-level systemPrompt field |

### v0.5.59 era (Aug 29)
| Commit | Description |
|--------|-------------|
| 90b52e06 | # v0.5.59 (2026-08-29) |
| 38f031f4 | feat(models): capability toggles for custom models with upsert |
| 009cac63 | fix(claude): bump CC fingerprint to 2.1.258 |
| b9c92cb8 | feat(quota): add usage tracking for Groq |
| ec669280 | fix(search): scope failure locks so search cannot take chat offline |
| 5a86f6a8 | feat(search): add ollama-search and zai-search |
| eb312bd4 | fix(claude): decloak tool names in same-format streaming |
| 2f17352c | feat(search): add Antigravity as a web search provider |
| 90a00058 | fix(cli): install better-sqlite3 without build tools on Node 22+ |

### v0.5.55 era (Aug 14)
| Commit | Description |
|--------|-------------|
| 699edac3 | # v0.5.55 (2026-08-14) |
| 540ebbe6 | test(baseline): regenerate provider snapshot |
| e1115e28 | feat(opencode-go): route by request format via transports |
| 27f3710c | fix(docker): ship sql.js so pure-JS DB fallback can start |
| 92259214 | fix(security): require proof that x-9r-real-ip came from socket |
| b04c03c6 | feat(providers): add Alibaba Token Plan |

## Local Commits (125, newest first)

### Our unique work (not upstream)
| Commit | Description | Category |
|--------|-------------|----------|
| 34f518e4 | fix(db): WAL checkpoint TRUNCATE -> PASSIVE in node:sqlite + bun | DB fix |
| 48bca50f | build: bundle per-IP rate limiter into CLI package | Build |
| 06f735c6 | fix(db): WAL checkpoint TRUNCATE -> PASSIVE to stop event-loop hang | DB fix |
| 6754d9c0 | feat(combos+models): combo duplicate, dev flag, model chooser sorting | Feature |
| 81dcc117 | docs(plans-and-prompts): reorganize knowledge base | Docs |
| 5f5ae792 | test(failover): upstream-dies-mid-stream coverage | Test |
| e23e291d | feat(failover): dynamic peer auto-discovery | Feature |
| 9865df13 | test(failover): IP-environment suite | Test |
| 5e86534e | feat(failover): --ipv6 security toggle | Feature |
| 4cf66153 | feat(failover): multi-peer proxy | Feature |
| 9a2987c3 | docs: mini2 full app (tray icon) Rosetta fix | Docs |
| d2affcc6 | fix(failover): L1 settings-load retry | Fix |
| 24a50108 | fix(cli): bundle full L1 settings closure | Fix |
| 1be5e96c | feat(failover): L1 in-app peer forwarding | Feature |
| b2fe901f | fix(messages): Trace view crash | Fix |
| 3cddabec | feat(messages): Error Inbox P2 | Feature |
| ad0a241a | feat(messages): DB-level conversation aggregation | Feature |
| 8bdff46c | feat(messages): full-text search (FTS5) | Feature |
| 2867fbb9 | feat(observability): per-request cost capture | Feature |
| 9f4c1631 | feat(smart-router): pre-combo interception smart router | Feature |

## Overlap Analysis

Potential conflicts where both branches touched similar areas:
- **Security:** upstream b870b5d4 (SSRF guard) vs our local security work — need manual review
- **CLI packaging:** upstream 90a00058 (better-sqlite3) vs our 48bca50f (rate limiter bundling) — cli/package.json conflict likely
- **Models/providers:** heavy upstream churn (38f031f4, 009cac63, etc.) vs our 6754d9c0 (combo features) — HIGH conflict risk
- **DB/SQLite:** upstream 27f3710c (sql.js shipping) vs our 34f518e4/06f735c6 (WAL PASSIVE) — MEDIUM conflict risk

## Uncommitted Working Tree (75 files)

Key uncommitted changes that MUST be committed before merge:
- `cli/hooks/trayRuntime.js` (+34 lines) — tray freeze fix
- `cli/package.json` (+3/-1) — failover-proxy.cjs packaging fix
- `custom-server.js` (+18) — L1 + rate limiter
- `open-sse/services/combo.js` (+56/-1) — combo feature work
- `src/app/(dashboard)/dashboard/combos/page.js` (+169/-1) — combos UI
- `src/app/api/combos/route.js` (+34/-1) — combos API
- `src/lib/db/repos/*` — alias/connections/settings repo changes
- All `docs/plans-and-prompts/` — our knowledge base (no conflict risk)

## Merge Strategy

1. Commit all 75 dirty files to v1-bug-fix
2. Create backup tag
3. Create merge branch from v1-bug-fix
4. git merge origin/master
5. Resolve conflicts: cli/ first, then open-sse/, then src/
6. Verify: npm run build + vitest + runtime smoke on mini2
7. Deploy to mini2 after verification

## Deliverables

- This doc: `docs/plans-and-prompts/research/9router/34-divergence-analysis.md`
- Copied to: `~/Documents/hermesResearch/9router/V2/research/34-divergence-analysis.md`
