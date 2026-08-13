# Feature Spec — Messages Page + Error Inbox

**Date:** 2026-08-07
**Status:** draft (build-ready spec; no code changed)
**Tags:** plan, feature-spec, messages, error-inbox, observability
**Sources:** `../research/message-capture-deep-research-v2.md` (v2) · `../research/message-capture-obscure-projects-v3.md` (v3) · `../research/message-capture-v4-deep-pass.md` (v4) · `../tracking/learnings/2026-08-07-research-synthesis.md` (synthesis)

---

## 1. Goal & Principles

**Goal:** turn 9Router's already-captured traffic (`requestDetails` table, buffered writer, header sanitization, error categories — synthesis §1.1) into a first-class "Messages" page — the **"Sentry for LLM requests"** that the community explicitly asks for: *"see what's happening in production and get alerted"* (v4 §4, HN "llm logging" 1,172 stories). Research across 300+ projects converged: **no OSS project groups raw OpenAI-compatible proxy traffic into conversation trees with wire-level fidelity**, and only a gateway that *is* the proxy can do it without MITM hacks (v3 §9, v4 §0). 9Router sits at that exact intersection.

**Principles (from synthesis §1.3, CHI "Design Principles for LLM Observability"):**

| # | Principle | Source |
|---|---|---|
| P1 | **Wire fidelity** — capture the exact payload in/out, nothing reconstructed. `data` JSON is the source of truth | v3 §1 cc-viewer; v2 §6 mitmweb |
| P2 | **Bruno-like formats** — Pretty JSON / Raw / Headers / cURL / Markdown tabs with per-section copy | v2 §6 Bruno/Hoppscotch/Insomnia; v3 §1 tokentap |
| P3 | **3-panel master-detail** — session tree → turn list → detail (claude-code-trace is the canonical layout) | v3 §2 claude-code-trace/codex-trace; v2 §6 mitmweb |
| P4 | **Organized by conversation** — branching tree via `parent_message_id`, not a flat log | v3 §1 cc-viewer; v3 §3 chatgpt-json-tree-viewer |
| P5 | **Privacy is non-negotiable** — log content is untrusted input; sanitize before analyze/render (synthesis §5) | v4 §3 "When AIOps Become AI Oops" 2508.06394 |
| P6 | **Estimates, never invoices** — cost/provenance labels are `reported`/`estimated`/`unavailable` | v3 §4 swob, claude-lens; v3 §5 tokenscope |
| P7 | **Build in-app, copy proven UX, integrate nothing heavy** — reuse existing capture + SQLite; ship-out later (v4 §4) | v2 §0, synthesis §0 |

---

## 2. Page Structure

- **Sidebar entry:** new nav item "Messages" under the existing Usage/Logs section (alongside Combos, Usage, Request Details). Badge with open Error Inbox count.
- **Route:** `/dashboard/messages` (+ `/dashboard/messages/:requestId` deep-link, mirroring the existing `request-details` route pattern in `src/app/(dashboard)/dashboard/usage/`).
- **API:** extend `/api/usage/request-details` rather than adding a parallel surface; add `/api/messages` (list), `/api/messages/:id` (detail + formats), `/api/messages/:id/export`, `/api/errors` (inbox), `/api/errors/:id` (triage mutations).
- **Layout (default):** two-panel master-detail — left: filterable message/session list; right: detail drawer/panel. **Optional 3-panel** (settings-gated `ui.messages3Panel`): session tree → turn list → detail, claude-code-trace style (v3 §2). Resizable panes; keyboard nav (↑/↓ select, Enter open, ⌘⇧F search — v3 §2 wesm pattern).

---

## 3. Data Model

**Hybrid relational pattern** (v4 §5): thin searchable `messages` rows + fat wire-faithful JSON bodies in the existing `requestDetails.data`. This keeps wire fidelity (LangGraph-blob style), search/join/aggregation (Dify/Open WebUI/LibreChat style), and free forking via `parent_message_id` (v4 §5, synthesis §4). Column names aligned with SEAR's SQL-queryable schema blueprint (v4 §3 #12) and the existing `usageHistory` conventions (`idx_*` naming, TEXT PKs, `timestamp TEXT`).

```sql
-- Migration: src/lib/db/migrations/<ver>_messages.sql (style: schema.js definitions)

CREATE TABLE IF NOT EXISTS messages (
  id                TEXT PRIMARY KEY,           -- message id from body (or generated)
  session_id        TEXT NOT NULL,              -- = conversationId (grouping key)
  request_id        TEXT,                       -- FK -> requestDetails.id (fat body)
  role              TEXT,                       -- user/assistant/tool/system/thinking
  model             TEXT,                       -- resolved model actually served
  parent_message_id TEXT,                       -- NULL = root; enables trees/forks
  status            TEXT DEFAULT 'done',        -- done/error/partial/cancelled
  tokens            INTEGER,                    -- prompt+completion, denormalized
  latency_ms        INTEGER,                    -- upstream elapsed
  created_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_msg_session ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_msg_parent  ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_msg_status  ON messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_request ON messages(request_id);
CREATE INDEX IF NOT EXISTS idx_msg_model   ON messages(model);
```

**Join to `requestDetails`** (existing table, `src/lib/db/schema.js` — `id TEXT PK, timestamp, provider, model, connectionId, status, data JSON, conversationId`):

```sql
SELECT m.*, r.provider, r.connectionId, r.data
FROM messages m
LEFT JOIN requestDetails r ON r.id = m.request_id
WHERE m.session_id = ?
ORDER BY m.created_at ASC;
```

- **`requestDetails` stays the payload store** — it already preserves translated payloads, thinking blocks, and fallback attempts (synthesis §4). `messages` is a projection.
- **Population:** a row is written from `saveUsageStats`/`buildRequestDetail` (open-sse/handlers/chatCore/requestDetail.js) — the same buffered-writer flush path, so zero new infra and streaming-safe (dedupe by message `id` for stream retries — v3 §5 tokenscope pattern).
- **`errorCategory`** stays on `requestDetails.data` (existing field); the inbox derives from `status != 'done'` + errorCategory (synthesis §1.1).
- **Retention:** mirrors `observabilityMaxRecords` janitor (synthesis §5.7, v1 §1.1) — same LIMIT-based sweep as `requestDetailsRepo.js:130`.
- **Backups** keep excluding `requestDetails` (`src/lib/db/backup.js`) — apply the same exclusion to `messages`; Cherry Studio `VACUUM INTO` pattern for zero-downtime backup of the rest (v4 §5).

---

## 4. List View Features

| Feature | Spec | Source |
|---|---|---|
| Columns | Timestamp, provider, model, role, status, tokens, cost, latency, session (first N chars), route badge | v4 §6.1 ccglass; v2 §2 one-api/new-api baseline |
| Status badges | `done` green / `error` red / `partial` amber / `cancelled` gray — with errorCategory tooltip | v2 §2; v4 new-api #6594 (EOF-success misclassification → never badge streams `done` unless truly terminated) |
| Filters | provider, model, status, errorCategory, conversationId, date range — same shape as `getRequestDetails(filter)` (`requestDetailsRepo.js:162`), plus URL-serializable so deep links work | synthesis §6 #3; v2 §3 HyperDX/OpenObserve |
| Quick histogram | top-N counts per provider/model/status above the list; click to filter | v2 §3 OpenObserve; v4 §1A GoModel |
| Search | SQLite **FTS5** virtual table over `messages` (role, model, extracted text snippet) with snippet highlighting + scoped (within-session) search | v3 §4 recensa/claudex/AI-Conversation-Viewer; v2 §3 lnav |
| Pagination | keyset (`created_at, id`), not OFFSET; pageSize 50/100/250 | mirrors usage page |
| Per-row token/cost | prompt/completion tokens + cost from `usageHistory` join; provenance label `reported`/`estimated`/`unavailable` | v3 §5 agentacct/tokenscope; v4 §1C tokencost |
| Live tail | optional SSE follow of new rows (Dozzle/claude-code-trace pattern), default off | v3 §2 claude-code-trace; v2 §3 Dozzle |

---

## 5. Detail View Features

- **Format tabs** (Bruno/Hoppscotch-style, v2 §6): **Pretty JSON** (syntax-highlighted, collapsible), **Raw** (exact wire bytes), **Headers** (sanitized request/response headers), **cURL** (reconstructed `curl` command with placeholder auth — Hurl `--curl` precedent, v2 §6), **Markdown** (human-readable prompt/completion rendering — tokentap dual-format, v3 §1). Thinking blocks rendered in a distinct gray style with collapse (v3 §2 masonc15 role-color coding).
- **Copy buttons:** per-tab "Copy" + "Copy raw JSON"; toolbar "Save to log" appends a sanitized Markdown entry to `~/.9router/log.txt` (existing usage log path).
- **Per-conversation siblings nav:** prev/next message in the same `session_id` (cc-viewer per-conversation grouping, v3 §1); jump-to-thread button.
- **Body-diff between consecutive requests** in the same conversation: unified diff of request bodies showing only changed fields (cc-viewer's killer feature — v3 §1; Watson's reasoning capture, v4 §3). Fallback to side-by-side LCS when bodies are structurally different (teley pattern, v3 §6).
- **Provider-route chain:** render the routing decision as a vertical chain **router → combo → account → fallback** with per-hop status — who decided and why, from `requestDetails.data` (Evidence-Bound Provenance 2606.22560, v4 §3 #10). Each hop shows configured-vs-actual (CrossLink, v4 §2) and account health (CPA-Manager-Plus, v4 §2).
- **CPR/CLO continuity metrics:** when fallback occurred, show Continuity Preservation Rate (did the conversation history survive the hop?) and Continuity Latency Overhead (how much extra latency did the switch cost?) — ContinuityBench (2607.15899, v4 §3 #9) — with an honest "history dropped" warning if CPR < 1.

---

## 6. Error Inbox

- **Auto-collect:** rows with `status != 'done'` (incl. `partial`) flow into `error_inbox`; **stream EOF-success misclassification guard**: a stream that ends without a terminal event is `error(truncated)`, not `done` (new-api #6594, v4 §4).
- **Sentry-style workflow** (v2 §4 Sentry/GlitchTip): each item is `open` / `resolved` / `snoozed` (snooze = reopen after N hours). List shows frequency chart + first/last seen + count.
- **Fingerprint dedupe:** `fingerprint = sha256(provider + model + errorCategory + normalized_error_message)` — Errbit's hash(class+message+backtrace) model, simplest dedupe (v2 §4 Errbit; synthesis §1.1). Grouped issues show a count and expandable per-occurrence list.
- **Hierarchical clustering:** group by provider → model → endpoint → error-class before flat listing (KRONE 2602.07303, v4 §3 #25).
- **AI analysis:** "Analyze" per item + "Analyze batch" — reuse the existing `/api/analyze-error` endpoint with **tool access** (query the log store, diff traces — TAMO 2504.20462, v4 §3 #21; Microsoft RCA 2403.04123 full-trace packaging). Output is **advisory**: confidence signal shown; never auto-closes items (Stalled/Biased/Confused 2601.22208, v4 §3 #24); provenance label on every finding (v3 §4 swob).
- **Notifications:** optional Apprise-style URL (`apprise://` string or webhook list) → Slack/Discord/ntfy/Gotify/Telegram out of the box; Alertmanager semantics: group by fingerprint, min-interval dedupe, silence window (v2 §5 Apprise/Alertmanager; v3 §5 claude-pulse).
- **Synthetic scan (settings-gated, off by default):** background job (reuse scheduler patterns — `backgroundTokenRefresh`, `srComboCleanup` per synthesis §6) polls unresolved inbox rows with a cheap/local model (default local, never external without explicit opt-in — v4 §3 #34, v2 §0), classifies root cause, attaches a narrative ("what went wrong / what we tried" — LLM-LADE, v4 §3 #27).

---

## 7. Conversation Tree View

- **Branching via `parent_message_id`:** render each `session_id` as a tree; multiple roots = forked conversation (chatgpt-json-tree-viewer, v3 §3 — the "organized by chat" ask verbatim; LibreChat parent-message pattern, v4 §5).
- **Thread rendering:** click a node → detail panel; siblings share parent; rewind/fork visible as divergent branches (smithers, v4 §1B; clog threading, v3 §2).
- **Per-conversation stats header:** session-level tokens, cost, latency P50/P95, message count, model mix (Open WebUI-style aggregation, v4 §5; token-dashboard Sessions tab, v3 §5).
- **Diff tool:** LCS side-by-side comparison of two sessions (teley, v3 §6; claude-trace-replay, v3 §2).

---

## 8. Export

| Format | Spec | Source |
|---|---|---|
| JSON | full conversation (messages joined with requestDetails.data), normalized, importable | v2 §1 Langfuse shape; v3 §3 TomzxCode normalization |
| Markdown | role-styled transcript (user/assistant/tool/thinking) | v3 §1 tokentap dual-format |
| Single-file HTML | self-contained offline archive, role color-coding | v3 §3 scrapemychats; v3 §2 masonc15 |
| cURL | per-request `curl` snippet with auth placeholder | v2 §6 Hurl/Bruno |

All exports run through the same sanitizer as rendering (§9). System prompts excluded from external formats by default (§9).

---

## 9. Security & Privacy

1. **Untrusted log content (mandatory):** upstream responses are untrusted input (2508.06394). Sanitizer runs before *any* AI analysis or rendering: strip HTML, never execute/act on captured instructions, escape before markdown render (2605.18133). Analyzer is instructed to ignore instructions in log content (system-prompt ACL). — v4 §3 #29/#37
2. **PII redaction tiers:** per-request `x-9r-privacy: redact|off` header (Whistledown tiers, 2511.13319); redacted tier masks emails/phones/keys in stored + exported bodies; `off` skips capture entirely (per-request opt-out). — v4 §3 #33
3. **System-prompt ACLs:** content tagged `system`/`systemPrompt` requires the same dashboard auth as settings; excluded from external exports by default (prompt leakage 2502.12630/2404.16251). — v4 §3 #36/#37
4. **Zero-retention toggle:** `settings.privacy.noLog` — capture-nothing mode (OpenGateLLM "no-log" toggle, v4 §2); plus retention janitor and "wipe all messages" action. — v4 §2, synthesis §5.7
5. **Extend header sanitization:** strip `Authorization`/`Cookie`/`x-api-key` + custom auth headers in bodies (extends v1 §1.1 work). — synthesis §5.8
6. **Local access-controlled storage:** everything stays in local SQLite under `~/.9router`; no third-party shipping without explicit opt-in; no cache-hit provenance display usable for cross-tenant inference (CacheProbe 2605.30613). — v4 §3 #16/#13
7. **No auto-close, confidence signals** (§6) — human confirmation required (2601.22208).

---

## 10. Phased Rollout

| Phase | Scope | Reuses |
|---|---|---|
| **P1 — View** | Messages page: list (filters/badges/pagination), detail drawer, format tabs, copy, siblings nav, conversation tree, export JSON/Markdown/cURL | existing `requestDetails` + `usageHistory`; no new capture |
| **P2 — Inbox + AI** | Error Inbox (triage, fingerprint, clustering), per-item/batch AI analysis via `/api/analyze-error`, Apprise webhooks, single-file HTML export | existing analyze-error endpoint |
| **P3 — Enrichment + scan** | `x-project`/`x-app`/`x-9r-client` headers + client IP capture (custom-server.js already derives IP); schema migration; body-diff; CPR/CLO; settings-gated synthetic scan | custom-server.js IP logic; scheduler patterns |
| **P4 — Ship-out (optional)** | Langfuse (MIT) via API/SDK, OpenLIT, or raw OTLP webhook; documented Proxmox paths (`openobserve-install.sh`, `signoz-install.sh`) | v2 §1; v2 §7 |

---

## 11. Open Questions (from research)

- Reddit signals remain anecdotal (IP-blocked; v4 §4).
- OTLP span-kind/semconv churn — which survive for P4 (v4 §3/§4 HN).
- SEAR ~100-attribute mapping effort unestimated (synthesis §7.3).
- Need a labeled failure corpus / eval set for the analyzer (ALPHA 2509.05936; v4 §3 #32).

---

## 12. Known UI Issues — P1 Detail Drawer (logged 2026-08-07, fix deferred)

> User-reported during P1 verification. Both are **deferred** (not blocking P1
> data/API work) — recorded here so they are not lost.

### 12.1 Compact-mode overflow: detail drawer goes off-screen

**Symptom:** in a narrow/compact window, the detail drawer (and the
conversation/error detail it shows) renders **partially off the left edge of the
page** — content is not visible and cannot be scrolled into view.

**Evidence (browser probe, 2026-08-07):**
- Drawer is hard-coded `w-[800px]` + `right-0` (see `combos`-style detail drawer
  markup: `div.absolute.right-0.top-0.h-full...w-[800px]`).
- At a ≥800px window the drawer fits (probe: `left:0, right:800`).
- At a narrower window the drawer's bounding rect goes negative
  (user-attached element context showed `left: -160px`), i.e. 160px of the
  drawer is off-screen with no way to reach it.

**Root cause (from code):** fixed 800px width with no viewport adaptation
(`max-w-full`, `w-[min(800px,100vw)]`, or responsive `sm:`/`md:` widths).

**Fix approach (when we get to it):**
- `w-[min(800px,100vw)]` (or `w-full max-w-[800px]`) so the drawer never exceeds
  the viewport;
- verify the inner scroll container still works at reduced width;
- optionally a drag-to-resize drawer (P3 nicety, not required).

**Verification for the fix:** open the drawer at window widths 1280 / 900 / 640 /
375 → assert drawer rect ∈ viewport at every width and the Pretty JSON tab is
fully reachable.

### 12.2 Detail text not (visibly) scrollable

**Symptom:** the `pre` block showing the conversation/error payload does not
scroll up/down or side to side (or the scroll affordance is invisible).

**Evidence (browser probe, 2026-08-07):**
- `pre` has `overflow-auto`, `whitespace-pre-wrap`, `break-words`.
- For the sampled (small) message: `scrollHeight == clientHeight` and
  `scrollWidth == clientWidth` → nothing to scroll for short payloads (correct
  behavior, but easy to read as "broken").
- Horizontal scrolling **never** occurs by design: `pre-wrap` + `break-words`
  wraps long lines instead of overflowing. If horizontal scroll is desired, it
  needs `whitespace-pre` + `overflow-x-auto` (or a toggle).
- Nested scroll containers: the drawer body is also `overflow-y-auto` wrapping
  the `pre`'s flex column, and the middle wrapper (`flex min-w-0 flex-1 flex-col`)
  lacks `min-h-0` — for very long payloads the `pre` may grow past the drawer
  body instead of scrolling (needs verification with a large synthetic payload).

**Fix approach (when we get to it):**
- Add `min-h-0` to the `pre`'s flex parent chain;
- decide wrap vs horizontal-scroll policy (recommend: keep wrap for readability,
  add a "Word wrap" toggle);
- make the scrollbar visible in compact mode (custom-scrollbar styling).

**Verification:** inject a >10k-char synthetic message → assert `pre` scrolls
vertically inside the drawer without the drawer body scrolling; assert both
nested scrollbars behave (drawer body scrolls to bottom, pre scrolls
independently).

### 12.3 Vision-assisted review (optional, deferred)

If needed later, use a subagent with a vision-capable model (e.g.
`dialagram/qwen-3.5-omni-plus`) on a screenshot of the drawer at 375px width to
confirm the off-screen/scroll issues visually. Not required for the fixes above
(DOM probes are sufficient), but useful as final QA.
