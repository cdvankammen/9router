# VERIFICATION TASK LEDGER — v4-vscode-works Full Branch Audit

**Date:** 2026-09-18
**Author:** GitHub Copilot agent (main session, v4-vscode-works)
**Status:** active
**Tags:** #tracking #verification #task-ledger #browser-testing #e2e

> Scope: ALL 273 commits on `v4-vscode-works` not in `master`, mapped to
> verification groups with requirements, acceptance criteria, and
> internal-browser test documentation. See `operations/browser-control-workflow.md`
> for the no-vision loop methodology.

---

## Environment (all groups)

```bash
# Server: /tmp/9r-e2e3/package on port 20130
DATA_DIR=/tmp/9r-e2e3/data JWT_SECRET=test-secret-123 \
  INITIAL_PASSWORD=123456 API_KEY_SECRET=test-api-key-secret-123 \
  PORT=20130 HOSTNAME=0.0.0.0 nohup node app/custom-server.js &

# Mock upstream on port 24000
node /tmp/mock-upstream.cjs &

# Browser: VS Code integrated browser, pageId from open_browser_page
# Login: password 123456
```

---

## VG00 — v3 Merge + v3 Features ✅ VERIFIED (prior session)

**Commits:** c8373d85, d0385f0f, a17cfa30, e0826482, 53d71dc7, 3c9851e6, a2d53af4, a236b6b3, 13784656, f9b271d8, 7d669a44, bab24207, 0ffb4cad + v3 docs/policy commits
**Status:** ✅ COMPLETE — all features verified in browser + tests green

---

## VG01 — DB Layer + SQLite Fixes

**Commits:** e582859a, e8ae804d, 34f518e4, 06f735c6
**Requirements:**
- FTS5 shadow tables excluded from safety backups
- node:sqlite rows normalized to plain objects for RSC serialization
- WAL checkpoint uses PASSIVE (not TRUNCATE) to prevent event-loop hang

**Acceptance criteria:**
- Backup file does not contain `*_fts_*` tables
- `/api/messages` returns serializable JSON (no RSC crash)
- No event-loop stall under concurrent writes

**Browser test:**
```javascript
// After triggering a backup via UI:
const res = await fetch('/api/db/backup');
// Check backup doesn't contain FTS shadow tables
// Navigate to /dashboard/messages → verify no 500, rows render
```

---

## VG02 — Security Hardening (GAP-P0 + P1)

**Commits:** b07ba0fc, 1fb61bf4, d22f616f, 251ed39c, 8d21882a, 65c26651, 4768482d, 92697e46, 2757db65
**Requirements:**
- Shutdown endpoint uses timing-safe comparison (GAP-P0-02)
- Default password not accepted in production (GAP-P1-14)
- CORS wildcard replaced with configurable allowlist (GAP-P1-13)
- MITM execSync replaced with execFileSync
- Rate limiter + header sanitizer active (GAP-P1-17)
- SSRF guard on suggested-models + smartRouter
- Auth on version/update endpoint (GAP-P0-11)

**Acceptance criteria:**
- POST /api/shutdown without valid auth → 401
- GET /v1/models from unauthorized origin → blocked
- Rate limiter returns 429 after 120 req/min

**Browser test:**
```javascript
// 1. Verify rate limiter:
for (let i = 0; i < 130; i++) await fetch('/api/settings');
// Last few should return 429

// 2. Verify CORS:
// fetch from different origin should fail

// 3. Verify shutdown auth:
const r = await fetch('/api/shutdown', { method: 'POST' });
// Expected: 401 or 403, not 200
```

---

## VG03 — Reliability + Timeouts (GAP-P1-25, P2-*)

**Commits:** 2757db65, db70ea24, 9308b6e5, c0eee46d, e29bcec7, dca0bd56, 8d2fce0f, 818c69bb, 639c4a0d, 7f5baa5d
**Requirements:**
- AbortSignal.timeout(8000) on all 22 provider validation fetch calls
- AbortSignal.timeout(15s) on iflow cookie validation
- 10s timeout on gitlab-pat validation + 504 response
- 30s timeouts on Cloudflare API calls
- 10s timeout on voice listing
- AbortSignal.timeout on vercel-deploy fetches
- Cloudflare subdomain-enable wrapped in try/catch
- Exponential backoff + jitter on onboardUser retry

**Acceptance criteria:**
- Provider validation with unreachable URL completes within 8s (not hang)
- Voice listing with dead upstream completes within 10s

**Browser test:**
```javascript
// Navigate to /dashboard/providers
// Add a provider with unreachable URL → should timeout gracefully, not hang
// Check console for no unhandled promise rejections
```

---

## VG04 — UX/Toast Improvements (GAP-P2-28/29, P3-33/37)

**Commits:** fa6fa899, e21c568f, fb160c12, e1b64e41, e1105b87, d6ff552c
**Requirements:**
- Connection errors surface via toast notifications
- ModelsCard errors show user-visible toasts (not silent console.log)
- alert() replaced with toast system
- Cowork settings config read failure returns structured error

**Acceptance criteria:**
- Triggering a connection error shows a toast in the UI
- No raw `alert()` calls remain in the codebase

**Browser test:**
```javascript
// Navigate to /dashboard/providers
// Trigger a connection error (e.g., add provider with bad URL)
// Verify toast appears: document.querySelector('[role="alert"]')
// Verify no alert() was called: window.__alertCalled === undefined
```

---

## VG05 — Messages Page P1 + Detail Drawer

**Commits:** 2b20618b, 5c1e6ec9, 79c457e6, 0194d065, 330d7230, ba7378db, 378cd321
**Requirements:**
- Messages page renders list with facets
- Detail drawer opens with headers/cURL/markdown tabs
- Conversation tree view works
- Timeline/Trace/Board view tabs render
- Status filter vocabulary matches stored values
- Facets via SQL GROUP BY (not JS filter)
- Histogram shows current hour correctly

**Acceptance criteria:**
- GET /api/messages returns rows with correct facets
- Drawer shows full payload for a captured request
- All 3 view tabs render without crash

**Browser test:**
```javascript
// 1. Navigate to /dashboard/messages
// 2. Verify list renders: document.querySelectorAll('table tbody tr').length > 0
// 3. Click first row → drawer opens
// 4. Verify tabs: document.querySelectorAll('[role="tab"]').length >= 3
// 5. Click Timeline tab → verify timeline renders
// 6. Click Board tab → verify board renders
```

---

## VG06 — Messages FTS5 + Error Inbox

**Commits:** 7ec60ad8, 8bdff46c, ad0a241a, 9a217338, 3cddabec, 16d81223
**Requirements:**
- Full-text search over captured payloads (FTS5 with LIKE fallback)
- DB-level conversation aggregation + keyset pagination
- Upstream URL captured and shown in cURL export
- Error Inbox P2 — server-side error aggregation + triage
- Inbox renders without provider-name crash

**Acceptance criteria:**
- Search for a known string returns matching messages
- Error Inbox shows grouped errors with triage actions

**Browser test:**
```javascript
// 1. Navigate to /dashboard/messages
// 2. Type in search box → verify results filter
// 3. Navigate to Error Inbox tab
// 4. Verify error groups render: document.querySelectorAll('.error-group').length >= 0
```

---

## VG07 — Observability + Cost Capture

**Commits:** 2867fbb9, 50b17ce6, c6fbe402, b63501f2, cb01da52, 57e87729, 3e7d1c7c, 40168739
**Requirements:**
- Per-request cost capture with provenance labels
- sourceApp/userAgent threaded through streaming handler
- Atomic markdown flush + export pagination
- AI Error Analyst analyzes captured failures
- Error categorization engine (auth/rate_limit/quota/timeout/network/upstream/invalid_request)
- errorCategory forwarded through request-detail pipeline

**Acceptance criteria:**
- Usage details show cost per request
- Error groups show correct category
- Markdown export downloads correctly

**Browser test:**
```javascript
// 1. Navigate to /dashboard/usage
// 2. Verify cost column shows values
// 3. Navigate to /dashboard/messages
// 4. Verify errorCategory badge shows correct color/label
```

---

## VG08 — Smart Router

**Commits:** 9f4c1631, 6f00d23f, acdc7134, a954b88f, 1c921ce2, d9415807, 5932879f, d1c1db28, 6485e782, 12895e19, 0e8b476b, 245845cf, 64c57811, ada25f6e
**Requirements:**
- Pre-combo interception smart router with dynamic combo fallback
- conversationId tracking + streaming non-SSE detail capture
- Smart Router config section on combos page
- Request export endpoint (JSON + markdown)
- taskType persisted in usageHistory meta
- Score breakdown + configurable sticky TTL
- source-app fingerprinting
- sr-* combo cleanup scheduler
- Credentials passed when fetching custom node /models

**Acceptance criteria:**
- Smart router config card renders on combos page
- Smart router creates sr-* combo when triggered
- Cleanup scheduler runs without error

**Browser test:**
```javascript
// 1. Navigate to /dashboard/combos
// 2. Verify Smart Router config card: text includes 'Smart Router'
// 3. Verify trigger names input has default 'modelRouter'
// 4. Verify allowed providers input present
```

---

## VG09 — Fallback Rules UI (3-view manager)

**Commits:** d1cc1faa, 6449b58b, 2f6c22ce, b1e2a061, a3a7b180, d7bf0e35, 6f06e6a0, b520c9d6, 8990a3b4, 99ac899f
**Requirements:**
- Visual fallback rule builder + markdown log explanation
- 3-view fallback rule manager (table, chain flow, cards)
- Provider picker + smart toggle + 2 new rule views
- Drag-and-drop reorder in FallbackRuleModal chain
- Live drop indicator bar in Chain Flow drag-and-drop
- Per-model retry counts for fallback chains

**Acceptance criteria:**
- All 3 view tabs render
- Drag-and-drop reorders chain nodes
- Drop indicator bar appears during drag
- Save persists to /api/settings

**Browser test:**
```javascript
// 1. Navigate to /dashboard/combos
// 2. Scroll to Per-Model Fallbacks section
// 3. Verify 3 tabs: Table | Chain Flow | Simple + Advanced
// 4. Click Chain Flow tab
// 5. Verify chain nodes render: document.querySelectorAll('[data-chain-node]').length
// 6. Drag a node → verify drop indicator appears
// 7. Verify order changed in DOM
// 8. Verify PATCH /api/settings was called with new order
```

---

## VG10 — Streaming Fixes ([DONE] sentinel)

**Commits:** ccde7bff, 429ddc56
**Requirements:**
- Stop forcing stream when client omits it (fixes [DONE] leak in JSON responses)
- Prevent duplicate [DONE] sentinel in passthrough mode

**Acceptance criteria:**
- Non-streaming request returns clean JSON (no SSE artifacts)
- Streaming request has exactly 1 `data: [DONE]`

**Browser test:**
```javascript
// Terminal curl test (not browser — SSE assertion):
// curl -s POST /v1/chat/completions stream:true | grep -c 'data: \[DONE\]' → 1
// curl -s POST /v1/chat/completions stream:false → valid JSON, no [DONE]
```

---

## VG11 — Provider Health + Auto-disable

**Commits:** 723e9669, 5918de88
**Requirements:**
- Provider health endpoint + auto-disable on refresh failures
- Node model error badge on providers page
- Hardening Phase 1: deep-merge settings + conflict warnings + fallback validation

**Acceptance criteria:**
- GET /api/provider-health returns health status
- Provider card shows error badge when model has errors

**Browser test:**
```javascript
// 1. Navigate to /dashboard/providers
// 2. Verify provider cards render
// 3. Trigger a model error → verify error badge appears
```

---

## VG12 — Failover Proxy (L2)

**Commits:** fd35e515, bb55d754, 1a0b0ecc, 156e74d0, 55f34b52, 4cf66153, 5e86534e, 9865df13, e23e291d, 5f5ae792, d2affcc6, 24a50108
**Requirements:**
- L2 proxy status endpoint + dashboard card
- Node-DOWN proxy prototype (L2)
- Multi-peer proxy works on any network
- --ipv6 security toggle + hostname/IPv4/IPv6 peer handling
- Dynamic peer auto-discovery
- L1 settings-load retry + API key parity

**Acceptance criteria:**
- Failover proxy card renders on dashboard
- L2 status endpoint returns peer status
- Peer discovery finds peers without hardcoded IPs

**Browser test:**
```javascript
// 1. Navigate to /dashboard
// 2. Verify failover proxy card renders
// 3. GET /api/failover/status → returns peer list
```

---

## VG13 — Memory Pipeline (PR #3599)

**Commits:** 836d6846, 111c4f9e, 03a393e8, 10ed2871, 8693e12d, 2a861fa3, 24b2dc7c
**Requirements:**
- Memory orchestrator + i18n + dashboard fixes
- contextCompactor sequence validity (tool-pair boundary + no synthetic ack)
- toolPruner truncation idempotent
- Handoff toggle removed from shipped pipeline

**Acceptance criteria:**
- Memory page renders without crash
- contextCompactor produces valid sequences
- toolPruner truncation is idempotent (running twice gives same result)

**Browser test:**
```javascript
// Navigate to /dashboard/memory → verify renders without crash
```

---

## VG14 — Claude Compat Layer

**Commits:** 5ba0f0b3 (partial — also covers model-context + statistics rework)
**Requirements:**
- Claude compat layer: /v1/models ids get claude- prefix for anthropic-version clients
- Model Context page rework
- Statistics dashboard rework

**Acceptance criteria:**
- /v1/models with anthropic-version header returns claude-prefixed ids
- Model Context page renders
- Statistics page shows correct aggregations

**Browser test:**
```javascript
// 1. Navigate to /dashboard/model-context → verify renders
// 2. Navigate to /dashboard/statistics → verify table renders with data
```

---

## VG15 — Test Fixes + CI

**Commits:** 05cda673, 5aa410de, 3c4ef2f4, 3b82b1d6, 939c1428, 26d7aa59, 91e26873, dca0bd56, e21c568f, cfbc3cf3, 650aa0b4, 24b2dc7c
**Requirements:**
- All 86 NEW test failures vs baseline resolved
- Tests aligned with pr-3595-squash changes
- Flaky createdAt assertion fixed
- Regression tests added for GAP fixes

**Acceptance criteria:**
- `npx vitest run` in tests/ shows 0 NEW failures vs baseline
- All regression tests pass

**Browser test:** N/A (test suite only)

---

## VG16 — Docs + Policy (no code changes)

**Commits:** All docs/tracking/policy commits (75268083, 2204f28c, 0d666c2d, etc.)
**Requirements:** Documentation accuracy only
**Acceptance criteria:** Docs match actual behavior
**Browser test:** N/A

---

## VG17 — Build + CLI Fixes

**Commits:** 008dd3ab, 26ba46db, fd2511b0, 52e90029, 1afe7e29, 48bca50f
**Requirements:**
- Standalone bundle includes rate-limiter
- CLI tray runtime self-heal failures logged (not swallowed)
- Brew detection uses filesystem checks (not shell)
- Rate limiter bundled into CLI package

**Acceptance criteria:**
- `npm run cli:pack` produces valid tgz
- CLI starts without tray runtime crash

**Browser test:** N/A (CLI/build only)

---

## GitHub PR Inventory (decolua/9router)

**Open PRs (need review/merge decision):**
- #4165 fix(opencode): stop 403 FreeTierError on Responses requests with tools
- #4164 master (sync)
- #4159 fix(provider-test): resolve connection tests from registry validateUrl
- #4157 feat(bedrock): AWS Bedrock provider with AWS SSO credential support
- #4154 fix(qoder): forward reasoning_effort to upstream models
- #4151 feat(chatCore): Claude Code auto-permission classifier compat mode
- #4148 feat(monitoring): monitor 9Router through Telegram bot
- #4147 fix(errors): forward Retry-After + stop retrying terminal billing errors
- #4146 fix(opencode): ensure decoy tools for free-tier requests
- #4144 feat(auth): TOTP two-factor authentication for dashboard login
- #4143 fix(translator): stop sending vendor-native thinking fields to OpenAI-compatible resellers
- #4134 sync
- #4133 Fix Ollama local streaming support for VS Code chat
- #4128 fix(opencode): restore free-tier client identity
- #4110 fix(translator): preserve function-tool strict across Claude and Chat routes
- #4096 fix(models): expose token limits on combo entries
- #4090 fix(translator): repair missing tool_call_id
- #4089 feat(providers): add ainetcafe (Kimi K3) provider
- #4087 fix(video): isolate poll cooldowns + enforce pinned accounts

**Closed PRs (merged to master — already in codebase):**
- #4158 fix(huggingface): complete Inference Providers router migration
- #4156 Perf/models endpoint latency
- #4155 fix(opencode): cloak Responses requests that already have tools
- #4150 fix(ollama): show free-plan monthly usage in quota tracker
- #4145 feat: OpenCode Zen (PAYG) provider
- #4142/#4141 fix(opencode): rename free-tier tool quartet
- #4139 fix(antigravity): strip Claude Code billing header
- #4137 fix(antigravity): scope cached thought signatures
- #4135 fix(codex): route bare codex-auto-review
- #4132 fix(opencode): complete free-tier client fingerprint
- #4131 fix(opencode): resolve 403 FreeTierError
- #4130 fix(commandcode): retry on transient stream error
- #4121 feat(opencode-zen): pay-per-use gateway
- #4117 fix(opencode): reuse stable upstream session
- #4116 fix(opencode): resolve 403 with canonical session format
- #4114 fix(kiro): preserve underscores in tool names
- #4112 fix(antigravity): preserve inlineData parts
- #4111 feat(opencode): route union-alpha through Messages API
- #4109 fix(kiro): neutral placeholder for tool-result-only turns
- #4107 fix(opencode): official client fingerprint
- #4105 fix(opencode): resolve 403 FreeTierError
- #4099 fix(opencode): route Union Alpha through Messages API
- #4093 fix(zed): harden OAuth lifecycle
- #4086 fix(commandcode): preserve images + reasoning_effort

---

## Execution Order

1. **VG01** (DB) — foundational, affects all pages
2. **VG02** (Security) — critical, affects auth/CORS
3. **VG03** (Reliability) — affects provider UX
4. **VG04** (UX/Toasts) — affects all error paths
5. **VG05** (Messages P1) — largest feature group
6. **VG06** (Messages FTS5 + Error Inbox)
7. **VG07** (Observability + Cost)
8. **VG08** (Smart Router)
9. **VG09** (Fallback Rules UI)
10. **VG10** (Streaming) — terminal curl tests
11. **VG11** (Provider Health)
12. **VG12** (Failover Proxy)
13. **VG13** (Memory Pipeline)
14. **VG14** (Claude Compat)
15. **VG15** (Test Fixes) — test suite only
16. **VG16** (Docs) — no browser test needed
17. **VG17** (Build/CLI) — build only
