# Gap Analysis & Risk Register — Messages Page + Error Inbox

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active (research-gap analysis — implementation not started)
**Tags:** research, gaps, risks, decision-log, messages-page, error-inbox, effort-estimate
**Sources:** `../tracking/learnings/2026-08-07-research-synthesis.md` (synthesis) · `../planning/messages-page-feature-spec.md` (spec) · `message-capture-v4-deep-pass.md` (v4)

---

## 1. Research Blind Spots — What We Still Don't Know & How to Close Each

### 1.1 Reddit demand signals (unverified — IP-blocked, 403)
v4 §4 recorded recurring themes ("can't see where my tokens went", cross-provider cost tracking) as *anecdotal* because Reddit blocks this environment. The claimed themes should not be cited as evidence until verified by a human pass. **Close by manual browsing** (use old.reddit.com if reddit.com still 403s):

| Subreddit | Search URL |
|---|---|
| r/selfhosted | https://www.reddit.com/r/selfhosted/search/?q=llm+logging+tokens&restrict_sr=1&sort=top |
| r/LocalLLaMA | https://www.reddit.com/r/LocalLLaMA/search/?q=usage+tracking+api+key+gateway&restrict_sr=1&sort=top |
| r/LLMDevs | https://www.reddit.com/r/LLMDevs/search/?q=request+logs+gateway&restrict_sr=1&sort=top |
| r/OpenWebUI | https://www.reddit.com/r/OpenWebUI/search/?q=analytics+tokens+usage&restrict_sr=1&sort=top |
| r/ollama | https://www.reddit.com/r/ollama/search/?q=cost+tracking+usage&restrict_sr=1&sort=top |
| All of Reddit | https://www.reddit.com/search/?q=%22request+logs%22+llm+gateway&sort=top |

Deliverable: a 5–10 line demand note appended to the synthesis (with URLs), or an explicit "no signal" verdict so the feature spec stops depending on it.

### 1.2 OTel / OpenInference standards churn
HN threads in v4 §4 flag OTel-vs-OpenInference span-kind incompatibility and unstable `gen_ai` semantic conventions. Any P4 ship-out code written against today's OTel semconv could break on upgrade. **Close:** freeze the P4 export format as a *minimal, documented subset* (method/status/tokens/latency as plain attributes) instead of chasing full semconv; re-verify conventions at P4 start (target date unknown), not now. Defer all semconv-sensitive design to P4.

### 1.3 Langfuse / Helicone maintenance risk
Helicone is in maintenance mode post-Mintlify acquisition (v2 §1) — its gateway+viewer shape validates our product direction but it is **not** a dependency candidate. Langfuse (32.7k★, MIT) is the leading ship-out target but cost-modeling issues (#14265, #13792/#8020) remain open upstream. **Close:** treat both as *format references only*; keep the P4 webhook export under our control so a future Langfuse change doesn't strand us.

### 1.4 TensorZero-archived lesson
TensorZero (gateway + observability consolidation) was archived June 2026 (synthesis §1.4). Lesson for us: **don't architect the ship-out around a single platform's data model**; the JSON export + webhook path must stay platform-agnostic (raw request/response + our own schema), so any external tool is replaceable.

### 1.5 GPL/AGPL license traps in copy candidates
Three copy candidates carry licenses incompatible with MIT 9Router — study UI, never vendor code:
- **octopus** (2.3k★, AGPL) — token/cost stats ideas only.
- **Helicone ai-gateway** — flagged AGPL in v4 §2; ideas only.
- **nullsink** (12★, AGPL) — zero-retention relay concept (the "opposite pole" privacy design) is copyable as a *feature*, not code.
Also flagged: workweave/router (no license), NadirClaw (no license), katanemo/plano (Apache-2.0 — fine), vllora (Other — check before reuse). **Close:** a one-line license note next to each copy item in the implementation backlog; code reuse only from MIT/Apache-2.0 (agent-prism, ccglass, Apprise, ntfy, GlitchTip schema).

### 1.6 Dead projects worth pattern-only study
| Project | Why study it | Why not build on it |
|---|---|---|
| BricksLLM (1,221★, MIT) | Per-key cost/rate enforcement UI, YC-backed design reference | Unmaintained ☠️; rate-enforcement already out of scope |
| llm.report | Cost reporting patterns | Dead |
| PromptSail (64★, MIT) | Minimal MIT capture-proxy reference impl | Too small to track |
| Glide (160★) | OTel export patterns | Dead (Pydantic → Logfire) |

---

## 2. Implementation Risks — Messages Page + Error Inbox

| # | Risk | Detail / Evidence | Mitigation |
|---|---|---|---|
| R1 | **Performance at scale** | SQLite + fat JSON blobs: joins across `messages` × `requestDetails.data` get slow past ~10⁵ rows; JSON extraction per row is unindexable | Keyset pagination (`created_at, id` — spec §4), never OFFSET; list queries select only `messages` columns + a *lazy* `requestDetails` join for the detail pane; quick-histogram via pre-aggregated counters or `GROUP BY` on indexed `(status)`, `(model)`; 50/100/250 page sizes |
| R2 | **Storage growth** | Wire-faithful capture is unbounded (synthesis §7.11); `requestDetails.data` already holds full translated payloads | `maxJsonSize` caps on stored bodies (truncate with a `truncated:true` flag); retention janitor mirroring `observabilityMaxRecords` sweep (`requestDetailsRepo.js:130` pattern); raw N days → aggregated rollup forever; "wipe all messages" action (spec §9.4); backups keep excluding `messages` like `requestDetails` |
| R3 | **Privacy / prompt injection** | Log content is untrusted input ("When AIOps Become AI Oops" 2508.06394); prompt leakage is a documented attack class (2502.12630, 2404.16251); PII in prompts (2511.13319) | Sanitizer runs **before any AI analysis or rendering** (strip HTML, escape, never act on captured instructions); `x-9r-privacy: redact\|off` header tiers; system-prompt ACLs (dashboard auth required, excluded from external exports); analyzer instructed to ignore instructions in log content (system-prompt ACL); no auto-close without human confirmation (2601.22208) |
| R4 | **Streaming capture gaps** | new-api #6594: terminal failures recorded as *successful EOF*; partial streams silently badge as `done` (spec §4) | Guard: a stream ending without a terminal event is `error(truncated)`, never `done`; dedupe by message `id` for stream retries; audit our own executors for EOF misclassification *before* the inbox ships (synthesis §7.5) |
| R5 | **Role-based access** | litellm #26582 shipped a read-only viewer role after #28859/#34099 complaints that log viewing was broken/broken-RBAC; 9Router has dashboard auth but no roles today | Ship viewer under existing dashboard auth; treat roles as a later concern; at minimum, system-prompt content requires same auth as settings (spec §9.3) |
| R6 | **DB driver variance** | Driver chain `bun:sqlite` → `better-sqlite3` → `node:sqlite` → `sql.js` (CLAUDE.md) — **FTS5 availability differs per driver**, and `sql.js` may lack FTS5 or build flags change it | Runtime capability probe (`PRAGMA compile_options` for FTS5) with LIKE-based fallback search; feature-flag search tier (FTS5 = snippets; LIKE = plain contains); unit-test search against at least two drivers |
| R7 | **Migration risk** | schema v2→v3 (new `messages` + `error_inbox` tables) runs on every existing install; additive-only is safe, destructive is not | Additive migration only (new tables/columns/indexes, no alters on `requestDetails`); migration file registered in `migrations/index.js`; test migration against a fixture DB copied from a v2 install; keep `VACUUM INTO` backups before migrate |
| R8 | **Concurrency** | Buffered writer flushes from async SSE paths; `messages` writes must not race the `requestDetails` write or each other | Single-writer discipline: writes only via the existing buffered writer flush path (spec §3); message row written in the same flush transaction as `requestDetails`; WAL mode + busy_timeout already standard |
| R9 | **UI complexity** | 3-panel (session tree → turn list → detail) vs 2-panel master-detail; 3-panel is the canonical copy (claude-code-trace) but doubles component work | 2-panel default; 3-panel as settings-gated opt-in (`ui.messages3Panel`, spec §2); reuse agent-prism-style tree components (MIT) rather than hand-rolling; keyboard nav (↑/↓, Enter, ⌘⇧F) in both |
| R10 | **Analyzer trust** | LLM RCA stalls/biases (2601.22208); judges imperfect (2510.20721); no labeled failure corpus exists (synthesis §7.6) | Advisory-only output with confidence signals + provenance labels; never auto-close; build the failure corpus from real inbox traffic as it ships (ALPHA-style few-label bootstrap, AnomalyGen synthetic seed) |

---

## 3. Decision Log — Open Questions

| # | Question | Options | Research evidence | Recommendation | Owner | Blocker |
|---|---|---|---|---|---|---|
| D1 | FTS5 vs LIKE search? | (a) FTS5 virtual table; (b) LIKE on extracted text; (c) both w/ runtime probe | recensa/claudex use FTS5 w/ snippets (v3 §4); driver chain makes FTS5 availability uneven (R6) | **(c)** — FTS5 primary, LIKE fallback behind capability probe; ship snippets only when FTS5 active | agent | N |
| D2 | New `messages` table vs extending `requestDetails`? | (a) new projection table + fat JSON stays; (b) add columns to `requestDetails` | Hybrid relational is the v4 §5 convergence (Dify/Open WebUI/LibreChat); fat bodies stay LangGraph-blob style (synthesis §4) | **(a)** — settled by research; open sub-question is only *backfill* of pre-existing `requestDetails` rows (recommend: no backfill, start clean) | agent | N |
| D3 | Webhook vs in-app notifications first? | (a) in-app badge/error-inbox first; (b) Apprise webhooks first | open-webui analytics demand is in-app (81-comment #21675); Alertmanager semantics inform grouping | **(a)** in-app in P2 with webhook as same-phase follow-on; Apprise URL support is low-effort and reuses alert semantics | agent | N |
| D4 | Synthetic scan model choice? | (a) local model (Ollama) default; (b) external API; (c) rules-only | "never send captured prompts to external models by default" (v2 §0, v4 #34); LLM wins semantics, rules win throughput (2604.12218) | **(a)** — settings-gated, off by default, local-first; rules pre-filter high-volume errors, LLM only on the survivors | agent | N |
| D5 | IP/agent/project capture in P3 or P1? | (a) P3 per spec; (b) pull into P1 | `custom-server.js` already derives IP; header conventions (`x-project`) adoption is spotty (synthesis §7.8) | **(a)** P3 — but make the migration additive now so P3 is column-only; avoid churning P1 schema | agent | N |
| D6 | Retention strategy? | (a) raw N days → aggregated forever; (b) raw forever; (c) user-set cap only | Storage economics unmodeled (synthesis §7.11); mirror `observabilityMaxRecords` (v1 §1.1) | **(a)** — default 7 days raw + aggregated rollup; configurable; "wipe all" action | agent | N |
| D7 | Labeled failure corpus? | (a) collect from live inbox; (b) synthetic only (AnomalyGen); (c) skip eval | AIOps surveys recommend real labeled traces; field gap acknowledged (synthesis §7.6, v4 §3 #1/#2) | **(a)+(b)** — seed synthetic during dev, harvest real from inbox post-launch; corpus gates *trusted* analysis, not advisory v1 | user | N (P2 launch), Y (trusted analysis) |

---

## 4. Effort Estimates by Phase (from feature-spec §10)

All paths relative to repo root. LOC are rough, implementation-only (excl. tests).

| Phase | LOC | Files (new) | Files (touched) | Tests to add | Risk |
|---|---|---|---|---|---|
| **P1 — View** | ~2,000–2,500 | `src/app/(dashboard)/dashboard/messages/page.js`; `components/MessagesList.js`, `MessageDetailPanel.js`, `FormatTabs.js`, `ConversationTree.js`; `src/app/api/messages/route.js`, `api/messages/[id]/route.js`, `api/messages/[id]/export/route.js`; `src/lib/db/repos/messagesRepo.js`; `src/lib/db/migrations/002-messages.js` | `src/app/(dashboard)/dashboard/usage/page.js` (nav entry + badge); `src/lib/db/repos/requestDetailsRepo.js` (list/filter reuse); `src/lib/db/backup.js` (exclude `messages`); `src/lib/db/migrations/index.js` | `unit/db/messagesRepo.test.js` (CRUD, keyset pagination, filters); `unit/api/messages.test.js` (list/detail/export, auth); `unit/migrations/002.test.js` (additive-only check); e2e: messages page filter/select/deep-link | **M** (new UI surface, driver variance R6) |
| **P2 — Inbox + AI** | ~1,200–1,800 | `src/app/(dashboard)/dashboard/errors/page.js`; `components/ErrorInbox.js`, `FingerprintGroup.js`; `src/app/api/errors/route.js`, `api/errors/[id]/route.js` (triage mutations); `src/lib/db/repos/errorInboxRepo.js`; `src/lib/sanitize.js`; `src/lib/notify/apprise.js` | `src/app/api/analyze-error/route.js` (tool access + advisory framing); `src/lib/db/repos/requestDetailsRepo.js` (auto-collect + fingerprint on write, EOF guard); migration `002` (add `error_inbox` + fingerprint index) | `unit/errorInboxRepo.test.js` (fingerprint dedupe, snooze/reopen); `unit/api/errors.test.js`; `unit/sanitize.test.js` (HTML/injection/PII tiers); `unit/notify.test.js` (Apprise URL, dedupe window); `unit/streamEof.test.js` (truncated≠done, new-api #6594 case) | **H** (security obligations R3, analyzer trust R10) |
| **P3 — Enrichment + scan** | ~1,000–1,500 | `src/lib/utils/diff.js` (LCS + unified); `src/lib/jobs/syntheticScan.js`; migration `003-enrichment.sql` (additive: clientId/projectId/ip columns) | `custom-server.js` (expose derived IP to request context); `src/sse/handlers/chat.js` + `open-sse/handlers/chatCore/requestDetail.js` (populate new fields); `src/lib/db/repos/settingsRepo.js` (scan settings); `open-sse/handlers/chatCore.js` (CPR/CLO computation) | `unit/diff.test.js`; `unit/cpr.test.js` (ContinuityBench metrics); `unit/requestDetailEnrichment.test.js`; `unit/syntheticScan.test.js` (local-model mock, opt-in gating); `unit/migrations/003.test.js` | **M** (touches request hot path; header adoption unknown) |
| **P4 — Ship-out (optional)** | ~600–1,000 | `src/lib/shipping/langfuse.js`, `openlit.js`, `otlp.js` (minimal semconv subset); settings UI for webhook URL | `src/lib/db/repos/settingsRepo.js` (ship-out settings); `src/lib/db/repos/requestDetailsRepo.js` (export cursor); `src/app/api/messages/export/route.js` (config-driven) | `unit/shipping.test.js` (mocked endpoints, retry/backoff, auth-header redaction) | **L** (isolated; standards churn deferred per §1.2) |

**Total: ~4,800–6,800 LOC** across four phases, with P1+P2 carrying ~70% of the risk-adjusted effort.

---

## Bottom Line

The product direction is research-settled; the remaining unknowns are *verification* (Reddit, license re-checks, OTel semconv freeze), *safety* (R3/R4/R10 — all mitigable with existing patterns), and *economics* (R2 retention, D6). No open question blocks P1; D7 blocks only "trusted" AI analysis, not advisory v1.
