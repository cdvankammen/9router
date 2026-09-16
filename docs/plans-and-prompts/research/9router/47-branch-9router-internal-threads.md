---
Date: 2026-09-15
Author: GitHub Copilot
Status: active
Tags: research, branch, 9router, internal, executors, translators, oauth, mitm, error-systems, failover, enforcement
---

# Branch 7 — 9Router Internal Threads (the 52 research docs expanded)

> Part of the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`).
> This branch covers every node whose topic descends from the 9Router codebase research docs (01–38) — the "information places and locations that we already have."

## Root

**9Router internal threads** = everything learned from deep-diving the 9Router codebase: the open-sse engine, executors, providers registry, translator, services, db layer, oauth, sse layer, mitm, api routes, ux, error systems, node failover, model serving policy, goal systems, runtime enforcement, gap analysis, divergence, malformed responses, message-driven tools.

## Level 1 — Two Children

### A. Core Engine (open-sse / executors / translators / providers)

**open-sse engine** (`01-open-sse-engine.md`):
- Provider-agnostic routing/translation engine.
- Request lifecycle: parse → combo expansion → account selection → format detection → translation → executor dispatch → SSE back.
- Pivots through **OpenAI as intermediate format**.
- Translators self-register via `register(from, to, reqFn, resFn)`.
- Direct routes for fragile pairs (thinking blocks, tool ids, non-base64 images, is_error).

**Executors** (`06-executors-deep-dive.md`):
- ~30 specialized executors + cached DefaultExecutor.
- Base-URL fallback loop DEFAULT_RETRY_CONFIG (429:0, 502:3×3s, 503:3×2s, 504:2×3s).
- FETCH_CONNECT_TIMEOUT_MS=60s.
- Binary/protobuf upstreams (kiro EventStream, cursor protobuf, commandcode NDJSON) handled inside their own executor.

**Providers registry** (`07-providers-registry-deep-dive.md`):
- One file per provider; `index.js` is auto-generated.
- Regenerate with `scripts/migrate-registry.mjs` / `injectDisplayToRegistry.mjs`.
- Add provider: copy `providers/REGISTRY_TEMPLATE.js`, add models to `config/providerModels.js`.

**Translator** (`08-translator-deep-dive.md`):
- Client format ↔ provider format.
- OpenAI intermediate format pivot.
- Direct routes for fragile pairs.

### B. App Layer (Next.js / db / oauth / sse / mitm / api)

**Next.js app** (`02-src-nextjs-app.md`):
- Dashboard at `/dashboard`, API at `/v1`.
- Next rewrite maps `/v1/*` → `/api/v1/*`.

**DB layer** (`11-db-layer-deep-dive.md`):
- SQLite with adapter fallback chain: bun:sqlite → better-sqlite3 → node:sqlite → sql.js.
- `src/lib/db/` with repos per entity; migrations in `src/lib/db/migrations/`.
- `localDb.js` is a backward-compat shim.

**OAuth** (`12-oauth-deep-dive.md`):
- OAuth/API-key credential management, token refresh.
- xAI OAuth service, token lifecycle.

**SSE layer** (`13-sse-layer-deep-dive.md`):
- SSE back to client, streaming, event handling.

**MITM** (`14-mitm-deep-dive.md`):
- MITM proxy for intercepting/transforming traffic.

**API routes** (`15-api-routes-deep-dive.md`):
- `/v1/*` route handlers, compat APIs.

## Level 2 — Four Children

### AA. Reliability Systems (error systems / failover / serving policy)

**Error systems** (`21-audit-no-more-bugs.md`, `22-error-sweep.md`, `26-programmatic-error-registry.md`, `29-unified-error-system-v2.md`):
- Error categorization: rate_limit | auth | billing | timeout | ...
- Programmatic error registry.
- Unified error system v2.

**Node failover** (`24-ha-mini-backup-nodes.md`, `25-node-failover-implementation.md`, `26-node-failover-networking-options.md`, `28b-mini2-failover-crashloop-deep-dive.md`, `28c-failover-session-command-log.md`, `28d-packaging-fix.md`):
- HA mini backup nodes.
- Failover networking options.
- Crashloop deep-dive.
- Packaging fixes.

**Model serving policy** (`27-model-serving-policy.md`):
- Which models can serve which tasks.
- Policy enforcement.

**Runtime enforcement** (`31-runtime-enforcement-layers.md`, `32-enforcement-mechanisms-per-layer.md`, `33-layers-combinations-build-plans.md`):
- Enforcement layers.
- Mechanisms per layer.
- Layer combinations build plans.

### AB. Analysis & Gaps (code review / feature gaps / divergence / malformed)

**Code review** (`17-code-review-user-commits.md`):
- Review of user commits.

**Feature gaps** (`18-feature-gap-review.md`, `32-gap-analysis-comprehensive.md`, `36-gap-merge-summary.md`):
- Feature gap review.
- Comprehensive gap analysis.
- Gap merge summary.

**Divergence** (`34-divergence-analysis.md`):
- Divergence between docs and code.

**Malformed responses** (`34-malformed-response-handling.md`):
- Handling malformed upstream responses.

### BA. UX & Tools (ux / message-driven tools / goal systems)

**UX** (`16-ux-research-drop-indicator-and-override-placement.md`):
- Drop indicator and override placement.

**Message-driven tools** (`38-message-driven-tools-research.md`):
- Message-driven tool research.

**Goal systems** (`30-goal-systems-research.md`):
- Goal systems research.

**Master coding rule** (`33-master-coding-rule.md`):
- Master coding rule.

### BB. Infrastructure (cli / tests / infra / cross-cutting)

**CLI** (`03-cli-and-tests.md`):
- CLI launcher package, tray management.

**Tests** (`03-cli-and-tests.md`):
- Vitest suite, baseline verification.

**Infra** (`04-infrastructure-config.md`):
- Docker, custom-server, rate limiter.

**Cross-cutting** (`05-cross-cutting-analysis.md`):
- Cross-cutting analysis.

## Level 3 — Eight Children (selected nodes)

### AAA. Executor Details
- **DefaultExecutor** — cached, handles any OpenAI-compatible provider.
- **Specialized executors** — kiro, cursor, commandcode, etc.
- **Retry config** — DEFAULT_RETRY_CONFIG.
- **Timeout handling** — FETCH_CONNECT_TIMEOUT_MS=60s.

### AAB. Translator Details
- **OpenAI pivot** — intermediate format.
- **Direct routes** — fragile pairs.
- **Self-registration** — register(from, to, reqFn, resFn).
- **Schema constants** — open-sse/translator/schema/.

### ABA. DB Layer Details
- **Adapter chain** — bun:sqlite → better-sqlite3 → node:sqlite → sql.js.
- **Repos** — per-entity logic.
- **Migrations** — schema evolution.
- **Paths** — DATA_DIR resolution.

### ABB. OAuth Details
- **Token refresh** — lifecycle management.
- **Credential management** — OAuth/API-key.
- **xAI service** — endpoint discovery.
- **Token storage** — secure persistence.

### BAA. Error Categorization
- **rate_limit** — 429 handling.
- **auth** — 401/403 handling.
- **billing** — 402 handling.
- **timeout** — timeout handling.

### BAB. Failover Details
- **HA mini nodes** — backup nodes.
- **Networking options** — failover networking.
- **Crashloop recovery** — mini2 crashloop.
- **Packaging** — failover packaging fixes.

### BBA. Enforcement Layers
- **Runtime enforcement** — layers.
- **Mechanisms** — per-layer mechanisms.
- **Combinations** — layer combinations.
- **Build plans** — enforcement build plans.

### BBB. Gap Analysis
- **Feature gaps** — missing features.
- **Divergence** — docs vs code.
- **Malformed responses** — upstream robustness.
- **Gap merge** — merged gap summary.

## Level 4–6 — Leaf Findings (verbatim from tree searches)

### AAA-A: Executor retry semantics
- **429:0** — no retry on rate limit.
- **502:3×3s** — 3 retries, 3s apart.
- **503:3×2s** — 3 retries, 2s apart.
- **504:2×3s** — 2 retries, 3s apart.

### AAA-B: Executor specialization
- **kiro EventStream** — binary/protobuf.
- **cursor protobuf** — protobuf format.
- **commandcode NDJSON** — NDJSON format.
- **DefaultExecutor** — OpenAI-compatible.

### AAB-A: Translator direct routes
- **thinking blocks** — fragile translation.
- **tool ids** — fragile translation.
- **non-base64 images** — fragile translation.
- **is_error** — fragile translation.

### AAB-B: Translator registration
- **register(from, to, reqFn, resFn)** — self-registration.
- **index.js imports** — MUST be imported.
- **Schema constants** — no hardcoded strings.
- **Config-driven** — DRY enforced.

### ABA-A: DB adapter chain
- **bun:sqlite** — fastest, Bun-only.
- **better-sqlite3** — optional native dep.
- **node:sqlite** — Node ≥22.5.
- **sql.js** — pure-JS fallback, always works.

### ABA-B: DB migrations
- **Schema migrations** — versioned.
- **Migration runner** — applies in order.
- **Backward compat** — localDb shim.
- **DATA_DIR** — path resolution.

### BAA-A: Error registry
- **Programmatic registry** — error codes.
- **Error categories** — rate_limit, auth, billing, timeout.
- **Error mapping** — upstream → internal.
- **Error recovery** — retry/fallback decisions.

### BAA-B: Unified error system v2
- **Unified error format** — consistent error responses.
- **Error inbox** — P2 design.
- **Error sweep** — bug cleanup.
- **No-more-bugs audit** — audit findings.

### BAB-A: HA mini nodes
- **Backup nodes** — HA mini.
- **Failover triggers** — crash detection.
- **Failover recovery** — session restore.
- **Failover testing** — crashloop deep-dive.

### BAB-B: Failover networking
- **Networking options** — failover networking.
- **Session command log** — failover session tracking.
- **Packaging fixes** — failover packaging.
- **Dual-instance conflicts** — cleanup.

### BBA-A: Enforcement mechanisms
- **Layer 1** — request validation.
- **Layer 2** — policy enforcement.
- **Layer 3** — runtime checks.
- **Layer 4** — audit logging.

### BBA-B: Enforcement combinations
- **Layer combinations** — which layers combine.
- **Build plans** — enforcement build plans.
- **Enforcement gaps** — missing enforcement.
- **Enforcement testing** — verification.

### BBB-A: Feature gaps
- **Missing features** — gap list.
- **Priority** — gap prioritization.
- **Effort** — gap effort estimation.
- **Impact** — gap impact analysis.

### BBB-B: Divergence analysis
- **Docs vs code** — divergence points.
- **Stale docs** — outdated documentation.
- **Code drift** — code diverging from design.
- **Reconciliation** — bringing docs and code in line.

## Key Insights for 9Router

1. **The 52 research docs are a complete internal knowledge base** — every subsystem is documented with deep-dive analysis.
2. **Reliability systems are mature** — error categorization, failover, enforcement layers are well-designed.
3. **Gap analysis identifies opportunities** — feature gaps, divergence, malformed-response handling.
4. **The tree expansion adds external grounding** — every internal thread now has external research backing.
5. **Implementation plans should map to these threads** — one plan per major internal thread.

## Related Docs
- `01-open-sse-engine.md` through `38-message-driven-tools-research.md`
- `39-binary-tree-expansion-master-plan.md`
- `41-branch-learned-routing.md` through `46-branch-evaluation-and-cost-quality.md`